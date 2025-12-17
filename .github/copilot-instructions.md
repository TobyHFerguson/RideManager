# Copilot Instructions

## Architecture Overview
This is a Google Apps Script (GAS) project that manages ride scheduling through integration with RideWithGPS and Google Calendar. The codebase mixes GAS-specific APIs with standard JavaScript/Node.js code.

### Key Architectural Patterns

#### GAS vs Pure JavaScript Separation
The codebase strictly separates GAS-specific code from pure JavaScript to maximize testability:

- **Pure JavaScript modules** (can run in Node.js/Jest, MUST have 100% test coverage):
  - `SCCCC.js` - SCCCC event data model
  - `EventFactory.js` - Event creation logic
  - `Groups.js` - Group specifications
  - `Globals.js` - Global configuration
  - `Commands.js` - Business logic commands
  - `rowCheck.js` - Validation logic
  - `RetryQueueCore.js` - Retry logic (exponential backoff, queue management)
  - `RetryQueueMarshallingCore.js` - Queue data marshalling (items ↔ 2D arrays)
  - `TriggerManagerCore.js` - Trigger management logic (configuration, validation, scheduling decisions)
  - `HyperlinkUtils.js` - Hyperlink formula parsing
  - Dates submodule

- **GAS-dependent modules** (thin wrappers around pure JavaScript, minimal logic):
  - `ScheduleAdapter.js` - Spreadsheet I/O adapter using Fiddler
  - `RideManager.js` - RWGPS and Calendar integration
  - `UIManager.js` - User interface dialogs
  - `MenuFunctions.js` - Menu handlers
  - `triggers.js` - GAS event handlers
  - `TriggerManager.js` - GAS orchestrator for TriggerManagerCore (ScriptApp operations)
  - `RetryQueue.js` - GAS orchestrator for RetryQueueCore
  - `RetryQueueSpreadsheetAdapter.js` - SpreadsheetApp I/O for retry queue (uses RetryQueueMarshallingCore)
  - `GoogleCalendarManager.js` - Calendar API wrapper

- **Legacy mixed modules** (MUST refactor when modifying):
  - `ProcessingManager.js` - Uses PropertiesService for state management
  - `UserLogger.js` - Uses DriveApp and Session
  - **Rule**: When modifying these files, MUST extract business logic to Core modules with 100% test coverage

#### CRITICAL Architecture Rules

**Rule 1: Maximize Testable Code - Minimize GAS Execution**
- **Principle**: Anything that can be tested in Jest without requiring GAS MUST be in a pure JavaScript Core module
- This includes:
  - Business logic (calculations, decisions, state management)
  - Data transformations and marshalling (format conversions, parsing, serialization)
  - Validation rules
  - Algorithm implementations
- GAS modules should be thin adapters that ONLY:
  - Read/write from GAS services (SpreadsheetApp, PropertiesService, CalendarApp, etc.)
  - Call pure JavaScript functions
  - Handle GAS-specific errors
  - Convert between GAS types and plain JavaScript types
- **Goal**: Every code path should be verifiable through automated tests
- **Example**: `RetryQueueMarshallingCore.js` (pure JS data conversion, 100% tested) vs `RetryQueueSpreadsheetAdapter.js` (thin GAS wrapper)

**Rule 2: 100% Test Coverage Required**
- ALL pure JavaScript modules MUST have Jest tests with 100% code coverage
- Run tests with: `npm test -- --coverage --collectCoverageFrom='src/YourModule.js'`
- Only exception: `if (typeof require !== 'undefined')` compatibility checks
- Test files go in `test/__tests__/YourModule.test.js`
- Coverage reports generated in `coverage/` directory
- **Not just business logic**: Data marshalling, format conversions, parsing - all must be tested

**Rule 3: Testability First - Extract Before You Code**
When creating new functionality:
1. **Identify what can be tested**: Separate pure logic from GAS API calls
2. **Write pure JavaScript core logic** in `*Core.js` module (e.g., `RetryQueueCore.js`, `RetryQueueMarshallingCore.js`)
3. **Write comprehensive Jest tests** achieving 100% coverage BEFORE writing the adapter
4. **Create thin GAS adapter** in `*.js` that only handles GAS APIs
5. **Document the separation** in code comments

**Example**: RetryQueue Spreadsheet Access
```javascript
// ✅ CORRECT: Pure JS marshalling (100% tested in Jest)
// RetryQueueMarshallingCore.js
class RetryQueueMarshallingCore {
    static itemToRow(item) {
        return [
            item.id || '',
            item.operation || '',
            item.params ? JSON.stringify(item.params) : '',
            // ... all conversion logic here
        ];
    }
    static rowToItem(row) {
        return {
            id: row[0] || '',
            operation: row[1] || '',
            params: row[2] ? JSON.parse(row[2]) : {},
            // ... all parsing logic here
        };
    }
}

// ✅ CORRECT: Thin GAS adapter (only SpreadsheetApp calls)
// RetryQueueSpreadsheetAdapter.js
class RetryQueueSpreadsheetAdapter {
    save(items) {
        const sheet = this._getSheet();
        // Use Core module for conversion
        const rows = RetryQueueMarshallingCore.itemsToRows(items);
        // Only GAS API call
        sheet.getRange(2, 1, rows.length, 7).setValues(rows);
    }
    
    loadAll() {
        const sheet = this._getSheet();
        // Only GAS API call
        const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
        // Use Core module for conversion
        return RetryQueueMarshallingCore.rowsToItems(values);
    }
}

// ❌ WRONG: Data conversion inline in GAS adapter (untestable)
class RetryQueueSpreadsheetAdapter {
    save(items) {
        const sheet = this._getSheet();
        // WRONG: Conversion logic mixed with GAS calls
        const rows = items.map(item => [
            item.id || '',
            item.operation || '',
            JSON.stringify(item.params),
            // ... can't test this without GAS
        ]);
        sheet.getRange(2, 1, rows.length, 7).setValues(rows);
    }
}
```

