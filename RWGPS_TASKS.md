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

### ARCHITECTURAL DECISION: Native v1 Format

**Key Insight (Session 2026-01-13)**: 
The original Phase 4 approach was a hybrid that transformed back and forth:
```
HYBRID (BAD):
Consumer → web format → transform → v1 API → transform → web format → Consumer
```

The cleaner architecture works **natively in v1 API format**:
```
NATIVE v1 (GOOD):
Consumer → v1 format → RWGPSClient → v1 API → v1 format → Consumer
```

**Why Native v1 is Better**:
1. **Simpler**: No transformation layer needed
2. **Fewer bugs**: No format mismatches or conversion errors
3. **Faster**: No conversion overhead
4. **Clearer**: Internal state matches API state

**The Pattern**:
- Event/Route URLs contain numeric IDs (e.g., `/events/444070`)
- Extract ID from URL using `extractEventId()` or `extractRouteId()`
- All operations work with IDs and v1 format data
- RWGPSClient methods accept/return v1 API format natively

**v1 API Format Characteristics**:
```javascript
// v1 API event format (native)
{
  id: 444070,
  name: "Event Name",
  description: "Event description",  // NOT 'desc'
  start_date: "2030-03-01",          // Separate date
  start_time: "11:00",               // Separate time
  all_day: false,
  visibility: 0,
  organizer_ids: ["498406"],         // Array of ID strings
  route_ids: ["50969472"]            // Array of ID strings
}

// Web API event format (LEGACY - to be deprecated)
{
  id: 444070,
  name: "Event Name", 
  desc: "Event description",          // Alias for 'description'
  starts_at: "2030-03-01T11:00:00",   // Combined timestamp
  organizers: [{id: 498406}],         // Array of objects
  routes: [{id: 50969472}]            // Array of objects
}
```

**Migration Strategy**:
1. **Phase 4**: RWGPSClient returns v1 format natively (no backward compat transform)
2. **Phase 5**: Update consumers (EventFactory, RideManager) to use v1 format
3. **Phase 6**: Remove all web format code and transformations

**Current Status**: Task 4.2 was completed with backward-compat transforms. 
Task 4.3+ will follow native v1 approach - no more `transformV1EventToWebFormat()`.

### CRITICAL IMPLEMENTATION METHODOLOGY

Phase 4 migration must use **TWO sources of truth** and systematically bridge the gap:

1. **📋 OpenAPI Specification (`docs/rwgps-openapi.yaml`)** - The documented contract
   - ✅ Endpoint paths, HTTP methods, authentication  
   - ✅ Request/response schemas, field types, nesting
   - ✅ Error codes, parameter requirements
   - ✅ **ALWAYS consult FIRST before implementation**

2. **🔧 Working Implementation** - Current web API behavior  
   - ✅ Actual request/response patterns (from fixtures)
   - ✅ Workarounds (double-edit pattern, field transformations)
   - ✅ Error handling, authentication flows
   - ✅ **Preserve working behavior patterns**

**LESSON LEARNED (Task 4.2)**: Implementing without checking OpenAPI spec led to unnecessary debugging cycle. v1 API response wrapping under `{"event": {...}}` key was documented but missed during implementation.

**✅ REQUIRED WORKFLOW for ALL Phase 4 tasks**:
```
BEFORE implementing ANY v1 endpoint:
1. Check OpenAPI spec: response schema, nesting, field formats
2. Review existing fixtures: current behavior patterns  
3. Identify differences: what needs transformation/adaptation
4. Implement with proper schema handling from start
5. Write tests matching documented contract
6. Deploy and validate - should succeed immediately
```

**Implementation Pattern**: 
- v1 API calls with Basic Auth (no login needed)
- Response transformation to maintain backward compatibility
- Preserve all workarounds (double-edit) until proven unnecessary

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

### Task 4.2: Replace web getEvent with v1 API ✅ COMPLETE
- [x] **APPLIED METHODOLOGY**: Consulted OpenAPI spec (after debugging) - response wrapped under `"event"` key
- [x] Change `getEvent()` to use `GET /api/v1/events/{id}.json`
- [x] **Transform v1 response format to match web API format**
  - v1 uses: `start_date` (string) + `start_time` (string) + `time_zone`  
  - Web uses: `starts_at` (ISO 8601 timestamp)
  - Implementation: `transformV1EventToWebFormat()` in RWGPSClientCore
  - Conversion: `start_date + start_time` → `starts_at` (ISO 8601)
  - **FIX**: Unwrap response from `{"event": {...}}` structure (per OpenAPI spec)
