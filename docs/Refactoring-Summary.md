# Refactoring Plan Summary

**Date**: January 1, 2026  
**Status**: Planning Phase  
**Next Action**: Begin Phase 1, Issue #171

## Quick Links

- **Detailed Plan**: [Architecture-Refactoring-Plan.md](Architecture-Refactoring-Plan.md)
- **Architecture Guidelines**: [../.github/copilot-instructions.md](../.github/copilot-instructions.md)

## GitHub Issues Created

### Phase 1: Critical Priority (Complete Before New Features)

| Issue | Title | Priority | Effort | Dependencies |
|-------|-------|----------|--------|--------------|
| [#171](https://github.com/TobyHFerguson/RideManager/issues/171) | Extract RowCore from Row.js - Pure Domain Model | Critical | 2-3 days | None (Foundation) |
| [#172](https://github.com/TobyHFerguson/RideManager/issues/172) | Extract RideManagerCore from RideManager.js - Business Logic | Critical | 3-4 days | After #171 |
| [#173](https://github.com/TobyHFerguson/RideManager/issues/173) | Enhance ScheduleAdapter with Better Dirty Tracking | Critical | 1-2 days | Requires #171 |

**Phase 1 Total**: 6-9 days (approximately 3 weeks)

**Note**: Row.js wrapper is eliminated. ScheduleAdapter returns RowCore instances directly, and all consuming code uses RowCore with camelCase properties.

### Phase 2: High Priority

| Issue | Title | Priority | Effort | Dependencies |
|-------|-------|----------|--------|--------------|
| [#174](https://github.com/TobyHFerguson/RideManager/issues/174) | Extract RowCheckCore from rowCheck.js - Validation Logic | High | 2-3 days | After #172 recommended |

**Phase 2 Total**: 2-3 days (approximately 1 week)

### Phase 3: Optional Enhancements

| Issue | Title | Priority | Effort | Dependencies |
|-------|-------|----------|--------|--------------|
| [#175](https://github.com/TobyHFerguson/RideManager/issues/175) | [Optional] Internalize RWGPS Library with Core/Adapter Pattern | Optional | 4-7 days | After Phase 1 & 2 |

**Recommendation**: Defer Phase 3 unless there are specific pain points with external RWGPSLib.

## Critical Path

```
#171 (RowCore)
   ↓
#172 (RideManagerCore) ← Recommended before #174
   ↓                       ↓
#173 (ScheduleAdapter)  #174 (RowCheckCore)
   ↓                       ↓
   └──── Phase 1 Complete ────┘
              ↓
#175 (RWGPS Internalization - Optional)
```

## Key Decisions Made

### ✅ Keep Fiddler (DO NOT REMOVE)
**Rationale**: Fiddler provides critical architecture benefits:
- Bulk data operations (performance)
- Column name keys (readability)
- Formula preservation (functionality)
- Separation of concerns (architecture)

**Action**: Enhance ScheduleAdapter to better leverage Fiddler patterns (Issue #173)

### ⚠️ Defer RWGPS Internalization
**Rationale**: External library currently works fine. Complete Phase 1 & 2 first, then make informed decision.

**Action**: Created optional issue #175 for future consideration

## Architecture Goals

### Core/Adapter Pattern
```
Pure JavaScript Core (100% tested)
         ↓
Thin GAS Adapter (minimal logic)
```

### What Belongs Where

**Core Modules** (Pure JavaScript, Jest tested):
- Business logic (calculations, decisions)
- Data transformations (parsing, serialization)
- Validation rules
- Algorithm implementations
- Template expansion
- Date calculations
- **Domain properties** (clean camelCase names, framework-agnostic)

**Adapter Modules** (Thin GAS wrappers):
- SpreadsheetApp operations
- GmailApp operations
- CalendarApp operations
- UrlFetchApp operations
- PropertiesService operations
- UI operations (dialogs, alerts)
- ScriptApp operations (triggers)
- **Anti-corruption layer** (mapping persistence ↔ domain)
- **Configuration loading** (getGlobals())

## Implementation Guidelines

### For Each Issue:
1. ✅ Create Core module with pure logic
2. ✅ Write comprehensive tests (100% coverage)
3. ✅ Update Adapter to use Core
4. ✅ Check VS Code Problems panel (⇧⌘M) - must show ZERO errors
5. ✅ Run `npm test && npm run typecheck && npm run validate-exports`
6. ✅ Deploy to dev: `npm run dev:push`
7. ✅ Test in GAS environment
8. ✅ Deploy to prod: `npm run prod:push`

### Pull Request Requirements
Any PR touching Row/RideManager/rowCheck MUST include:
- ✅ Refactoring progress toward Core/Adapter separation
- ✅ Tests for extracted Core logic
- ✅ Updated type definitions (.d.ts files)
- ✅ Documentation updates
- ✅ Zero VS Code errors
- ✅ Zero regression

## Blocking Rules

- ❌ **Block new features** until Phase 1 complete
- ❌ **Block RWGPS internalization** until Phase 1 & 2 complete
- ❌ **Never remove Fiddler** - architectural regression
- ❌ **Never add business logic** to GAS adapters
- ❌ **Never skip test writing** for Core modules

## Success Metrics

### Phase 1 Complete When:
- ✅ RowCore has 100% test coverage
- ✅ RideManagerCore has 100% test coverage
- ✅ ScheduleAdapter uses enhanced dirty tracking
- ✅ All Phase 1 modules deployed to production
- ✅ Zero regressions reported

### Phase 2 Complete When:
- ✅ RowCheckCore has 100% test coverage
- ✅ All validation rules testable without GAS

### Overall Success:
- ✅ >80% of business logic has test coverage
- ✅ GAS code is thin, focused on I/O
- ✅ New features can be added with confidence
- ✅ Bugs caught in tests, not production

## Timeline Estimate

| Phase | Calendar Time | Status |
|-------|---------------|--------|
| Phase 1 | 3 weeks | Not started |
| Phase 2 | 1 week | Not started |
| Phase 3 | 2-3 weeks | Optional |

**Total Critical Path**: 4 weeks for Phase 1 & 2

## Next Steps

1. **Start with Issue #171** (RowCore extraction)
   - Foundation for all other work
   - No dependencies
   - Highest impact

2. **Review Architecture Plan**
   - Read [Architecture-Refactoring-Plan.md](Architecture-Refactoring-Plan.md)
   - Understand Core/Adapter pattern
   - Review code examples

3. **Set Up Development Environment**
   - Ensure all tests pass: `npm test`
   - Ensure type checking passes: `npm run typecheck`
   - Ensure exports valid: `npm run validate-exports`

4. **Create Feature Branch**
   ```bash
   git checkout -b refactor/row-core
   ```

5. **Begin Implementation**
   - Follow guidelines in Issue #171
   - Write tests first (TDD approach recommended)
   - Keep commits small and focused

## Questions?

Refer to:
- [Architecture-Refactoring-Plan.md](Architecture-Refactoring-Plan.md) - Detailed implementation plans
- [../.github/copilot-instructions.md](../.github/copilot-instructions.md) - Architecture principles
- GitHub Issues #171-175 - Specific success criteria

---

**Remember**: Incremental progress with full test coverage is better than large refactoring without tests. Each Core module is a victory for maintainability.
