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

## Phase 4: Migrate to v1 API ⏳ IN PROGRESS

**Status**: Incomplete - needs cleanup, Core/Adapter refactoring, full GAS test coverage

### Goal
1. Replace web API calls with v1 API calls where possible
2. **Every public method must have a GAS integration test**
3. **Consolidate overlapping methods** (createEvent + createEventWithLogo)
4. **Fix Core/Adapter violations** - RWGPSClientCore has GAS dependencies!
5. **Remove unnecessary login() calls** - v1 API uses Basic Auth only
6. **Minimize public API surface** - make methods private where possible
7. **Delete deprecated code** - remove template-related methods

### v1 API Reference

<details>
<summary>v1 API Format (click to expand)</summary>

```javascript
// v1 API event format
{
  id: 444070,
  name: "Event Name",
  description: "Event description",  // NOT 'desc'
  start_date: "2030-03-01",          // Separate date
  start_time: "11:00",               // Separate time
  all_day: false,
  visibility: 0,
  organizer_ids: [498406],           // Array of integers (UNDOCUMENTED - works on PUT, verify POST!)
  route_ids: [50969472]              // Array of integers (UNDOCUMENTED)
}
```

**v1 API Authentication**: Basic Auth with `apiKey:authToken`
```javascript
'Authorization': this._getBasicAuthHeader()  // encodes apiKey:authToken
```

**Key Finding**: Single PUT updates all 11 working fields. No double-edit required.

</details>

<details>
<summary>Logo Handling (click to expand)</summary>

Logos cannot be set via JSON payload (`logo_url` is read-only).
Must use multipart form-data upload with binary image.

**Solution Implemented**: Drive-based logo storage
- Logo files stored in "SCCCC Group Logos" Drive folder
- Groups tab has LogoURL column with Drive file URLs
- `createEventWithLogo()` downloads from Drive and uploads to RWGPS

</details>

---

### Issues Found During Review

#### Issue 1: createEvent vs createEventWithLogo Overlap

**Current**: Two separate methods
- `createEvent(eventData)` - JSON POST, no logo
- `createEventWithLogo(eventData, logoUrl)` - multipart POST with logo

**Target**: Single method with optional logo
```javascript
createEvent(eventData, logoUrl?)  // Use multipart if logoUrl provided
```

#### Issue 2: createEvent with organizer_ids - UNVERIFIED

`buildV1EditEventPayload()` includes `organizer_ids` handling, so createEvent SHOULD support it.
But this is undocumented - **we need a GAS test to verify POST accepts organizer_ids**.

**Test needed**: `testRWGPSClientCreateEventWithOrganizers()`

#### Issue 3: Unnecessary login() Calls

| Method | Current | Correct |
|--------|---------|---------|
| `getEvent()` | No login ✅ | Basic Auth only |
| `editEvent()` | No login ✅ | Basic Auth only |
| `createEvent()` | No login ✅ | Basic Auth only |
| `deleteEvent()` | **HAS login ❌** | Basic Auth only - login unnecessary! |
| `scheduleEvent()` | Has login | ⚠️ Needed only for `_lookupOrganizer` web call |
| `updateEvent()` | Has login | ⚠️ Needed only for `_lookupOrganizer` web call |

**Fix**: Remove login() from deleteEvent(). Once _lookupOrganizer is replaced with cache lookup, remove login() from scheduleEvent/updateEvent too.

#### Issue 4: Core/Adapter Leakage (ARCHITECTURE VIOLATION!)

RWGPSClientCore.js contains GAS API calls:
- `Utilities.base64Encode` (L108)
- `Utilities.newBlob` (L451, 453, 471)

**This violates architecture rules!** Core modules must be pure JavaScript.

**Coverage**: Only **54.85% stmt / 54.19% branch** (lines 122-273, 339-487 uncovered)

**Fix**: Move GAS-dependent code to RWGPSClient.js:
- `buildBasicAuthHeader()` - move Base64 logic to adapter, inject result
- `buildMultipartCreateEventPayload()` - move to adapter (uses Blob/Utilities)

---

### RWGPSClient Method Audit

