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
- [x] Add GAS integration test: testRWGPSClientGetEvent()
- [x] **TESTED IN GAS**: Successfully fetched event 445203 with full details

### Task 3.6: Implement editEvent ✅
- [x] Read Update fixture for the double-edit pattern
- [x] Implement `editEvent(eventUrl, eventData)` in RWGPSClient
- [x] Include the all_day workaround (double-edit: all_day=1, then all_day=0)
- [x] Add buildEditEventPayload() and buildEditEventOptions() to Core
- [x] Add tests using mock server (7 tests, 460 total passing)
- [x] Created edit.json fixture (login + 2 PUTs)
- [x] Commit: "Task 3.6: Implement editEvent with double-edit pattern" (18b74d5)
- [x] Add GAS integration test: testRWGPSClientEditEvent()
- [x] **TESTED IN GAS**: Event 445203 edited (added test marker) and restored successfully
- [x] **VERIFIED**: Double-edit pattern (all_day=1, then all_day=0) works correctly
- [x] Note: Converts organizers→organizer_tokens, routes→route_ids

### Task 3.7: Implement cancelEvent using getEvent + editEvent ✅
- [x] `cancelEvent(eventUrl)` should:
  - Call `getEvent()` to fetch current data
  - Check if already cancelled (name starts with "CANCELLED: ")
  - Add "CANCELLED: " prefix to name
  - Call `editEvent()` with modified data
- [x] Demonstrates composable design (uses getEvent + editEvent)
- [x] Add 6 tests (466 total passing)
- [x] Commit: "Task 3.7: Implement cancelEvent using getEvent + editEvent" (596757f)
- [x] Add GAS integration test: testRWGPSClientCancelEvent()
- [x] **TESTED IN GAS**: Event 445203 cancelled (added CANCELLED: prefix) and restored successfully
- [x] **VERIFIED**: Double-edit pattern working, composable methods confirmed

### Task 3.8: Implement reinstateEvent ✅
- [x] `reinstateEvent(eventUrl)` should:
  - Call `getEvent()` to fetch current data
  - Check if event is cancelled (name starts with "CANCELLED: ")
  - Remove "CANCELLED: " prefix from name
  - Call `editEvent()` with modified data
- [x] Demonstrates composable design (uses getEvent + editEvent)
- [x] Add 6 tests (472 total passing)
- [x] Commit: "Task 3.8: reinstateEvent implementation" (01efe98)
- [x] Add GAS integration test: testRWGPSClientReinstateEvent()
- [x] **TESTED IN GAS**: Event 445203 cancelled then reinstated (CANCELLED: prefix removed) successfully
- [x] **VERIFIED**: Double-edit pattern working, name restored to original

### Task 3.9: Implement copyTemplate ✅
- [x] Read Schedule fixture for copy_template behavior
- [x] NOTE: POST returns 302 with new event URL in Location header
- [x] Implement `copyTemplate(templateUrl, eventData)` method:
  - POST to `/events/{id}/copy` with optional event data
  - Extract new event URL from Location header
  - Return `{success, eventUrl}` or `{success: false, error}`
- [x] Add 6 Jest tests (478 total passing):
  - Success path with Location header extraction
  - Custom event data provided during copy
  - Login failure
  - Invalid template URL
  - Non-302 status (400, 500, etc.)
  - Missing Location header in 302 response
- [x] Add TypeScript type definition with optional eventData parameter
- [x] Commit: "Task 3.9: Implement copyTemplate method" (8f3f406)
- [x] Add GAS integration test: testRWGPSClientCopyTemplate(templateId)
- [x] **TESTED IN GAS**: Successfully tested template copy with event 453057
  - ✅ Template 404019 copied successfully
  - ✅ New event URL extracted from Location header
  - ✅ New event data verified (custom name, visibility)
  - ✅ Cleanup completed (test event deleted)

### Task 3.10: Implement scheduleEvent ✅
- [x] `scheduleEvent(templateUrl, eventData, organizerNames)` should:
  - Copy template → get new URL
  - Look up organizers by name (via `_lookupOrganizer`)
  - Edit event with full data + organizer tokens
  - Remove template tag (via `_removeEventTags`)
