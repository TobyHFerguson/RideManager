# RWGPS v1 API Bug Report: PUT Updates Only 3 of 12 OpenAPI Fields

## Summary

The v1 REST API endpoint `PUT /api/v1/events/{id}.json` has **severe limitations** - only **3 of 12 fields** defined in the OpenAPI `EventPayload` schema can be updated: `name`, `start_date`, and `start_time`. 

**Nine fields documented in the OpenAPI spec are silently ignored**, including `description`, `end_date`, `end_time`, `location`, `lat`, `lng`, `time_zone`, `visibility`, and `organizers`.

This makes the v1 API unsuitable for comprehensive event editing.

---

## How to Reproduce

### Prerequisites

- A valid RWGPS API key and auth token
- An event ID you own (or create one first)
- curl (or any HTTP client)

### Step 1: Set Up Environment Variables

```bash
# Replace with your actual credentials
export RWGPS_API_KEY="your_api_key"
export RWGPS_AUTH_TOKEN="your_auth_token"
export RWGPS_AUTH=$(echo -n "${RWGPS_API_KEY}:${RWGPS_AUTH_TOKEN}" | base64)

# Replace with an event ID you own
export EVENT_ID="453384"
```

### Step 2: Get Current Event State

```bash
curl -s "https://ridewithgps.com/api/v1/events/${EVENT_ID}.json" \
  -H "Authorization: Basic ${RWGPS_AUTH}" \
  -H "Content-Type: application/json" | jq .
```

Note the current values of all fields.

### Step 3: Send PUT Request with ALL EventPayload Fields

```bash
curl -s -X PUT "https://ridewithgps.com/api/v1/events/${EVENT_ID}.json" \
  -H "Authorization: Basic ${RWGPS_AUTH}" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "name": "TEST - Updated Name",
      "description": "This description should appear after PUT.",
      "start_date": "2030-08-20",
      "start_time": "14:30",
      "end_date": "2030-08-20",
      "end_time": "18:00",
      "location": "Updated Location - New Start Point",
      "lat": 37.7749,
      "lng": -122.4194,
      "time_zone": "America/New_York",
      "visibility": "public",
      "organizers": [{"id": 302732}]
    }
  }' | jq .
```

### Step 4: Verify Which Fields Updated

```bash
curl -s "https://ridewithgps.com/api/v1/events/${EVENT_ID}.json" \
  -H "Authorization: Basic ${RWGPS_AUTH}" \
  -H "Content-Type: application/json" | jq '.event | {
    name,
    desc,
    start_date,
    start_time,
    end_date,
    end_time,
    location,
    lat,
    lng,
    time_zone,
    visibility,
    organizer_ids,
    all_day
  }'
```

---

## Our Test Results (January 14, 2026)

### Summary Table

| OpenAPI Field | Value Sent | Value After PUT | Status |
|---------------|------------|-----------------|--------|
| `name` | `"TEST - Updated Name"` | `"TEST - Updated Name"` | ✅ **WORKS** |
| `start_date` | `"2030-08-20"` | `"2030-08-20"` | ✅ **WORKS** |
| `start_time` | `"14:30"` | `"14:30"` | ✅ **WORKS** |
| `description` | `"This description..."` | `null` | ❌ **IGNORED** |
| `end_date` | `"2030-08-20"` | `null` | ❌ **IGNORED** |
| `end_time` | `"18:00"` | `null` | ❌ **IGNORED** |
| `location` | `"Updated Location..."` | *(original value)* | ❌ **IGNORED** |
| `lat` | `37.7749` | `null` | ❌ **IGNORED** |
| `lng` | `-122.4194` | `null` | ❌ **IGNORED** |
| `time_zone` | `"America/New_York"` | `"America/Los_Angeles"` | ❌ **IGNORED** |
| `visibility` | `"public"` | `"managers_only"` | ❌ **IGNORED** |
| `organizers` | `[{"id": 302732}]` | `[]` | ❌ **IGNORED** |

**Result**: Only **3 of 12** EventPayload fields are honored by PUT.

---

## OpenAPI Specification Reference

Per your OpenAPI spec, the `EventPayload` schema (used for PUT/POST) defines these fields:

```yaml
# From /components/schemas/EventPayload
EventPayload:
  type: object
  properties:
    name:
      type: string
    description:
      type: string
    visibility:
      type: string
      enum: [public, private, managers_only]
    location:
      type: string
    lat:
      type: number
    lng:
      type: number
    time_zone:
      type: string
    start_date:
      type: string
      format: date
    start_time:
      type: string
    end_date:
      type: string
      format: date
    end_time:
      type: string
    logo:
      type: string
      format: uri
    banner:
      type: string
      format: uri
    organizers:
      type: array
      items:
        $ref: '#/components/schemas/User'
```

**We tested all non-media fields** (`logo` and `banner` not tested). Only 3 work.

---

## Raw HTTP Request/Response

### Request

```http
PUT /api/v1/events/453384.json HTTP/1.1
Host: ridewithgps.com
Authorization: Basic <base64(apiKey:authToken)>
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

### Response (HTTP 200 OK)

```json
{
  "event": {
    "id": 453384,
    "name": "OPENAPI TEST - Updated Name",
    "desc": null,
    "start_date": "2030-08-20",
    "start_time": "14:30",
    "end_date": null,
    "end_time": null,
    "location": "Initial Location - Starting Point A",
    "lat": null,
    "lng": null,
    "time_zone": "America/Los_Angeles",
    "visibility": "managers_only",
    "organizer_ids": [],
    "all_day": false
  }
}
```

**Note**: The API returns HTTP 200 (success) but silently ignores 9 of 12 fields.

---

## Fields Not in EventPayload Schema

These fields appear in responses but are **NOT in the EventPayload schema**:

| Field | Notes |
|-------|-------|
| `all_day` | Appears derived from start/end times (read-only) |
| `route_ids` | In `EventSummary`, not `EventPayload` - no documented way to update routes |
| `organizer_ids` | Response uses this, but spec says to send `organizers` array |

---

## Questions

1. **Are the 9 ignored fields intentionally not implemented?** The OpenAPI spec defines them in `EventPayload`, but PUT ignores them.

2. **What is the correct format for `organizers`?** We used `[{"id": 302732}]` per the schema (array of User objects), but it was ignored.

3. **How do we update `visibility`?** Sending `"public"` is ignored; events stay `managers_only`.

4. **How do we set event duration?** `end_date` and `end_time` are ignored.

5. **Is there a different endpoint?** Perhaps PATCH or field-specific endpoints?

6. **How do we update routes on an existing event?** `route_ids` is not in EventPayload.

---

## Impact

Applications cannot:

- ❌ Update event descriptions
- ❌ Change event visibility (stuck on `managers_only`)
- ❌ Set event duration (end date/time)
- ❌ Assign organizers
- ❌ Update location or GPS coordinates
- ❌ Change time zones

---

## Environment

| Item | Value |
|------|-------|
| **Endpoint** | `PUT /api/v1/events/{id}.json` |
| **Auth** | Basic Auth (`apiKey:authToken`) |
| **Content-Type** | `application/json` |
| **Date Tested** | January 14, 2026 |
| **Event ID** | 453384 (newly created, no participants) |

---

We'd appreciate guidance on the correct approach for updating these fields, or confirmation that they are not yet implemented in the v1 API.

Thank you!
