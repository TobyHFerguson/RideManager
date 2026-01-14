# RWGPS v1 API Bug Report: PUT Does Not Update Event Date

## Summary

The v1 REST API endpoint `PUT /api/v1/events/{id}.json` does not update the `start_date` field. Other fields including `name`, `description`, and `start_time` update correctly, but the date remains unchanged.

## Reproduction Steps

### Test 1: Single PUT Request

1. **Get an existing event** via `GET /api/v1/events/{id}.json`
   ```json
   {
     "event": {
       "id": 445203,
       "start_date": "2030-03-01",
       "start_time": "11:00",
       "all_day": false,
       "name": "Fri B (3/1 11:00) CCP - Rancho San Vicente..."
     }
   }
   ```

2. **Send single PUT** with updated date and time:
   ```bash
   PUT /api/v1/events/445203.json
   Authorization: Basic {base64(apiKey:authToken)}
   Content-Type: application/json
   
   {
     "event": {
       "name": "Fri B (3/1 11:00) CCP... [V1 TEST]",
       "description": "...",
       "start_date": "2030-04-15",
       "start_time": "18:30",
       "all_day": "0"
     }
   }
   ```

3. **Response** (HTTP 200):
   ```json
   {
     "event": {
       "id": 445203,
       "start_date": "2030-03-01",  // ❌ NOT updated (sent 2030-04-15)
       "start_time": "18:30",        // ✅ Updated correctly
       "all_day": false,
       "name": "Fri B (3/1 11:00) CCP... [V1 TEST]"  // ✅ Updated correctly
     }
   }
   ```

**Result**: `name` and `start_time` update correctly, but `start_date` remains unchanged.

### Test 2: Double-PUT Pattern (all_day workaround)

We also tested the "double-edit" pattern that works for the legacy web API:

1. **First PUT** with `all_day: "1"`:
   ```json
   {
     "event": {
       "start_date": "2030-04-15",
       "start_time": "14:30",
       "all_day": "1"
     }
   }
   ```
   Response: `start_date: "2030-03-01"`, `start_time: "14:30"`, `all_day: false`

2. **Second PUT** with `all_day: "0"`:
   ```json
   {
     "event": {
       "start_date": "2030-04-15",
       "start_time": "14:30",
       "all_day": "0"
     }
   }
   ```
   Response: `start_date: "2030-03-01"`, `start_time: "14:30"`, `all_day: false`

**Result**: Even with double-edit, `start_date` does NOT update. Also, `all_day` never changed to `true` despite sending `"1"`.

## Summary of Field Update Behavior

| Field | Single PUT | Double-PUT | Notes |
|-------|------------|------------|-------|
| `name` | ✅ Works | ✅ Works | |
| `description` | ✅ Works | ✅ Works | |
| `start_time` | ✅ Works | ✅ Works | |
| `start_date` | ❌ Ignored | ❌ Ignored | **BUG: Never updates** |
| `all_day` | ❌ Ignored | ❌ Ignored | Stays `false` even when sending `"1"` or `true` |

## Expected Behavior

A PUT request should update all provided fields, including `start_date`.

## Questions for RWGPS Developers

1. **Is `start_date` intentionally read-only?** If so, what is the correct way to reschedule an event to a different date via the v1 API?

2. **Is `all_day` writable?** We noticed it's not listed in the `EventPayload` schema (only in `EventSummary`). Should we be able to change an event between all-day and timed modes?

3. **Is there a different endpoint or method for rescheduling events?** Perhaps a separate "reschedule" action?

4. **Are there restrictions based on event state?** (e.g., events with participants, past events, etc.)

## Environment

- **API Version**: v1 REST API (`/api/v1/events/{id}.json`)
- **Authentication**: Basic Auth with `apiKey:authToken`
- **Content-Type**: `application/json`
- **Tested**: January 13, 2026
- **Event ID**: 445203 (user-owned event, no participants)
- **Event Date**: Future date (2030-03-01)

## Payload Format Tested

We confirmed we're using the correct v1 API format:
```json
{
  "event": {
    "name": "string",
    "description": "string",
    "start_date": "YYYY-MM-DD",
    "start_time": "HH:MM",
    "all_day": "0" | "1" | true | false
  }
}
```

We also tried:
- Boolean values for `all_day`: `true`/`false`
- String values for `all_day`: `"0"`/`"1"`
- ISO timestamp format: `starts_at: "2030-04-15T18:30:00"`

None of these variations allowed updating `start_date`.

## Current Workaround

For now, we'll keep the date update limitation in mind:
- Use v1 API for: name, description, time, organizers, routes
- For date changes: May need to delete and recreate the event

## Request

Could you clarify whether `start_date` is intended to be updatable via the v1 PUT endpoint, and if so, what the correct format/approach should be?

Thank you for your help!

---

**Test Code Available**: We have GAS (Google Apps Script) test functions demonstrating this behavior if you'd like to see the full implementation.
