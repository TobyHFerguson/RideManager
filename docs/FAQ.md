# Refactoring FAQ

## Common Questions

### Q: How do I run `get_errors(['src/'])`?

**A**: You don't! This is a tool your **AI assistant uses**, not a command you run.

Instead, you should:

**Option 1**: Check VS Code Problems Panel (Easiest)
```
⇧⌘M (Shift+Command+M on Mac)
View → Problems
```
Must show **0 problems** in `src/` directory.

**Option 2**: Run TypeScript compiler
```bash
npm run typecheck
```

**Option 3**: Ask your AI assistant
Your AI assistant can run `get_errors` tool for you and report the results.

---

### Q: What's the difference between `npm run typecheck` and VS Code errors?

**A**: **VS Code is MORE STRICT** than `tsc --noEmit`.

- ✅ **Always check VS Code Problems panel first** - it catches more errors
- ⚠️ `npm run typecheck` may pass even when VS Code shows errors
- 🔍 VS Code catches: Implicit `any` types, generic types without parameters, implicit `any[]` arrays

**Rule**: Both must pass, but VS Code is the source of truth.

---

### Q: Should I remove Fiddler?

**A**: **NO! Absolutely not.**

Removing Fiddler would be an **architectural regression**. Fiddler provides:
- Bulk data operations (critical for performance)
- Column name keys (row.RideName instead of row[5])
- Formula preservation (HYPERLINK formulas)
- Separation of concerns (I/O layer)

