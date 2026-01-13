# RWGPS Library Refactoring Tasks

## How to Use This File

1. **Start each session** by reading this file
2. **Pick the next unchecked task** (marked with `[ ]`)
3. **Follow the steps exactly** - run tests after each change
4. **Mark completed** when done (change `[ ]` to `[x]`)
5. **Commit after each task** with a descriptive message

**IMPORTANT**: This task file enforces architectural patterns from `.github/copilot-instructions.md`. The rules below are MANDATORY for all code changes.

## Rules (CRITICAL)

### Workflow Rules
1. **ONE task at a time** - never skip ahead
2. **Run tests after EVERY code change**: `npm test -- test/__tests__/RWGPSCharacterization.test.js`
3. **If tests fail**: STOP. Do not continue. Either fix or ask for help.
4. **If tests pass**: Commit immediately, then continue
5. **Read the fixtures** in `test/fixtures/rwgps-api/` when you need to understand expected behavior

### Architectural Rules (MANDATORY)

**Core/Adapter Separation**:
- **Core modules** (`*Core.js`): Pure JavaScript, NO GAS dependencies, 100% test coverage
- **Adapter modules** (`*.js`): Thin wrappers, ONLY UrlFetchApp/GAS API calls, minimal logic
- **Pattern**: Extract ALL business logic to Core, adapters only handle I/O

