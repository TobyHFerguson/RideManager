
# RWGPS v1 API: OpenAPI Spec Discrepancy for `organizers` Field

## Summary

**Good news**: The v1 REST API `PUT /api/v1/events/{id}.json` successfully updates **11 of 12** fields from the OpenAPI `EventPayload` schema.

**Issue**: The `organizers` field documented in the OpenAPI spec does NOT work. However, `organizer_ids` (not in the spec) DOES work.

This appears to be a **documentation discrepancy** rather than an API limitation.

---

## Test Results Summary (January 14, 2026)

### Fields That WORK (11/12)

| OpenAPI Field | Status | Notes |
|---------------|--------|-------|
| `name` | ✅ | Works correctly |
| `description` | ✅ | Works correctly |
| `start_date` | ✅ | Works correctly |
| `start_time` | ✅ | Works correctly |
| `end_date` | ✅ | Works correctly |
| `end_time` | ✅ | Works correctly |
| `location` | ✅ | Works correctly |
| `lat` | ✅ | Works correctly |
| `lng` | ✅ | Works correctly |
| `time_zone` | ✅ | Works correctly |
| `visibility` | ✅ | Works correctly |

### Field That Does NOT Work (1/12)

| OpenAPI Field | Status | Notes |
|---------------|--------|-------|
| `organizers` | ❌ | Silently ignored (returns 200 OK but no change) |

### Workaround That WORKS (not in OpenAPI spec)

| Field | Status | Notes |
|-------|--------|-------|
| `organizer_ids` | ✅ | Array of integers - **this works** |

---

## Reference Events (Preserved for Inspection)

We've created three test events demonstrating the issue. **Please inspect these**:

| Event ID | Test | X-Request-ID | Result |
|----------|------|--------------|--------|
| **453399** | `organizers: [{id: 799754}]` | `764e0bca33cb58d4517a6ff9e733f9af` | ❌ FAILED |
| **453400** | `organizers: [{id, first_name, last_name, display_name}]` | `4b570b91698fc2688853d962a6c8eda6` | ❌ FAILED |
| **453401** | `organizer_ids: [799754]` | *(raw fetch, no captured ID)* | ✅ PASSED |

**Event URLs:**
- https://ridewithgps.com/events/453399-isolated-test-test1-idonly
- https://ridewithgps.com/events/453400-isolated-test-test2-fulluser  
- https://ridewithgps.com/events/453401-isolated-test-test3-organizerids

User ID 799754 = Andy Drenick (club member, not account owner)

---

## How to Reproduce with curl

### Prerequisites

```bash
# Replace with your actual credentials
export RWGPS_API_KEY="your_api_key"
export RWGPS_AUTH_TOKEN="your_auth_token"
export RWGPS_AUTH=$(echo -n "${RWGPS_API_KEY}:${RWGPS_AUTH_TOKEN}" | base64)

# Use one of these test events (or create your own)
export EVENT_ID="453399"
```

### Test 1: Try `organizers` per OpenAPI Spec (FAILS)

```bash
# Send organizers array with User objects (per OpenAPI EventPayload schema)
curl -s -X PUT "https://ridewithgps.com/api/v1/events/${EVENT_ID}.json" \
  -H "Authorization: Basic ${RWGPS_AUTH}" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "organizers": [{"id": 799754}]
    }
  }' | jq '.event.organizers'

# Expected: [{"id": 799754, ...}]
# Actual: []
```

### Test 2: Try Full User Object (FAILS)

```bash
# Send organizers with full User object
curl -s -X PUT "https://ridewithgps.com/api/v1/events/${EVENT_ID}.json" \
  -H "Authorization: Basic ${RWGPS_AUTH}" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "organizers": [{
        "id": 799754,
        "first_name": "Andy",
        "last_name": "Drenick",
        "display_name": "Andy Drenick"
      }]
    }
  }' | jq '.event.organizers'

# Expected: [{"id": 799754, ...}]
# Actual: []
```

### Test 3: Try `organizer_ids` (WORKS - but not in spec)

```bash
# Send organizer_ids as array of integers
curl -s -X PUT "https://ridewithgps.com/api/v1/events/${EVENT_ID}.json" \
  -H "Authorization: Basic ${RWGPS_AUTH}" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "organizer_ids": [799754]
    }
  }' | jq '.event.organizers'

# Expected: []
# Actual: [{"id": 799754, "text": "adrenick"}]  <-- IT WORKS!
```

---

## OpenAPI Specification vs Actual Behavior

### What the Spec Says (`EventPayload`)

```yaml
# From /components/schemas/EventPayload
organizers:
  type: array
  items:
    "$ref": "#/components/schemas/User"
```

### What Actually Works

```json
// NOT in spec, but this works:
{
  "event": {
    "organizer_ids": [799754, 302732]
  }
}
```

---

## Recommendation

Could you please:

1. **Confirm `organizer_ids` is the correct field** for setting organizers via PUT?
2. **Update the OpenAPI spec** to document `organizer_ids` in `EventPayload`?
3. **Clarify `organizers` behavior** - is it intentionally read-only, or a bug?

---

## Our Previous Bug Report Was WRONG

We initially reported that v1 API only updated 3 fields. **This was our error** - our test code had a bug that was only sending 5 fields. After your team pointed this out (thank you!), we fixed our code and now confirm:

- ✅ **11 of 12 EventPayload fields work correctly**
- ❌ Only `organizers` field doesn't work (but `organizer_ids` does)

We apologize for the confusion and appreciate your patience!

---

## Environment

| Item | Value |
|------|-------|
| **Endpoint** | `PUT /api/v1/events/{id}.json` |
| **Auth** | Basic Auth (`apiKey:authToken`) |
| **Content-Type** | `application/json` |
| **Date Tested** | January 14, 2026 |
| **Test Events** | 453399, 453400, 453401 |
| **Test User** | 799754 (Andy Drenick) |

Thank you!