**Why This Matters**:
- **Reliability**: Every conversion, every edge case is tested
- **Debugging**: Pure JS modules can be debugged in Node.js with full tooling
- **Refactoring**: Pure JS modules can be safely changed with test verification
- **Speed**: Jest tests run in milliseconds vs GAS manual testing
- **Confidence**: 100% coverage means all code paths are verified

**Rule 4: Dependency Injection**
Pure JavaScript modules should accept dependencies as parameters:
```javascript
// ✅ Good - testable
RetryQueueCore.createQueueItem(operation, generateId, getCurrentTime)

// ❌ Bad - hardcoded GAS dependency
createQueueItem(operation) { id: Utilities.getUuid() }
```

#### CRITICAL: Schedule & Row Refactoring Requirements
**Schedule & Row Classes** - Currently tightly coupled to SpreadsheetApp (MUST fix when modifying):
- These classes leak GAS dependencies throughout the codebase
- Spreadsheets are small (few hundred rows, ~20 columns), amenable to in-memory processing
- **MANDATORY architecture**: Load spreadsheet → Convert to domain objects → Pass to business layer → Merge updates → Save back
- MUST use Fiddler for I/O layer instead of direct SpreadsheetApp manipulation
- MUST keep pure JavaScript business logic separate from GAS persistence layer
- **Rule**: Any modification to Schedule/Row MUST move toward this architecture, not maintain current coupling

#### Module Export/Import Pattern
Due to GAS limitations, the code uses a conditional module pattern:

```javascript
// At top of file for Node.js/Jest compatibility
if (typeof require !== 'undefined') {
    var SomeModule = require('./SomeModule');  // Use 'var', not 'const'!
}

// Module definition using IIFE or direct assignment
var ModuleName = (function() {
    class ModuleName {
        // Implementation
    }
    return ModuleName;
})();

// At bottom of file for Node.js/Jest export
if (typeof module !== 'undefined') {
    module.exports = ModuleName;  // Export the module, NOT 'var ModuleName = ModuleName'
}
```

**Critical Naming Convention**: The variable name MUST match the class/module name:
- ✅ `var SCCCCEvent = (function() { class SCCCCEvent { ... } return SCCCCEvent; })()`
- ✅ `var Row = (function() { class Row { ... } return Row; })()`
- ✅ `var dates = { convert, weekday, MMDD, ... };` (for namespace modules)
- ❌ `const Event = ...` (causes redeclaration errors)
- ❌ `var Event = Event;` (syntax error - already declared by the class)

**Why use `var` instead of `const`**:
- GAS concatenates all files into global scope in arbitrary order
- `var` declarations are hoisted and can be redeclared without error
- `const` and `let` cause "already declared" errors when files load out of order
- Inside `if (typeof require !== 'undefined')` blocks, we still use `var` for consistency

#### Centralized Exports Pattern
`Exports.js` provides a single point of access to all modules using lazy property getters:

```javascript
var Exports = {
    get ModuleName() {
        return ModuleName;  // Returns the global variable
    },
    // ... other modules
};
```

**Benefits**:
- Lazy evaluation: module is resolved when accessed, not when defined
- Handles GAS arbitrary file loading order automatically
- Single import point for all modules
- Access via `Exports.ModuleName` (property, not function call)

**Usage in code**:
```javascript
// ✅ Correct - property access
const command = Exports.Commands.someCommand;

// ❌ Wrong - function call (old pattern)
const commands = Exports.getCommands();
```

**CRITICAL: Property Names MUST Match Variable Names**:
- The property name in `Exports.js` MUST match the actual variable name being returned
- File names can differ, but variable names must match
- This allows `npm run validate-exports` to verify all modules are defined
- Examples:
  - ✅ `get SCCCCEvent() { return SCCCCEvent; }` - matches variable name
  - ✅ `get dates() { return dates; }` - matches variable name in `common/dates.js`
  - ❌ `get Event() { return SCCCCEvent; }` - property name doesn't match variable (validation fails)
- **Rule**: When adding a new module to Exports.js, the property name MUST be the same as the `var`/`const` name in the source file

### Key Components

#### Schedule & Row Classes
`Schedule.js` provides the primary interface to the spreadsheet:
- Manages the "Consolidated Rides" sheet
- Provides `Row` objects that represent individual ride entries
- Handles formula storage/restoration
- Caches row data to minimize spreadsheet reads
- **Note**: Tightly coupled to SpreadsheetApp - refactoring target for better separation

#### Command Pattern
`Commands.js` contains frozen command objects executed by `MenuFunctions.js`:
- Each command receives `(rows, rwgps, force)` parameters
- Commands delegate to `RideManager.js` for actual operations
- `UIManager.processRows` handles validation and user confirmation

#### Validation System
`rowCheck.js` provides validation functions:
- Functions return error/warning messages or undefined
- Used by `UIManager.processRows` before command execution
- Distinguishes between errors (blocking) and warnings (user can override)

#### Processing Flow
1. User selects menu item in spreadsheet
2. `triggers.js` calls `MenuFunctions.js`
3. `MenuFunctions.js` gets selected rows from `Schedule.js`
4. `UIManager.processRows` validates rows using `rowCheck.js`
5. User confirms via dialog
6. `Commands.js` execute via `RideManager.js`
7. `Schedule.save()` writes changes back to spreadsheet

#### Trigger Management
**TriggerManagerCore.js** (Pure JavaScript, 100% tested):
- Trigger configuration and validation logic
- Scheduling decision logic (when to create/remove triggers)
- Owner validation logic
- No GAS dependencies

**TriggerManager.js** (GAS adapter):
- Thin wrapper around TriggerManagerCore
- Handles ScriptApp trigger creation/deletion
- Manages document properties for coordination
- Logs all operations to User Activity Log