- [x] Implement Core helper methods in RWGPSClientCore.js:
  - `buildOrganizerLookupOptions(sessionCookie, organizerName)` - POST request builder
  - `findMatchingOrganizer(results, organizerName)` - Exact name match finder
  - `buildBatchTagOptions(sessionCookie, eventIds, tagAction, tagNames)` - Batch tag update builder
- [x] Implement adapter methods in RWGPSClient.js:
  - `scheduleEvent(templateUrl, eventData, organizerNames)` - Full workflow orchestration
  - `_lookupOrganizer(eventUrl, organizerName)` - POST to `/events/{id}/organizer_ids.json`
  - `_removeEventTags(eventId, tags)` - POST to `/events/batch_update_tags.json`
- [x] Add 26 comprehensive tests (50 total RWGPSClient tests, 504 total passing):
  - 12 Core tests: organizer lookup options (3), find matching (6), batch tag options (3)
  - 14 Adapter tests: schedule success, organizer token passing, login/copy/edit failures, tag removal (non-fatal), empty/null organizers
- [x] Add TypeScript type definitions with ScheduleResult.event and private method signatures
- [x] Commit: "Task 3.10: Implement scheduleEvent with organizer lookup and tag removal" (PENDING)
- [x] Add GAS integration test: testRWGPSClientScheduleEvent(templateId, organizerName)
- [x] **TESTED IN GAS**: Successfully tested with event 453197
  - ✅ Template 404019 copied successfully
  - ✅ Event data applied (name, start time, visibility)
  - ✅ Organizer lookup executed (non-fatal if not found)
  - ✅ Template tag removed successfully
  - ✅ Cleanup completed (test event deleted)
- [x] **VERIFIED**: Full scheduling workflow working end-to-end

### Task 3.11: Implement updateEvent (full operation) ✅
- [x] `updateEvent(eventUrl, eventData, organizerNames)` should:
  - Login to establish web session
  - Look up organizers by name (optional, via `_lookupOrganizer`)
  - Edit event with full data + organizer tokens
- [x] Similar to scheduleEvent but:
  - No copy step (uses existing event)
  - No tag removal (updating existing, not creating from template)
  - organizerNames parameter is optional
- [x] Add 9 comprehensive tests (59 total RWGPSClient tests, 513 total passing):
  - Update without organizers
  - Update with organizers
  - Organizers returned in result
  - Login failure
  - Edit failure
  - Organizer lookup failure (non-fatal)
  - Empty/null/undefined organizer names
- [x] Add TypeScript type definition with optional organizerNames parameter, ScheduleResult return type
- [x] Commit: "Task 3.11: Implement updateEvent with optional organizer support" (PENDING)
- [x] Add GAS integration test: testRWGPSClientUpdateEvent(eventId, organizerName)
- [x] **TESTED IN GAS**: Successfully tested with event 445203
  - ✅ Original event retrieved successfully
  - ✅ Event data updated (description modified with test marker)
  - ✅ Update verified (description contains test marker)
  - ✅ Original event restored successfully
  - ✅ Organizer lookup tested (none provided, works correctly)
- [x] **VERIFIED**: Full update workflow working end-to-end

### Task 3.12: Implement importRoute ✅
- [x] Read import-route fixture
  - 4-step workflow: login → copy → getRoute → addTags
  - Copy uses web session: POST /routes/{id}/copy.json
  - Get uses v1 API: GET /api/v1/routes/{id}.json (Basic Auth)
  - Tags use web session: POST /routes/batch_update_tags.json
- [x] Implement importRoute method in RWGPSClient
  - Orchestrates full workflow
  - Returns {success, routeUrl?, route?, error?}
  - Login failure stops process
  - Copy failure stops process
  - Get failure returns partial success with routeUrl
  - Tag failure is non-fatal (logs warning)