| Method | API | Auth | login() | GAS Test | Issue |
|--------|-----|------|---------|----------|-------|
| `login()` | Web | Cookie | self | Used by all | ✅ Keep for web ops |
| `getEvent()` | v1 | Basic | None | `testRWGPSClientGetEvent` | ✅ |
| `editEvent()` | v1 | Basic | None | `testRWGPSClientEditEvent` | ✅ |
| `createEvent()` | v1 | Basic | None | None direct | ⚠️ Needs test |
| `createEventWithLogo()` | v1 | Basic | None | `testLogoUrlInCreateEvent` | ⚠️ Merge with createEvent |
| `deleteEvent()` | v1 | Basic | ❌ Has it | **None** | ❌ Remove login, add test |
| `cancelEvent()` | v1 | Basic | None | `testRWGPSClientCancelEvent` | ✅ |
| `reinstateEvent()` | v1 | Basic | None | `testRWGPSClientReinstateEvent` | ✅ |
| `getRoute()` | v1 | Basic | None | Used by importRoute | ✅ |
| `importRoute()` | Mixed | Both | Yes | `testRWGPSClientImportRoute` | ✅ (uses web for tags) |
| `scheduleEvent()` | Mixed | Both | Yes | `testRWGPSClientScheduleEvent` | ⚠️ Uses `_lookupOrganizer` |
| `updateEvent()` | Mixed | Both | Yes | `testRWGPSClientUpdateEvent` | ⚠️ Uses `_lookupOrganizer` |
| `copyTemplate()` | Web | Cookie | Yes | `testRWGPSClientCopyTemplate` | ❌ **DELETE** |
| `testV1SingleEditEvent()` | v1 | - | - | Test artifact | ❌ **DELETE** |

### Private Methods (Web-only, no v1 equivalent)

| Method | API | Notes |
|--------|-----|-------|
| `_lookupOrganizer()` | Web | ⚠️ Replace with cached Members lookup (Phase 5) |
| `_removeEventTags()` | Web | ✅ Keep - no v1 tag endpoints |
| `_addEventTags()` | Web | ✅ Keep - no v1 tag endpoints |
| `_copyRoute()` | Web | ✅ Keep - no v1 route copy |
| `_addRouteTags()` | Web | ✅ Keep - no v1 tag endpoints |

---

## Phase 4 Task List (Revised 2026-01-17)

### Task 4.A: Remove double-edit pattern from editEvent() ⏳ TODO

**Status**: Not started  
**Priority**: HIGH - proven unnecessary, code cleanup

**Evidence**: PHASE4_HISTORICAL_NOTES.md documents that single PUT works for all 11 fields.
Line 345 of this file: "Single PUT updates all 11 working fields. No double-edit required."

**Current**: `editEvent()` does two PUTs (all_day=1, then all_day=0)
**Target**: Single PUT with all_day=0

**Steps**:
- [ ] 4.A.1 Update `editEvent()` to use single PUT (remove first PUT)
- [ ] 4.A.2 Update JSDoc to remove "double-edit" references
- [ ] 4.A.3 Update RWGPSClient.d.ts JSDoc
- [ ] 4.A.4 Update tests to expect single fetch call
- [ ] 4.A.5 Run `npm test` - verify all pass
- [ ] 4.A.6 Run GAS test `testRWGPSClientEditEvent` - verify still works
- [ ] Commit: "Task 4.A: Remove unnecessary double-edit from editEvent()"

---

### Task 4.B: Remove unnecessary login() from deleteEvent() ✅ COMPLETE

**Status**: Complete (commit 937f355)

**Current**: `deleteEvent()` calls `login()` then uses Basic Auth
**Issue**: v1 API with Basic Auth doesn't need web session

**Steps**:
- [x] 4.B.1 Remove `login()` call from `deleteEvent()`
- [x] 4.B.2 Run existing GAS test or add `testRWGPSClientDeleteEvent()`
- [x] 4.B.3 Verify delete works without login
- [x] Commit: "Task 4.B: Remove unnecessary login() from deleteEvent()"

**GAS Test Result** (2026-01-18 10:02 AM):
- ✅ Created temporary event (ID 453684)
- ✅ Deleted using v1 API with Basic Auth (no login)
- ✅ Received 204 No Content response
- ✅ Verified deletion successful

---

### Task 4.C: Delete deprecated methods ⏳ TODO

**Status**: ✅ Complete (2026-01-18)

**Methods to delete from RWGPSClient.js**:
1. `copyTemplate()` - Templates are GONE per architecture
2. `testV1SingleEditEvent()` - Test artifact, already proved its point