**Test-First Development**:
- **MUST write tests BEFORE implementation** (not after)
- Tests will fail initially (code doesn't exist yet) - this is correct
- Only implement after tests are written
- Achieve 100% coverage: `npm test -- --coverage --collectCoverageFrom='src/rwgpslib/*Core.js'`

**Type Safety (Zero Tolerance)**:
- **Create `.d.ts` files FIRST** before writing implementation
- **Run `npm run typecheck` after EVERY change** - must show ZERO errors
- **Use class pattern** with static methods (NOT namespace pattern)
- **Explicit JSDoc types** on ALL parameters (no `@param {any}` or `@param {Object}`)
- Use specific types: `@param {{field: string}} options` not `@param {Object} options`
- Error handling: `catch (error)` → `const err = error instanceof Error ? error : new Error(String(error));`

**Code Quality**:
- Use `class ClassName { static method() {} }` pattern (full type checking)
- NO `var ModuleName = (function() { return {...}; })()` pattern (creates type blind spots)
- Add JSDoc to ALL functions with parameter types and return types
- Example:
  ```javascript
  /**
   * Delete an event
   * @param {string} eventUrl - Full URL to event
   * @returns {{success: boolean, error?: string}} Result object
   */
  static deleteEvent(eventUrl) { }
  ```

## Current Status

**Phase**: 3 - Simplify Architecture
**Model recommendation**: Sonnet 4.5 or Opus 4.5

---

## Phase 3: Simplify Architecture

### Goal
Replace the layered structure with a single unified client:
```
BEFORE: RWGPS → RWGPSService → ApiService → UrlFetchApp
AFTER:  RWGPSClient → UrlFetchApp
```

### Task 3.1: Create RWGPSClient skeleton
- [x] **Create `.d.ts` FIRST**: `src/rwgpslib/RWGPSClientCore.d.ts` with method signatures
- [x] **Write tests**: `test/__tests__/RWGPSClientCore.test.js` (will fail - no implementation yet)
- [x] **Create Core**: `src/rwgpslib/RWGPSClientCore.js` with class and static methods:
  - `parseEventUrl(eventUrl)` - Extract event ID from URL
  - `buildRequestOptions(method, payload)` - Build HTTP request options
  - `validateEventData(eventData)` - Validate event fields
- [x] **Create Adapter**: `src/rwgpslib/RWGPSClient.js` (thin wrapper)
  - Constructor takes credentials (apiKey, authToken, username, password)
  - Method stubs: `scheduleEvent()`, `updateEvent()`, `cancelEvent()`, `reinstateEvent()`, `deleteEvent()`, `importRoute()`
  - Each method delegates to Core for logic, uses UrlFetchApp for I/O
- [x] **Run typecheck**: `npm run typecheck` (must show ZERO errors)
- [x] **Run tests**: Should pass (Core logic tested, adapter stubs don't break anything)
- [x] **Commit**: "Add RWGPSClient skeleton with Core/Adapter separation"

### Task 3.2: Move authentication logic
- [x] Copy `login()` method from ApiService to RWGPSClient
- [x] Copy `_prepareRequest()` helper for Basic Auth
- [x] RWGPSClient should handle BOTH web session AND Basic Auth internally
- [x] Run tests
- [x] Commit: "Move authentication to RWGPSClient"

### Task 3.3: Implement deleteEvent (simplest operation)
- [x] Read `test/fixtures/rwgps-api/unschedule.json` to understand the API calls
- [x] Implement `deleteEvent(eventUrl)` in RWGPSClient
- [x] It should: login → DELETE to v1 API → return success/failure
- [x] Add test in `test/__tests__/RWGPSClient.test.js` using mock server (6 tests)
- [x] Fix fixtures: Replace `[REDACTED]` cookies with real mock values
- [x] Run all tests (448 pass)
- [x] Commit: "Implement RWGPSClient.deleteEvent" (9f3164b)

### Task 3.4: Wire RWGPSClient.deleteEvent to existing code ✅
- [x] Find where `batch_delete_events` is called (grep for it)
- [x] Create adapter that calls RWGPSClient.deleteEvent instead
- [x] Run tests
- [x] Commit: "Wire RWGPSClient.deleteEvent to existing callers" (19fde58)
- [x] First GAS deployment successful (commit 69cc412)
- [x] Note: Fixed validate-exports to handle subdirectories and indented class declarations
- [x] Fixed IIFE pattern compatibility for GAS (commit d6c9f2b)
- [x] **TESTED IN GAS**: Unschedule operation confirmed working

### Task 3.5: Implement getEvent ✅
- [x] Read Cancel/Reinstate fixtures to see how getAll works
- [x] Implement `getEvent(eventUrl)` in RWGPSClient
- [x] Returns the event object (parsed JSON)
- [x] Add tests using mock server (5 tests)
- [x] Commit: "Implement RWGPSClient.getEvent" (22edfa8)

### Task 3.6: Implement editEvent
- [ ] Read Update fixture for the double-edit pattern
- [ ] Implement `editEvent(eventUrl, eventData)` in RWGPSClient
- [ ] Include the all_day workaround (for now - we'll test removing it later)
- [ ] Add tests using mock server
- [ ] Commit: "Implement RWGPSClient.editEvent"

### Task 3.7: Implement cancelEvent using getEvent + editEvent
- [ ] `cancelEvent(eventUrl)` should:
  - Call `getEvent()` to fetch current data
  - Add "CANCELLED: " prefix to name
  - Call `editEvent()` with modified data
- [ ] Verify behavior matches fixtures
- [ ] Add tests
- [ ] Commit: "Implement RWGPSClient.cancelEvent"

### Task 3.8: Implement reinstateEvent
- [ ] Similar to cancelEvent but removes "CANCELLED: " prefix
- [ ] Add tests
- [ ] Commit: "Implement RWGPSClient.reinstateEvent"

### Task 3.9: Implement copyTemplate
- [ ] Read Schedule fixture for copy_template behavior
- [ ] NOTE: Returns new event URL from Location header
- [ ] Add tests
- [ ] Commit: "Implement RWGPSClient.copyTemplate"

### Task 3.10: Implement scheduleEvent
- [ ] `scheduleEvent(templateUrl, eventData, organizerNames)` should:
  - Copy template → get new URL
  - Look up organizers by name
  - Edit event with full data
  - Remove template tag
- [ ] Add comprehensive tests
- [ ] Commit: "Implement RWGPSClient.scheduleEvent"

### Task 3.11: Implement updateEvent (full operation)
- [ ] Similar to scheduleEvent but no copy step
- [ ] Add tests
- [ ] Commit: "Implement RWGPSClient.updateEvent"

### Task 3.12: Implement importRoute
- [ ] Read import-route fixture
- [ ] Copy route → fetch details → add tags
- [ ] Add tests
- [ ] Commit: "Implement RWGPSClient.importRoute"

### Phase 3 Complete Checkpoint
- [ ] All 424+ tests pass
- [ ] RWGPSClient has all 6 operations implemented
- [ ] Old code still works (adapter layer in place)
- [ ] Commit: "Phase 3 complete: RWGPSClient implemented"

---

## Phase 4: Migrate to v1 API

**Model recommendation**: Haiku 4.5 for mechanical changes, Sonnet if tests fail

### Goal
Replace web API calls with v1 API calls where possible.

### Task 4.1: Test if double-edit is needed for v1 API
- [ ] Create a test that does single PUT to v1 API
- [ ] Check if start time is set correctly without the all_day workaround
- [ ] Document finding in RWGPS_MIGRATION_GUIDE.md
- [ ] Commit: "Test: v1 API double-edit requirement"

### Task 4.2: Replace web getEvent with v1 API
- [ ] Change `getEvent()` to use `GET /api/v1/events/{id}.json`
- [ ] Run tests - verify response format matches
- [ ] If format differs, add transformation
- [ ] Commit: "Migrate getEvent to v1 API"

### Task 4.3: Replace web editEvent with v1 API
- [ ] Change `editEvent()` to use `PUT /api/v1/events/{id}.json`
- [ ] If double-edit not needed (from Task 4.1), remove workaround
- [ ] Run tests
- [ ] Commit: "Migrate editEvent to v1 API"

### Task 4.4: Replace copyTemplate with createEvent
- [ ] v1 API has `POST /api/v1/events.json` to create events
- [ ] May need to fetch template first to copy its settings
- [ ] Run tests
- [ ] Commit: "Replace copyTemplate with v1 createEvent"

### Task 4.5: Handle batch_update_tags
- [ ] DECISION POINT: Keep web API or implement individual tag calls?
- [ ] If keeping web API, document why
- [ ] If replacing, implement individual calls
- [ ] Commit decision and implementation

### Task 4.6: Verify getClubMembers still works
- [ ] Already uses v1 API - just verify
- [ ] Run tests
- [ ] Commit: "Verify getClubMembers uses v1 API"

### Phase 4 Complete Checkpoint
- [ ] All tests pass
- [ ] Most operations use v1 API
- [ ] Document any operations that still need web API
- [ ] Commit: "Phase 4 complete: Migrated to v1 API"

---

## Phase 5: Clean Up

**Model recommendation**: Haiku 4.5

### Goal
Remove dead code, simplify structure.

### Task 5.1: Remove RWGPS.js facade (if no longer needed)
- [ ] Check if anything still imports RWGPS.js
- [ ] If not, delete it
- [ ] Run tests
- [ ] Commit: "Remove unused RWGPS.js"

### Task 5.2: Remove RWGPSService.js (if no longer needed)
- [ ] Check imports
- [ ] Delete if unused
- [ ] Run tests
- [ ] Commit: "Remove unused RWGPSService.js"

### Task 5.3: Simplify ApiService.js
- [ ] If only used for Basic Auth, simplify
- [ ] Or merge into RWGPSClient
- [ ] Run tests
- [ ] Commit: "Simplify ApiService"

### Task 5.4: Remove web session login (if no longer needed)
- [ ] If all operations use v1 API, remove web login code
- [ ] Run tests
- [ ] Commit: "Remove web session authentication"

### Task 5.5: Clean up CredentialManager
- [ ] Remove unused credential types
- [ ] Run tests
- [ ] Commit: "Simplify CredentialManager"

### Task 5.6: Update exports and types
- [ ] Update RWGPSLibAdapter.js to use RWGPSClient
- [ ] Update any type definitions
- [ ] Run tests
- [ ] Commit: "Update exports to use RWGPSClient"

### Task 5.7: Final cleanup
- [ ] Remove RWGPSApiLogger if no longer needed for production
- [ ] Or keep it for debugging (your choice)
- [ ] Run full test suite: `npm test`
- [ ] Commit: "Phase 5 complete: Cleanup done"

---

## Final Verification

- [ ] Run full test suite: `npm test` (all 424+ tests pass)
- [ ] Run characterization tests: `npm test -- test/__tests__/RWGPSCharacterization.test.js`
- [ ] Deploy to dev: `npm run dev:push`
- [ ] Test all 6 operations manually in spreadsheet
- [ ] If all work: `npm run prod:push`
- [ ] Merge branch to master

---

## Quick Reference

### Run Tests
```bash
# All tests
npm test

# Just characterization tests (fast check)
npm test -- test/__tests__/RWGPSCharacterization.test.js

# Just RWGPSClient tests
npm test -- test/__tests__/RWGPSClient.test.js
```

### Fixture Files
- `test/fixtures/rwgps-api/schedule.json` - 6 API calls
- `test/fixtures/rwgps-api/update.json` - 4 API calls
- `test/fixtures/rwgps-api/cancel.json` - 4 API calls
- `test/fixtures/rwgps-api/reinstate.json` - 4 API calls
- `test/fixtures/rwgps-api/unschedule.json` - 2 API calls
- `test/fixtures/rwgps-api/import-route.json` - 4 API calls

### Key Files
- `src/rwgpslib/RWGPSClient.js` - New unified client (create this)
- `src/rwgpslib/ApiService.js` - Current fetch handling
- `src/rwgpslib/CredentialManager.js` - Credential storage
- `test/mocks/RWGPSMockServer.js` - Mock server for tests
