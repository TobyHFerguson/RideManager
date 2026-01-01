# Refactoring Quick Reference

## 🚀 Getting Started

**Start Here**: Issue [#171](https://github.com/TobyHFerguson/RideManager/issues/171) - Extract RowCore

```bash
# Create feature branch
git checkout -b refactor/row-core

# Verify environment
npm test && npm run typecheck && npm run validate-exports
```

## 📋 Phase 1 Checklist (Critical - Must Complete First)

- [ ] [#171](https://github.com/TobyHFerguson/RideManager/issues/171) Extract RowCore from Row.js (2-3 days)
- [ ] [#172](https://github.com/TobyHFerguson/RideManager/issues/172) Extract RideManagerCore from RideManager.js (3-4 days)
- [ ] [#173](https://github.com/TobyHFerguson/RideManager/issues/173) Enhance ScheduleAdapter (1-2 days)

**Total**: ~3 weeks

## 🎯 Core/Adapter Pattern (The Golden Rule)

```javascript
// ✅ CORRECT

// ModuleCore.js - Pure JavaScript (100% tested)
class ModuleCore {
    static calculateSomething(input, dependencies) {
        // Pure logic, no GAS
        return result;
    }
}

// Module.js - Thin GAS adapter (minimal logic)
class Module {
    doSomething() {
        const input = SpreadsheetApp.getActiveSheet().getValue(); // GAS
        const result = ModuleCore.calculateSomething(input, config); // Core
        GmailApp.sendEmail(result); // GAS
    }
}
```

## 🚫 Anti-Patterns (NEVER DO THIS)

```javascript
// ❌ WRONG - Business logic in GAS adapter
function calculateInAdapter() {
    const value = SpreadsheetApp.getActiveSheet().getValue();
    return value * 2 + complexCalculation(); // Mixed!
}

// ❌ WRONG - Hardcoded GAS dependency
function createItem(operation) {
    return { id: Utilities.getUuid(), ...operation };
}

// ✅ CORRECT - Dependency injection
function createItem(operation, generateId) {
    return { id: generateId(), ...operation };
}
```

## ✅ Pre-Commit Checklist (MANDATORY)

```bash
# 1. MANDATORY FIRST: Check VS Code Problems panel (⇧⌘M)
#    Must show ZERO errors in src/ directory

# 2. Run all tests
npm test

# 3. Check types
npm run typecheck

# 4. Validate exports
npm run validate-exports

# 5. One-liner validation
npm test && npm run typecheck && npm run validate-exports
```

## 📦 Deployment Workflow

```bash
# Development deployment (with debug version)
npm run dev:push

# Production deployment (requires clean git)
npm run prod:push
```

## 📚 Key Documents

| Document | Purpose |
|----------|---------|
| [Refactoring-Summary.md](Refactoring-Summary.md) | Overview & quick links |
| [Architecture-Refactoring-Plan.md](Architecture-Refactoring-Plan.md) | Detailed implementation plans |
| [../.github/copilot-instructions.md](../.github/copilot-instructions.md) | Full architecture guidelines |

## 🔍 Debugging Workflow

```bash
# Run specific test with watch
npm test -- --watch test/__tests__/ModuleCore.test.js

# Check coverage for specific file
npm test -- --coverage --collectCoverageFrom='src/ModuleCore.js'

# Debug in Node.js
node --inspect-brk node_modules/.bin/jest test/__tests__/ModuleCore.test.js

# Open GAS web editor
npm run clasp:open
```

## 📊 Architecture Compliance Scorecard

| Module | Status | Action |
|--------|--------|--------|
| AnnouncementCore/Manager | ✅ Model | Reference this |
| TriggerManagerCore/Manager | ✅ Model | Reference this |
| **Row + ScheduleAdapter** | ❌ **Issue #171** | Start here |
| **RideManager** | ❌ **Issue #172** | Do second |
| **rowCheck** | ⚠️ **Issue #174** | Do after #172 |

## 💡 Implementation Tips

### Test-First Development
1. Write test for expected behavior
2. Watch it fail
3. Implement Core logic
4. Watch it pass
5. Write Adapter to use Core
6. Test in GAS

### Keep Commits Small
```bash
git commit -m "feat(RowCore): Add RideName getter/setter with dirty tracking"
git commit -m "test(RowCore): Add tests for RideName property"
git commit -m "refactor(Row): Delegate RideName to RowCore"
```

### Test Coverage Requirements
- **Statements**: 100%
- **Branches**: 100% (except Node.js compatibility checks)
- **Functions**: 100%
- **Lines**: 100%

## 🚧 Blocking Rules

- ❌ No new features until Phase 1 complete
- ❌ No RWGPS internalization until Phase 1 & 2 complete
- ❌ NEVER remove Fiddler (architectural regression)
- ❌ NEVER add business logic to adapters
- ❌ NEVER skip tests for Core modules
- ❌ NEVER proceed with VS Code errors

## 🎬 When to Ask for Help

- Stuck on architectural decision (Core vs Adapter)
- Test coverage not reaching 100%
- VS Code type errors you can't resolve
- Regression in production behavior
- Unclear on dependency injection pattern

## 📝 PR Requirements

Every PR must include:
- ✅ Tests for Core logic (100% coverage)
- ✅ Updated .d.ts type definitions
- ✅ Zero VS Code errors
- ✅ Documentation updates (if user-facing)
- ✅ All validation passing: `npm test && npm run typecheck && npm run validate-exports`

## 🏆 Success Criteria

**Phase 1 Complete When**:
- RowCore, RideManagerCore, ScheduleAdapter all refactored
- 100% test coverage for Core modules
- Zero regressions in production
- New features can be added with test coverage

---

**Remember**: "Perfect is the enemy of good, but untested is the enemy of everything." - Ancient Developer Proverb (probably)

**Next Action**: Open Issue [#171](https://github.com/TobyHFerguson/RideManager/issues/171) and start with RowCore extraction.