**Action**: Keep Fiddler. Enhance ScheduleAdapter to use it better (Issue #173).

---

### Q: Should I internalize RWGPS Library?

**A**: **Not yet. Defer until Phase 1 & 2 complete.**

Reasons to wait:
- External library currently works fine
- Complete Row/RideManager refactoring first
- Then make informed decision with testable architecture in place
- Less maintenance burden if it works

**Action**: Complete Phase 1 & 2, then reconsider (Issue #175).

---

### Q: Can I add new features while refactoring?

**A**: **No. Block new features until Phase 1 complete.**

Exceptions:
- Critical bug fixes (apply to production, merge back)
- Small features that include Core extraction as part of the PR

**Reason**: Need testable architecture before safely adding features.

---

### Q: Which issue should I start with?

**A**: **Issue #171 - Extract RowCore**

This is the foundation:
- No dependencies
- Enables all other refactoring
- Highest impact on architecture
- 2-3 days effort

**Don't start with** RideManager or ScheduleAdapter - they depend on RowCore.

---

### Q: Do I need 100% test coverage?

**A**: **Yes, for Core modules. No exceptions.**

- Core modules (pure JavaScript): 100% coverage required
- Adapter modules (GAS wrappers): Integration tests where feasible
- Acceptable uncovered: Only `if (typeof require !== 'undefined')` checks

**Reason**: Untested code is broken code waiting to happen.

---

### Q: What if I can't reach 100% coverage?

**A**: You probably have business logic in the adapter layer.

**Solution**:
1. Extract that logic to Core module
2. Test it there (easy without GAS)
3. Adapter becomes thin wrapper (doesn't need 100% coverage)

**Pattern**: If it's hard to test, it belongs in Core.

---

### Q: Can I do multiple phases simultaneously?

**A**: **No. Each phase depends on the previous.**

- Phase 1.3 (ScheduleAdapter) requires Phase 1.1 (RowCore)
- Phase 2 (RowCheckCore) recommended after Phase 1.2 (RideManagerCore)
- Phase 3 (RWGPS) requires Phase 1 & 2 complete

**Strategy**: Incremental, deployed progress is safer than big-bang refactoring.

---

### Q: How do I know my refactoring is correct?

**A**: Follow the success criteria checklist:

- ✅ Core module has 100% test coverage
- ✅ All tests pass: `npm test`
- ✅ Type check passes: `npm run typecheck`
- ✅ VS Code shows 0 errors (⇧⌘M)
- ✅ Exports valid: `npm run validate-exports`
- ✅ Deployed to dev: `npm run dev:push`
- ✅ Manual testing in GAS environment
- ✅ Zero regression in production behavior

---

### Q: What if I find a bug during refactoring?

**A**: Document it but **don't fix it yet** (unless critical).

**Process**:
1. Create GitHub issue for the bug
2. Add test that demonstrates the bug
3. Mark test as `.skip` or expected to fail
4. Complete refactoring first
5. Fix bug in separate PR with test

**Reason**: Don't mix refactoring with behavior changes.

---

### Q: My PR is getting too large. What do I do?

**A**: **Break it into smaller PRs.**

**Example for RowCore**:
- PR 1: Create RowCore with getters/setters (no tests yet)
- PR 2: Add tests for RowCore (reach 100% coverage)
- PR 3: Refactor Row to delegate to RowCore
- PR 4: Remove dead code from Row

**Each PR**: Deployed, tested, verified independently.

---

### Q: Should I update documentation while refactoring?

**A**: **Yes, but incrementally.**

Update these with each PR:
- ✅ Module .d.ts files (type definitions)
- ✅ JSDoc comments in code
- ✅ Issue success criteria checkboxes

Update these at end of phase:
- ⏭️ Architecture-Refactoring-Plan.md (status)
- ⏭️ Copilot-instructions.md (if patterns change)

---

### Q: How do I handle emergencies during refactoring?

**A**: Production always has a working version.

**Process**:
1. Checkout master/production branch
2. Apply hotfix directly
3. Deploy to production
4. Merge hotfix back to refactoring branch
5. Continue refactoring

**Reason**: Each phase deploys independently. Production is never broken.

---

### Q: What's the difference between Row and RowCore?

**A**: After refactoring, **only RowCore exists**. Row wrapper is eliminated as unnecessary complexity.

**RowCore** (Pure Domain Model):
- Uses clean camelCase property names (`rideName`, not `'Ride Name'`)
- NO knowledge of spreadsheet columns
- NO getGlobals() calls
- Business logic (validation, calculations)
- Dirty field tracking
- Testable in Jest with plain objects

**ScheduleAdapter** (Anti-Corruption Layer):
- Builds columnMap from getGlobals() spreadsheet configuration
- Maps spreadsheet columns → RowCore domain properties
- Maps RowCore properties → spreadsheet columns
- Handles SpreadsheetApp operations
- Handles formula preservation
- Returns RowCore instances directly

**Old Row class** (Removed):
- Was originally a wrapper around RowCore
- Provided PascalCase API (`RideName`) for backward compatibility
- Added unnecessary complexity
- **Eliminated in refactoring** - consuming code uses RowCore directly

**Example**:
```javascript
// ScheduleAdapter creates RowCore instances
const scheduleAdapter = new ScheduleAdapter();
const rows = scheduleAdapter.load(); // Returns RowCore[]

// Use RowCore directly with camelCase
rows.forEach(row => {
    console.log(row.rideName);  // Direct access
    if (row.isScheduled()) {
        // Domain logic
    }
});

// Modify and save
row.rideName = 'New Name';
row.markDirty('rideName');
scheduleAdapter.saveDirtyFields(row);
```

**Why Row was removed**: ScheduleAdapter handles all GAS I/O, RowCore has all domain logic. Row wrapper added no value.

---

### Q: Can I use AI to help with refactoring?

**A**: **Yes! Your AI assistant knows the architecture.**

The AI assistant can:
- ✅ Check for errors using `get_errors` tool
- ✅ Suggest Core/Adapter separation
- ✅ Review code for architectural compliance
- ✅ Generate test templates
- ✅ Explain patterns from copilot-instructions

**Ask for**: Architecture reviews, pattern explanations, test strategies.

---

### Q: Where can I find code examples?

**A**: **Look at existing model modules:**

- `src/AnnouncementCore.js` + `src/AnnouncementManager.js` - Perfect Core/Adapter
- `src/TriggerManagerCore.js` + `src/TriggerManager.js` - State management pattern
- `src/RWGPSMembersCore.js` + `src/RWGPSMembersAdapter.js` - Data transformation
- `src/RouteColumnEditor.js` - Pure JavaScript utility (no adapter needed)
- `src/HyperlinkUtils.js` - String parsing utilities

**Study these** before implementing your refactoring.

---

### Q: What if I disagree with the architecture?

**A**: **Discuss first, then decide.**

Process:
1. Create GitHub issue with your concerns
2. Explain alternative approach
3. Discuss pros/cons
4. Update architecture docs if consensus changes
5. Then implement

**Don't**: Silently implement different architecture.

---

### Q: How long will this take?

**A**: **Estimated timeline:**

- Phase 1 (Critical): 3 weeks
  - Issue #171 (RowCore): 2-3 days
  - Issue #172 (RideManagerCore): 3-4 days
  - Issue #173 (ScheduleAdapter): 1-2 days

- Phase 2 (High Priority): 1 week
  - Issue #174 (RowCheckCore): 2-3 days

- Phase 3 (Optional): 2-3 weeks
  - Issue #175 (RWGPS): 4-7 days

**Total Critical Path**: 4 weeks for Phase 1 & 2.

---

### Q: What happens after refactoring is complete?

**A**: **New features become safe and easy to add.**

Benefits:
- ✅ Business logic is tested (catch bugs before production)
- ✅ Refactoring is safe (tests verify behavior)
- ✅ New features have clear architecture (Core vs Adapter)
- ✅ Debugging is easier (can test Core in Node.js)
- ✅ Confidence is higher (automated verification)

**Goal**: Sustainable development velocity with quality.

---

## Still Have Questions?

- Check [Architecture-Refactoring-Plan.md](Architecture-Refactoring-Plan.md) for detailed plans
- Check [Refactoring-Quick-Reference.md](Refactoring-Quick-Reference.md) for code patterns
- Check [copilot-instructions.md](../.github/copilot-instructions.md) for full guidelines
- Ask your AI assistant for specific help

---

### Q: Why can't RowCore just use spreadsheet column names directly?

**A**: That would be a **leaky abstraction** violating Hexagonal Architecture principles.

**The Problem**:
```javascript
// ❌ BAD - Domain depends on persistence
class RowCore {
    constructor(data) {
        this._data = data; // Keys are 'Ride Name', 'Start Date'
    }
    get rideName() { return this._data['Ride Name']; } // Spreadsheet column!
}
```

**Issues**:
- RowCore can't be tested without knowing spreadsheet structure
- Changing spreadsheet columns breaks domain model
- Can't reuse RowCore with different data sources (database, API)
- Violates separation of concerns

**The Solution**: Anti-Corruption Layer
```javascript
// ✅ GOOD - Pure domain model
class RowCore {
    constructor({ rideName, startDate }) {
        this.rideName = rideName;  // Clean property
        this.startDate = startDate;
    }
}

// ✅ GOOD - Adapter handles mapping
class ScheduleAdapter {
    constructor() {
        const globals = getGlobals();
        this.columnMap = {
            [globals.RIDENAMECOLUMNNAME]: 'rideName',
            [globals.STARTDATETIMECOLUMNNAME]: 'startDate'
        };
    }
    
    load() {
        const spreadsheetData = this.fiddler.getData();
        return spreadsheetData.map(row => {
            const domainData = {};
            for (const [col, prop] of Object.entries(this.columnMap)) {
                domainData[prop] = row[col];
            }
            return new RowCore(domainData);
        });
    }
}
```

**Benefits**:
- RowCore is 100% testable with plain objects
- Spreadsheet structure can change without touching RowCore
- Could swap to database without changing RowCore
- Proper separation: domain logic vs persistence

**This is Hexagonal Architecture** (Ports & Adapters pattern) - the adapter protects the domain from external concerns.

---

**Remember**: If you're unsure, ask! Better to clarify now than refactor twice.