**Trigger Types Managed**:
1. **onOpen** - Installable trigger (runs as owner)
2. **onEdit** - Installable trigger (runs as owner)
3. **Daily Announcement Check** - Backstop (runs 2 AM daily)
4. **Daily Retry Check** - Backstop (runs 2 AM daily)
5. **Announcement Scheduled** - Dynamic (fires at announcement send time)
6. **Retry Scheduled** - Dynamic (fires at retry due time)

**Installation**:
- Owner-only via menu: "Ride Schedulers > Install Triggers"
- Idempotent: Safe to run multiple times
- All operations logged to User Activity Log

**Pattern**: "Backstop + Scheduled"
- Daily backstops provide self-healing (catch missed operations)
- Scheduled triggers provide precision timing
- Owner-only ensures single source of trigger management

### Testing Strategy

#### Jest Tests (Required for Pure JavaScript)
- **ALL pure JavaScript modules MUST have 100% test coverage**
- Tests located in `test/__tests__/ModuleName.test.js`
- Run specific test with coverage: `npm test -- --coverage --collectCoverageFrom='src/ModuleName.js' test/__tests__/ModuleName.test.js`
- Coverage reports in `coverage/` directory
- Acceptable uncovered: only `if (typeof require !== 'undefined')` compatibility checks

#### Test Structure
```javascript
const ModuleName = require('../../src/ModuleName');

describe('ModuleName', () => {
    describe('methodName', () => {
        it('should handle normal case', () => {
            // Arrange
            const input = { /* test data */ };
            
            // Act
            const result = ModuleName.methodName(input);
            
            // Assert
            expect(result).toEqual(expected);
        });
        
        it('should handle edge case', () => {
            // Test edge cases, errors, boundaries
        });
    });
});
```

#### GAS-Specific Testing
- GAS modules tested manually or via `testEvent.js` style functions
- Focus on integration testing at GAS boundary
- Mock GAS APIs when testing mixed modules

#### Coverage Requirements
- **Statements**: 100%
- **Branches**: 100% (except Node.js compatibility checks)
- **Functions**: 100%
- **Lines**: 100%

**Before submitting code**:
1. Run full test suite: `npm test`
2. Run coverage for new modules: `npm test -- --coverage`
3. Verify 100% coverage in terminal output
4. Check `coverage/lcov-report/index.html` for details

## TypeScript Type Coverage (MANDATORY)

**CRITICAL: Maximum Type Safety Required**

All code in the `src/` directory MUST have comprehensive TypeScript type coverage and ZERO type errors.

### Type Coverage Requirements

1. **Zero Type Errors Policy**
   - `npm run typecheck` MUST pass with ZERO errors in `src/` directory
   - Pre-existing errors in `submodules/` are acceptable (not our code)
   - Every code change MUST be verified with `npm run typecheck` before deployment
   - ❌ NEVER commit code that introduces new type errors

2. **Comprehensive `.d.ts` Files**
   - Every `.js` module in `src/` MUST have a corresponding `.d.ts` file
   - Type declarations MUST accurately reflect the actual implementation
   - Update `.d.ts` files whenever changing function signatures
   - Use JSDoc comments in `.js` files to enhance type inference

3. **Type Error Suppression Strategy**
   - **Prefer `@ts-expect-error`** over `@ts-ignore`
   - `@ts-expect-error`: Used when you KNOW there's a type error (fails if error is fixed)
   - `@ts-ignore`: Only for unavoidable compatibility issues (e.g., `typeof require !== 'undefined'`)
   - **ALWAYS add explanatory comment** explaining why suppression is needed
   - Minimize use of type escapes - fix the root cause when possible

4. **Type Escape Guidelines**

   ```javascript
   // ✅ GOOD - @ts-expect-error with explanation
   // @ts-expect-error - Google Apps Script globals not in type definitions
   const value = globalVariable;
   
   // ✅ GOOD - @ts-ignore for compatibility check
   // @ts-ignore - Node.js compatibility check for Jest tests
   if (typeof require !== 'undefined') {
       var Module = require('./Module');
   }
   
   // ❌ BAD - @ts-ignore without explanation
   // @ts-ignore
   const result = someFunction();
   
   // ❌ BAD - Using type escape instead of fixing the issue
   // @ts-ignore
   const route = getRoute(); // Should add proper type to getRoute()
   ```

5. **Ambient vs Module Declarations**
   - **Ambient** (no exports): For GAS globals available everywhere
     ```typescript
     // UserLogger.d.ts - Ambient (no export)
     declare const UserLogger: UserLoggerNamespace;
     // Use directly: UserLogger.log()
     ```
   - **Module** (with exports): For modules imported explicitly
     ```typescript
     // Event.d.ts - Module (with export)
     export class Event { ... }
     // Import required: const Event = require('./Event')
     ```

6. **Type Checking Workflow**
   ```bash
   # CRITICAL: Run type check before committing ANY code change
   
   npm run typecheck
   
   # This runs: tsc --noEmit
   # Which uses tsconfig.json settings (checkJs: true, allowJs: true)
   # Checks all files in src/**/*.js as configured in tsconfig.json
   
   # Must pass with ZERO errors in src/ before deployment
   # Pre-existing errors in submodules/ are acceptable
   ```
   
   **VS Code Integration:**
   - VS Code uses the same tsconfig.json for inline error checking
   - Errors shown in VS Code = errors that will fail `npm run typecheck`
   - Fix ALL type errors shown in VS Code before committing
   - Use triple-slash references (`/// <reference path="..." />`) to resolve "Cannot find name" errors
   
   **CRITICAL: jsconfig.json Override**
   - `src/jsconfig.json` overrides root `tsconfig.json` for VS Code in src/ directory
   - MUST keep both files synchronized with same strict settings:
     - `"noImplicitAny": true`
     - `"strict": true`
     - `"useUnknownInCatchVariables": true`
   - If VS Code and `npm run typecheck` show different errors, check both config files

