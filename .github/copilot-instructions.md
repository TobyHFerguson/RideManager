# Copilot Instructions

## Quick Start (READ THIS FIRST)

**AUDIENCE**: These instructions apply to:
- **Chat Assistants** (like GitHub Copilot Chat) - have access to `get_errors` tool
- **Autonomous Coding Agents** (create PRs automatically) - do NOT have `get_errors` tool

**KEY DIFFERENCE**:
- **Chat Assistants**: Can see VS Code errors via `get_errors` tool → MUST use it after every change
- **Autonomous Agents**: Cannot see VS Code errors → MUST create `.d.ts` files FIRST, run `npm run typecheck` after every change

**CRITICAL Pre-Deployment Checks** (MANDATORY before EVERY code change):
```bash
npm test && npm run typecheck && npm run validate-exports
```

**MANDATORY After EVERY Code Modification**:

**FOR CHAT ASSISTANTS** (have `get_errors` tool):
1. ✅ Use `get_errors` tool to check VS Code reports ZERO problems
2. ✅ If errors exist, FIX THEM before proceeding
3. ✅ NEVER leave code with VS Code errors - they indicate bugs

**FOR AUTONOMOUS CODING AGENTS** (no `get_errors` tool):
1. ✅ Run `npm run typecheck` after EVERY code change (ZERO errors required)
2. ✅ Run `npm test` to verify tests pass
3. ✅ Create `.d.ts` files FIRST before implementing new modules
4. ✅ NEVER reference non-existent methods - verify method exists in `.d.ts` before calling
5. ✅ Add proper JSDoc types to ALL function parameters (no implicit `any`)

**Key Workflow Commands**:
- `npm run dev:push` - Deploy to dev environment (with debug version)
- `npm run prod:push` - Deploy to prod (requires clean git)
- `npm test -- --coverage` - Full test coverage report
- `npm run typecheck` - TypeScript validation (must be ZERO errors)
- `npm run validate-exports` - Verify module loading order

**Golden Rules**:
1. ✅ **ALL** business logic in `*Core.js` modules (pure JavaScript, 100% tested)
2. ✅ GAS APIs ONLY in thin adapter modules (minimal logic)
3. ✅ NEVER mix business logic with GAS API calls
4. ✅ Update tests, types (`.d.ts`), and docs with EVERY code change
5. ✅ Add new modules to `Exports.js` or GAS won't find them
6. ✅ **MANDATORY**: Verify ZERO type errors (chat: use `get_errors` tool; agents: run `npm run typecheck`)
7. ✅ **ZERO TOLERANCE**: NEVER use `@param {any}` - use proper types to catch errors at compile-time, not runtime
8. ✅ **CREATE TYPES FIRST**: Always create `.d.ts` files BEFORE writing implementation code

**Architecture Pattern**:
```javascript
// ✅ CORRECT: Pure logic + tested (CLASS with static methods)
class AnnouncementCore {
    static calculateSendTime(rideDate) { 
        // Pure logic - fully testable
        return new Date(rideDate.getTime() - 2 * 24 * 60 * 60 * 1000);
    }
    
    static expandTemplate(template, rowData) {
        // Call other static methods directly
        const enriched = AnnouncementCore.enrichRowData(rowData);
        return template.replace(/\{(\w+)\}/g, (match, field) => enriched[field] || match);
    }
    
    static enrichRowData(rowData) {
        // Helper method
        return { ...rowData, DateTime: new Date(rowData.Date).toISOString() };
    }
}

// ✅ CORRECT: Thin GAS adapter (CLASS with instance methods)
class AnnouncementManager {
    sendAnnouncement(row, route) {
        // Use Core class static methods
        const sendTime = AnnouncementCore.calculateSendTime(row.Date);
        const body = AnnouncementCore.expandTemplate(template, row);
        // Only GAS API calls here
        GmailApp.sendEmail(/* ... */);
    }
}
```

**If you violate these rules**, code will be rejected or break in production.

## CRITICAL: Type Safety - Zero Tolerance for `{any}`

**MANDATORY RULE**: NEVER use `@param {any}` in function signatures. Proper types prevent runtime errors by catching them at development time.

**Real Production Error Prevented by Proper Types**:
```javascript
// ❌ With @param {any} - No error until production runtime
/** @param {any} row */
function importRow_(row, rwgps) {
    row.linkRouteURL();  // ✅ TypeScript allows this
    // 💥 Runtime Error: "row.linkRouteURL is not a function"
}

// ✅ With proper types - Error caught immediately in VS Code
/** @param {RowCoreInstance} row */
function importRow_(row, rwgps) {
    row.linkRouteURL();  // ❌ TypeScript Error: Property 'linkRouteURL' does not exist
}
```

**Type Replacement Guide**:

| ❌ NEVER Use | ✅ ALWAYS Use | Example |
|-------------|--------------|---------|
| `@param {any} row` | `@param {RowCoreInstance} row` | Single row parameter |
| `@param {any} rows` | `@param {RowCoreInstance[]} rows` | Array of rows |
| `@param {any} rwgps` | `@param {RWGPS} rwgps` | RWGPS API interface |
| `@param {any} route` | `@param {{first_lat: number, first_lng: number}} route` | Object with known shape |
| `@param {any} data` | `@param {any} data` + justification comment | ONLY when truly arbitrary |

