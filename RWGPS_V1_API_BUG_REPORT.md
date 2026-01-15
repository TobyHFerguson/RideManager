# RWGPS v1 API Bug Report: PUT Updates Only 3 of 12 OpenAPI Fields

## Summary

The v1 REST API endpoint `PUT /api/v1/events/{id}.json` has **severe limitations** - only **3 of 12 fields** defined in the OpenAPI `EventPayload` schema can be updated: `name`, `start_date`, and `start_time`. 

**Nine fields documented in the OpenAPI spec are silently ignored**, including `description`, `end_date`, `end_time`, `location`, `lat`, `lng`, `time_zone`, `visibility`, and `organizers`.

This makes the v1 API unsuitable for comprehensive event editing.

## Test Methodology

We created a comprehensive test (`testV1API_OpenAPICompliant()`) that:
1. Creates a test event with initial values for ALL OpenAPI EventPayload fields
2. Sends a single PUT request updating ALL fields to new values
3. Verifies which fields actually changed
4. Cleans up (deletes) the test event

**Test strictly follows the OpenAPI specification** (reference: `/components/schemas/EventPayload`).

## OpenAPI EventPayload Schema Fields Tested

Per the OpenAPI spec, `EventPayload` defines these writable fields:
- `name` (string)
- `description` (string)
- `start_date` (string, format: date)
- `start_time` (string)
- `end_date` (string, format: date)
- `end_time` (string)
- `location` (string)
- `lat` (number)
- `lng` (number)
- `time_zone` (string)
- `visibility` (enum: public, private, managers_only)
- `organizers` (array of User objects)

**Note**: Fields like `route_ids`, `organizer_ids`, and `all_day` are **NOT in the EventPayload schema**.

## Test Results (January 14, 2026)

### Summary Table

| OpenAPI Field | Sent Value | Received Value | Status |
|---------------|------------|----------------|--------|
| `name` | "OPENAPI TEST - Updated Name" | "OPENAPI TEST - Updated Name" | ✅ **WORKING** |
| `start_date` | "2030-08-20" | "2030-08-20" | ✅ **WORKING** |
| `start_time` | "14:30" | "14:30" | ✅ **WORKING** |
| `description` | "Updated description..." | `undefined` | ❌ **BROKEN** |
| `end_date` | "2030-08-20" | `null` | ❌ **IGNORED** |
| `end_time` | "18:00" | `null` | ❌ **IGNORED** |
| `location` | "Updated Location - Starting Point B" | "Initial Location - Starting Point A" | ❌ **IGNORED** |
| `lat` | 37.7749 | `null` | ❌ **IGNORED** |
| `lng` | -122.4194 | `null` | ❌ **IGNORED** |
| `time_zone` | "America/New_York" | "America/Los_Angeles" | ❌ **IGNORED** |
| `visibility` | "public" | "managers_only" | ❌ **IGNORED** |
| `organizers` | `[{id: 302732}]` | `[]` | ❌ **IGNORED** |

**Result**: Only **3 of 12 OpenAPI EventPayload fields** can be updated via PUT.

### Derived/Read-Only Fields (Not in EventPayload)

| Field | Behavior | Notes |
|-------|----------|-------|
| `all_day` | Correctly inferred | Derived from start/end times; not writable |
| `route_ids` | N/A | **Not in EventPayload spec** - cannot test |
| `organizer_ids` | N/A | **Not in OpenAPI spec** - use `organizers` instead |

## Reproduction Example

### Test Payload (OpenAPI-Compliant)

```json
PUT /api/v1/events/453384.json
Authorization: Basic {base64(apiKey:authToken)}
Content-Type: application/json

{
  "event": {
    "name": "OPENAPI TEST - Updated Name",
    "description": "Updated description after OpenAPI compliance testing.",
    "start_date": "2030-08-20",
    "start_time": "14:30",
    "end_date": "2030-08-20",
    "end_time": "18:00",
    "location": "Updated Location - Starting Point B",
    "lat": 37.7749,
    "lng": -122.4194,
    "time_zone": "America/New_York",
    "visibility": "public",
    "organizers": [{"id": 302732}]
  }
}
```

### API Response (HTTP 200)

```json
{
  "event": {
    "id": 453384,
    "name": "OPENAPI TEST - Updated Name",      // ✅ Updated
    "desc": null,                                // ❌ description ignored
    "start_date": "2030-08-20",                  // ✅ Updated  
    "start_time": "14:30",                       // ✅ Updated
    "end_date": null,                            // ❌ end_date ignored
    "end_time": null,                            // ❌ end_time ignored
    "location": "Initial Location - Starting Point A",  // ❌ location ignored
    "lat": null,                                 // ❌ lat ignored
    "lng": null,                                 // ❌ lng ignored
    "time_zone": "America/Los_Angeles",          // ❌ time_zone ignored
    "visibility": "managers_only",               // ❌ visibility ignored
    "organizer_ids": [],                         // ❌ organizers ignored
    "all_day": false
  }
}
```

## Expected Behavior

Per the OpenAPI specification, `PUT /api/v1/events/{id}.json` should accept an `EventPayload` object and update all provided fields on the event.

**Current behavior**: Only `name`, `start_date`, and `start_time` are honored. All other fields in the EventPayload schema are silently ignored with no error.

## Questions for RWGPS Developers

1. **Are the 9 broken fields intentionally not implemented?** The OpenAPI spec defines them in `EventPayload`, but they don't work.

2. **What is the correct format for `organizers`?** We used `[{id: 302732}]` per the spec (array of User objects), but it was ignored.

3. **How can we update event visibility?** Sending `visibility: "public"` is ignored.

4. **How can we set event duration?** `end_date` and `end_time` are ignored, making it impossible to specify when an event ends.

5. **Is there a different endpoint for updating these fields?** Perhaps a PATCH endpoint or field-specific endpoints?

6. **How can we update event routes?** `route_ids` is not in EventPayload - is there another way to modify routes after event creation?

## Impact

This limitation severely impacts event management applications:

- ❌ **Cannot update event descriptions** (critical for ride details)
- ❌ **Cannot change event visibility** (stuck on `managers_only`)
- ❌ **Cannot set event duration** (no end date/time)
- ❌ **Cannot assign organizers** (empty organizer list)
- ❌ **Cannot update location** (critical for ride start points)
- ❌ **Cannot change time zones** (important for multi-region events)
- ❌ **Cannot set GPS coordinates** (lat/lng ignored)

## Environment

- **API Version**: v1 REST API (`/api/v1/events/{id}.json`)
- **OpenAPI Reference**: `/components/schemas/EventPayload`
- **Authentication**: Basic Auth with `apiKey:authToken`
- **Content-Type**: `application/json`
- **Tested**: January 14, 2026
- **Test Event ID**: 453384 (newly created, no participants)
- **Event Date**: Future date (2030)

## Test Code

Full test implementation available in `gas-integration-tests.js`:
- `testV1API_OpenAPICompliant()` - Tests all 12 EventPayload fields

The test:
1. Creates event with initial values
2. PUTs updated values for ALL OpenAPI EventPayload fields
3. Verifies each field individually
4. Reports working vs broken fields
5. Cleans up test data

---

**We'd appreciate guidance on the correct approach for updating these fields, or confirmation that they are not yet implemented in the v1 API.**