7. **GAS Global Declarations Pattern (CRITICAL)**
   
   **Problem**: In Google Apps Script, all `.js` files are concatenated into a single global scope. Variables declared with `var` at top level become global variables. TypeScript/VS Code doesn't know about these runtime globals.
   
   **Solution**: Use `gas-globals.d.ts` ambient declaration file
   
   ```typescript
   // src/gas-globals.d.ts - Declares GAS runtime globals for TypeScript
   
   import type ScheduleAdapterClass from './ScheduleAdapter';
   import type RetryQueueClass from './RetryQueue';
   // ... other imports
   
   declare global {
       // Classes - use 'typeof' to get the constructor type
       const ScheduleAdapter: typeof ScheduleAdapterClass;
       const RetryQueue: typeof RetryQueueClass;
       
       // Utility functions that are global in GAS
       function getRoute(url: string, readThrough?: boolean): any;
       function getAppVersion(): string;
   }
   
   export {}; // Make this a module
   ```
   
   **Usage in JavaScript files**:
   ```javascript
   /// <reference path="./gas-globals.d.ts" />
   
   function myFunction() {
       // TypeScript now knows ScheduleAdapter is available globally
       const adapter = new ScheduleAdapter();
       const version = getAppVersion();
   }
   ```
   
   **JSDoc Instance Types**:
   When a function parameter is an *instance* of a class (not the class itself), use:
   ```javascript
   /**
    * @param {InstanceType<typeof ScheduleAdapter>} adapter - Instance of ScheduleAdapter
    */
   function handleEdit(event, adapter) {
       adapter.restoreFormula(row, 'Route'); // TypeScript knows instance methods
   }
   ```
   
   **Key Rules**:
   - ✅ Use `typeof ClassName` for class constructors (can use `new`)
   - ✅ Use `InstanceType<typeof ClassName>` in JSDoc for class instances
   - ✅ Reference `gas-globals.d.ts` in files that use global variables
   - ✅ Keep `gas-globals.d.ts` updated when adding new global functions/classes
   - ❌ Don't declare globals directly in module .d.ts files (won't work)

8. **Common Type Issues and Solutions**

   | Issue | Solution |
   |-------|----------|
   | Cannot find name 'X' | Add to `gas-globals.d.ts` or triple-slash reference |
   | Property 'X' does not exist | Update `.d.ts` to include the property |
   | Type 'X' is not assignable to 'Y' | Add type assertion or fix type mismatch |
   | Implicit 'any' type | Add explicit type annotation or JSDoc |
   | 'Property missing in type' for class instance | Use `InstanceType<typeof ClassName>` in JSDoc |
   | 'typeof X' has no method Y | Use instance type, not constructor type |
   | VS Code errors but `npm run typecheck` passes | Restart TypeScript server in VS Code |

9. **Error Type Guards (useUnknownInCatchVariables: true)**
   
   With strict mode enabled, catch block variables are `unknown` type. Always use type guards:
   
   ```javascript
   // ✅ GOOD - Type guard for error handling
   try {
       somethingRisky();
   } catch (error) {
       const err = error instanceof Error ? error : new Error(String(error));
       console.error(err.message);
       UserLogger.log('ERROR', err.message, { stack: err.stack });
   }
   
   // ❌ BAD - Direct use of unknown error
   try {
       somethingRisky();
   } catch (error) {
       console.error(error.message); // TS Error: 'error' is of type 'unknown'
   }
   ```

