# RWGPS v1 API Bug Report: Single PUT Does Not Update Event Time

## Summary

The v1 REST API endpoint `PUT /api/v1/events/{id}.json` does not correctly update the `start_time` field when sending a single PUT request. Other fields (e.g., `name`, `description`) update correctly, but the time remains unchanged.

## Reproduction Steps

1. **Get an existing event** via `GET /api/v1/events/{id}.json`
   ```json
   {
     "id": 445203,
     "start_date": "2030-03-01",
     "start_time": "11:00",
     "all_day": false,
     "name": "Original Name"
   }
   ```

2. **Send single PUT** with updated time:
   ```bash
   PUT /api/v1/events/445203.json
   Authorization: Basic {apiKey:authToken base64}
   Content-Type: application/json
   
   {
     "name": "Updated Name",
     "start_date": "2030-04-15",
     "start_time": "18:30",
     "all_day": "0"
   }
   ```

3. **Fetch event again** to verify changes:
   ```json
   {
     "id": 445203,
     "start_date": "2030-03-01",  // ❌ NOT updated
     "start_time": "11:00",        // ❌ NOT updated
     "all_day": false,
     "name": "Updated Name"        // ✅ Updated correctly
   }
   ```

**Result**: Name field updates correctly, but `start_date` and `start_time` remain unchanged.

## Expected Behavior

A single PUT request should update all provided fields, including `start_date` and `start_time`.

## Current Workaround

We've discovered that time updates **do** work if using a "double-edit" pattern (same as the legacy web API behavior):

1. **First PUT**: Set `all_day: "1"` (enables all-day mode, which clears the specific time)
2. **Second PUT**: Set `start_date`, `start_time`, and `all_day: "0"` (now the time updates correctly)

```javascript
// First PUT - Reset with all_day
PUT /api/v1/events/{id}.json
{ "all_day": "1" }

// Second PUT - Set actual time
PUT /api/v1/events/{id}.json
{
  "start_date": "2030-04-15",
  "start_time": "18:30",
  "all_day": "0"
}
// ✅ Time now updates correctly
```

This workaround is identical to the behavior required by your legacy web API (which uses web session cookies and CSRF tokens).

## Impact

This issue prevents clean migration from the web API to the v1 REST API:
- Forces continued use of the double-edit workaround
- Increases API call count (2 PUTs instead of 1)
- Makes the v1 API inconsistent (some fields update with single PUT, others don't)
- Prevents developers from writing clean, intuitive API integrations

## Environment

- **API Version**: v1 REST API (`/api/v1/events/{id}.json`)
- **Authentication**: Basic Auth with apiKey:authToken
- **Tested**: January 13, 2026
- **Event ID**: 445203 (repeatable with other events)
- **Response Format**: Confirmed via production testing

## Additional Notes

The v1 API response structure uses separate `start_date` and `start_time` fields instead of a combined `starts_at` timestamp (different from web API). However, the issue exists regardless of whether we send:
- `starts_at: "2030-04-15T18:30:00.000Z"` (combined timestamp)
- `start_date: "2030-04-15"` + `start_time: "18:30"` (separate fields)

Neither format updates the time with a single PUT.

## Request

Could you investigate why the v1 API requires the double-edit workaround for time changes? Ideally, a single PUT request should update all provided fields atomically.

Thank you for maintaining this excellent platform! We're excited to migrate our integration to the v1 REST API once this issue is resolved.

---

**Testing Code Available**: We have comprehensive test cases demonstrating this behavior if you'd like to see the full implementation details.