**Required Typedef Setup**:
```javascript
// At top of file (after triple-slash references)
/**
 * @typedef {InstanceType<typeof RowCore>} RowCoreInstance
 * @typedef {import('./Externals').RWGPS} RWGPS
 */
```

**Verification Workflow** (MANDATORY for every file you modify):

**FOR CHAT ASSISTANTS** (have `get_errors` tool):
```bash
# 1. Check VS Code errors (MOST IMPORTANT - catches more than tsc)
get_errors(['src/YourFile.js'])  # MUST show ZERO errors

# 2. Run typecheck
npm run typecheck

# 3. Test type safety works
# Temporarily add: row.nonExistentMethod()
# Verify: TypeScript shows error
# Remove: Test line after verification
```

**FOR AUTONOMOUS CODING AGENTS** (no `get_errors` tool):
```bash
# 1. FIRST: Create .d.ts file with ALL method signatures
# Example: src/ValidationCore.d.ts must declare validateForScheduling()

# 2. Run typecheck (catches most errors)
npm run typecheck  # MUST show ZERO errors

# 3. Run tests
npm test

# 4. Verify method exists before calling
# Check .d.ts file: Does ValidationCore.validateForScheduling exist?
# If not, ADD IT TO .d.ts before calling it in code
```

**Exception**: Only use `{any}` when:
1. The parameter is truly arbitrary user data with no expected structure
2. You add a comment justifying why `{any}` is required
3. Example: `/** @param {any} additionalData - Arbitrary user data (structure not constrained) */`

**Benefits of Proper Types**:
- ✅ Catch typos and non-existent methods at compile-time
- ✅ IntelliSense shows available properties/methods
- ✅ Refactoring is safe with type validation
- ✅ Self-documenting code
- ✅ Prevents entire class of runtime errors

See GitHub Issue: "Enforce Strict Type Checking System-Wide" for complete audit and remediation plan.

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
  - `RouteColumnEditor.js` - Route URL/formula parsing and manipulation
  - `AnnouncementCore.js` - Announcement scheduling and template expansion
  - `TriggerManagerCore.js` - Trigger management logic (configuration, validation, scheduling decisions)
  - `HyperlinkUtils.js` - Hyperlink formula parsing
  - Dates submodule

- **GAS-dependent modules** (thin wrappers around pure JavaScript, minimal logic):
  - `ScheduleAdapter.js` - Spreadsheet I/O adapter using Fiddler
  - `RideManager.js` - RWGPS and Calendar integration
  - `UIManager.js` - User interface dialogs
  - `MenuFunctions.js` - Menu handlers
  - `triggers.js` - GAS event handlers (onOpen, onEdit, scheduled triggers)
  - `TriggerManager.js` - GAS orchestrator for TriggerManagerCore (ScriptApp operations)
  - `AnnouncementManager.js` - GAS adapter for AnnouncementCore (Gmail, SpreadsheetApp)
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
2. **Write pure JavaScript core logic** in `*Core.js` module (e.g., `RWGPSMembersCore.js`)
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

**Rule 4.5: MANDATORY Class Pattern for All New Code**
- **ALL new modules MUST use class pattern with static methods**
- **NEVER create new namespace pattern modules** (IIFE returning object)
- Namespace pattern creates TypeScript blind spots requiring `@ts-expect-error` suppressions
- `@ts-expect-error` suppresses ALL errors on line, not just namespace resolution (hides real bugs)

```javascript
// ✅ CORRECT: Class pattern with static methods
class ValidationCore {
    static validateForScheduling(rows, options) {
        // Call other static methods
        const error = ValidationCore.isUnmanagedRide(row, options.managedEventName);
        return result;
    }
    
    static isUnmanagedRide(row, managedEventName) {
        // Helper method
    }
}

if (typeof module !== 'undefined') {
    module.exports = ValidationCore;
}

// ❌ WRONG: Namespace pattern (DEPRECATED - creates type safety blind spots)
var ValidationCore = (function() {
    const ValidationCore = {
        validateForScheduling(rows, options) {
            // TypeScript can't resolve this.isUnmanagedRide through module imports
            const error = this.isUnmanagedRide(row, options.managedEventName);
        },
        isUnmanagedRide(row, managedEventName) { }
    };
    return ValidationCore;
})();
```

**Why Class Pattern is Mandatory**:
- TypeScript correctly resolves static method calls (no `@ts-expect-error` needed)
- Full type checking enabled (catches missing parameters, wrong types)
- No blind spots - all errors visible at development time
- Better tooling support (IntelliSense, refactoring)
- Production bugs caught before deployment

**Converting Existing Namespace Modules**:
See GitHub Issue #XXX for tracking conversion of legacy modules (RideManagerCore, AnnouncementCore, TriggerManagerCore, etc.)

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

