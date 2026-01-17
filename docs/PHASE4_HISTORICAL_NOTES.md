# Phase 4 Historical Notes

**Purpose**: This file preserves the debugging history and corrections from Phase 4 migration.
The main task document (RWGPS_TASKS.md) contains only current understanding.

---

## The Double-Edit Investigation (January 2026)

### Original Hypothesis
We believed the v1 API required a "double-edit" pattern to update event times:
1. First PUT: Set `all_day: '1'` to reset time
2. Second PUT: Set actual `start_date`, `start_time`, `all_day: '0'`

### What Actually Happened
Our test code (testTask4_1_V1ApiSingleEdit) had bugs:
- Used `desc` instead of `description`
- Only sent 5 fields instead of all 11
- Misinterpreted results as API limitations

### Resolution
After fixing the test to use correct v1 field names, we discovered:
- Single PUT works for ALL 11 fields
- Double-edit was NEVER required
- The "limitation" was entirely in our test code

### Key Commits
- fc4677b: Add GAS integration test (with buggy field names)
- 81ea3da: Fix v1 API auth (apiKey:authToken)
- Later: Corrected field names, discovered single PUT works

---

## Field Name Confusion

### The Problem
Web API and v1 API use different field names:

| Concept | Web API | v1 API |
|---------|---------|--------|
| Description | `desc` | `description` |
| Start time | `starts_at` (combined) | `start_date` + `start_time` |
| Organizers | `organizers: [{id}]` | `organizer_ids: [id]` |
| Routes | `routes: [{id}]` | `route_ids: [id]` |

### Consequence
Test code written with web API field names didn't work with v1 API.
This was misinterpreted as "v1 API doesn't support these fields."

---

## Task 4.2 Debugging

### Initial Implementation
Didn't consult OpenAPI spec first. Discovered through debugging that:
- v1 API wraps response in `{"event": {...}}`
- This was documented in the spec but we missed it

### Lesson
ALWAYS consult OpenAPI spec before implementing v1 endpoints.

---

## Original Task 4.1 Results (WRONG)

The original findings stated:
- ❌ "start_time does NOT update with single PUT - requires double-edit workaround"
- ❌ "V1 API REQUIRES double-edit (same as web API)"

These were wrong because our test used incorrect field names.

---

## Corrected Understanding (January 17, 2026)

After proper testing:
- ✅ Single PUT updates all 11 working fields
- ✅ `organizer_ids` works (UNDOCUMENTED)
- ✅ `route_ids` works (UNDOCUMENTED)
- ❌ Only `organizers` array is silently ignored

---

## Related Documents

- `docs/rwgps-api-tested.yaml` - Verified API behavior
- `docs/RWGPS_V1_API_BUG_REPORT.md` - API discrepancies with official spec