10. **VS Code TypeScript Error Checking (CRITICAL)**
   
   **MANDATORY: VS Code TypeScript server is MORE STRICT than `tsc --noEmit`**
   
   The VS Code TypeScript language server catches implicit type errors that the command-line TypeScript compiler (`tsc --noEmit`) does NOT catch. This means:
   
   - ✅ **ALWAYS check VS Code errors** using the `get_errors` tool
   - ❌ **NEVER assume `npm run typecheck` passing means no type errors**
   - 🔍 **VS Code catches**: Implicit `any` types, generic types without parameters, implicit `any[]` arrays
   - ⚠️ **tsc --noEmit allows**: Many implicit types that VS Code flags as errors
   
   **How to Find VS Code Errors:**
   ```bash
   # Use get_errors tool to see VS Code's TypeScript server errors
   # This shows the SAME errors VS Code displays in the editor
   get_errors(['src/'])
   ```
   
   **Common VS Code-Only Errors:**
   
   1. **Generic Array Type Without Parameter**
      ```javascript
      // ❌ ERROR in VS Code (but passes tsc --noEmit)
      /**
       * @param {Array} items - Array of items
       */
      function process(items) { }
      
      // ✅ CORRECT - Use any[] or specific type
      /**
       * @param {any[]} items - Array of items
       */
      function process(items) { }
      ```
   
   2. **Implicit any[] Type on Variables**
      ```javascript
      // ❌ ERROR in VS Code (but passes tsc --noEmit)
      const results = items.filter(x => x.valid);
      
      // ✅ CORRECT - Explicit type annotation
      /** @type {any[]} */
      const results = items.filter(x => x.valid);
      
      // ✅ BETTER - Specific type
      /** @type {string[]} */
      const names = items.map(x => x.name);
      ```
   
   3. **Implicit any on Function Parameters**
      ```javascript
      // ❌ ERROR in VS Code (but passes tsc --noEmit)
      function expandTemplate(template, rowData) {
          return template.replace(/\{(\w+)\}/g, (match, field) => {
              return rowData[field] || '';
          });
      }
      
      // ✅ CORRECT - Full JSDoc with parameter types
      /**
       * Expand template placeholders with row data
       * 
       * @param {string} template - Template text with {FieldName} placeholders
       * @param {any} rowData - Row data object
       * @returns {string} Expanded text
       */
      function expandTemplate(template, rowData) {
          return template.replace(/\{(\w+)\}/g, 
              (/** @type {string} */ match, /** @type {string} */ field) => {
                  return rowData[field] || '';
              }
          );
      }
      ```
   
   4. **Implicit any[] in Lambda/Callback Parameters**
      ```javascript
      // ❌ ERROR in VS Code (but passes tsc --noEmit)
      const names = items.map(item => item.name);
      
      // ✅ CORRECT - Inline type annotation
      const names = items.map((/** @type {any} */ item) => item.name);
      
      // ✅ BETTER - Type the array first
      /** @type {Array<{name: string}>} */
      const items = getItems();
      const names = items.map(item => item.name); // Type inferred
      ```
   
   **Type Annotation Patterns (VS Code Compliance):**
   
   ```javascript
   // Pattern 1: Variable declarations
   /** @type {any[]} */
   const items = [];
   
   /** @type {string[]} */
   const names = ['Alice', 'Bob'];
   
   /** @type {{id: string, name: string}[]} */
   const users = [];
   
   // Pattern 2: Function JSDoc
   /**
    * Process items with validation
    * 
    * @param {any[]} items - Array of items to process
    * @param {string} mode - Processing mode
    * @returns {{success: boolean, errors: string[]}} Result object
    */
   function processItems(items, mode) {
       /** @type {string[]} */
       const errors = [];
       // ... implementation
       return { success: errors.length === 0, errors };
   }
   
   // Pattern 3: Lambda parameters in callbacks
   items.forEach((/** @type {any} */ item, /** @type {number} */ index) => {
       console.log(`Item ${index}: ${item.name}`);
   });
   
   // Pattern 4: Replace callback with multiple parameters
   text.replace(/pattern/g, (/** @type {string} */ match, /** @type {string} */ group) => {
       return transform(match, group);
   });
   ```
   
   **VS Code Error Checking Workflow:**
   
   1. **After ANY code change:**
      ```bash
      # Check VS Code errors (more strict)
      get_errors(['src/'])
      
      # Also check CLI (should still pass)
      npm run typecheck
      ```
   
   2. **Fixing implicit type errors:**
      - Look at the error message for the expected type
      - Add `/** @type {T} */` annotation BEFORE the declaration
      - For function parameters, add full JSDoc block with `@param {T}`
      - For lambda parameters, use inline `(/** @type {T} */ param) =>`
   
   3. **Common patterns to fix:**
      - `{Array}` → `{any[]}` or `{T[]}` in JSDoc
      - Implicit `any[]` variable → `/** @type {any[]} */ const x = ...`
      - Missing function JSDoc → Add `@param {T}` for all parameters
      - Lambda without types → `(/** @type {T} */ x) => ...`
   
   **Real-World Example (AnnouncementCore.js):**
   
   ```javascript
   // BEFORE: 11 VS Code errors (but tsc --noEmit passed!)
   
   /**
    * Get items due for sending/reminder
    * @param {Array} rows - All announcement rows
    * @returns {Object} Due items
    */
   static getDueItems(rows, currentTime) {
       const dueToSend = rows.filter(/* ... */);
       const dueForReminder = rows.filter(/* ... */);
       return { dueToSend, dueForReminder };
   }
   
   static expandTemplate(template, rowData, route) {
       const missingFields = [];
       const expandedText = template.replace(/\{(\w+)\}/g, (match, fieldName) => {
           // ...
       });
       return { expandedText, missingFields };
   }
   
   // AFTER: 0 VS Code errors (explicit types everywhere)
   
   /**
    * Get items due for sending/reminder
    * @param {any[]} rows - All announcement rows (FIXED: Array → any[])
    * @param {number} currentTime - Current timestamp
    * @returns {Object} Due items
    */
   static getDueItems(rows, currentTime) {
       /** @type {any[]} */  // ADDED: Explicit type
       const dueToSend = rows.filter(/* ... */);
       /** @type {any[]} */  // ADDED: Explicit type
       const dueForReminder = rows.filter(/* ... */);
       return { dueToSend, dueForReminder };
   }
   
   /**
    * Expand template placeholders with row data
    * 
    * @param {string} template - Template text with {FieldName} placeholders
    * @param {any} rowData - Row data object
    * @param {any} [route] - Optional route object
    * @returns {Object} Object with expandedText and missingFields
    */
   static expandTemplate(template, rowData, route) {
       /** @type {string[]} */  // ADDED: Explicit type
       const missingFields = [];
       const expandedText = template.replace(/\{(\w+)\}/g, 
           (/** @type {string} */ match, /** @type {string} */ fieldName) => {
               // ADDED: Lambda parameter types
               // ...
           }
       );
       return { expandedText, missingFields };
   }
   ```