#### Announcement System (Major Feature)
**AnnouncementCore.js** (Pure JavaScript, 100% tested):
- Send time calculations (6 PM, 2 days before ride)
- Queue item creation and management
- Template expansion logic (replaces {FieldName} placeholders)
- Exponential backoff retry logic for failed sends
- Status transitions and validation
- Statistics calculations

**CRITICAL: Timezone Handling**:
- **Implementation uses LOCAL timezone**: All date calculations in `AnnouncementCore.js` use JavaScript's native Date object, which operates in the local timezone of the execution environment
- **In Google Apps Script**: Local timezone = `Session.getScriptTimeZone()` (configured in GAS project settings, typically 'America/Los_Angeles')
- **In Jest tests**: Local timezone = system timezone where tests run (e.g., developer's machine timezone)
- **Test Date Format**: Tests MUST use local time format (no 'Z' suffix) to match implementation behavior:
  - ✅ CORRECT: `new Date('2025-12-05T18:00:00')` - Local 6 PM
  - ❌ WRONG: `new Date('2025-12-05T18:00:00Z')` - UTC 6 PM (may be different local time depending on timezone)
- **Why this matters**: Using UTC dates in tests (with 'Z') causes timezone-dependent failures. A UTC date `2025-12-05T18:00:00Z` is interpreted as `2025-12-05 10:00 PST` in Pacific timezone, causing 8-hour offset in assertions.
- **Future enhancement**: The `timezone` parameter exists in function signatures but is currently unused. Full timezone support would require either:
  1. External library (e.g., moment-timezone) - adds dependency
  2. Manual UTC offset calculations - error-prone
  3. Intl.DateTimeFormat API - complex, browser-dependent

**AnnouncementManager.js** (GAS adapter):
- Gmail integration for sending announcements
- Google Doc template rendering
- Spreadsheet persistence for announcement queue
- Trigger scheduling for timed sends

**Key Concepts**:
- **Announcement Queue**: Spreadsheet-based (not PropertiesService) for operator visibility
- **Template Expansion**: Google Docs with {FieldName} placeholders → expanded with row data
- **Timed Sends**: Scheduled triggers fire at exact send time (with backstop at 2 AM daily)
- **Status Flow**: pending → sending → sent | failed (with retry logic)
- **Cancellation Handling**: Special logic for cancelled rides (sends cancellation email if announcement already sent)

**Documentation**:
- Operator Manual: `docs/Announcement-OperatorManual.md`
- Ride Scheduler Guide: `docs/Announcement-RideSchedulerGuide.md`
- Release Notes: `docs/Announcement-ReleaseNotes.md`

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
5. **Daily RWGPS Members Sync** - Backstop (runs 2 AM daily)
6. **Announcement Scheduled** - Dynamic (fires at announcement send time)

**Installation**:
- Owner-only via menu: "Ride Schedulers > Install Triggers"
- Idempotent: Safe to run multiple times
- All operations logged to User Activity Log
- **CRITICAL**: ALL triggers MUST be installed via `TriggerManager.installAllTriggers()` unless there is a clear architectural or operational reason they cannot be (e.g., external system requirements, user-specific triggers)

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

**CRITICAL: Date and Timezone Handling in Tests**:
- **Use LOCAL time format in test dates** (no 'Z' suffix for UTC)
- Implementation uses JavaScript Date in local timezone (not UTC)
- ✅ CORRECT: `new Date('2025-12-05T18:00:00')` - Interpreted as 6 PM in local timezone
- ❌ WRONG: `new Date('2025-12-05T18:00:00Z')` - Interpreted as UTC, creates timezone-dependent failures
- **Why**: A UTC date like '2025-12-05T18:00:00Z' becomes '2025-12-05 10:00' in PST (8-hour offset), causing test failures when comparing to local 6 PM
- **Applies to**: AnnouncementCore tests, TriggerManager tests, any date/time calculations

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

## Development Workflow (CRITICAL)

### Essential Commands

**Testing & Validation (MANDATORY before every deployment)**:
```bash
# Run all tests
npm test

# Run tests with full coverage report
npm test -- --coverage

# Run specific test file
npm test -- test/__tests__/ModuleName.test.js

# Type check (ZERO errors required)
npm run typecheck

# Validate all modules in Exports.js are defined
npm run validate-exports

# Full pre-deployment validation
npm run typecheck && npm run validate-exports && npm test
```

**Deployment Workflows**:
```bash
# Development deployment (with debug version)
npm run dev:push
# This runs: validate-exports → typecheck → set dev env → create debug Version.js → push to GAS

# Production deployment (requires clean git)
npm run prod:push  
# This runs: validate-exports → typecheck → verify clean git → create prod Version.js → push to GAS

# Pull from GAS (development)
npm run dev:pull

# Pull from GAS (production, requires clean git)
npm run prod:pull

# Direct clasp commands (uses clasp-wrapper.sh for credential swapping)
npm run clasp:push    # Push to current environment
npm run clasp:pull    # Pull from current environment
npm run clasp:status  # Check file sync status
npm run clasp:open    # Open project in GAS web editor
```

**Key Scripts Explained**:
- **`clasp-wrapper.sh`**: Temporarily swaps GAS credentials from `.clasp-credentials.json` to `~/.clasprc.json` for project-specific authentication. All `clasp:*` and deployment commands use this wrapper.
- **`validate-exports`**: Verifies all modules referenced in `Exports.js` are defined (catches loading order issues before GAS deployment)
- **`prepare-debug-version`**: Creates `Version.js` with current git commit hash for debugging
- **`prepare-prod-version`**: Creates `Version.js` with committed version (enforces clean git state)

### Module Addition Checklist

When adding a new module to the codebase:

1. **Create the module** following naming conventions:
   - Pure JavaScript logic: `ModuleNameCore.js`
   - GAS adapter: `ModuleName.js`
   - Type definitions: `ModuleName.d.ts` (for both)

2. **Write comprehensive tests** (Core modules ONLY):
   - Create `test/__tests__/ModuleNameCore.test.js`
   - Achieve 100% coverage
   - Run: `npm test -- --coverage --collectCoverageFrom='src/ModuleNameCore.js'`

3. **Add to Exports.js** (CRITICAL - prevents loading order issues):
   ```javascript
   // Add getter for your module
   get ModuleName() {
       return ModuleName;
   }
   ```
   - Property name MUST match the variable name in the source file
   - Run `npm run validate-exports` to verify

4. **Update gas-globals.d.ts** if module exposes global functions/classes:
   ```typescript
   declare global {
       const ModuleName: typeof ModuleNameClass;
       function globalFunction(): ReturnType;
   }
   ```

5. **Verify deployment**:
   ```bash
   npm run typecheck          # Zero errors required
   npm run validate-exports   # Verify module is accessible
   npm run dev:push          # Deploy to dev environment
   ```

### Debugging Workflow

**Local Debugging (Pure JavaScript modules)**:
```bash
# Run specific test with watch mode
npm test -- --watch test/__tests__/ModuleName.test.js

# Debug test in Node.js
node --inspect-brk node_modules/.bin/jest test/__tests__/ModuleName.test.js

# Check test coverage for specific file
npm test -- --coverage --collectCoverageFrom='src/ModuleName.js'
```

**GAS Debugging**:
1. Deploy with debug version: `npm run dev:push`
2. Open in GAS editor: `npm run clasp:open`
3. Use `console.log()` and view logs in GAS execution logs
4. Check version in spreadsheet: Menu > "Ride Schedulers" > "Show Version"
5. Check User Activity Log for operation history

**Common Issues**:
- **"Module not found" in GAS**: Run `npm run validate-exports` to check module is in Exports.js
- **Loading order issues**: Ensure module uses `Exports.ModuleName` for cross-module access
- **Type errors**: Run `npm run typecheck` and check `gas-globals.d.ts` for missing declarations
- **Failed deployment**: Check `.clasp-credentials.json` exists and is valid

### Architecture Validation

**Before committing code, verify**:

**FOR CHAT ASSISTANTS** (have `get_errors` tool):
```bash
# 0. VS Code errors (MANDATORY FIRST STEP)
get_errors(['src/'])  # Must show ZERO errors

# 1. All tests pass
npm test

# 2. Type checking passes
npm run typecheck

# 3. All modules exported
npm run validate-exports

# 4. Coverage meets requirements (pure JS modules)
npm test -- --coverage

# 5. Verify class pattern (no new namespace modules)
grep -r "^var .*= (function()" src/*.js  # Should return NOTHING

# One-liner validation:
npm test && npm run typecheck && npm run validate-exports
```

**FOR AUTONOMOUS CODING AGENTS** (no `get_errors` tool):
```bash
# 1. Type checking (MANDATORY FIRST STEP - catches method existence errors)
npm run typecheck  # Must show ZERO errors

# 2. All tests pass
npm test

# 3. All modules exported
npm run validate-exports

# 4. Coverage meets requirements (pure JS modules)
npm test -- --coverage

# One-liner validation:
npm run typecheck && npm test && npm run validate-exports
```

**CRITICAL**: The `get_errors` tool check is MANDATORY for chat assistants and must be done FIRST.
VS Code's TypeScript language server catches errors that `tsc --noEmit` may miss.
Autonomous agents MUST run `npm run typecheck` after EVERY code change.
npm test -- --coverage

# One-liner validation:
npm test && npm run typecheck && npm run validate-exports
```

**CRITICAL**: The `get_errors` tool check is MANDATORY for chat assistants and must be done FIRST.
VS Code's TypeScript language server catches errors that `tsc --noEmit` may miss.
Autonomous agents MUST run `npm run typecheck` after EVERY code change.

**Red Flags** (indicates architecture violation):
- ❌ GAS API calls in `*Core.js` files (should be pure JavaScript)
- ❌ Business logic in adapter files (should delegate to Core)
- ❌ Mixing data transformation with SpreadsheetApp calls (separate in Core + Adapter)
- ❌ Hardcoded GAS dependencies (use dependency injection)
- ❌ Tests missing or <100% coverage for Core modules
- ❌ **NEW namespace pattern modules** (use class pattern instead)
- ❌ Pattern: `var ModuleName = (function() { return { ... }; })()` (DEPRECATED)
- ❌ Using `@ts-expect-error` to hide TypeScript errors (fix root cause with class pattern)

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
   
   **FOR CHAT ASSISTANTS**: VS Code TypeScript server is MORE STRICT than `tsc --noEmit`
   
   The VS Code TypeScript language server catches implicit type errors that the command-line TypeScript compiler (`tsc --noEmit`) does NOT catch. This means:
   
   - ✅ **ALWAYS check VS Code errors** using the `get_errors` tool
   - ❌ **NEVER assume `npm run typecheck` passing means no type errors**
   - 🔍 **VS Code catches**: Implicit `any` types, generic types without parameters, implicit `any[]` arrays
   - ⚠️ **tsc --noEmit allows**: Many implicit types that VS Code flags as errors
   
   **FOR AUTONOMOUS CODING AGENTS**: You cannot use `get_errors` tool
   
   Since you don't have access to VS Code's TypeScript server, you MUST:
   
   - ✅ **Create `.d.ts` files FIRST** with all method signatures before implementation
   - ✅ **Run `npm run typecheck` after EVERY code change** (catches most errors)
   - ✅ **Add explicit JSDoc types** to ALL function parameters (no implicit `any`)
   - ✅ **Verify methods exist in `.d.ts`** before calling them in code
   - ❌ **NEVER call non-existent methods** - this is the #1 error agents make
   
   **How to Find VS Code Errors (Chat Assistants Only)**:
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

14. **Namespace Pattern TypeScript Limitations (CRITICAL)**
   
   **Problem**: When a JavaScript module exports a namespace object (not a class), TypeScript's module resolution conflicts with the namespace pattern, causing false "Property does not exist" errors even though the methods exist and work at runtime.
   
   **Example - RideManagerCore**:
   ```javascript
   // RideManagerCore.js - Exports namespace object
   var RideManagerCore = (function() {
       function extractEventID(eventUrl) { /* ... */ }
       function prepareRouteImport(rowData, globals) { /* ... */ }
       return {
           extractEventID,
           prepareRouteImport
       };
   })();
   
   if (typeof module !== 'undefined') {
       module.exports = RideManagerCore;
   }
   ```
   
   ```typescript
   // RideManagerCore.d.ts - Declares namespace
   declare namespace RideManagerCore {
       function extractEventID(eventUrl: string): string;
       function prepareRouteImport(rowData: any, globals: any): any;
   }
   export default RideManagerCore;
   ```
   
   **Symptom**: When importing in another module:
   ```javascript
   // RideManager.js
   if (typeof require !== 'undefined') {
       var RideManagerCore = require('./RideManagerCore');
   }
   
   // This works at runtime but TypeScript shows error:
   RideManagerCore.extractEventID(url);
   // Error: Property 'extractEventID' does not exist on type 'typeof import(...)/RideManagerCore'
   ```
   
   **Why This Happens**:
   - TypeScript sees the **module export type** (typeof import), not the namespace type
   - The triple-slash reference to gas-globals.d.ts declares it as a global, but VS Code's resolution prioritizes the require import
   - This is a known TypeScript limitation with namespace+module patterns
   
   **Solution Pattern**:
   Since the methods DO exist and work correctly at runtime (verified by tests), suppress the false positive errors with explanatory comments:
   
   ```javascript
   /**
    * @param {string} event_url
    */
   function _extractEventID(event_url) {
       // NOTE: extractEventID exists in RideManagerCore (see RideManagerCore.js:18, test coverage: 100%)
       // TypeScript error is false positive due to namespace export pattern
       // @ts-expect-error - TypeScript can't resolve namespace methods through module imports
       return RideManagerCore.extractEventID(event_url);
   }
   ```
   
   **When to Use This Pattern**:
   - ✅ Methods exist in the source file and have test coverage
   - ✅ Code works correctly at runtime in GAS
   - ✅ TypeScript errors are "Property does not exist on type 'typeof import(...)'"
   - ✅ Module uses namespace pattern (not class pattern)
   - ❌ Don't use for actual missing methods or API calls
   - ❌ Don't use if method names are misspelled
   
   **CRITICAL LIMITATION - Type Safety Blind Spot**:
   
   ⚠️ **`@ts-expect-error` suppresses ALL errors on that line, not just the namespace resolution error.**
   
   This means legitimate type errors (wrong parameter count, wrong types, etc.) will also be hidden:
   
   ```javascript
   // @ts-expect-error - TypeScript can't resolve namespace methods through module imports
   UIHelper.promptForCancellationReason();  // Missing required parameter - NOT CAUGHT!
   
   // @ts-expect-error - TypeScript can't resolve namespace methods through module imports  
   ValidationCore.validateForScheduling(rows, "wrong type");  // Wrong type - NOT CAUGHT!
   ```
   
   **Production Impact**: This blind spot allowed a runtime error to reach production (TypeError: Cannot read properties of undefined).
   
   **Mitigation Strategies**:
   1. ✅ **100% Test Coverage MANDATORY** - Tests are the only safety net
   2. ✅ **Verify parameter counts** - Manually check calls match `.d.ts` signatures
   3. ✅ **Code review carefully** - Human review catches what TypeScript can't
   4. ✅ **Prefer class pattern** - Convert namespace modules to classes when refactoring
   5. ✅ **Document thoroughly** - Add comments about expected parameters
   
   **Why This Happens**:
   - TypeScript's `@ts-expect-error` suppresses ALL errors on the line
   - There's no way to suppress only specific errors in JSDoc
   - The namespace pattern forces us to accept this trade-off
   
   **Long-Term Solution**:
   Convert namespace modules to classes with static methods:
   ```javascript
   // Instead of namespace object
   var UIHelper = {
       promptForCancellationReason: function(row) { }
   };
   
   // Use class with static methods
   class UIHelper {
       static promptForCancellationReason(row) { }
   }
   ```
   This eliminates the need for `@ts-expect-error` and restores full type checking.
   
   **Verification Checklist**:
   1. **Confirm method exists**: Check source file (`RideManagerCore.js`) for the method
   2. **Verify test coverage**: Run `npm test -- --coverage --collectCoverageFrom='src/ModuleCore.js'`
   3. **Check runtime behavior**: Deploy to GAS and verify method works
   4. **Document in comment**: Reference source line number and test coverage
   5. **Use specific error comment**: `@ts-expect-error - TypeScript can't resolve namespace methods through module imports`
   6. **⚠️ MANUALLY VERIFY**: Parameter count and types match `.d.ts` signature
   
   **Alternative Solution (Recommended for New Code)**:
   Use class pattern with static methods instead of namespace objects. This maintains GAS compatibility while enabling full type checking.
   
   **Examples in Codebase**:
   - `RideManagerCore` - 7 methods with namespace pattern (PR #179)
   - All methods exist, have 100% test coverage (32 tests)
   - TypeScript shows 9 false positive errors
   - All suppressed with `@ts-expect-error` + explanatory comments
   - ⚠️ WARNING: Parameter errors on these lines will NOT be caught by TypeScript

15. **Deployment Checklist**
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

## Namespace vs Class in .d.ts Files (CRITICAL TypeScript Pattern)

**Problem**: When a JavaScript module exports an object with static-like methods (namespace pattern), the `.d.ts` file must use `declare namespace`, NOT `declare class`.

**JavaScript Implementation** (exports namespace object):
```javascript
// AnnouncementCore.js
var AnnouncementCore = {
    calculateSendTime: function(rideDate, timezone) { /* ... */ },
    expandTemplate: function(template, rowData, route) { /* ... */ },
    getDueItems: function(rows, currentTime) { /* ... */ }
};

if (typeof module !== 'undefined') {
    module.exports = AnnouncementCore;
}
```

**Type Definition Patterns**:

```typescript
// ❌ WRONG - Using 'declare class' for namespace object
declare class AnnouncementCore {
    static calculateSendTime(rideDate: Date | string, timezone: string): Date;
    static expandTemplate(template: string, rowData: any, route?: any): any;
}
export default AnnouncementCore;
```

**Why this is wrong**:
- TypeScript sees `AnnouncementCore` as a class constructor, not a namespace
- When imported in gas-globals.d.ts as `const AnnouncementCore: typeof AnnouncementCoreClass`, VS Code resolves `AnnouncementCore.method()` calls to the module import type, not the global variable
- Result: "Property 'method' does not exist on type 'typeof import(...)/AnnouncementCore')"

```typescript
// ✅ CORRECT - Using 'declare namespace' for namespace object
declare namespace AnnouncementCore {
    function calculateSendTime(rideDate: Date | string, timezone: string): Date;
    function expandTemplate(template: string, rowData: any, route?: any): any;
}
export default AnnouncementCore;
```

**Why this works**:
- Matches the actual JavaScript structure (object with functions, not class with static methods)
- When imported in gas-globals.d.ts as `const AnnouncementCore: typeof AnnouncementCore`, TypeScript correctly resolves method calls
- No conflict between module import types and global GAS variables

**gas-globals.d.ts Pattern**:
```typescript
// Import the namespace type
import type AnnouncementCore from './AnnouncementCore';

declare global {
    // Declare as global constant with the namespace type
    const AnnouncementCore: typeof AnnouncementCore;
}
```

**Key Rules**:
- ✅ Use `declare namespace` when JS exports an object with functions
- ✅ Use `function methodName()` inside namespace (not `static methodName()`)
- ✅ Use `declare class` when JS exports an actual class constructor
- ✅ Use `static methodName()` inside class for class static methods
- ✅ Match `.d.ts` structure to actual JS export structure
- ❌ Don't use `class` for namespace objects - causes "module import type" resolution issues

**Real-World Example**:
- AnnouncementCore.js exports namespace object → AnnouncementCore.d.ts uses `declare namespace`
- TriggerManager.js exports class constructor → TriggerManager.d.ts uses `declare class`
- Row.js exports class constructor → Row.d.ts uses `declare class`

**Debugging Tip**:
If you see errors like "Property 'X' does not exist on type 'typeof import(...)/ModuleName'", check:
1. Is the `.d.ts` using `declare class` when it should be `declare namespace`?
2. Is gas-globals.d.ts using the right import and declaration pattern?
3. Does the JavaScript export structure match the TypeScript declaration?

## CRITICAL: Code Modification Workflow

**MANDATORY: Every code change MUST follow this checklist**

When modifying ANY code file, you MUST update all related artifacts:

### 0. Verify Zero Type Errors (MANDATORY AFTER EVERY EDIT)

**FOR CHAT ASSISTANTS** (have `get_errors` tool):
- ✅ **IMMEDIATELY** after modifying ANY file, run `get_errors` tool
- ✅ Target the specific file or directory: `get_errors(['src/YourFile.js'])`
- ✅ Fix ALL errors before proceeding to next change
- ✅ If you see type errors about missing properties, update the `.d.ts` file
- ✅ If you see "is of type 'unknown'" errors, add type guards in catch blocks
- ❌ NEVER proceed with work when VS Code shows errors
- ❌ NEVER say "I'll fix the errors later" - fix them NOW

**FOR AUTONOMOUS CODING AGENTS** (no `get_errors` tool):
- ✅ **IMMEDIATELY** after modifying ANY file, run `npm run typecheck`
- ✅ Fix ALL errors before proceeding to next change
- ✅ If you see "Property does not exist" errors, ADD THE METHOD to the `.d.ts` file
- ✅ If you see implicit `any` errors, add explicit JSDoc types
- ❌ NEVER proceed with work when typecheck shows errors
- ❌ NEVER reference methods that don't exist in `.d.ts` files

**Why This Matters**:
- VS Code TypeScript server catches errors `tsc --noEmit` misses (chat assistants)
- `npm run typecheck` catches most errors (autonomous agents)
- Type errors indicate runtime bugs waiting to happen
- Zero tolerance policy: ZERO errors or code is not complete

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

**FOR CHAT ASSISTANTS**:
- ✅ **FIRST**: Check VS Code errors: `get_errors(['src/'])` - MUST be zero
- ✅ Run full validation: `npm run typecheck && npm run validate-exports && npm test`
- ✅ Deploy: `npm run dev:push` (or `prod:push` for production)
- ✅ Verify deployment success
- ✅ Test in GAS environment (manual testing of critical paths)
- ❌ NEVER assume deployment worked without verification
- ❌ NEVER deploy with VS Code errors present

**FOR AUTONOMOUS CODING AGENTS**:
- ✅ **FIRST**: Run typecheck: `npm run typecheck` - MUST show zero errors
- ✅ Run full validation: `npm test && npm run validate-exports`
- ✅ Verify all `.d.ts` files are up to date
- ✅ Check that all called methods exist in `.d.ts` files
- ❌ NEVER create PR with typecheck errors
- ❌ NEVER reference non-existent methods

**Example Workflow (Chat Assistants with `get_errors` tool)**:
```
1. ✅ Modify triggers.js (add cleanup calls)
2. ✅ IMMEDIATELY check: get_errors(['src/triggers.js']) -- fix any errors
3. ✅ Update triggers.d.ts (add JSDoc, verify signatures)
4. ✅ Check again: get_errors(['src/triggers.js', 'src/triggers.d.ts']) -- must be zero
5. ✅ Update TriggerManagerCore.test.js (if logic changed)
6. ✅ Update docs/Announcement-OperatorManual.md (trigger lifecycle)
7. ✅ Run npm test -- verify all pass
8. ✅ Run npm run typecheck -- verify no errors
9. ✅ Final check: get_errors(['src/']) -- must show ZERO errors
10. ✅ Deploy: npm run dev:push
11. ✅ Test in spreadsheet: verify triggers clean up
```

**Example Workflow (Autonomous Agents without `get_errors` tool)**:
```
1. ✅ Create ValidationCore.d.ts with ALL method signatures FIRST
2. ✅ Implement ValidationCore.js with proper JSDoc types
3. ✅ Run npm run typecheck -- MUST show zero errors
4. ✅ Create UIHelper.d.ts with ALL method signatures
5. ✅ Implement UIHelper.js with proper JSDoc types
6. ✅ Run npm run typecheck again -- MUST show zero errors
7. ✅ Create RideCoordinator.js that calls ValidationCore/UIHelper methods
8. ✅ Run npm run typecheck -- verify all methods exist
9. ✅ Write tests for ValidationCore/UIHelper
10. ✅ Run npm test -- verify all pass
10. ✅ Deploy: npm run dev:push
11. ✅ Test in spreadsheet: verify triggers clean up
```

**If you skip ANY step:**
- Tests may be incomplete (hidden bugs)
- Types may be wrong (TypeScript errors)
- Documentation may be outdated (user confusion)
- Deployment may fail (wasted time)

**REMEMBER**: "I'll just do this quick fix" → Technical debt → Hours debugging later

**ALWAYS ask yourself**: "Did I update tests, types, and docs?" before calling work complete.

## Common Type Errors and Fixes

### 1. AnnouncementCore/Module Import Types
When TypeScript sees `typeof import('./Module')`, it's treating the module as a type, not the actual exported object.

**Problem**:
```javascript
// This doesn't work - TypeScript sees the module type, not the exported object
AnnouncementCore.calculateSendTime(...)  // Error: Property 'calculateSendTime' does not exist
```

**Solution**: Add `@typedef` to properly import the module's default export:
```javascript
// At top of file after triple-slash references
/**
 * @typedef {import('./AnnouncementCore').default} AnnouncementCoreType
 */

// Then access the namespace methods normally
const time = AnnouncementCore.calculateSendTime(date, timezone);
```

### 2. Row Instance vs Class Type
Functions receiving Row instances must use `InstanceType<typeof Row>`, not just `Row`.

**Problem**:
```javascript
/**
 * @param {Row} row - WRONG: This means the Row class constructor
 */
function processRow(row) {
    row.RideName  // Error: Property 'RideName' does not exist on type 'typeof Row'
}
```

**Solution**:
```javascript
/**
 * @param {InstanceType<typeof Row>} row - CORRECT: This means a Row instance
 */
function processRow(row) {
    row.RideName  // ✅ Works - TypeScript knows this is an instance
}
```

### 3. Error Type Guards (useUnknownInCatchVariables: true)
ALL catch blocks must use type guards since errors are `unknown` type in strict mode.

**Problem**:
```javascript
catch (error) {
    console.log(error.message);  // Error: 'error' is of type 'unknown'
}
```

**Solution**:
```javascript
catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.log(err.message);  // ✅ Works
}
```

### 4. Object Return Types from Functions
When a function returns `{success: boolean, error?: string}`, JSDoc must specify the shape.

**Problem**:
```javascript
/**
 * @returns {Object}  // Too vague - TypeScript doesn't know the properties
 */
function doSomething() {
    return { success: true };
}

const result = doSomething();
if (result.success) {}  // Error: Property 'success' does not exist on type 'Object'
```

**Solution**:
```javascript
/**
 * @returns {{success: boolean, error?: string}}  // Specific shape
 */
function doSomething() {
    return { success: true };
}

const result = doSomething();
if (result.success) {}  // ✅ Works
```

### 5. Implicit any Parameters
ALL function parameters need explicit types.

**Problem**:
```javascript
function process(item) {  // Error: Parameter 'item' implicitly has an 'any' type
    return item.name;
}
```

**Solution**:
```javascript
/**
 * @param {any} item - Item to process
 */
function process(item) {
    return item.name;  // ✅ Works
}
```

### 6. Lambda/Arrow Function Parameter Types
Lambda parameters also need types when not inferrable.

**Problem**:
```javascript
items.forEach(row => {  // Error: Parameter 'row' implicitly has an 'any' type
    console.log(row.name);
});
```

**Solution**:
```javascript
items.forEach((/** @type {any} */ row) => {  // Inline JSDoc type
    console.log(row.name);  // ✅ Works
});
```

### 7. Undefined vs Null for Optional Date Fields
TypeScript distinguishes between `undefined` and `Date` in strict mode.

**Problem**:
```javascript
row.SendAt = undefined;  // Error: Type 'undefined' is not assignable to type 'Date'
```

**Solutions**:
```javascript
// Option 1: Type definition allows undefined
// In Row.d.ts: get SendAt(): Date | undefined;
row.SendAt = undefined;  // ✅ Works if type allows it

// Option 2: Use type assertion when necessary
// @ts-ignore - Clearing SendAt field (design allows undefined)
row.SendAt = undefined;

// Option 3: Use null if type definition uses Date | null
row.SendAt = null;
```

### 8. Accessing Private Properties
Private properties marked in `.d.ts` cannot be accessed directly.

**Problem**:
```javascript
row._adapter.save();  // Error: Property '_adapter' is private
```

**Solutions**:
```javascript
// Option 1: Add explanatory @ts-ignore comment
// @ts-ignore - _adapter is internal but needed for immediate save
row._adapter.save();

// Option 2: Add public method to class
// In Row class:
save() {
    this._adapter.save();
}
// Then call:
row.save();  // ✅ Public method
```

### Pre-Flight Checklist for Zero VS Code Errors

Before claiming work is complete:
1. ✅ Run `get_errors(['src/YourFile.js'])` - must show ZERO
2. ✅ Check all function parameters have JSDoc types
3. ✅ Check all catch blocks have error type guards
4. ✅ Check Row parameters use `InstanceType<typeof Row>`
5. ✅ Check return types specify object shapes `{{success: boolean}}`
6. ✅ Check lambda parameters have inline `@type` annotations
7. ✅ Check module imports have proper `@typedef` for namespace access
8. ✅ Run `npm run typecheck` - must show ZERO errors in src/

**If you have 175 errors like the example**:
- You skipped these steps
- Fix them ALL before proceeding
- Each error is a potential runtime bug
