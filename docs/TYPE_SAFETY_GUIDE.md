# Type Safety Guide

## The Problem We're Solving

**Critical Gap Identified**: Manual `.d.ts` type definition files can drift from their `.js` implementations, causing TypeScript to validate against **incorrect type signatures**. This allows bugs to pass type checking and reach production.

**Real Example**: `RowCore.d.ts` declared `get announcementUrl()` while `RowCore.js` implemented `get announcementURL()`. TypeScript didn't catch 11 references to the wrong property name in `AnnouncementManager.js` because it was checking against the incorrect `.d.ts` file.

## Our Multi-Layered Type Safety Strategy

### Layer 1: TypeScript Compiler (`tsc --noEmit`)

**What it checks**:
- Type consistency across the codebase
- Method calls against declared types
- Parameter types
- Return types

**Limitations**:
- Only checks against `.d.ts` declarations, not actual implementations
- Doesn't verify `.d.ts` files match `.js` files

**When to run**: After EVERY code change
```bash
npm run typecheck
```

### Layer 2: Type Definition Validation (`validate-type-definitions.js`)

**What it checks**:
- `.d.ts` declarations match actual `.js` implementations
- Public methods exist in both files
- Property names are consistent

**What it catches**:
- Missing method declarations in `.d.ts`
- Misspelled property names (like `announcementUrl` vs `announcementURL`)
- Declared methods that don't exist in implementation

**When to run**: After modifying ANY `.js` or `.d.ts` file
```bash
npm run validate-types
```

**How it works**:
1. Loads `.js` module in Node.js to inspect actual properties
2. Parses `.d.ts` file for declared properties
3. Compares and reports mismatches

**Current status**: Validation script created, found 33 errors to fix

### Layer 3: JSDoc Type Annotations

**What it provides**:
- Inline type documentation in `.js` files
- Type inference for parameters and return values
- IntelliSense support in VS Code

**Best practices**:
```javascript
/**
 * Process announcement for a ride
 * 
 * @param {InstanceType<typeof RowCore>} row - Row instance
 * @param {string} templateUrl - Google Doc template URL
 * @returns {{success: boolean, error?: string}} Processing result
 */
function processAnnouncement(row, templateUrl) {
    // TypeScript validates based on JSDoc types
}
```

**Benefits**:
- TypeScript can generate `.d.ts` from JSDoc (future improvement)
- Self-documenting code
- IDE support

### Layer 4: Test Coverage

**What it verifies**:
- Business logic correctness
- Edge cases and error handling
- Runtime behavior

**Requirements**:
- 100% coverage for pure JavaScript Core modules
- Tests run in Node.js (fast, no GAS required)

```bash
npm test -- --coverage
```

### Layer 5: CI/CD Automation

**GitHub Actions workflow** (`.github/workflows/type-check.yml`):
- Runs on every push and pull request
- Validates:
  1. TypeScript type checking (`npm run typecheck`)
  2. Type definition consistency (`npm run validate-types`)
  3. No undocumented type suppressions (grep for `@ts-ignore` without comments)

**Prevents**:
- Merging code with type errors
- Deploying code with `.d.ts` drift
- Silent type suppressions

## Mandatory Workflow (UPDATED)

### Before Making ANY Code Change:

1. **Understand what you're changing**:
   - If modifying `.js` → You MUST update `.d.ts`
   - If adding/removing methods → Update both files
   - If changing parameter types → Update JSDoc AND `.d.ts`

### After EVERY Code Change:

**CRITICAL: Run ALL validations**:
```bash
npm run validate-all
```

This runs:
1. ✅ `validate-exports` - Verify module loading order
2. ✅ `typecheck` - TypeScript validation
3. ✅ `validate-types` - `.d.ts` consistency check
4. ✅ `test` - All Jest tests

**OR run individually**:
```bash
npm run typecheck           # TypeScript errors
npm run validate-types      # .d.ts drift detection
npm test                    # Runtime behavior
```

### Before Committing:

