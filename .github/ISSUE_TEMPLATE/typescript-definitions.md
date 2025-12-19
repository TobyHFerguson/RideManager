---
name: Add TypeScript Definitions for All Modules
about: Track technical debt for missing TypeScript definition files across the codebase
title: 'Add TypeScript definitions (.d.ts) for all modules to prevent API mismatches'
labels: technical-debt, enhancement, typescript
assignees: ''

---

## Problem Statement

During RetryQueue testing, we encountered **14+ runtime errors** caused by API mismatches that TypeScript definitions would have caught at development time:
- `schedule.getLastRow()` vs `loadLastRow()`
- `_rowNum` vs `rowNum`
- Static method calls on class requiring instantiation
- Method name mismatches (`getQueueStatus()` vs `getStatus()`)
- Property name errors (`nextRetry` vs `nextRetryAt`)

**Current Coverage**: Only 9 modules have `.d.ts` files:
- ✅ Event.d.ts
- ✅ EventFactory.d.ts
- ✅ Externals.d.ts
- ✅ Globals.d.ts
- ✅ GoogleCalendarManager.d.ts
- ✅ Groups.d.ts
- ✅ MenuFunctions.d.ts
- ✅ RideManager.d.ts
- ✅ UIManager.d.ts

**Missing Coverage**: ~30+ modules lack TypeScript definitions, including critical infrastructure:
- ❌ RetryQueue.js
- ❌ RetryQueueCore.js
- ❌ ScheduleAdapter.js
- ❌ Row.js
- ❌ Commands.js
- ❌ ProcessingManager.js
- ❌ rowCheck.js
- ❌ HyperlinkUtils.js
- ❌ RouteColumnEditor.js
- ❌ UserLogger.js
- ❌ And many more...

## Business Impact

**Development Velocity**: Every API mismatch requires:
1. User encounters runtime error in GAS
2. Developer investigates error logs
3. Find actual API signature
4. Fix code
5. Push to GAS
6. User re-tests

This cycle repeats for each error, wasting significant time.

**Code Quality**: TypeScript definitions provide:
- Auto-completion in VS Code
- Type checking before deployment
- Self-documenting APIs
- Refactoring confidence

## Technical Requirements

### Phase 1: Critical Infrastructure (Priority: HIGH)
Create `.d.ts` files for modules with complex APIs or frequent usage:

1. **RetryQueueCore.d.ts** - Pure JavaScript with complex interfaces
   ```typescript
   interface QueueItem {
       id: string;
       type: 'create' | 'update' | 'delete';
       calendarId: string;
       rideUrl: string;
       params: any;
       userEmail: string;
       enqueuedAt: number;
       nextRetryAt: number;
       attemptCount: number;
       lastError: string | null;
   }
   
   interface RetryResult {
       shouldRetry: boolean;
       updatedItem: QueueItem;
   }
   ```

2. **RetryQueue.d.ts** - GAS adapter class
3. **ScheduleAdapter.d.ts** - Complex spreadsheet I/O
4. **Row.d.ts** - Data model with many properties
5. **Commands.d.ts** - Command pattern interface

### Phase 2: Business Logic (Priority: MEDIUM)
6. **ProcessingManager.d.ts**
7. **rowCheck.d.ts** - Validation functions
8. **HyperlinkUtils.d.ts**
9.  **RouteColumnEditor.d.ts**

### Phase 3: Supporting Modules (Priority: LOW)
11. **UserLogger.d.ts**
12. **utils.d.ts**
13. **testEvent.d.ts**
14. **testRetryQueue.d.ts**
15. All remaining modules

## Architecture Guidelines

Following `.github/copilot-instructions.md` patterns:

### For Pure JavaScript Modules (*Core.js)
```typescript
/**
 * Pure JavaScript module - no GAS dependencies
 * Can be tested in Jest with 100% coverage
 */
declare class ModuleName {
    static method(param: Type): ReturnType;
}

export = ModuleName;
```

### For GAS Adapter Modules
```typescript
/**
 * GAS-specific adapter - thin wrapper around Core logic
 */
declare class ModuleName {
    constructor();
    method(param: Type): ReturnType;
    private _gasSpecificMethod(): void;
}

export = ModuleName;
```

### For Frozen Command Objects
```typescript
interface Command {
    readonly name: string;
    readonly execute: (rows: Row[], rwgps: any, force: boolean) => void;
}

declare const Commands: {
    readonly commandName: Command;
};

export = Commands;
```

## Acceptance Criteria

- [ ] All Phase 1 modules have `.d.ts` files
- [ ] TypeScript checking enabled in VS Code workspace
- [ ] JSDoc comments enhanced to support TypeScript inference
- [ ] `jsconfig.json` configured for type checking
- [ ] Documentation updated with TypeScript examples
- [ ] CI/CD pipeline validates TypeScript definitions (if applicable)

## Testing Strategy

1. Create `.d.ts` file
2. Add `// @ts-check` to corresponding `.js` file
3. Verify VS Code shows type errors for known issues
4. Fix any discovered type mismatches
5. Remove `// @ts-check` after validation (optional, based on team preference)

## Related Issues

- Created after successful RetryQueue testing (#[issue number])
- Blocked by: None
- Blocks: Future refactoring work

## Estimated Effort

- Phase 1 (5 modules): ~8 hours
- Phase 2 (5 modules): ~6 hours  
- Phase 3 (remaining): ~10 hours
- **Total**: ~24 hours (3 days)

## Benefits

✅ **Prevent runtime errors** - Catch API mismatches at development time
✅ **Improve developer experience** - Auto-completion and inline documentation
✅ **Enable safer refactoring** - Type checking during code changes
✅ **Self-documenting code** - Types serve as executable documentation
✅ **Reduce debugging time** - Fix issues before deployment

---

**Note**: This is technical debt from the original GAS-first development approach. Adding TypeScript definitions incrementally will modernize the codebase without requiring a full rewrite.
