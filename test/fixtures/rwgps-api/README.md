# RWGPS API Fixtures

These fixtures capture the complete API traffic for all RWGPS operations. They were captured on 2026-01-13 using the `RWGPSApiLogger` instrumentation added to the vendored RWGPSLib.

## Fixture Files

| File | Operation | API Calls | Description |
|------|-----------|-----------|-------------|
| `schedule.json` | Schedule | 6 | Create a new ride from template |
| `update.json` | Update | 4 | Update an existing ride |
| `cancel.json` | Cancel | 4 | Add CANCELLED: prefix to ride |
| `reinstate.json` | Reinstate | 4 | Remove CANCELLED: prefix |
| `unschedule.json` | Unschedule | 2 | Delete ride from RWGPS |
| `import-route.json` | Import Route | 4 | Copy route to club library |

## Key Observations

### Authentication
- All operations start with `login` to get a web session cookie
- Login returns 302 redirect with `Set-Cookie` header
- Some operations (delete_event, getRoute) use Basic Auth instead of cookie

### The "Double Edit" Pattern
All event modifications (Schedule, Update, Cancel, Reinstate) use TWO sequential edits:
1. First edit with `all_day: "1"` - works around RWGPS API quirk
2. Second edit with `all_day: "0"` - sets the actual start time

This is because RWGPS API has asymmetric field handling:
- Send: `all_day` (string "0" or "1")
- Receive: `all_day` (boolean true/false)

### Response Headers
The `copy_template` operation (Schedule) returns 302 with `Location` header containing the new event URL. This is critical for extracting the event ID.

### API Endpoints Used

| Endpoint | Auth | Usage |
|----------|------|-------|
| `/organizations/47/sign_in` | POST (email/password) | Login |
| `/events/{id}/copy` | Cookie | Copy template |
| `/events/{template}/organizer_ids.json` | Cookie | Search organizers |
| `/events/{id}` | Cookie | GET/PUT event |
| `/events/batch_update_tags.json` | Cookie | Add/remove tags |
| `/api/v1/events/{id}.json` | Basic Auth | DELETE event |
| `/routes/{id}/copy.json` | Cookie | Copy route |
| `/api/v1/routes/{id}.json` | Basic Auth | GET route details |
| `/routes/batch_update_tags.json` | Cookie | Add route tags |

## Usage in Tests

```javascript
const scheduleFixture = require('../fixtures/rwgps-api/schedule.json');

// Get expected response for an operation
const copyTemplateCall = scheduleFixture.apiCalls.find(c => c.operation === 'copy_template');
expect(copyTemplateCall.responseHeaders.Location).toContain('/events/');
```

## Redacted Fields

Sensitive data has been replaced with `[REDACTED]`:
- `user-password` in login requests
- `Cookie` headers
- `Authorization` headers
- `Set-Cookie` in responses

## Notes

- Event ID 444070 was used for all operations in this capture session
- Route ID 50969472 was the attached route
- Organizer ID 498406 (Albert Saporta) was the ride leader
- All timestamps are in Pacific Time (America/Los_Angeles)