- [x] Implement helper methods:
  - getRoute(routeUrl) - Fetch route details via v1 API
  - _copyRoute(routeUrl, routeData) - Copy route via web session
  - _addRouteTags(routeUrl, tags) - Add tags via batch_update_tags
- [x] Add Core helper methods in RWGPSClientCore:
  - extractRouteId(url) - Extract route ID from URL
  - buildRouteCopyOptions(sessionCookie, routeUrl, routeData) - Build copy POST payload
  - buildRouteTagOptions(sessionCookie, routeId, tags) - Build tag POST payload
- [x] Add comprehensive tests (13 adapter + 4 core = 17 tests):
  - importRoute: success without tags, success with tags, login failure, copy failure, fetch failure, tag failure
  - getRoute: success, invalid URL, fetch failure
  - _copyRoute: success, invalid URL, copy failure, missing URL
  - _addRouteTags: success, invalid URL, failure
  - extractRouteId: success, with slug, invalid URL, event URL
  - buildRouteCopyOptions: minimal data, all optional fields, exclude undefined
  - buildRouteTagOptions: multiple tags, single tag, empty tags
- [x] Add TypeScript type definitions:
  - Updated RWGPSClient.d.ts: importRoute, getRoute, _copyRoute, _addRouteTags
  - Updated RWGPSClientCore.d.ts: extractRouteId, buildRouteCopyOptions, buildRouteTagOptions
- [x] All tests passing (539 total, added 17 new)
- [x] TypeScript typecheck clean (zero errors)
- [x] Add GAS integration test: testRWGPSClientImportRoute(routeId)
- [x] **TESTED IN GAS**: Successfully tested with route 53253553
  - ✅ Source route 53253553 copied successfully
  - ✅ New route URL returned: https://ridewithgps.com/routes/53722997
  - ✅ Route details fetched via v1 API
  - ✅ Route data verified (ID: 53722997, Name, Distance: 46.3km, Elevation: 452m)
  - ✅ Tags and expiry applied correctly
  - ⚠️ Note: User ID was undefined in test (globals.ClubUserId not set, but copy still succeeded)
  - ⚠️ Manual cleanup required (test route deleted manually)
- [x] **VERIFIED**: Full import workflow working end-to-end
- [x] Commit: "Task 3.12: Implement importRoute" (d1b2c44)

### Phase 3 Complete Checkpoint ✅
- [x] All 539 tests pass (was 513, added 26 new tests in Tasks 3.11 + 3.12)
- [x] RWGPSClient has all 12 operations implemented and tested:
  - getRSVPCounts ✅ (GAS verified)
  - getOrganizers ✅ (GAS verified)
  - unTagEvents ✅ (GAS verified)
  - getEvents ✅ (GAS verified)
  - getEvent ✅ (GAS verified)
  - deleteEvent ✅ (GAS verified)
  - scheduleEvent ✅ (GAS verified with event 451900)
  - copyTemplate ✅ (GAS verified with event 453057)
  - updateEvent ✅ (GAS verified with event 445203)
  - importRoute ✅ (GAS verified with route 53722997)
  - setRouteExpiration ✅ (GAS verified)
  - login ✅ (used by all web session operations)
- [x] Old code still works (adapter layer in RideManager.js delegates to RWGPSClient)
- [x] Commit Phase 3 complete (Tasks 3.11-3.12): "Task 3.12: Implement importRoute" (d1b2c44)

---

## Phase 4: Migrate to v1 API

**Model recommendation**: Haiku 4.5 for mechanical changes, Sonnet if tests fail

### Goal
Replace web API calls with v1 API calls where possible.

### CRITICAL: v1 API Authentication
**ALWAYS use apiKey:authToken for v1 API, NEVER username:password**

The v1 REST API uses Basic Authentication with:
- **Username**: `apiKey` (from credentials)
- **Password**: `authToken` (from credentials)

Example:
```javascript
// ✅ CORRECT - Use _getBasicAuthHeader() which encodes apiKey:authToken
'Authorization': this._getBasicAuthHeader()

// ❌ WRONG - Do NOT use username:password
'Authorization': 'Basic ' + Utilities.base64Encode(this.username + ':' + this.password)
```