- [x] Run tests - all getEvent tests pass ✅
- [x] Backward compatibility maintained - consumers get same format
- [x] Commit: "Task 4.2: Migrate getEvent to v1 API with response transformation" (809b361)- [x] **DEPLOYED AND VERIFIED**: GAS integration test confirms v1 API working
  - ✅ v1 API endpoint called (no login required)
  - ✅ Response format transformed successfully
  - ✅ Web API format returned to consumer
  - ✅ Event data extracted and transformed correctly
**Key Changes**:
- Endpoint: `GET /events/{id}` → `GET /api/v1/events/{id}.json`
- Auth: Web session cookie → Basic Auth (apiKey:authToken)
- Response transformation handles different date/time format
- No login required (v1 API uses Basic Auth)
- **CRITICAL**: v1 API wraps response in `{"event": {...}}` - must unwrap

**LESSON**: Initial implementation failed because OpenAPI spec wasn't consulted first. Response wrapping was documented but discovered through debugging instead of spec review.

**Test Results**: 5 tests pass
- ✅ successfully get event details
- ✅ return error on API failure
- ✅ return error for invalid event URL
- ✅ use v1 API endpoint
- ✅ use Basic Auth with v1 API

**TASK COMPLETE**

### Task 4.3: Replace web editEvent with v1 API (Native v1 Format) ✅ COMPLETE

**CHOSEN APPROACH: Option B - Native v1 Format with URL Interface**

**Architecture**:
```
User Input (URLs) → Extract ID → v1 API Format (internal) → v1 API → Build URL → User Output (URLs)
```

**Key Principles**:
1. **URLs for human interface**: Users paste public URLs (ridewithgps.com/events/444070)
2. **IDs extracted from URLs**: `extractEventId()`, `extractRouteId()` already exist
3. **v1 format internally**: All data structures use v1 API format (description, start_date, start_time, organizer_ids, route_ids)
4. **URLs for display**: Reconstruct URLs from IDs for output (e.g., spreadsheet links)

**URL ↔ ID Utilities** (already exist):
```javascript
// Extract ID from URL
const eventId = RWGPSClientCore.extractEventId('https://ridewithgps.com/events/444070'); // → '444070'
const routeId = RWGPSClientCore.extractRouteId('https://ridewithgps.com/routes/50969472'); // → '50969472'

// Build URL from ID (simple string concatenation)
const eventUrl = `https://ridewithgps.com/events/${eventId}`;
const routeUrl = `https://ridewithgps.com/routes/${routeId}`;
```

**Implementation Steps**:

- [x] **STEP 1: Update editEvent to accept v1 format natively**
  - Added: `buildV1EditEventPayload()` helper in RWGPSClientCore.js
  - Added: `buildV1EditEventOptions()` helper for PUT request construction
  - Accept: `{name, description, start_date, start_time, organizer_ids, route_ids, ...}`
  - Endpoint: `PUT /api/v1/events/{id}.json` with Basic Auth (no login required)

- [x] **STEP 2: Keep double-edit workaround** (confirmed by Task 4.1)
  - First PUT: `all_day: '1'` to reset time
  - Second PUT: actual `start_date`, `start_time`, `all_day: '0'`

- [x] **STEP 3: Return v1 format response natively**
  - Return: v1 format as-is (unwrap from `{"event": {...}}` only)
  - No transformation layer

- [x] **STEP 4: Update tests**
  - Updated edit.json fixture to use v1 API format
  - Updated cancel.json fixture with v1 response wrapping
  - Tests provide v1 format input (description, start_date, start_time, organizer_ids)
  - Tests expect v1 format output
  - Updated cancelEvent/reinstateEvent tests for v1 API behavior (no login errors)

- [x] **STEP 5: Document breaking change**
  - editEvent now accepts/returns v1 format
  - Callers need to be updated in Phase 5

- [x] Run tests - 77/77 pass ✅
- [x] Commit: "Task 4.3: Migrate editEvent to native v1 API format" (0dc667c)

**Test Results**: 7 editEvent tests pass, 77 total tests pass
- ✅ successfully edit an event using double-edit pattern
- ✅ make two PUT requests (all_day=1, then all_day=0)
- ✅ use v1 API with organizer_ids directly
- ✅ use v1 API with route_ids directly
- ✅ return error if API call fails
- ✅ return error for invalid event URL
- ✅ use Basic Auth in both PUT requests

**TASK COMPLETE**

### Task 4.3.1: Revert Task 4.2 to native v1 format ✅ COMPLETE
- [x] Update getEvent to return v1 format natively (remove transformV1EventToWebFormat)
- [x] Update tests to expect v1 format
- [x] Commit: "Task 4.3.1: getEvent returns native v1 format" (2c1458d)

### v1 API Limitations (Documented via GAS Testing)
**See RWGPS_V1_API_BUG_REPORT.md for full details**

#### Event Field Updates (PUT /api/v1/events/{id}.json)

| Field | PUT Update Works? | Notes |
|-------|-------------------|-------|
| `name` | ✅ Yes | Single PUT |
| `description` | ✅ Yes | Single PUT |
| `start_time` | ✅ Yes | Single PUT (after fixing field format) |
| `start_date` | ❌ No | Never updates, even with double-edit |
| `all_day` | ❌ No | Read-only (not in EventPayload schema) |

**Workaround for date changes**: Delete and recreate event

#### Event Creation - Logo/Image Handling (POST /api/v1/events.json)

**Experiment Date**: January 13, 2026  
**Test Function**: `testLogoUrlInCreateEvent()` in gas-integration-tests.js

| Approach | Works? | Details |
|----------|--------|---------|
| `logo_url` in JSON payload | ❌ No | Field is read-only, cannot be set via POST |
| Multipart form-data upload | ✅ Yes (documented) | `Content-Type: multipart/form-data` with `event[logo]` binary field |

**JSON Payload Test Results**:
```javascript
// Attempted:
POST /api/v1/events.json
{
  "event": {
    "name": "...",
    "logo_url": "https://ridewithgps.com/.../404019.jpg"
  }
}