**Steps**:
- [x] 4.C.1 Delete `copyTemplate()` method (66 lines removed)
- [x] 4.C.2 Delete `testV1SingleEditEvent()` method (94 lines removed)
- [x] 4.C.3 Update RWGPSClient.d.ts - remove deleted method signatures
- [x] 4.C.4 Delete/update any tests referencing deleted methods (8 tests removed)
- [x] 4.C.5 Run `npm test` - 735 tests pass (down from 744 due to deleted tests)
- [x] 4.C.6 Run `npm run typecheck` - ZERO errors
- [x] Updated fixture-related tests due to Task 4.B changes (unschedule fixture now 1 call not 2)

**Verification**:
- All tests pass: 735 passed
- No type errors
- Methods successfully removed from implementation and type definitions
- Tests cleaned up: removed 6 copyTemplate tests, 2 testV1SingleEditEvent tests
- Fixed cascading test failures from Task 4.B fixture changes

---

### Task 4.D: Consolidate createEvent + createEventWithLogo ✅ COMPLETE

**Status**: ✅ Complete (2026-01-18)

**Current**: Two methods with overlapping logic
**Target**: One method `createEvent(eventData, logoUrl?)`

**Steps**:
- [x] 4.D.1 Modify `createEvent(eventData, logoUrl?)` to handle optional logo
  - If logoUrl provided: fetch blob from Drive, use multipart/form-data
  - If no logoUrl: use JSON POST
- [x] 4.D.2 Delete `createEventWithLogo()` method (~68 lines removed)
- [x] 4.D.3 Update `scheduleEvent()` to always call `createEvent(eventData, logoUrl)`
- [x] 4.D.4 Update RWGPSClient.d.ts (added logoUrl?: string parameter)
- [x] 4.D.5 Update tests
  - Added 2 new tests for createEvent with logo
  - Updated migration test to check createEvent (not createEventWithLogo)
  - All 737 tests pass
- [x] 4.D.6 Added GAS integration tests to `gas-integration-tests.js` (lines 2612-2745)
  - `testTask4DCreateEvent()` - Tests without logo (JSON POST)
  - `testTask4DCreateEventWithLogo(logoUrl)` - Tests with logo (multipart POST)
  - **NOTE**: All GAS integration tests MUST be in `gas-integration-tests.js` file

**Verification**:
- ✅ All tests pass: 737 passed
- ✅ No type errors: `npm run typecheck` clean
- ✅ Consolidated code: 68 lines removed, logic unified
- ✅ GAS integration tests: Both passed (2026-01-18 10:25-10:27)
  - `testTask4DCreateEvent()` - Event 453687 created successfully (JSON POST)
  - `testTask4DCreateEventWithLogo()` - Event 453688 created with logo (multipart POST)

**Implementation Details**:
- `createEvent()` now branches internally based on logoUrl presence
- Logo path: DriveApp → blob → multipart payload with boundary
- No logo path: JSON POST (original behavior)
- Maintains backward compatibility (logoUrl is optional)

**Commits**: 
- d3d807c (code implementation)
- [this commit] (GAS integration tests)

---

### Task 4.E: Fix Core/Adapter Architecture Violations ⏳ TODO

**Status**: Not started
**Priority**: HIGH - blocks proper Jest testing

RWGPSClientCore.js has GAS dependencies, violating architecture:
```
Utilities.base64Encode (L108) - has Buffer fallback, minor issue
Utilities.newBlob (L451, 453, 471) - TRUE violation, no fallback
```

**Steps**:
- [ ] 4.E.1 Move `buildMultipartCreateEventPayload()` from Core to RWGPSClient.js
  - Uses `Utilities.newBlob()`, cannot be tested in Jest
  - Core should only build the data structure, adapter handles Blob creation
- [ ] 4.E.2 Increase RWGPSClientCore.js coverage to 100%
  - Current: 54.85% stmt, 54.19% branch
  - Target: 100% (architecture requirement)
- [ ] 4.E.3 Run `npm test -- --coverage --collectCoverageFrom='src/rwgpslib/RWGPSClientCore.js'`
- [ ] Commit: "Task 4.E: Fix Core/Adapter architecture violations"

Note: `buildBasicAuthHeader()` already has Buffer.from() fallback for Node.js - not a blocking issue.

---

