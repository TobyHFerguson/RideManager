# Google Apps Script Best Practices

> **Universal Guidelines**: This file contains universal best practices for Google Apps Script development that apply to **any GAS codebase**. These guidelines focus on type safety, testing, architecture patterns, and GAS platform limitations.

---

## Table of Contents

1. [AI Agent Best Practices](#ai-agent-best-practices)
   - [Pre-Coding Checklist (TDD Workflow)](#pre-coding-checklist-tdd-workflow)
   - [Search Before Implementing](#search-before-implementing)
   - [Code Modification Workflow](#code-modification-workflow)
   - [Chat Assistants vs Autonomous Agents](#chat-assistants-vs-autonomous-agents)
2. [GAS Technical Patterns](#gas-technical-patterns)
   - [GAS API Limitations](#gas-api-limitations)
   - [Module Export/Import Pattern](#module-exportimport-pattern)
   - [Common GAS + clasp Pain Points](#common-gas--clasp-pain-points)
3. [Type Safety Patterns](#type-safety-patterns)
   - [Zero Tolerance for any and Object](#zero-tolerance-for-any-and-object)
   - [Type Replacement Guide](#type-replacement-guide)
   - [Implicit any in Array Callbacks](#implicit-any-in-array-callbacks)
   - [Detecting Hidden any Types](#detecting-hidden-any-types)
4. [Architecture Patterns](#architecture-patterns)
   - [Core/Adapter Separation](#coreadapter-separation)
   - [100% Test Coverage Required](#100-test-coverage-required)
   - [Class Pattern (not namespace)](#class-pattern-not-namespace)
5. [Testing Strategy](#testing-strategy)
   - [Jest Tests for Pure JavaScript](#jest-tests-for-pure-javascript)
   - [Coverage Requirements](#coverage-requirements)
6. [TypeScript Type Coverage](#typescript-type-coverage)
   - [Zero Type Errors Policy](#zero-type-errors-policy)
   - [.d.ts File Patterns](#dts-file-patterns)
   - [Common Type Errors and Fixes](#common-type-errors-and-fixes)

---

## AI Agent Best Practices

### Pre-Coding Checklist (TDD Workflow)

**⚠️ STOP: Before Writing ANY Code**

**MANDATORY Pre-Coding Checklist - Follow in EXACT ORDER:**

1. ✅ **Identify pure logic** (calculations, URL building, data transformations, validation rules)
   - Is there pure logic that can be tested in Jest without GAS?
   - If NO → Skip to step 5 (GAS-only code)
   - If YES → Continue to step 2

2. ✅ **Write tests FIRST** (before any implementation code)
   - Create `test/__tests__/*Core.test.js`
   - Write test cases for expected behavior
   - Tests will FAIL initially (code doesn't exist yet)
   - **DO NOT write implementation yet**

3. ✅ **Now implement the Core module**
   - Create `src/*Core.js` with pure JavaScript logic
   - Make the tests pass
   - Run: `npm test -- --coverage --collectCoverageFrom='src/*Core.js'`

4. ✅ **Verify 100% test coverage**
   - Check terminal output: All coverage must be 100%
   - Statements: 100%, Branches: 100%, Functions: 100%, Lines: 100%
   - **DO NOT PROCEED until coverage is 100%**

5. ✅ **Only THEN create/modify GAS adapter files**
   - Adapter should only call Core logic and GAS APIs
   - No business logic in adapters

**If you skip step 2 and write implementation first, STOP immediately and write tests.**

---

### Search Before Implementing

**🔍 STOP: Search Before Implementing (MANDATORY)**

**CRITICAL: Before writing ANY new functionality, you MUST search for existing implementations.**

**Why This Matters:**
- Codebases evolve over time with working, tested implementations
- Reinventing existing code wastes time and introduces bugs
- New code written without awareness is often worse than existing tested code

**MANDATORY Search Checklist:**

1. ✅ **Search for existing implementations:**
   ```bash
   grep -r "functionName\|methodName\|featureName" src/
   grep -r "keyword\|pattern" src/  # Search by functionality keywords
   ```

2. ✅ **Check the canonical modules FIRST**:
   - Look for `*Core.js` modules - these contain tested business logic
   - Look for `*Adapter.js` modules - these contain GAS API interactions
   - Review module documentation/inventory if available

3. ✅ **If similar code exists:**
   - **REUSE IT** - call the existing function/method
   - **REFACTOR IT** - if it needs modification, refactor don't rewrite
   - **NEVER DUPLICATE** - don't write parallel implementations

4. ✅ **Only write new code when:**
   - No existing implementation found after thorough search
   - Existing code cannot be adapted (rare)
   - You've documented WHY new code is needed

**Example of WRONG vs RIGHT:**
```javascript
// ❌ WRONG: Writing new code without searching
function buildUrl(params) {
    // Reinventing URL building...
    let url = baseUrl + '?';
    for (const key in params) {
        url += key + '=' + params[key] + '&';
    }
    return url.slice(0, -1);
}

// ✅ RIGHT: Reusing existing tested implementation
function buildUrl(params) {
    // UrlBuilderCore.buildQueryString is tested and works!
    return baseUrl + '?' + UrlBuilderCore.buildQueryString(params);
}
```

---

### Code Modification Workflow

**CRITICAL: Code Modification Workflow**

Every code change must include updates to:

#### 0. Verify Zero Type Errors (MANDATORY AFTER EVERY EDIT)

**FOR CHAT ASSISTANTS** (have `get_errors` tool):
1. ✅ Use `get_errors` tool to check VS Code reports ZERO problems
2. ✅ If errors exist, FIX THEM before proceeding
3. ✅ NEVER leave code with VS Code errors - they indicate bugs
4. ✅ Run `npm run validate-types` to ensure `.d.ts` files match implementations

**FOR AUTONOMOUS CODING AGENTS** (no `get_errors` tool):
1. ✅ Run `npm run typecheck` after EVERY code change (ZERO errors required)
2. ✅ Run `npm run validate-types` after modifying ANY `.js` or `.d.ts` file
3. ✅ Run `npm test` to verify tests pass
4. ✅ Create `.d.ts` files FIRST before implementing new modules
5. ✅ NEVER reference non-existent methods - verify method exists in `.d.ts` before calling
6. ✅ Add proper JSDoc types to ALL function parameters (no implicit `any`)
7. ✅ Update `.d.ts` when adding/modifying methods in `.js` files

#### 1. Update Tests (MANDATORY for Pure JavaScript)

- Add test cases for new functionality
- Update existing tests for modified behavior
- Maintain 100% coverage for Core modules
- Run: `npm test -- --coverage`

#### 2. Update TypeScript Declarations (MANDATORY)

- Update `.d.ts` files to match implementation changes
- Add JSDoc types to new functions/methods
- Verify zero type errors: `npm run typecheck`

#### 3. Update Documentation (MANDATORY for User-Facing Changes)

- Update README if public API changes
- Update inline JSDoc comments
- Update architecture documentation if patterns change

#### 4. Deployment Verification (MANDATORY)

- Run full validation: `npm run validate-all`
- This runs: `validate-exports → typecheck → validate-types → test`

---

### Chat Assistants vs Autonomous Agents

**AUDIENCE**: These instructions apply to:
- **Chat Assistants** (like GitHub Copilot Chat) - have access to `get_errors` tool
- **Autonomous Coding Agents** (create PRs automatically) - do NOT have `get_errors` tool

**KEY DIFFERENCE**:
- **Chat Assistants**: Can see VS Code errors via `get_errors` tool → MUST use it after every change
- **Autonomous Agents**: Cannot see VS Code errors → MUST create `.d.ts` files FIRST, run `npm run typecheck` after every change

**CRITICAL Pre-Deployment Checks** (MANDATORY before EVERY code change):
```bash
npm run validate-all
# This runs: validate-exports → typecheck → validate-types → test
```

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
class DataProcessorCore {
    static calculateValue(inputData) { 
        // Pure logic - fully testable
        return inputData.amount * inputData.multiplier;
    }
    
    static transformData(data) {
        // Call other static methods directly
        const value = DataProcessorCore.calculateValue(data);
        return { ...data, processedValue: value };
    }
}

// ✅ CORRECT: Thin GAS adapter (CLASS with instance methods)
class DataProcessor {
    processSpreadsheetData(sheetName) {
        // Use Core class static methods
        const rawData = this._fetchFromSheet(sheetName);
        const transformed = DataProcessorCore.transformData(rawData);
        // Only GAS API calls here
        this._writeToSheet(sheetName, transformed);
    }
    
    _fetchFromSheet(sheetName) {
        // GAS API calls only
        return SpreadsheetApp.getActiveSpreadsheet()
            .getSheetByName(sheetName)
            .getDataRange()
            .getValues();
    }
}
```

---

## GAS Technical Patterns

### GAS API Limitations

**🚫 CRITICAL: Google Apps Script API Limitations**

**MANDATORY**: This codebase runs in Google Apps Script V8 runtime, which has LIMITED JavaScript API support. Many modern browser/Node.js APIs are NOT available.

#### ❌ FORBIDDEN APIs (Will cause runtime errors in GAS):

**Modern JavaScript APIs NOT available in GAS**:
- ❌ `URLSearchParams` - Not available (use manual URL encoding with `encodeURIComponent()`)
- ❌ `fetch()` - Not available (use `UrlFetchApp.fetch()`)
- ❌ `localStorage` / `sessionStorage` - Not available (use `PropertiesService`)
- ❌ `window` / `document` / DOM APIs - Not available (server-side only)
- ❌ `setTimeout` / `setInterval` - Not available (use time-based triggers)
- ❌ `WebSocket` - Not available
- ❌ `FormData` - Not available
- ❌ `AbortController` - Not available
- ❌ Most Node.js APIs - Not available

**Modern ES6+ Features with LIMITED support**:
- ⚠️ `import` / `export` - Not available (use GAS's module system with global `var`)
- ⚠️ `async` / `await` - Available but limited (GAS uses synchronous model)
- ⚠️ Top-level `await` - Not available
- ⚠️ Dynamic `import()` - Not available
- ❌ `static FIELD = value` - Static class fields NOT supported (use `static get FIELD() { return value; }`)
- ❌ Bare `class` declarations - Cause "Identifier already declared" (wrap in IIFE: `var X = (function() { class X {} return X; })()`)

#### ✅ ALWAYS USE GAS-Compatible Alternatives:

| ❌ Forbidden | ✅ GAS Alternative | Example |
|-------------|-------------------|---------|
| `URLSearchParams` | Manual encoding with `encodeURIComponent()` | `const params = ['src=' + encodeURIComponent(id)]; url + '?' + params.join('&')` |
| `fetch(url)` | `UrlFetchApp.fetch(url)` | `const response = UrlFetchApp.fetch(url); const data = JSON.parse(response.getContentText());` |
| `localStorage.setItem()` | `PropertiesService.getUserProperties()` | `PropertiesService.getUserProperties().setProperty(key, value)` |
| `setTimeout(fn, ms)` | `Utilities.sleep(ms)` or time-based trigger | `Utilities.sleep(5000); // 5 seconds` |
| `console.log()` | `Logger.log()` (GAS logs) | `Logger.log('message')` |

#### 🔍 How to Verify GAS Compatibility:

**BEFORE using ANY API not in this codebase:**
1. ✅ Check [Google Apps Script Reference](https://developers.google.com/apps-script/reference) first
2. ✅ Search existing codebase: `grep -r "APIName" src/` to see if it's already used
3. ✅ If in doubt, assume it's NOT available and use GAS equivalent
4. ✅ Test in GAS environment immediately after writing code

**Red Flags** (API likely not available in GAS):
- 🚩 Recently added to JavaScript (ES2020+)
- 🚩 Browser-specific API (window, document, navigator)
- 🚩 Node.js-specific API (fs, path, process)
- 🚩 Requires network/async capabilities (WebSocket, WebRTC)

#### 💡 Golden Rule for Core Modules:

**Even though Core modules are "pure JavaScript"**, they must STILL be GAS-compatible because:
1. They run in GAS during deployment
2. They're tested in Node.js but executed in GAS
3. GAS has fewer APIs than Node.js

**Safe APIs for Core modules**:
- ✅ Basic JavaScript: `Array`, `Object`, `String`, `Number`, `Date`, `Math`, `JSON`, `RegExp`
- ✅ ES6+ features: arrow functions, `const`/`let`, template literals, destructuring, spread operator
- ✅ Standard methods: `Array.map/filter/reduce`, `String.replace/split`, `Object.keys/values`
- ✅ `encodeURIComponent()` / `decodeURIComponent()` for URL encoding

**Example of proper GAS-compatible Core module**:
```javascript
// ✅ CORRECT - Uses only GAS-compatible APIs
class UrlBuilderCore {
    static buildUrl(baseUrl, params) {
        // Manual URL encoding (GAS-compatible)
        const queryParts = [];
        for (const [key, value] of Object.entries(params)) {
            queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
        }
        return `${baseUrl}?${queryParts.join('&')}`;
    }
}

// ❌ WRONG - Uses URLSearchParams (not available in GAS)
class UrlBuilderCore {
    static buildUrl(baseUrl, params) {
        const searchParams = new URLSearchParams(params);  // ❌ Runtime error in GAS!
        return `${baseUrl}?${searchParams.toString()}`;
    }
}
```

**REMEMBER**: If you're writing code that will run in GAS (even Core modules), verify every API is GAS-compatible. When in doubt, use basic JavaScript only.

---

### Module Export/Import Pattern

**Module Export/Import Pattern for GAS Compatibility**

GAS doesn't support ES6 `import`/`export`. Use conditional exports for Node.js/Jest compatibility:

```javascript
// At the end of *Core.js files:
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MyCore };
}

// At the end of adapter files that use Core modules:
if (typeof module !== 'undefined' && module.exports) {
    const { MyCore } = require('./MyCore.js');
    module.exports = { MyAdapter };
}
```

**IIFE Wrapping for Classes**:

GAS has issues with bare `class` declarations causing "Identifier already declared" errors. Wrap classes in IIFEs:

```javascript
// ✅ CORRECT: IIFE-wrapped class
var MyClass = (function() {
    class MyClass {
        constructor() { }
        
        myMethod() { }
    }
    
    return MyClass;
})();

// ❌ WRONG: Bare class declaration
class MyClass {  // Causes "Identifier already declared" in GAS
    constructor() { }
}
```

**Centralized Exports Pattern**:

Create an `Exports.js` file to control module loading order and expose global variables:

```javascript
// Exports.js - Load order matters!
// Core modules first (no dependencies)
// Then adapters (depend on Core modules)

// Load order: Core modules
var ValidationCore = (typeof ValidationCore !== 'undefined') ? ValidationCore : {};
var DataProcessorCore = (typeof DataProcessorCore !== 'undefined') ? DataProcessorCore : {};

// Load order: Adapters
var DataProcessor = (typeof DataProcessor !== 'undefined') ? DataProcessor : {};
var ValidationAdapter = (typeof ValidationAdapter !== 'undefined') ? ValidationAdapter : {};

// For Node.js/Jest testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ValidationCore,
        DataProcessorCore,
        DataProcessor,
        ValidationAdapter
    };
}
```

**Why This Pattern?**:
- GAS loads files in unpredictable order
- Adapters depend on Core modules being loaded first
- Exports.js ensures correct loading order
- Conditional exports enable Jest testing in Node.js
- IIFE prevents "Identifier already declared" errors

---

### Common GAS + clasp Pain Points

**Common GAS + clasp Pain Points (For Future Reference)**

#### 1. GAS Execution Quotas and Timeouts

**Problem**: GAS has strict execution time limits (6 minutes for simple triggers, 30 minutes for installed triggers).

**Solutions**:
- Break long-running operations into chunks
- Use continuation triggers for multi-step processes
- Store progress in PropertiesService
- Use time-based triggers for batch operations

```javascript
// ✅ CORRECT: Chunked processing with progress tracking
function processBatchWithContinuation() {
    const props = PropertiesService.getScriptProperties();
    const lastProcessedIndex = parseInt(props.getProperty('lastProcessedIndex') || '0');
    const chunkSize = 100;
    
    const startTime = new Date().getTime();
    const maxRunTime = 5 * 60 * 1000; // 5 minutes
    
    const data = getAllData();
    let currentIndex = lastProcessedIndex;
    
    while (currentIndex < data.length) {
        if (new Date().getTime() - startTime > maxRunTime) {
            // Save progress and schedule continuation
            props.setProperty('lastProcessedIndex', currentIndex.toString());
            ScriptApp.newTrigger('processBatchWithContinuation')
                .timeBased()
                .after(1000) // 1 second later
                .create();
            return;
        }
        
        processItem(data[currentIndex]);
        currentIndex++;
    }
    
    // Cleanup when done
    props.deleteProperty('lastProcessedIndex');
}
```

#### 2. Lock Service for Concurrent Access

**Problem**: Multiple users or triggers accessing same resources concurrently can cause data corruption.

**Solution**: Use LockService with timeouts:

```javascript
// ✅ CORRECT: Using LockService
function safeUpdateSpreadsheet(data) {
    const lock = LockService.getScriptLock();
    
    try {
        // Wait up to 30 seconds for lock
        lock.waitLock(30000);
        
        // Critical section - only one execution at a time
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Data');
        sheet.appendRow(data);
        
    } catch (e) {
        Logger.log('Could not obtain lock: ' + e);
        throw new Error('System busy, please try again');
    } finally {
        lock.releaseLock();
    }
}
```

#### 3. PropertiesService Patterns

**Problem**: PropertiesService has size limits (9KB per property, 500KB total).

**Best Practices**:
```javascript
// ✅ CORRECT: Structured storage with JSON
function saveUserPreferences(userId, prefs) {
    const props = PropertiesService.getUserProperties();
    props.setProperty(`prefs_${userId}`, JSON.stringify(prefs));
}

function getUserPreferences(userId) {
    const props = PropertiesService.getUserProperties();
    const json = props.getProperty(`prefs_${userId}`);
    return json ? JSON.parse(json) : {};
}

// For large data, split into chunks
function saveLargeData(key, data) {
    const json = JSON.stringify(data);
    const chunkSize = 8000; // Leave room for key overhead
    const chunks = [];
    
    for (let i = 0; i < json.length; i += chunkSize) {
        chunks.push(json.substring(i, i + chunkSize));
    }
    
    const props = PropertiesService.getScriptProperties();
    props.setProperty(`${key}_count`, chunks.length.toString());
    
    chunks.forEach((chunk, index) => {
        props.setProperty(`${key}_${index}`, chunk);
    });
}
```

#### 4. Exponential Backoff for External APIs

**Problem**: External APIs may be rate-limited or temporarily unavailable.

**Solution**: Implement exponential backoff:

```javascript
// ✅ CORRECT: Exponential backoff with jitter
function fetchWithRetry(url, options, maxRetries = 5) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = UrlFetchApp.fetch(url, options);
            return response;
        } catch (e) {
            lastError = e;
            
            if (attempt < maxRetries - 1) {
                // Exponential backoff: 1s, 2s, 4s, 8s, 16s
                const delay = Math.pow(2, attempt) * 1000;
                // Add jitter to prevent thundering herd
                const jitter = Math.random() * 1000;
                Utilities.sleep(delay + jitter);
            }
        }
    }
    
    throw new Error(`Failed after ${maxRetries} attempts: ${lastError}`);
}
```

#### 5. Manifest File (appsscript.json) Management

**Key Settings**:
```json
{
  "timeZone": "America/Los_Angeles",
  "dependencies": {
    "enabledAdvancedServices": []
  },
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

**clasp Commands**:
- `clasp push` - Push local code to GAS
- `clasp pull` - Pull GAS code to local
- `clasp open` - Open project in GAS editor
- `clasp logs` - View execution logs
- `clasp deploy` - Create new deployment

#### 6. Testing GAS-Specific Date Behavior

**Problem**: GAS runs in different timezone than your local machine.

**Solution**: Always specify timezone in tests:

```javascript
// ✅ CORRECT: Test with specific timezone
describe('DateProcessor', () => {
    beforeAll(() => {
        // Set timezone to match GAS environment
        process.env.TZ = 'America/Los_Angeles';
    });
    
    test('calculates date correctly', () => {
        const input = new Date('2024-01-15T10:00:00');
        const result = DateProcessorCore.addBusinessDays(input, 5);
        expect(result.toISOString()).toBe('2024-01-22T10:00:00.000Z');
    });
});
```

---

## Type Safety Patterns

### Zero Tolerance for any and Object

**CRITICAL: Type Safety - Zero Tolerance for `{any}` and `{Object}`**

**MANDATORY RULE**: NEVER use `@param {any}` or `@param {Object}` in function signatures. These overly broad types prevent compile-time error detection. Always use specific types or object shapes that describe the actual structure.

**Why `{Object}` is as bad as `{any}`**:
- TypeScript cannot validate property access (e.g., `obj.propertyName`)
- Typos in property names won't be caught until runtime
- No IntelliSense/autocomplete for properties
- Refactoring becomes unsafe
- Defeats the entire purpose of type checking

---

### Type Replacement Guide

| ❌ NEVER Use | ✅ ALWAYS Use | Example |
|-------------|--------------|---------|
| `@param {any} row` | `@param {RowInstance} row` | Single row parameter |
| `@param {Object} rowData` | `@param {{name?: string, url?: string, date?: Date}} rowData` | Plain object with known properties |
| `@param {Object} options` | `@param {{force?: boolean, debug?: boolean}} options` | Options/config object |
| `@param {Object} result` | `@param {{success: boolean, error?: string}} result` | Return value object |
| `@param {any} data` | `@param {any} data` + justification comment | ONLY when truly arbitrary |

**Pattern for Plain Objects**:
```javascript
// ❌ WRONG - Too broad, no type checking
/**
 * @param {Object} rowData - Row data
 */
function enrichRowData(rowData) {
    return rowData.name; // No error if name doesn't exist!
}

// ✅ CORRECT - Specific shape with optional properties
/**
 * @param {{name?: string, url?: string, date?: Date | string}} rowData - Row data with specific fields
 * @returns {Record<string, any>} Enriched data object
 */
function enrichRowData(rowData) {
    return rowData.name; // TypeScript validates name exists in type
}
```

**Pattern for GAS API Return Objects**:
```javascript
// ❌ WRONG
/**
 * @param {Object} result
 */
function handleResult(result) {
    if (result.success) { } // No error if 'success' doesn't exist!
}

// ✅ CORRECT
/**
 * @param {{success: boolean, emailAddress?: string, error?: string}} result
 */
function handleResult(result) {
    if (result.success) { } // TypeScript knows 'success' is boolean
}
```

**Pattern for Dictionary-like Objects**:
```javascript
// When keys are dynamic but values have consistent type:
/**
 * @param {Record<string, any>} attributes - Dictionary of attribute values
 */
function applyAttributes(attributes) { }

// Or with specific value type:
/**
 * @param {Record<string, string>} config - Configuration key-value pairs
 */
function applyConfig(config) { }
```

**CRITICAL: When to Use Record<string, any> (RARELY)**:

⚠️ **STOP BEFORE USING Record<string, any>** - Ask these questions:

1. **Do I know the property names?**
   - ✅ YES → Use specific inline type or typedef
   - ❌ NO → Continue to question 2

2. **Are the keys truly dynamic/unknown at compile time?**
   - ✅ YES → Use Record<string, any> with justification
   - ❌ NO → Use specific inline type or typedef

3. **Examples of JUSTIFIED use**:
   ```javascript
   // ✅ JUSTIFIED - Keys are dynamic (unknown at compile time)
   /** @returns {{installed: number, failed: number, details: Record<string, any>}} */
   function buildSummary() {
       return {
           installed: 0,
           failed: 0,
           details: {} // Keys added dynamically: details[type] = result
       };
   }
   ```

---

### Implicit any in Array Callbacks

**Implicit `any` in Array Callbacks (CRITICAL)**

**PROBLEM**: Array methods like `.map()`, `.filter()`, `.forEach()` create implicit `any` types for callback parameters when the array type isn't specific enough.

**Detection**:
```typescript
// ❌ WRONG - Implicit 'any' in callback
function getNames(items) {  // items is 'any[]'
    return items.map(item => item.name);  // 'item' is implicitly 'any'
}
```

**Solutions**:

**Option 1: Add explicit parameter types**:
```javascript
/**
 * @param {Array<{name: string, id: number}>} items
 * @returns {string[]}
 */
function getNames(items) {
    return items.map(item => item.name);  // 'item' is inferred from array type
}
```

**Option 2: Inline parameter type in callback**:
```javascript
/**
 * @param {any[]} items
 * @returns {string[]}
 */
function getNames(items) {
    return items.map(
        /** @param {{name: string, id: number}} item */
        item => item.name
    );
}
```

**Option 3: Use explicit callback type**:
```javascript
/**
 * @param {any[]} items
 * @returns {string[]}
 */
function getNames(items) {
    /** @type {(item: {name: string, id: number}) => string} */
    const extractName = item => item.name;
    return items.map(extractName);
}
```

---

### Detecting Hidden any Types

**Detecting Hidden `any` Types (CRITICAL)**

**VS Code vs npm run typecheck**:

VS Code's TypeScript checker may NOT show all `any` type errors. Always run `npm run typecheck` to catch hidden issues.

**Common Hidden `any` Patterns**:

1. **Array Callback Parameters**:
   ```javascript
   // VS Code may not flag this, but typecheck will
   items.map(item => item.name);  // 'item' is implicitly 'any'
   ```

2. **Object Property Access**:
   ```javascript
   function getValue(obj) {  // obj is implicitly 'any'
       return obj.value;
   }
   ```

3. **Return Values from External Functions**:
   ```javascript
   const data = externalFunction();  // May return 'any'
   data.property; // No type checking
   ```

**Detection Commands**:
```bash
# Run TypeScript type checking
npm run typecheck

# Look for 'any' in error messages
npm run typecheck 2>&1 | grep "any"

# Validate type definitions match implementations
npm run validate-types
```

**Zero Tolerance Policy**:
1. ✅ Run `npm run typecheck` after EVERY code change
2. ✅ Fix ALL `any` type errors before committing
3. ✅ Add explicit types to function parameters
4. ✅ Add types to array callback parameters
5. ✅ Never commit code with implicit `any` types

---

## Architecture Patterns

### Core/Adapter Separation

**Architecture Pattern: Core/Adapter Separation**

**Key Principle**: Separate pure JavaScript business logic from GAS API calls.

**Pattern**:
```
*Core.js files:
- Pure JavaScript (no GAS APIs)
- 100% test coverage required
- Exports static class methods
- Tested in Node.js/Jest

*Adapter.js files (or non-Core files):
- Thin wrappers around GAS APIs
- Minimal business logic
- Instance methods that call Core static methods
- Not directly testable (GAS-dependent)
```

**Example Structure**:
```javascript
// ✅ ValidationCore.js - Pure logic, fully testable
class ValidationCore {
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    static validateDateRange(startDate, endDate) {
        return startDate <= endDate;
    }
}

// ✅ ValidationAdapter.js - GAS wrapper, thin logic
class ValidationAdapter {
    validateSpreadsheetData(sheetName) {
        const sheet = SpreadsheetApp.getActiveSpreadsheet()
            .getSheetByName(sheetName);
        const data = sheet.getDataRange().getValues();
        
        const errors = [];
        data.forEach((row, index) => {
            const [email, startDate, endDate] = row;
            
            // Delegate to Core for validation logic
            if (!ValidationCore.validateEmail(email)) {
                errors.push(`Row ${index}: Invalid email`);
            }
            
            if (!ValidationCore.validateDateRange(startDate, endDate)) {
                errors.push(`Row ${index}: Invalid date range`);
            }
        });
        
        return errors;
    }
}
```

**Benefits**:
- Business logic is testable without GAS environment
- Tests run fast in Jest
- Easy to refactor and maintain
- Clear separation of concerns
- 100% code coverage on Core modules

---

### 100% Test Coverage Required

**100% Test Coverage Required**

**MANDATORY**: All `*Core.js` modules MUST have 100% test coverage.

**Coverage Requirements**:
- Statements: 100%
- Branches: 100%
- Functions: 100%
- Lines: 100%

**Running Coverage**:
```bash
# Full coverage report
npm test -- --coverage

# Coverage for specific file
npm test -- --coverage --collectCoverageFrom='src/MyCore.js'

# Coverage output should show:
# Statements: 100% (X/X)
# Branches: 100% (X/X)
# Functions: 100% (X/X)
# Lines: 100% (X/X)
```

**Test Structure**:
```javascript
// test/__tests__/ValidationCore.test.js
const { ValidationCore } = require('../../src/ValidationCore.js');

describe('ValidationCore', () => {
    describe('validateEmail', () => {
        test('returns true for valid email', () => {
            expect(ValidationCore.validateEmail('user@example.com')).toBe(true);
        });
        
        test('returns false for email without @', () => {
            expect(ValidationCore.validateEmail('userexample.com')).toBe(false);
        });
        
        test('returns false for email without domain', () => {
            expect(ValidationCore.validateEmail('user@')).toBe(false);
        });
    });
    
    describe('validateDateRange', () => {
        test('returns true when start is before end', () => {
            const start = new Date('2024-01-01');
            const end = new Date('2024-01-31');
            expect(ValidationCore.validateDateRange(start, end)).toBe(true);
        });
        
        test('returns false when start is after end', () => {
            const start = new Date('2024-01-31');
            const end = new Date('2024-01-01');
            expect(ValidationCore.validateDateRange(start, end)).toBe(false);
        });
    });
});
```

**Why 100% Coverage?**:
- Core modules contain critical business logic
- Pure JavaScript is easily testable
- Catches edge cases and bugs early
- Enables confident refactoring
- Documents expected behavior

---

### Class Pattern (not namespace)

**Class Pattern (MANDATORY in GAS)**

**CRITICAL**: Always use the IIFE-wrapped class pattern, never bare class declarations or namespace pattern.

**✅ CORRECT: IIFE-Wrapped Class**:
```javascript
var MyCore = (function() {
    class MyCore {
        static myMethod() {
            return "result";
        }
        
        static get CONFIG() {
            return { timeout: 5000 };
        }
    }
    
    return MyCore;
})();
```

**❌ WRONG: Bare Class Declaration**:
```javascript
class MyCore {  // Causes "Identifier already declared" in GAS
    static myMethod() {
        return "result";
    }
}
```

**❌ WRONG: Namespace Pattern**:
```javascript
var MyCore = {
    myMethod: function() {
        return "result";
    }
};
```

**Why IIFE-Wrapped Class?**:
- Prevents "Identifier already declared" errors in GAS
- Allows use of real class syntax (cleaner than namespace)
- Supports static methods and getters
- Compatible with TypeScript type checking
- Works in both GAS and Node.js/Jest

**Static Fields Limitation**:
```javascript
// ❌ WRONG: Static fields not supported in GAS V8
class MyCore {
    static CONFIG = { timeout: 5000 };  // Runtime error in GAS!
}

// ✅ CORRECT: Use static getter
class MyCore {
    static get CONFIG() {
        return { timeout: 5000 };
    }
}
```

---

## Testing Strategy

### Jest Tests for Pure JavaScript

**Jest Tests (Required for Pure JavaScript)**

All `*Core.js` modules must have corresponding Jest tests in `test/__tests__/*Core.test.js`.

**Test File Naming**:
```
src/ValidationCore.js → test/__tests__/ValidationCore.test.js
src/DataProcessorCore.js → test/__tests__/DataProcessorCore.test.js
```

**Test Structure**:
```javascript
const { ValidationCore } = require('../../src/ValidationCore.js');

describe('ValidationCore', () => {
    describe('methodName', () => {
        test('should handle normal case', () => {
            const result = ValidationCore.methodName(input);
            expect(result).toBe(expected);
        });
        
        test('should handle edge case', () => {
            const result = ValidationCore.methodName(edgeInput);
            expect(result).toBe(edgeExpected);
        });
        
        test('should throw error for invalid input', () => {
            expect(() => {
                ValidationCore.methodName(invalidInput);
            }).toThrow('Expected error message');
        });
    });
});
```

**Date and Timezone Handling**:
```javascript
// Always set timezone in tests to match GAS environment
describe('DateCore', () => {
    beforeAll(() => {
        process.env.TZ = 'America/Los_Angeles';
    });
    
    test('calculates date correctly', () => {
        const input = new Date('2024-01-15T10:00:00');
        const result = DateCore.addDays(input, 5);
        expect(result.toISOString()).toBe('2024-01-20T10:00:00.000Z');
    });
});
```

**Running Tests**:
```bash
# Run all tests
npm test

# Run specific test file
npm test -- ValidationCore

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

### Coverage Requirements

**Coverage Requirements (MANDATORY for Core Modules)**

**100% Coverage Required**:
- Statements: 100%
- Branches: 100%
- Functions: 100%
- Lines: 100%

**Checking Coverage**:
```bash
# Generate coverage report
npm test -- --coverage

# Coverage for specific file
npm test -- --coverage --collectCoverageFrom='src/ValidationCore.js'
```

**Coverage Output**:
```
-----------------------------|---------|----------|---------|---------|
File                         | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------|---------|----------|---------|---------|
ValidationCore.js            |     100 |      100 |     100 |     100 |
-----------------------------|---------|----------|---------|---------|
```

**If Coverage < 100%**:
1. Review uncovered lines in coverage report
2. Add test cases for uncovered branches
3. Test edge cases and error paths
4. Verify all methods are tested
5. Run coverage again until 100%

**Why 100%?**:
- Core modules are critical business logic
- Pure JavaScript is easily testable
- Prevents regression bugs
- Documents expected behavior
- Enables confident refactoring

---

## TypeScript Type Coverage

### Zero Type Errors Policy

**Zero Type Errors Policy (MANDATORY)**

**RULE**: ZERO TypeScript errors allowed in the codebase at all times.

**Verification**:
```bash
# Check type errors
npm run typecheck

# Output MUST be:
# Found 0 errors
```

**After EVERY Code Change**:

**FOR CHAT ASSISTANTS**:
1. Use `get_errors` tool to verify ZERO VS Code errors
2. If errors exist, FIX THEM immediately
3. Run `npm run typecheck` to double-check

**FOR AUTONOMOUS AGENTS**:
1. Run `npm run typecheck` after EVERY edit
2. Fix ALL errors before proceeding
3. Run `npm run validate-types` to verify `.d.ts` files match implementations

**Common Type Errors to Fix**:
- Implicit `any` parameters
- Missing type declarations
- `.d.ts` files out of sync with `.js` files
- Incorrect return types
- Missing null/undefined checks

---

### .d.ts File Patterns

**.d.ts File Patterns**

Every `.js` file should have a corresponding `.d.ts` file for TypeScript type checking.

**Pattern for Core Modules** (Static Methods):
```typescript
// ValidationCore.d.ts
export declare class ValidationCore {
    static validateEmail(email: string): boolean;
    static validateDateRange(startDate: Date, endDate: Date): boolean;
}
```

**Pattern for Adapter Modules** (Instance Methods):
```typescript
// ValidationAdapter.d.ts
export declare class ValidationAdapter {
    validateSpreadsheetData(sheetName: string): string[];
}
```

**Pattern with Complex Types**:
```typescript
// DataProcessorCore.d.ts
export declare class DataProcessorCore {
    static processData(
        data: Array<{name: string, value: number}>,
        options?: {threshold?: number, debug?: boolean}
    ): {processed: number, skipped: number};
}
```

**Pattern with Inline Object Types**:
```typescript
export declare class ConfigCore {
    static parseConfig(
        raw: string
    ): {
        timeout: number;
        retries: number;
        endpoints: string[];
    };
}
```

**Exporting Types**:
```typescript
// Create type aliases for reuse
export type ConfigOptions = {
    timeout?: number;
    retries?: number;
    debug?: boolean;
};

export declare class ConfigCore {
    static applyConfig(options: ConfigOptions): void;
}
```

---

### Common Type Errors and Fixes

**Common Type Errors and Fixes**

#### 1. Implicit any Parameters

**Error**: Parameter 'x' implicitly has an 'any' type.

**Fix**: Add explicit type annotation:
```javascript
// ❌ WRONG
function process(data) {  // implicit 'any'
    return data.value;
}

// ✅ CORRECT
/**
 * @param {{value: number}} data
 */
function process(data) {
    return data.value;
}
```

#### 2. Missing Type Declarations

**Error**: Could not find a declaration file for module './MyModule.js'.

**Fix**: Create `.d.ts` file:
```typescript
// MyModule.d.ts
export declare class MyModule {
    static myMethod(): string;
}
```

#### 3. Array Callback Implicit any

**Error**: Parameter 'item' implicitly has an 'any' type.

**Fix**: Type the array or callback:
```javascript
// ❌ WRONG
items.map(item => item.name);

// ✅ CORRECT
/** @param {Array<{name: string}>} items */
function getNames(items) {
    return items.map(item => item.name);
}
```

#### 4. Object Return Types

**Error**: Function lacks return type annotation.

**Fix**: Add return type:
```javascript
// ❌ WRONG
function getData() {
    return { value: 42 };
}

// ✅ CORRECT
/**
 * @returns {{value: number}}
 */
function getData() {
    return { value: 42 };
}
```

#### 5. Error Type Guards

**Error**: Parameter 'error' is implicitly typed as 'any'.

**Fix**: Use type guard or unknown:
```javascript
// ❌ WRONG
try {
    // ...
} catch (error) {  // implicit 'any'
    console.log(error.message);
}

// ✅ CORRECT
try {
    // ...
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(message);
}
```

#### 6. Undefined vs Null

**Error**: Type 'undefined' is not assignable to type 'Date | null'.

**Fix**: Use correct optional type:
```javascript
// ❌ WRONG
/** @param {Date | null} date */
function process(date) {
    // ...
}
process(undefined);  // Error!

// ✅ CORRECT
/** @param {Date | null | undefined} date */
function process(date) {
    // ...
}
```

---

## Pre-Flight Checklist

**Pre-Flight Checklist for Zero Errors**

Before committing ANY code change:

- [ ] Run `npm run typecheck` → ZERO errors
- [ ] Run `npm run validate-types` → All `.d.ts` files match implementations
- [ ] Run `npm test` → All tests pass
- [ ] Run `npm test -- --coverage` → 100% coverage on Core modules
- [ ] Use `get_errors` tool (chat assistants) → ZERO VS Code errors
- [ ] Review JSDoc types → No `{any}` or `{Object}` types
- [ ] Review array callbacks → All parameters explicitly typed
- [ ] Review `.d.ts` files → Match current implementations
- [ ] Review exports → New modules added to `Exports.js`

**If ANY check fails**:
1. ❌ DO NOT COMMIT
2. ✅ FIX the errors
3. ✅ Re-run all checks
4. ✅ Commit only when ALL checks pass

---

## Additional Resources

- [Google Apps Script Reference](https://developers.google.com/apps-script/reference)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [clasp Documentation](https://github.com/google/clasp)

---

**END OF UNIVERSAL GUIDELINES**

For project-specific patterns and module inventories, refer to your project's `copilot-instructions.md` file.