// Result: Event created but logo_url = null
// Conclusion: logo_url is read-only
```

**Multipart Upload Solution** (from OpenAPI spec):
```
POST /api/v1/events.json
Content-Type: multipart/form-data

Fields:
- event[name]
- event[description]
- event[logo] - Binary image file
- event[banner] - Binary image file
- event[start_date], event[start_time], etc.
```

**Implementation Required**: To fully replace `copyTemplate()`:
1. Download logo image from template's `logo_url` as binary
2. Use multipart/form-data instead of JSON for createEvent
3. Include logo binary in the payload
**Impact on RideManager**: Minimal - date changes are rare after event creation

### Task 4.4: Replace copyTemplate with createEvent ✅ COMPLETE

**Status**: Complete - createEvent with Drive-based logo storage implemented

**Implementation Summary**:

1. **createEvent implementation** ✅
   - `POST /api/v1/events.json` endpoint working
   - Creates events with v1 API format
   - Tests pass (13 tests)
   - Method signature: `createEvent(eventData)` where eventData contains:
     - `name`, `description`, `start_date`, `start_time`, `visibility`
     - `organizer_ids` (array of numbers), `route_ids` (array of numbers)
     - Optional: `location`, `time_zone`, `all_day`

2. **Logo/Image Handling** ✅
   
   **Solution Implemented - Drive-Based Logo Storage**:
   - ✅ **Drive folder created**: "SCCCC Group Logos" stores logo image files
   - ✅ **Groups tab updated**: LogoURL column contains Drive file URLs
   - ✅ **Logo population script**: `GroupLogoManager.populateGroupLogos()`
   - ✅ **Runtime integration**: `createEventWithLogo()` accepts Drive logo URL
   - ✅ **Self-healing**: `autoPopulateGroupLogos()` populates missing logos on trigger
   
   **Architecture - Drive-Based Storage**:
   ```javascript
   // Groups tab structure (LogoURL column):
   // Group | TEMPLATE                    | GoogleCalendarId    | LogoURL (Drive)         | MIN_LENGTH | ...
   // A     | https://.../events/404019   | groupA@gmail.com   | https://drive.google... | 30         | ...
   // B     | https://.../events/404020   | groupB@gmail.com   | https://drive.google... | 40         | ...
   ```
   
   **Logo Storage Strategy Implemented**:
   1. ✅ **One-time setup**: `populateGroupLogos()` creates Drive folder and uploads logos
   2. ✅ **Logo storage**: Image files in Drive folder (persistent, no size limits)
   3. ✅ **LogoURL column**: Contains Drive file URLs (hover shows preview)
   4. ✅ **Read at runtime**: `getGroupSpecs()` returns LogoURL from Groups tab
   5. ✅ **Usage**: `createEventWithLogo(eventData, logoUrl)` downloads from Drive and uploads to RWGPS
   6. ✅ **Self-healing**: Installable trigger calls `autoPopulateGroupLogos()` if LogoURL missing
   
   **Key Files Created**:
   - `src/GroupLogoManager.js` - Logo population and Drive management
   - `docs/MIGRATION_GROUP_LOGOS.md` - Operator documentation
   - `src/gas-integration-tests.js` - Test: `testTask4_4_PartB_LogoIntegration()`

**Commits**:
- 90709f7: Task 4.4: Implement createEvent with v1 API POST
- 19372fa: Task 4.4 Part A: Implement GroupLogoManager for logo storage
- 26dd274: Task 4.4 Part B: Runtime logo integration
- b7eba35: Drive-based logo storage for Task 4.4

**TASK COMPLETE**

### Task 4.5: Handle batch_update_tags ✅ COMPLETE

**Decision**: Keep web API for batch tag operations

**Rationale**:
1. **v1 API has NO tag endpoints** - Verified in OpenAPI spec
   - No `/api/v1/events/{id}/tags` endpoint
   - No `/api/v1/routes/{id}/tags` endpoint
   - No batch tag operations in v1 API
   
2. **Web API is the ONLY option** for tag operations:
   - `POST /events/batch_update_tags.json` - Add/remove tags on multiple events
   - `POST /routes/batch_update_tags.json` - Add/remove tags on multiple routes
   - Requires web session cookie (login)
   
3. **Alternative would be inefficient**:
   - Would need individual PUT calls for each event/route
   - No documented way to update tags in v1 EventPayload
   - Would significantly slow down operations that tag multiple events

**Implementation**: Keep existing `_batch_update_tags()` method using web API

**Affected Methods**:
- `unTagEvents()` - Batch remove tags from multiple events
- `tagEvents()` - Batch add tags to multiple events  
- `_addRouteTags()` - Add tags to routes
- `_removeRouteTags()` - Remove tags from routes

**Commit**: "Task 4.5: Document decision to keep web API for tag operations"

**TASK COMPLETE**

### Task 4.6: Evaluate getClubMembers migration ✅ COMPLETE

**Investigation**: Does `/clubs/47/table_members.json` need migration to v1 API?

**Current Implementation**:
- Uses `/clubs/47/table_members.json` (undocumented endpoint)
- Returns: `[{user: {id, first_name, last_name}, ...}]`
- Used by: `RWGPSMembersAdapter.updateMembers()`
- Processing: `RWGPSMembersCore.transformMembersData()` expects this exact format
- Tests: 100% coverage of transformation logic

**v1 API Available**: 
- Endpoint: `GET /api/v1/members.json`
- Returns: `{members: [{user: {id, first_name, last_name}, ...}], meta: {pagination}}`
- Paginated (requires fetching multiple pages)

**Key Finding**: Both endpoints return the SAME data format! ✅

**Decision: Keep existing endpoint**

**Rationale**:
1. **Works perfectly** - RWGPSMembersAdapter is well-tested and working in production
2. **Same data format** - Both endpoints return `{user: {id, first_name, last_name}}`
3. **Simpler** - `/table_members.json` returns all members in one call
4. **v1 is paginated** - Would require pagination loop (more complexity)
5. **No benefit** - Migration adds work with zero functional improvement
6. **Documented** - OpenAPI has v1, but undocumented endpoint works fine

**Conclusion**: This is NOT a "web API that needs migration" - it's already working correctly with the same data format as v1. The only difference is pagination, which is actually a disadvantage for our use case (we want all members at once).

**Affected Code**:
- `RWGPSService.getClubMembers()` - Keep as-is
- `RWGPS.get_club_members()` - Keep as-is
- `RWGPSMembersAdapter` - No changes needed
- `RWGPSMembersCore` - Already handles the format correctly

**TASK COMPLETE - No migration needed**

### Phase 4 Complete Checkpoint
- [x] ✅ All tests pass (554 tests - commit 0d0b5d2)
- [x] ✅ RWGPSClient operations use v1 API natively
  - createEvent, getEvent, editEvent all use /api/v1/events
  - getEvent transforms v1 → web format for backward compatibility (commit ee9ba29)
- [x] ✅ Document operations still using web API:
  - **batch_update_tags** - v1 API has NO tag endpoints (must use web API)
  - **getClubMembers** - /clubs/47/table_members.json returns v1-compatible format
    (No migration needed - same data structure, simpler than paginated v1)
- [x] ✅ GAS Integration Tests PASSED:
  - **testTask4_2_V1ApiGetEvent(445203)** ✅ starts_at correctly transformed
    - v1 format (start_date + start_time) → web format (starts_at ISO 8601)
    - Backward compatibility maintained for Phase 4
  - **testTask4_4_PartB_LogoIntegration()** ✅ Logo integration working
    - Created event 453387 with logo from Google Drive
    - Logo uploaded successfully (image/jpeg, 9124 bytes)
    - User verified logo displays on RWGPS event page
    - Complete workflow: Drive URL → Blob → v1 API multipart upload
- [x] ✅ Commit Phase 4 complete: Multiple commits (0d0b5d2, ee9ba29)

**Phase 4 Summary**:
- RWGPSClient fully migrated to v1 API for events
- Tests updated to reflect new createEvent() flow
- v1→web transformation ensures backward compatibility
- Two operations keep web API with documented rationale
- All 554 tests passing + GAS integration tests validated

**Key Learning**: GAS integration tests caught format mismatch that Jest mocks didn't catch. Always validate with real API calls before considering phase complete.

---

## Phase 5: Update Consumers to v1 Format

**Model recommendation**: Sonnet 4.5

### Goal
Update all consumers of RWGPSClient to use v1 API format natively.

### Key Format Differences to Address
```javascript
// CONSUMER MIGRATION: Update all usages from web format to v1 format