### Task 4.F: Achieve 100% RWGPSClientCore.js Coverage ⏳ TODO

**Status**: Not started
**Depends on**: Task 4.E (multipart code moved out of Core)

**Current Coverage** (after Task 4.E):
- Target: 100% stmt, 100% branch, 100% functions

**Steps**:
- [ ] 4.F.1 Write tests for uncovered lines
- [ ] 4.F.2 Run `npm test -- --coverage --collectCoverageFrom='src/rwgpslib/RWGPSClientCore.js'`
- [ ] 4.F.3 Verify 100% coverage
- [ ] Commit: "Task 4.F: Achieve 100% RWGPSClientCore coverage"

---

## Phase 4 Completion Checklist

Before marking Phase 4 complete:
- [ ] `editEvent()` uses single PUT (no double-edit)
- [ ] `deleteEvent()` has no login() call
- [ ] `copyTemplate()` deleted
- [ ] `testV1SingleEditEvent()` deleted
- [ ] `createEvent()` and `createEventWithLogo()` consolidated
- [ ] RWGPSClientCore.js has NO GAS dependencies (pure JavaScript)
- [ ] RWGPSClientCore.js has 100% test coverage
- [ ] All tests pass: `npm test`
- [ ] All GAS integration tests pass

---

## Deferred to Phase 5

The following tasks are deferred to Phase 5 (see Phase 5 section below for details):

- **Task 5.0.5**: Replace `_lookupOrganizer` with cached lookup (already defined)
- **Task 5.X**: Verify POST /events accepts organizer_ids
- **Task 5.X**: Minimize public API surface

---

### APIs Still Using Web Endpoints (Correctly)

| Operation | Reason |
|-----------|--------|
| `_removeEventTags()` | v1 API has NO tag endpoints |
| `_addEventTags()` | v1 API has NO tag endpoints |
| `_copyRoute()` | v1 API has no route copy |
| `_addRouteTags()` | v1 API has NO tag endpoints |
| `login()` | Session cookies for web-only operations only |

### Reference

- `docs/rwgps-api-tested.yaml` - Verified API behavior
- `docs/PHASE4_HISTORICAL_NOTES.md` - Debugging history
- `docs/RWGPS_V1_API_BUG_REPORT.md` - API discrepancies

---
## Phase 5: Consolidate to RWGPSClient + Migrate RideManager.js

**Model recommendation**: Opus 4.5 (for complex multi-step tasks)

### Goal

1. **Move RWGPSClient.js and RWGPSClientCore.js to `src/`** - canonical implementations
2. **Replace all RideManager.js RWGPS calls** with direct RWGPSClient calls
3. **Treat `src/rwgpslib/` as reference only** - code will be deleted in Phase 6

**CRITICAL PATTERN**: When you find useful code in `src/rwgpslib/`:
- Use it as **reference** for what functionality is needed
- **Migrate the logic INTO** RWGPSClient.js or RWGPSClientCore.js
- **Do NOT call** rwgpslib code directly - it's being deprecated

**Reference**: See `docs/SUPERSEDED_PHASE5_PLAN.md` for the original overly-complex plan that was discarded.

### Target Architecture

After Phase 5:
```
src/
├── RWGPSClient.js      # GAS adapter - all RWGPS API calls
├── RWGPSClientCore.js  # Pure JS - all transformations, testable
├── RideManager.js      # Orchestrates ride operations using RWGPSClient
└── rwgpslib/           # DEPRECATED - reference only, delete in Phase 6
```

```
┌─────────────────────────────────────────────────────────┐
│  RideManager.js  (GAS Adapter - orchestrates operations)│
│  - importRow_(), schedule_row_(), updateRow_(), etc.    │
│  - Uses CredentialManager for credentials               │
│  - Creates RWGPSClient instance and calls methods       │
└──────────────────────────┬──────────────────────────────┘
                           │ Direct calls (no facade layer)
                           ↓
┌─────────────────────────────────────────────────────────┐
│  src/RWGPSClient.js  (moved from rwgpslib/)             │
│  - importRoute(), getEvent(), editEvent(), createEvent()│
│  - lookupOrganizerId() - uses cached Members sheet      │
│  - Uses v1 API with Basic Auth (apiKey:authToken)       │
│  - Web session for tag operations (login required)      │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  src/RWGPSClientCore.js  (moved from rwgpslib/)         │
│  - extractRouteId(), extractEventId()                   │
│  - buildV1EditEventPayload(), buildRouteCopyOptions()   │
│  - lookupUserIdByName() - pure JS lookup logic          │
│  - All format transformations                           │
└─────────────────────────────────────────────────────────┘
```