11. **TypeScript Import Types in JSDoc**
   
   **Pattern**: Use `@typedef` with `import()` to reference types from `.d.ts` files in JSDoc comments.
   
   When a JavaScript file needs to reference a type from another module's `.d.ts` file:
   
   ```javascript
   // At top of file, after triple-slash references
   /**
    * @typedef {import('./Externals').Organizer} Organizer
    */
   
   // Now you can use Organizer in JSDoc
   /**
    * @param {Organizer[]} organizers - Array of organizer objects
    */
   function processOrganizers(organizers) {
       // ...
   }
   ```
   
   **Why this matters**:
   - Allows JavaScript files to reference TypeScript types without converting to TypeScript
   - Provides full type checking and IntelliSense in VS Code
   - Keeps type definitions centralized in `.d.ts` files
   - Enables cross-module type references
   
   **Common pattern for instance types**:
   ```javascript
   /**
    * @param {InstanceType<typeof Row>} row - Instance of Row class
    * @param {InstanceType<typeof SCCCCEvent>} event - Instance of SCCCCEvent class
    * @returns {InstanceType<typeof SCCCCEvent>} - New event instance
    */
   function transform(row, event) {
       // TypeScript knows row and event are instances, not classes
   }
   ```
   
   **CRITICAL: Never Use TypeScript Syntax in JavaScript Files**
   
   ❌ **WRONG - TypeScript-style inline type annotations**:
   ```javascript
   // BAD: Type annotations in destructuring (TypeScript syntax)
   .filter(({ data }: { data: any }) => {
       return data.value > 0;
   })
   ```
   
   ✅ **CORRECT - JSDoc inline type annotations**:
   ```javascript
   // GOOD: JSDoc type annotation for the parameter
   .filter((/** @type {{ data: any, rowNum: number }} */ item) => {
       return item.data.value > 0;
   })
   ```
   
   **Key Rules**:
   - ❌ Never use `: Type` syntax in JavaScript (that's TypeScript only)
   - ✅ Always use `/** @type {Type} */` or `(/** @type {Type} */ param)` in JavaScript
   - ✅ For destructured parameters, annotate the whole parameter, not the destructuring
   - ✅ Use `InstanceType<typeof ClassName>` when referring to class instances (not the class itself)
   
   **External type definitions**:
   - `Externals.d.ts` contains shared types used across modules:
     * `RWGPS` interface - Complete RWGPS API surface
     * `Organizer` interface - Ride leader/organizer data structure
     * `dates` namespace - Date utility functions
   - These types are imported where needed using `@typedef {import('./Externals').TypeName}`
   
   **Best practices**:
   - ✅ Define shared types in `Externals.d.ts` once
   - ✅ Import types using `@typedef {import(...)}` pattern
   - ✅ Use `InstanceType<typeof ClassName>` for class instances
   - ✅ Keep type definitions synchronized with actual implementations
   - ❌ Don't duplicate type definitions across files
   - ❌ Don't mix constructor types and instance types

12. **Comprehensive Type Definitions for External Dependencies**
   
   **CRITICAL**: All external library APIs MUST have complete type definitions in `Externals.d.ts`.
   
   When working with external libraries like RWGPSLib:
   
   1. **Document ALL methods used in codebase**:
      ```typescript
      interface RWGPS {
          // Single event operations
          get_event(eventUrl: string): any;
          edit_event(eventUrl: string, event: any): void;
          
          // Batch operations
          get_events(scheduledRowURLs: string[]): any[];
          edit_events(edits: { url: string; event: any }[]): Promise<any>;
          
          // Route operations
          importRoute(route: { url: string; expiry: string; tags: string[]; name?: string }): string;
          copy_template_(templateUrl: string): string;
          setRouteExpiration(routeUrl: string, expiryDate: Date, forceUpdate: boolean): void;
          
          // Organizer and RSVP operations
          getOrganizers(rideLeaders: string[] | string): Organizer[];
          getRSVPCounts(scheduledRowURLs: string[], scheduledRowLeaders: string[][]): number[];
          
          // Tag operations
          unTagEvents(eventUrls: string[], tags: string[]): void;
      }
      ```
   
   2. **Find all usages with grep**:
      ```bash
      # Search for all method calls on the object
      grep -r "rwgps\." src/ | grep -v "\.d\.ts"
      ```
   
   3. **Document parameters and return types**:
      - Use actual types when known (string, number, Date, etc.)
      - Use `any` as fallback when type is complex/unknown
      - Document object shapes with inline types `{ url: string; event: any }`
      - Add JSDoc comments explaining each method's purpose
   
   4. **Import types in consuming modules**:
      ```javascript
      // EventFactory.js
      /**
       * @typedef {import('./Externals').RWGPS} RWGPS
       * @typedef {import('./Externals').Organizer} Organizer
       */
      
      /**
       * @param {InstanceType<typeof Row>} row
       * @param {Organizer[]} organizers
       * @param {string | number} event_id
       */
      function newEvent(row, organizers, event_id) {
          // Full type checking with IntelliSense
      }
      ```
   
   **Benefits of complete external type definitions**:
   - ✅ Catch API usage errors at development time
   - ✅ IntelliSense shows available methods and parameters
   - ✅ Refactoring tools understand the API surface
   - ✅ Type checking validates all API calls
   - ✅ Documentation serves as API reference
   
   **Process for adding new external APIs**:
   1. Search codebase for all usages: `grep -r "object\." src/`
   2. Document each method in `Externals.d.ts`
   3. Add JSDoc comments with parameter descriptions
   4. Import type where used: `@typedef {import('./Externals').TypeName}`
   5. Verify no type errors: `get_errors(['src/'])` and `npm run typecheck`

13. **Ambient Declarations and Type Exports (CRITICAL)**
   
   **Pattern for GAS Global Functions**: When declaring global functions in `gas-globals.d.ts`, always export explicit types from module `.d.ts` files rather than using `typeof` on function imports.
   
   **Problem**: Using `typeof FunctionImport` as a return type
   ```typescript
   // ❌ BAD - typeof gives function type, not return type
   // Globals.d.ts
   declare function getGlobals(): Record<string, any>;
   
   // gas-globals.d.ts
   import type GlobalsType from './Globals';
   declare global {
       function getGlobals(): typeof GlobalsType; // Wrong: function type, not return type
   }
   ```
   
   **Solution**: Export explicit type and use directly
   ```typescript
   // ✅ GOOD - Export explicit type
   // Globals.d.ts
   export type GlobalsObject = Record<string, any>;
   
   declare function getGlobals(): GlobalsObject;
   
   // gas-globals.d.ts
   import type { GlobalsObject } from './Globals';
   declare global {
       function getGlobals(): GlobalsObject; // Correct: explicit type
   }
   ```
   
   **Alternative**: Use `ReturnType` utility type (less clear)
   ```typescript
   // ⚠️ ACCEPTABLE but less clear
   // gas-globals.d.ts
   import type GlobalsType from './Globals';
   declare global {
       function getGlobals(): ReturnType<typeof GlobalsType>;
   }
   ```
   
   **Key Rules**:
   - ✅ Export explicit types from module `.d.ts` files when they represent return values
   - ✅ Import and use the explicit type in ambient declarations
   - ✅ Use descriptive type names (e.g., `GlobalsObject` not just `Globals`)
   - ⚠️ Only use `ReturnType<typeof Function>` when explicit type export is not possible
   - ❌ Never use `typeof FunctionImport` directly as a return type (gives function type)
   - ❌ Don't rely on implicit type inference for ambient declarations
   
   **Benefits**:
   - Clarity: Explicit type shows what the function returns
   - Maintainability: Type can be reused and extended
   - Documentation: Type name provides semantic meaning
   - IntelliSense: Better autocomplete and type hints
   
   **Real-World Example from this codebase**:
   The `getGlobals()` function was declared with `typeof GlobalsType` (the function itself) instead of `GlobalsObject` (the return type). Fixed by:
   1. Added `export type GlobalsObject = Record<string, any>` to `Globals.d.ts`
   2. Changed import in `gas-globals.d.ts`: `import type { GlobalsObject } from './Globals'`
   3. Updated function signature: `function getGlobals(): GlobalsObject`

14. **Deployment Checklist**
   - ✅ All tests pass: `npm test`
   - ✅ **VS Code errors checked: `get_errors(['src/'])`** (MANDATORY)
   - ✅ Type check passes: `npm run typecheck`
   - ✅ No new type errors introduced
   - ✅ All `.d.ts` files updated (including `Externals.d.ts` for external APIs)
   - ✅ Type imports added where needed (`@typedef {import(...)}`)
   - ✅ Type escapes minimized and documented

**REMEMBER**: 
- **VS Code TypeScript server is MORE STRICT than tsc --noEmit**
- **ALWAYS use `get_errors` tool to check VS Code errors**
- **Complete type definitions for ALL external APIs in Externals.d.ts**
- **Use @typedef {import(...)} pattern to reference types across modules**
- **Type errors are bugs waiting to happen. Zero tolerance for type errors in `src/`**

## Fiddler Library (MANDATORY)
This repository uses the [bmPreFiddler](https://github.com/brucemcpherson/bmPreFiddler) to manage [Fiddler](https://github.com/brucemcpherson/bmFiddler) GAS spreadsheet access.

**CRITICAL Rule**: MUST use the bmPreFiddler library to access Fiddler spreadsheets instead of directly using the Fiddler library. Furthermore, ONLY use SpreadsheetApp for functionality not covered by Fiddler or bmPreFiddler (such as finding which rows were selected).

Note that `fiddler.getData()` returns a 1D array of objects representing the rows in the spreadsheet, and `fiddler.setData()` accepts a similar array to write back to the spreadsheet. This allows you to work with in-memory representations of the spreadsheet data, which is more efficient and testable. Furthermore the object keys are based on the column headers, making the code more readable.

Fiddler also supports formulas, which are preserved when reading and writing data, and are important for the Route and Ride columns since those contain hyperlinks generated by formulas.

### ScheduleAdapter
`ScheduleAdapter.js` is the GAS-specific adapter layer for the "Consolidated Rides" spreadsheet:
- Uses bmPreFiddler/Fiddler for bulk data I/O
- Converts spreadsheet rows to plain JavaScript objects with column names as keys
- Enriches row objects with `_rowNum` (1-based spreadsheet row) and `_range` metadata
- Provides selection handling via SpreadsheetApp for user interactions
- Supports filtering operations (younger rows, selected rows, last row)
- **MANDATORY pattern**: Load → Work with plain objects → Save back (batch operation)

#### Formula Preservation Strategy
The Route and Ride columns contain HYPERLINK formulas that must be preserved across read/write cycles:

**Storage Mechanism**:
- Formulas are stored in PropertiesService as JSON arrays after each save
- Properties: `rideColumnFormulas` and `routeColumnFormulas`
- Each property contains a 2D array from `Range.getFormulas()` (e.g., `[[formula1], [formula2], ...]`)

**Loading Process** (`_ensureDataLoaded()`):
1. `fiddler.getData()` loads spreadsheet data → returns **displayed values** (not formulas)
2. `_overlayFormulas()` loads stored formulas from PropertiesService
3. Formulas are overlaid onto Route and Ride column values
4. Result: data objects contain formula strings (e.g., `=HYPERLINK("url", "text")`) as values

**Why this approach**:
- Formulas are treated as string values beginning with '='
- Allows single unified data structure (no separate formula tracking)
- `HyperlinkUtils.parseHyperlinkFormula()` extracts URL/text from formula strings
- When `Row.RouteURL` is accessed, it parses the formula string to get the actual URL

**Saving Process - Cell-Level Precision**:
1. Each Row tracks dirty fields in a `Set<string>` (_dirtyFields)
2. When a field is modified, the column name is added to the dirty set
3. On save(), **only dirty cells** are written to the spreadsheet
4. Formula cells (values starting with '=') use `setFormula()`, others use `setValue()`
5. `SpreadsheetApp.flush()` ensures writes are committed
6. `_storeFormulas()` reads and stores current formulas in PropertiesService
7. Cache cleared to force reload on next operation

**Why Cell-Level Writes Are Critical**:
- **Version History**: Writing entire rows makes change tracking meaningless
- **Precision**: Only modified cells appear in revision history
- **Collaboration**: Reduces conflicts when multiple users work on different columns
- By writing only dirty cells, version history shows exactly what changed and when

**Critical**: Always load formulas after reading data. Row objects expect formula strings in Route/Ride columns, not displayed values.

**CRITICAL Rule**: When working with ScheduleAdapter or Row objects, you MUST follow the cell-level write pattern. NEVER write entire rows when only specific cells have changed. This preserves meaningful version history and prevents collaboration conflicts.

## RWGPS Library
This repository uses the [RWGPSLib(https://github.com/TobyHFerguson/RWGPSLib) to manage RideWithGPS API access.

## Google Calendar Integration
This repository uses the Google Calendar API to create and manage calendar events corresponding to scheduled rides.

## Code Generation Guidelines

### MANDATORY: When modifying legacy mixed modules:
- If you touch `ProcessingManager.js` or `UserLogger.js`, you MUST extract business logic
- Create `*Core.js` module with pure JavaScript and 100% test coverage
- Leave only GAS API calls in the original file
- Do NOT add more business logic to mixed modules

### When suggesting refactorings:
- Identify whether code is GAS-dependent or could be pure JavaScript
- Suggest extracting GAS dependencies to make code testable in Jest
- Maintain the conditional import/export pattern for compatibility
- Consider using adapter pattern to isolate GAS APIs (especially for Schedule/Row)
- **ALWAYS create `*Core.js` modules for business logic with 100% test coverage**

### When adding new features:
1. **Start with pure JavaScript core** - Write business logic in `*Core.js` module
2. **Write comprehensive tests** - Achieve 100% coverage before creating GAS adapter
3. **Create thin GAS adapter** - Minimal wrapper that only handles GAS APIs
4. **Document separation** - Add comments explaining Core vs Adapter split
5. Add validation to `rowCheck.js` rather than inline in commands
6. Follow the Command pattern for new menu operations

**CRITICAL**: Steps 1-3 are MANDATORY and MUST be completed in order. Do NOT skip test writing. Do NOT create mixed modules.

### Architecture Checklist for New Code
Before creating any new functionality, verify:
- ✅ Business logic in pure JavaScript module (`*Core.js`)
- ✅ 100% Jest test coverage for pure JavaScript
- ✅ GAS code only in thin adapter layer
- ✅ Dependencies injected, not hardcoded
- ✅ Tests run successfully: `npm test -- --coverage`
- ✅ Module exported in `Exports.js`
- ✅ Follows conditional import/export pattern

### Example: Correct Architecture Pattern
```javascript
// ✅ RetryQueueCore.js - Pure JavaScript, fully tested
class RetryQueueCore {
    static calculateNextRetry(attemptCount, enqueuedAt, currentTime) {
        // Pure logic, no GAS dependencies
        const ageHours = (currentTime - enqueuedAt) / (60 * 60 * 1000);
        if (ageHours >= 48) return null;
        return currentTime + (ageHours < 1 ? 5 * 60 * 1000 : 60 * 60 * 1000);
    }
}

// ✅ RetryQueue.js - Thin GAS adapter
class RetryQueue {
    processQueue() {
        const queue = this._getQueue(); // GAS: PropertiesService
        const now = new Date().getTime(); // GAS: Date
        
        // Use core logic
        const dueItems = RetryQueueCore.getDueItems(queue, now);
        
        // GAS-specific execution
        dueItems.forEach(item => {
            const result = this._executeOperation(item); // GAS: CalendarApp
            if (!result.success) {
                const update = RetryQueueCore.updateAfterFailure(item, result.error, now);
                // Handle update with GAS persistence
            }
        });
    }
}
```

### Anti-Patterns to Avoid
❌ **Business logic in GAS modules**
```javascript
// BAD - calculation logic in GAS module
class RetryQueue {
    _calculateNextRetry(attemptCount, enqueuedAt) {
        const now = new Date().getTime(); // Can't test this!
        // ... complex logic mixed with GAS APIs
    }
}
```

❌ **Hardcoded GAS dependencies**
```javascript
// BAD - can't test without GAS
function createItem(operation) {
    return {
        id: Utilities.getUuid(), // Hardcoded GAS dependency
        ...operation
    };
}
```

❌ **No test coverage**
```javascript
// BAD - no tests = broken code waiting to happen
class NewFeature {
    complexLogic() {
        // Lots of untested code
    }
}
```

## CRITICAL: Code Modification Workflow

**MANDATORY: Every code change MUST follow this checklist**

When modifying ANY code file, you MUST update all related artifacts:

### 1. Update Tests (MANDATORY for Pure JavaScript)
- ✅ Add/update Jest tests for modified functionality
- ✅ Verify 100% coverage: `npm test -- --coverage --collectCoverageFrom='src/YourModule.js'`
- ✅ All tests must pass: `npm test`
- ❌ NEVER skip test updates - untested code is broken code

### 2. Update TypeScript Declarations (MANDATORY)
- ✅ Update corresponding `.d.ts` file for any modified JavaScript module
- ✅ Add JSDoc comments to functions for better type inference
- ✅ Verify types: `npm run typecheck`
- ❌ NEVER deploy without type correctness

### 3. Update Documentation (MANDATORY for User-Facing Changes)
- ✅ Update relevant files in `docs/` folder if behavior changes
- ✅ Update copilot-instructions.md if architectural patterns change
- ✅ Update README.md if setup/deployment changes
- ❌ NEVER leave documentation inconsistent with code

### 4. Deployment Verification (MANDATORY)
- ✅ Run full validation: `npm run typecheck; npm run validate-exports; clasp-wrapper.sh push`
- ✅ Verify deployment success
- ✅ Test in GAS environment (manual testing of critical paths)
- ❌ NEVER assume deployment worked without verification

**Example Workflow for Adding Trigger Cleanup:**
```
1. ✅ Modify triggers.js (add cleanup calls)
2. ✅ Update triggers.d.ts (add JSDoc, verify signatures)
3. ✅ Update TriggerManagerCore.test.js (if logic changed)
4. ✅ Update docs/Announcement-OperatorManual.md (trigger lifecycle)
5. ✅ Run npm test -- verify all pass
6. ✅ Run npm run typecheck -- verify no errors
7. ✅ Deploy: npm run dev:push
8. ✅ Test in spreadsheet: verify triggers clean up
```

**If you skip ANY step:**
- Tests may be incomplete (hidden bugs)
- Types may be wrong (TypeScript errors)
- Documentation may be outdated (user confusion)
- Deployment may fail (wasted time)

**REMEMBER**: "I'll just do this quick fix" → Technical debt → Hours debugging later

**ALWAYS ask yourself**: "Did I update tests, types, and docs?" before calling work complete.