1. ✅ ALL validations passing (`npm run validate-all`)
2. ✅ Update BOTH `.js` and `.d.ts` files
3. ✅ Update tests if behavior changed
4. ✅ Add JSDoc comments for new functions

### Before Deploying:

1. ✅ Clean git state (no uncommitted changes)
2. ✅ All validations passing
3. ✅ Manual testing in dev environment

```bash
npm run validate-all && npm run dev:push
```

## Common Type Errors and How to Fix Them

### Error: Property doesn't exist on type

**Symptom**:
```
Property 'announcementUrl' does not exist on type 'RowCore'
```

**Causes**:
1. Typo in property name
2. Property not declared in `.d.ts`
3. Using wrong casing (url vs URL)

**Fix**:
```bash
# 1. Check actual implementation
grep -n "get announcement" src/RowCore.js

# 2. Check type definition
grep -n "announcement" src/RowCore.d.ts

# 3. Fix the mismatch (update .d.ts or fix typo)
```

### Error: Type definition validation failed

**Symptom**:
```
❌ RowCore: Property "announcement" exists in .js but not declared in .d.ts
```

**Fix**:
Add the missing declaration to `.d.ts`:
```typescript
/** Get announcement as RichText object (backward compatibility) */
get announcement(): {text: string, url: string};
```

### Warning: Property declared but not found

**Symptom**:
```
⚠️  RowCore: Property "startDate" declared in .d.ts but not found in .js
```

**Explanation**: These are instance properties set in constructor, not methods/getters. The validation script can't detect them through prototype inspection. This is expected and can be ignored.

## Future Improvements

### 1. Generate `.d.ts` from JSDoc (Recommended)

Instead of manually maintaining 33 `.d.ts` files, generate them automatically:

```bash
npm install --save-dev typescript-json-schema
```

**Benefits**:
- Single source of truth (JSDoc in `.js` files)
- No drift possible
- Less maintenance

**Tradeoffs**:
- Generated files may be verbose
- Requires comprehensive JSDoc
- Build step added to workflow

### 2. Runtime Type Validation

Use libraries like `zod` or `io-ts` for runtime validation:

```javascript
const RowSchema = z.object({
    rideName: z.string(),
    rideURL: z.string().url(),
    startDate: z.date()
});

// Validates at runtime
const row = RowSchema.parse(data);
```

**Benefits**:
- Catches type errors at GAS runtime
- Self-documenting schemas
- Runtime safety

**Tradeoffs**:
- Additional dependency
- Performance overhead
- GAS compatibility concerns

### 3. Strict Mode Everywhere

Enable strictest TypeScript settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Status**: Already enabled `strict: true` and `noImplicitAny: true`

## Monitoring and Metrics

### Key Metrics to Track:

1. **Type Error Count**: Should always be 0
   ```bash
   npm run typecheck 2>&1 | grep "error TS"
   ```

2. **Type Definition Drift**: Should always be 0 errors
   ```bash
   npm run validate-types
   ```

3. **Test Coverage**: Core modules should be 100%
   ```bash
   npm test -- --coverage
   ```

4. **Undocumented Type Suppressions**: Should be 0
   ```bash
   grep -r "@ts-ignore$" src/ | wc -l
   ```

### Dashboard (Future)

Consider creating a pre-commit hook that shows:
```
🔍 Type Safety Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TypeScript Errors:      0
✅ Type Definition Drift:  0  
✅ Test Coverage:          97.72%
⚠️  Type Suppressions:     15 (all documented)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Summary: Your Type Safety Checklist

**Every Code Change**:
- [ ] Modify `.js` implementation
- [ ] Update `.d.ts` declaration
- [ ] Update JSDoc comments
- [ ] Run `npm run validate-all`
- [ ] All checks passing

**Before Every Commit**:
- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run validate-types` → 0 errors
- [ ] `npm test` → All passing
- [ ] No undocumented `@ts-ignore`

**Every Deploy**:
- [ ] CI/CD passing
- [ ] Manual testing in dev
- [ ] Clean git state

**Remember**: Type safety is a **system**, not a single tool. Each layer catches different issues. Use them all!