### Organizer Lookup Migration

**OLD** (wrong - adds layers):
- `RWGPSMembersAdapter.lookupUserIdByName()` → reads from "RWGPS Members" sheet
- Separate adapter class, separate file

**NEW** (right - consolidate):
- `RWGPSClientCore.lookupUserIdByName(members, name)` → pure JS lookup (testable)
- `RWGPSClient.lookupOrganizerId(name)` → reads sheet, calls Core
- All in RWGPSClient, no separate adapter

### Pattern for RideManager.js

Use Task 3.12 (testRWGPSClientImportRoute) as the template:

```javascript
function operationName_() {
    // 1. Get credentials
    const creds = CredentialManager.getAll();
    const globals = getGlobals();
    
    // 2. Create client
    const client = new RWGPSClient({
        apiKey: creds.apiKey,
        authToken: creds.authToken,
        username: creds.username,
        password: creds.password
    });
    
    // 3. Call the TESTED method
    const result = client.methodName(params);
    
    // 4. Handle result
    if (!result.success) {
        throw new Error(result.error);
    }
    return result;
}
```

### Undocumented API Features

Discovered through testing (January 2026):
- `organizer_ids`: Array of integers - sets event organizers (NOT in official spec)
- `route_ids`: Array of integers - associates routes with event (NOT in official spec)

See `docs/rwgps-api-tested.yaml` for complete verified API behavior.

---

### Task 5.0: Move RWGPSClient/Core to src/ ⏳ NEXT

**Status**: Not started

**What needs to happen**:
1. Move `src/rwgpslib/RWGPSClient.js` → `src/RWGPSClient.js`
2. Move `src/rwgpslib/RWGPSClientCore.js` → `src/RWGPSClientCore.js`
3. Move corresponding `.d.ts` files
4. Update imports/references in all consuming files
5. Update test paths in `test/__tests__/`
6. Add to `Exports.js`

**Steps**:
- [ ] 5.0.1 Copy RWGPSClient.js to src/ (keep rwgpslib version temporarily)
- [ ] 5.0.2 Copy RWGPSClientCore.js to src/
- [ ] 5.0.3 Copy .d.ts files to src/
- [ ] 5.0.4 Update require paths in moved files
- [ ] 5.0.5 Add RWGPSClient and RWGPSClientCore to Exports.js
- [ ] 5.0.6 Update test file paths
- [ ] 5.0.7 Run `npm test` - verify all tests pass
- [ ] 5.0.8 Run `npm run validate-all` - verify types
- [ ] Commit: "Task 5.0: Move RWGPSClient/Core to src/"

---

### Task 5.0.5: Consolidate member lookup into RWGPSClient

**Status**: Not started

**What needs to happen**:
1. Move `RWGPSMembersCore.lookupUserIdByName()` logic → `RWGPSClientCore.js`
2. Add `RWGPSClient.lookupOrganizerId(name)` - reads "RWGPS Members" sheet
3. Update `scheduleEvent()` and `updateEvent()` to use cached lookup instead of web API
4. Delete dependency on RWGPSMembersAdapter

**Why**:
- Current `_lookupOrganizer()` makes web API call for EACH organizer name
- Members are already cached in sheet - just look them up locally
- Eliminates web API calls, faster, simpler

**Steps**:
- [ ] Add `lookupUserIdByName(members, name)` to RWGPSClientCore.js (pure JS)
- [ ] Add `lookupOrganizerId(name)` to RWGPSClient.js (reads sheet via Fiddler)
- [ ] Update `scheduleEvent()` to use `lookupOrganizerId()` instead of `_lookupOrganizer()`
- [ ] Update `updateEvent()` similarly
- [ ] Write tests for new lookup methods
- [ ] Verify in GAS
- [ ] Commit: "Task 5.0.5: Consolidate member lookup into RWGPSClient"

---

### Task 5.1: Migrate importRow_() ✅ COMPLETE

**Status**: Done (January 2026)

- [x] Replace legacy route import with `client.importRoute()`
- [x] Handle FOREIGN prefix naming
- [x] Add group + expiry tags via `_addRouteTags()`

