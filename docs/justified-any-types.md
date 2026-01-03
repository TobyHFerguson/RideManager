# Justified `{any}` Type Usage

This document tracks the **2 justified** uses of `@param {any}` in the codebase.

## Policy

The codebase enforces **strict type checking** system-wide. The use of `@param {any}` is **prohibited** unless:

1. The parameter truly accepts arbitrary data with no expected structure
2. The usage is documented with a clear justification comment
3. The usage is approved and tracked in this document

## Approved Uses

### 1. UserLogger.js - `additionalData` parameter

**File**: `src/UserLogger.js`  
**Line**: 19  
**Parameter**: `additionalData`  
**Justification**: "Arbitrary user activity data (structure not constrained, will be stringified)"

**Context**: The UserLogger.log() method accepts arbitrary metadata about user actions. This data is logged as-is for audit purposes and has no constrained structure. The parameter is immediately stringified via JSON.stringify().

```javascript
/**
 * @param {any} additionalData - Arbitrary user activity data (structure not constrained, will be stringified)
 */
static log(action, details = '', additionalData = {}) {
    // ... stringified before storage
}
```

### 2. UserLoggerCore.js - `additionalData` parameter

**File**: `src/UserLoggerCore.js`  
**Line**: 19  
**Parameter**: `additionalData`  
**Justification**: "Arbitrary user activity data (structure not constrained, will be stringified)"

**Context**: The UserLoggerCore.formatLogEntry() method accepts arbitrary metadata for log formatting. The data structure is not constrained and is immediately stringified via JSON.stringify().

```javascript
/**
 * @param {any} additionalData - Arbitrary user activity data (structure not constrained, will be stringified)
 */
static formatLogEntry(action, details, additionalData, user, timestamp) {
    return {
        // ...
        additionalData: JSON.stringify(additionalData)
    };
}
```

## Verification

To verify no unjustified `{any}` types exist:

```bash
# Show all @param {any} (should only be the 2 above)
grep -rn "@param {any}" src/ --include="*.js"

# Count them (should be 2)
grep -r "@param {any}" src/ --include="*.js" | wc -l
```

Expected output: 2 occurrences with justification comments.

## Historical Context

Before this cleanup (Issue #XXX):
- **17 total** `@param {any}` occurrences across 7 files
- **15 eliminated** by using proper types (RowCoreInstance, Object shapes, GAS types, union types)
- **2 retained** with proper justification (UserLogger/UserLoggerCore)

## Benefits Achieved

After enforcement:
- ✅ Runtime errors like `row.linkRouteURL is not a function` caught at development time
- ✅ IntelliSense provides accurate method/property suggestions
- ✅ Refactoring is safer with compile-time validation
- ✅ Self-documenting code with explicit types
- ✅ Faster development with better tooling support

## Maintenance

When reviewing PRs:
- ❌ Reject any new `@param {any}` without justification
- ✅ Verify justification meets policy requirements
- ✅ Update this document if new justified uses are approved