// Event data fields:
desc → description              // Field rename
starts_at → start_date + start_time  // Split timestamp
organizers: [{id: N}] → organizer_ids: ['N']  // Object array → string array
routes: [{id: N}] → route_ids: ['N']  // Object array → string array

// Example transformation in consumer:
// BEFORE (web format):
const eventData = {
    name: 'Ride Name',
    desc: 'Description',
    starts_at: '2030-03-01T11:00:00',
    organizers: [{ id: 498406 }],
    routes: [{ id: 50969472 }]
};

// AFTER (v1 format):
const eventData = {
    name: 'Ride Name',
    description: 'Description',
    start_date: '2030-03-01',
    start_time: '11:00',
    organizer_ids: ['498406'],
    route_ids: ['50969472']
};
```

### Task 5.1: Identify all RWGPSClient consumers
- [ ] Search codebase: `grep -r "rwgps\." src/ --include="*.js"`
- [ ] Document each file that calls RWGPSClient methods
- [ ] List which methods are called and with what format
- [ ] Prioritize by frequency of use

**Expected consumers**:
- `RideManager.js` - Main adapter, uses many methods
- `EventFactory.js` - Creates event data objects
- `RideCoordinator.js` - Orchestrates ride operations
- GAS integration tests (`gas-integration-tests.js`)

### Task 5.2: Update EventFactory to create v1 format
- [ ] `newEvent()` should create v1 format events
- [ ] Update: `desc` → `description`
- [ ] Update: `starts_at` → `start_date` + `start_time`
- [ ] Update: `organizers` → `organizer_ids`
- [ ] Update: `routes` → `route_ids`
- [ ] Update tests
- [ ] Run tests
- [ ] Commit: "Task 5.2: EventFactory creates v1 format events"

### Task 5.3: Update RideManager to expect v1 format
- [ ] Update `scheduleRide()` to pass v1 format to RWGPSClient
- [ ] Update `updateRide()` to pass v1 format to RWGPSClient
- [ ] Update `cancelRide()` to handle v1 format responses
- [ ] Update tests
- [ ] Run tests
- [ ] Commit: "Task 5.3: RideManager uses v1 format"

### Task 5.4: Update RideCoordinator
- [ ] Check what format RideCoordinator uses
- [ ] Update to v1 format if needed
- [ ] Update tests
- [ ] Run tests
- [ ] Commit: "Task 5.4: RideCoordinator uses v1 format"

### Task 5.5: Update GAS integration tests
- [ ] Update test data to use v1 format
- [ ] Verify all tests pass with native v1 format
- [ ] Commit: "Task 5.5: Integration tests use v1 format"

### Phase 5 Complete Checkpoint
- [ ] All consumers use v1 format natively
- [ ] No web format code remains in application layer
- [ ] All tests pass
- [ ] Deploy and verify in GAS
- [ ] Commit: "Phase 5 complete: All consumers use native v1 format"

---

## Phase 6: Clean Up Legacy Code

**Model recommendation**: Haiku 4.5

### Goal
Remove dead code, legacy transformations, and simplify structure.

### Task 6.1: Remove web format transformation code
- [ ] Delete `transformV1EventToWebFormat()` from RWGPSClientCore
- [ ] Delete `transformWebEventToV1Format()` from RWGPSClientCore
- [ ] Delete `buildEditEventPayload()` (if replaced by v1 native)
- [ ] Update type definitions
- [ ] Run tests
- [ ] Commit: "Remove web format transformation code"

### Task 6.2: Remove RWGPS.js facade (if no longer needed)
- [ ] Check if anything still imports RWGPS.js
- [ ] If not, delete it
- [ ] Run tests
- [ ] Commit: "Remove unused RWGPS.js"

### Task 6.3: Remove RWGPSService.js (if no longer needed)
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
