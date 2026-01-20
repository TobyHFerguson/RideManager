# RWGPS Library Migration Guide

## Overview

This guide documents the migration of the vendored RWGPSLib from the current mixed web/v1 API implementation to a clean v1 API-only architecture.

## Current State

The vendored library (`src/rwgpslib/`) currently uses TWO authentication methods:

| Method | Used For | Auth Type |
|--------|----------|-----------|
| Web Session (cookie) | copy_template, edit_event, batch_update_tags, organizer lookup | Cookie from /organizations/47/sign_in |
| v1 API (Basic Auth) | delete_event, getRoute, getClubMembers | Basic Auth with api_key:auth_token |

## Target State

All operations should use the **v1 API with Basic Auth**. The v1 API supports:
- `GET /api/v1/events.json` - List events
- `POST /api/v1/events.json` - Create event
- `GET /api/v1/events/{id}.json` - Get event
- `PUT /api/v1/events/{id}.json` - Update event  
- `DELETE /api/v1/events/{id}.json` - Delete event
- `GET /api/v1/routes/{id}.json` - Get route
- `GET /api/v1/members.json` - List club members

See `docs/rwgps-openapi.yaml` for the complete API specification.

## Key Insights from Characterization

### The "Double Edit" Workaround

The current implementation does TWO edits for every event modification:
```javascript
// First edit with all_day=1 (workaround)
rwgpsService.edit_event(url, { ...event, all_day: "1" });
// Second edit with actual all_day value
rwgpsService.edit_event(url, event);
```

**Hypothesis**: This may be a web API quirk that doesn't apply to v1 API.
**Test**: Create a v1 API test that does a single PUT and verify time is set correctly.

### Asymmetric Field Names

The web API uses inconsistent field naming:
- **Request**: `all_day` as string ("0" or "1")
- **Response**: `all_day` as boolean (true/false)
- **Request**: `organizer_tokens` (array of string IDs)
- **Response**: `organizer_ids` (array of numbers)

The v1 API may have cleaner, consistent field names.

### Operations Without v1 API Equivalent

| Operation | Current Method | v1 API Alternative |
|-----------|---------------|-------------------|
| copy_template | POST to /events/{id}/copy | POST /api/v1/events.json (create new) |
| batch_update_tags | POST to /events/batch_update_tags.json | None - need individual calls or keep web API |
| getOrganizers | POST to /events/{template}/organizer_ids.json | GET /api/v1/members.json with name filter |

## Migration Steps

### Phase 1: Characterization Tests (DONE)
- ✅ Add API logging to capture all traffic
- ✅ Save fixtures for all 6 operations
- ✅ Create mock server for replay

### Phase 2: Unit Tests Against Fixtures
- [ ] Write tests for each operation verifying:
  - Correct API calls are made
  - Correct data is sent in requests
  - Responses are parsed correctly
  - Return values match expected format

### Phase 3: Simplify Architecture
Replace the current layered structure:
```
RWGPS (facade) → RWGPSService → ApiService → UrlFetchApp
```

With a simpler:
```
RWGPSClient (single class) → UrlFetchApp
```

### Phase 4: Migrate to v1 API
For each operation, in order of risk:
1. **getRoute** - Already uses v1 API ✅
2. **deleteEvent** - Already uses v1 API ✅
3. **getClubMembers** - Already uses v1 API ✅
4. **getEvent** - Change from web API to v1 API
5. **editEvent** - Change from web API to v1 API (test if double-edit needed)
6. **createEvent** - Replace copy_template with POST /api/v1/events.json
7. **batch_update_tags** - Keep web API or implement individual tag calls

### Phase 5: Clean Up
- Remove unused code paths
- Remove web session authentication if no longer needed
- Update documentation

## Test-Driven Refactoring Process

For each change, follow this exact process:

1. **Run existing tests**: `npm test`
2. **Make ONE small change**
3. **Run tests again**: `npm test`
4. **If tests fail**: Fix immediately or revert
5. **If tests pass**: Commit the change
6. **Repeat**

## Files to Modify

### Keep (with modifications)
- `ApiService.js` - Simplify to single auth method
- `CredentialManager.js` - Keep for credential storage

### Delete (after migration)
- `RWGPS.js` - Merge into single client
- `RWGPSService.js` - Merge into single client
- `CanonicalEvent.js` - May not be needed
- `types.js` - Inline types or use JSDoc

### New Files
- `RWGPSClient.js` - Single unified client
- `RWGPSClient.test.js` - Characterization + unit tests

## API Reference Quick Card

### v1 API Authentication
```javascript
const headers = {
  'Authorization': `Basic ${btoa(apiKey + ':' + authToken)}`,
  'Accept': 'application/json'
};
```

### Create Event (v1 API)
```
POST /api/v1/events.json
Content-Type: application/json

{
  "event": {
    "name": "Event Name",
    "description": "Description",
    "starts_at": "2025-03-01T18:00:00Z",
    "all_day": false,
    "visibility": "private",
    "route_ids": [12345]
  }
}
```

### Update Event (v1 API)
```
PUT /api/v1/events/{id}.json
Content-Type: application/json

{
  "event": {
    "name": "Updated Name",
    ...
  }
}
```

### Delete Event (v1 API)
```
DELETE /api/v1/events/{id}.json
→ Returns 204 No Content
```

## Error Handling

The v1 API returns consistent error responses:
```json
{
  "error": {
    "message": "Not found",
    "code": "not_found"
  }
}
```

## Rollback Plan

If the migration breaks production:
1. Revert to the commit before migration started
2. Re-deploy: `npm run prod:push`
3. Document what broke in an issue

The characterization tests serve as the safety net - if they pass, behavior is preserved.