**Result**: Works end-to-end. Route imported with correct naming.

---

### Task 5.2: Migrate schedule_row_() ⏳ IN PROGRESS

**Status**: Partially complete

**What needs to happen**:
1. Use `client.createEvent()` instead of `copy_template_()` + `edit_event()`
2. Pass logo URL from Groups table (NOT from template)
3. Add group tag via `_addEventTags()`
4. Set route association via `route_ids` field

**Known issues**:
- [ ] `_addEventTags()` may have bug - needs verification

**Steps**:
- [ ] 5.2.1 Update schedule_row_() to create RWGPSClient
- [ ] 5.2.2 Get logo URL from `getGroupSpecs()[group].LogoURL`
- [ ] 5.2.3 Call `client.createEvent(eventData, logoUrl)`
- [ ] 5.2.4 Add group tag with `client._addEventTags([eventId], [group])`
- [ ] 5.2.5 Test: Schedule Selected Rides in GAS
- [ ] Commit: "Task 5.2: schedule_row_() uses RWGPSClient"

---

### Task 5.3: Migrate updateRow_() 🔜 NEXT

**Status**: Not started

**What needs to happen**:
1. Use `client.editEvent()` with correct v1 field names
2. Use `route_ids` to associate route (verified working)
3. Handle group changes: swap tags + update logo

**Steps**:
- [ ] 5.3.1 Update updateRow_() to create RWGPSClient
- [ ] 5.3.2 Call `client.editEvent(url, eventData)`
- [ ] 5.3.3 If group changed: update logo + swap tags
- [ ] 5.3.4 Test: Update Selected Rides in GAS
- [ ] Commit: "Task 5.3: updateRow_() uses RWGPSClient"

---

### Task 5.4: Migrate cancel/reinstate operations

**Status**: Not started

- [ ] 5.4.1 Update cancelRow_() to use RWGPSClient
- [ ] 5.4.2 Update reinstateRow_() to use RWGPSClient
- [ ] 5.4.3 Test: Cancel/Reinstate in GAS
- [ ] Commit: "Task 5.4: cancel/reinstate use RWGPSClient"

---

### Task 5.5: Migrate unschedule operation

**Status**: Not started

- [ ] 5.5.1 Update unscheduleRow_() to use RWGPSClient
- [ ] 5.5.2 Test: Unschedule Selected Rides in GAS
- [ ] Commit: "Task 5.5: unscheduleRow_() uses RWGPSClient"

---

### Task 5.6: Final verification

**Status**: Not started

- [ ] 5.6.1 Run all Jest tests: `npm test`
- [ ] 5.6.2 Run validation: `npm run validate-all`
- [ ] 5.6.3 Full GAS integration test of all operations
- [ ] 5.6.4 Document any remaining issues
- [ ] Commit: "Phase 5 complete: RideManager uses RWGPSClient"

---

### Phase 5 Complete Checkpoint

Before proceeding to Phase 6:
- [ ] All RideManager operations use RWGPSClient directly
- [ ] All Jest tests pass
- [ ] All GAS integration tests pass
- [ ] `npm run validate-all` passes
- [ ] Commit: "Phase 5 complete"

---

## Phase 6: Delete rwgpslib/ and Legacy Code

**Model recommendation**: Claude 4 Sonnet (straightforward cleanup with verification)

### Goal

After Phase 5 is complete:
1. **Delete `src/rwgpslib/` entirely** - all useful code migrated to src/
2. **Delete other unused legacy files**
3. **Update RWGPSMembersAdapter** - functionality consolidated into RWGPSClient

### Files to KEEP (in src/)

| File | Reason |
|------|--------|
| src/RWGPSClient.js | **KEEP** - Migrated, tested, canonical |
| src/RWGPSClientCore.js | **KEEP** - Migrated, pure JS helpers |

### Files to DELETE

| File/Folder | Status | Notes |
|-------------|--------|-------|
| `src/rwgpslib/` | **DELETE ALL** | Entire folder - functionality migrated to src/ |
| `src/RWGPSMembersAdapter.js` | **DELETE** | Lookup consolidated into RWGPSClient |
| `src/RWGPSMembersCore.js` | **DELETE** | Lookup consolidated into RWGPSClientCore |

### Task 6.1: Delete rwgpslib/ folder