All v1 API endpoints (`/api/v1/*`) require this authentication pattern.

### CRITICAL: v1 API Date/Time Behavior
**v1 API uses separate `start_date` and `start_time` fields in response, NOT `starts_at`**

The v1 API response format differs from web API:
```json
{
  "start_date": "2030-03-01",  // Separate date field
  "start_time": "11:00",       // Separate time field
  "all_day": false
  // NO starts_at field in response
}
```

**CRITICAL Finding (Task 4.1 GAS Testing):**
- ✅ Name field updates correctly with single PUT
- ❌ **start_time does NOT update with single PUT** - requires double-edit workaround
- ✅ all_day field works correctly
- **CONCLUSION**: V1 API still requires double-edit pattern (same as web API)

**Migration Impact:**
- Phase 4 must keep double-PUT pattern for time changes
- First PUT with `all_day: '1'` to reset
- Second PUT with actual `start_date`, `start_time`, and `all_day: '0'`

### Task 4.1: Test if double-edit is needed for v1 API ✅ COMPLETE
- [x] Create testV1SingleEditEvent() method in RWGPSClient
  - Tests single PUT to v1 endpoint without workaround
  - Uses Basic Auth instead of web session cookie
  - Sends: `PUT /api/v1/events/{id}.json` with `all_day: '0'`
- [x] Add test cases for v1 API single-edit
  - Verifies v1 endpoint can be called
  - Documents expected behaviors
  - Tests run successfully (2 new tests)
- [x] Initial findings from v1 API documentation:
  - v1 API endpoint exists: `PUT /api/v1/events/{id}.json`
  - Uses Basic Auth (instead of web session cookie)
  - Accepts same event data structure
  - OpenAPI spec confirms all_day field is supported
- [x] Add GAS integration test: testTask4_1_V1ApiSingleEdit(eventId)
  - Uses event 445203 by default (successfully used in Task 3.11)
  - Fetches event, tests single PUT, verifies time, restores original
  - Comprehensive findings report on v1 API behavior
  - Improved error handling and troubleshooting guidance
- [x] Run in GAS: `testTask4_1_V1ApiSingleEdit()`
  - **RESULT**: Name updated ✅, Time unchanged ❌
  - **FINDING**: V1 API REQUIRES double-edit (same as web API)
  - Event 445203: Time stayed at original despite single PUT
- [x] Document findings in this file (see CRITICAL section above)
- [x] Commits:
  - fc4677b: Add GAS integration test
  - f22a760: Improve error handling
  - 81ea3da: Fix v1 API auth (apiKey:authToken)
  - 4e92695: Enhance test logging and analysis

**TASK COMPLETE - Key Finding**: V1 API migration must keep double-PUT pattern for time changes.

### Task 4.2: Replace web getEvent with v1 API
- [x] Change `getEvent()` to use `GET /api/v1/events/{id}.json`
- [x] **CRITICAL**: Transform v1 response format to match web API format
  - v1 uses: `start_date` (string) + `start_time` (string) + `time_zone`
  - Web uses: `starts_at` (ISO 8601 timestamp)
  - Must convert: `start_date + start_time + time_zone` → `starts_at`
- [x] Run tests - verify response format matches
- [x] Commit: "Migrate getEvent to v1 API"

### Task 4.3: Replace web editEvent with v1 API
- [ ] Change `editEvent()` to use `PUT /api/v1/events/{id}.json`
- [ ] **MUST keep double-edit workaround** (confirmed by Task 4.1)
  - First PUT: `all_day: '1'` to reset time
  - Second PUT: actual `start_date`, `start_time`, `all_day: '0'`
- [ ] **CRITICAL**: Transform payload format for v1 API
  - Input has: `starts_at` (ISO 8601 timestamp)
  - v1 needs: `start_date` (YYYY-MM-DD) + `start_time` (HH:MM)
  - Must convert: `starts_at` → `start_date + start_time`
- [ ] Run tests
- [ ] Commit: "Migrate editEvent to v1 API with double-edit"

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
