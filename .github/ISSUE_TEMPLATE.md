# Enforce Strict Type Checking System-Wide: Eliminate `{any}` Parameter Types

## Problem Statement

A production runtime error was discovered that **could have been prevented** by proper type checking:

```javascript
TypeError: row.linkRouteURL is not a function
```

**Root Cause**: Function signatures using `@param {any}` disable TypeScript's type checking, allowing calls to non-existent methods that only fail at runtime in production.

**Impact**: When parameters are typed as `{any}`, the type system cannot:
- ✅ Validate method calls against actual interfaces
- ✅ Catch typos in property/method names
- ✅ Warn about undefined properties
- ✅ Provide IntelliSense/autocomplete
- ✅ Detect breaking changes during refactoring

## Current State

Audit shows **26 occurrences** of `@param {any}` across 6 files:

| File | Count | Risk Level |
|------|-------|-----------|
| `AnnouncementManager.js` | 5 | HIGH - Complex GAS interactions |
| `UserLogger.js` | 3 | MEDIUM - Logging infrastructure |
| `triggers.js` | 4 | HIGH - User-facing operations |
| `rowCheck.js` | 3 | HIGH - Validation logic |
| `AnnouncementCore.js` | 4 | HIGH - Business logic |
| `RideManagerCore.js` | 1 | MEDIUM - Business logic |

**Note**: `RideManager.js` has been fully fixed (15 occurrences converted to `RowCoreInstance`)

## Required Changes

### 1. Replace `{any}` with Proper Types

For each `@param {any}` occurrence:

#### ✅ **Row/RowCore instances**:
```javascript
// ❌ BEFORE - No type checking
/** @param {any} row */

// ✅ AFTER - Full type checking
/** @param {RowCoreInstance} row */
```

#### ✅ **Arrays of rows**:
```javascript
// ❌ BEFORE
/** @param {any} rows */

// ✅ AFTER
/** @param {RowCoreInstance[]} rows */
```

#### ✅ **RWGPS interface**:
```javascript
// ❌ BEFORE
/** @param {any} rwgps */

// ✅ AFTER
/** @param {RWGPS} rwgps */
```

#### ✅ **External objects** (when structure is known):
```javascript
// ❌ BEFORE
/** @param {any} route */

// ✅ AFTER - Document the shape
/** @param {{first_lat: number, first_lng: number, distance?: number}} route */
```

#### ✅ **External objects** (when structure is complex/unknown):
```javascript
// Only use {any} with justification comment
/**
 * @param {any} additionalData - Arbitrary user data (structure not constrained)
 */
```

### 2. Add Required Typedefs

Files using RowCore must include at the top (after triple-slash references):

```javascript
/**
 * @typedef {InstanceType<typeof RowCore>} RowCoreInstance
 */
```

Files using RWGPS must include:

```javascript
/**
 * @typedef {import('./Externals').RWGPS} RWGPS
 */
```

### 3. Verification Steps

For EACH file modified:

```bash
# 1. MANDATORY: Check VS Code errors (more strict than tsc)
get_errors(['src/YourFile.js'])  # Must show ZERO errors

# 2. Run typecheck
npm run typecheck

# 3. Run tests
npm test

# 4. Verify in VS Code
# - Open file in editor
# - Check Problems panel shows 0 errors
# - Test IntelliSense on typed parameters (Ctrl+Space)
```

### 4. Testing the Fix

After updating types, verify they catch errors by:

1. **Temporarily add a typo** to test type checking:
   ```javascript
   row.nonExistentMethod();  // Should show type error
   ```

2. **Verify TypeScript catches it**:
   - Should report: "Property 'nonExistentMethod' does not exist on type 'RowCore'"

3. **Remove the test line** after verification

## Files to Update

### Priority 1: HIGH RISK (User-Facing/Critical Path)
- [ ] `src/triggers.js` (4 occurrences) - Menu commands, user interactions
- [ ] `src/rowCheck.js` (3 occurrences) - Validation logic
- [ ] `src/AnnouncementManager.js` (5 occurrences) - Announcement system

### Priority 2: MEDIUM RISK (Business Logic)
- [ ] `src/AnnouncementCore.js` (4 occurrences) - Core logic
- [ ] `src/RideManagerCore.js` (1 occurrence) - Core logic
- [ ] `src/UserLogger.js` (3 occurrences) - Infrastructure

## Success Criteria

- [ ] **ZERO `@param {any}` in production code** (except justified with comment)
- [ ] **All type errors resolved** via `get_errors(['src/'])`
- [ ] **`npm run typecheck` passes** with 0 errors
- [ ] **All tests pass** (`npm test`)
- [ ] **VS Code Problems panel clean** for all modified files
- [ ] **Type checking verified** by testing with intentional error

## Benefits

After completion:
- ✅ Runtime errors like `linkRouteURL is not a function` caught at development time
- ✅ IntelliSense provides accurate method/property suggestions
- ✅ Refactoring is safer with compile-time validation
- ✅ Self-documenting code with explicit types
- ✅ Faster development with better tooling support

## Implementation Pattern (from RideManager.js fix)

See `src/RideManager.js` for reference implementation:
- Lines 1-16: Triple-slash reference + typedef declarations
- Lines 84-107: Example of properly typed function
- All 15 functions updated from `{any}` to `RowCoreInstance`
- Verified: Type system catches non-existent method calls

## Acceptance Test

The fix is complete when:

```javascript
// This code in ANY file should show a type error:
function testFunction(row) {  // row is RowCoreInstance
    row.linkRouteURL();  // ❌ TypeScript Error: Property 'linkRouteURL' does not exist
    row.nonExistentMethod();  // ❌ TypeScript Error: Property 'nonExistentMethod' does not exist
}
```

## References

- **Root Cause**: PR #179 - Runtime error from `row.linkRouteURL()`
- **Fix Example**: `src/RideManager.js` - Complete type safety implementation
- **Architecture**: `.github/copilot-instructions.md` - Type checking requirements