- [ ] 6.1.1 Verify all needed functionality is in src/RWGPSClient*.js
- [ ] 6.1.2 `rm -rf src/rwgpslib/`
- [ ] 6.1.3 Run `npm test` - all tests should pass
- [ ] 6.1.4 Run `npm run validate-all`
- [ ] Commit: "Task 6.1: Delete deprecated rwgpslib/"

### Task 6.2: Delete RWGPSMembersAdapter

- [ ] 6.2.1 Verify lookup is in RWGPSClient
- [ ] 6.2.2 Delete `src/RWGPSMembersAdapter.js` and `.d.ts`
- [ ] 6.2.3 Delete `src/RWGPSMembersCore.js` and `.d.ts`
- [ ] 6.2.4 Remove from Exports.js
- [ ] 6.2.5 Run `npm test`
- [ ] Commit: "Task 6.2: Delete RWGPSMembersAdapter (consolidated into RWGPSClient)"

### Task 6.3: Clean up test files

- [ ] 6.3.1 Delete test files for deleted modules
- [ ] 6.3.2 Run `npm test` - verify remaining tests pass
- [ ] Commit: "Task 6.3: Remove tests for deleted modules"

### Phase 6 Complete Checkpoint

- [ ] All unused files deleted
- [ ] All Jest tests pass
- [ ] `npm run validate-all` passes
- [ ] Commit: "Phase 6 complete"

---

## Future Work

### When RWGPS Improves v1 API

Monitor the RWGPS OpenAPI spec for improvements:

1. **v1 PUT supports all 12 fields** → No longer need workarounds
2. **v1 adds route import** → Migrate `importRoute()` from web API
3. **v1 adds tag endpoints** → Migrate tag operations from web API

### API Coverage Reference

| Operation | Current API | Notes |
|-----------|-------------|-------|
| Get event | v1 GET | ✅ Works |
| Create event | v1 POST | ✅ Works with multipart for logo |
| Edit event | v1 PUT | ✅ 11 of 12 fields work |
| Delete events | v1 DELETE | ✅ Works |
| Import route | Web | v1 has no equivalent |
| Tag operations | Web | v1 has no tag endpoints |
| Get organizers | Local lookup | ✅ Uses cached "RWGPS Members" sheet |
| Get members | Web | Synced to sheet, then local lookup |

---

## Summary

### Current Status (January 17, 2026)

- **Phase 1-4**: Complete
- **Phase 5**: In progress
  - ✅ Task 5.1: importRow_() migrated
  - ⏳ Task 5.2: schedule_row_() in progress
  - 🔜 Task 5.3-5.6: Not started
- **Phase 6**: Not started (waiting on Phase 5)

### Key Discoveries

1. **Double-edit NOT required** - Single v1 PUT updates all 11 working fields
2. **Undocumented fields work**: `organizer_ids`, `route_ids`
3. **Only `organizers` array fails** - Use `organizer_ids` instead
4. **RWGPSClient is already tested** - Use it directly, don't add layers

### Reference Documents

- `docs/rwgps-api-tested.yaml` - Verified API behavior
- `docs/RWGPS_V1_API_BUG_REPORT.md` - API discrepancies
- `docs/SUPERSEDED_PHASE5_PLAN.md` - Historical reference only

---

## Quick Reference

### Run Tests
```bash
# All tests
npm test

# Coverage for RWGPSClient (after migration to src/)
npm test -- --coverage --collectCoverageFrom='src/RWGPSClient.js'

# Coverage for RWGPSClientCore (after migration to src/)
npm test -- --coverage --collectCoverageFrom='src/RWGPSClientCore.js'

# Current location (before migration)
npm test -- --coverage --collectCoverageFrom='src/rwgpslib/RWGPSClient.js'
```

### Validation Commands
```bash
npm run validate-all    # Full validation suite
npm run typecheck       # TypeScript checking
npm run validate-types  # .d.ts matches .js
npm run validate-exports # Module loading order
```

### Key Files (After Phase 5 Migration)
```
src/
├── RWGPSClient.js      # Main client (CANONICAL - moved from rwgpslib/)
├── RWGPSClientCore.js  # Pure JS helpers (CANONICAL - moved from rwgpslib/)
├── RideManager.js      # Orchestrates rides - uses RWGPSClient directly
└── rwgpslib/           # DEPRECATED - delete in Phase 6
```
