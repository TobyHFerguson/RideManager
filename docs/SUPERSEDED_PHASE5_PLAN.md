# Superseded Phase 5 Plan (Historical Reference)

**Date Superseded**: January 17, 2026

**Why This Was Superseded**: 
The original plan proposed creating 3 new layers (RWGPSCore → RWGPSAdapter → RWGPSFacade).
But testing revealed that RWGPSClient was ALREADY working correctly. The complexity was unnecessary.

**The Simple Solution**: Use RWGPSClient directly from RideManager.js, which Task 3.12 proved works.

---

## Original Phase 5 Plan (DO NOT IMPLEMENT)

### Original Goal
Replace the current 3,579-line rwgpslib codebase with a small, stable, fully testable library following copilot-instructions Core/Adapter separation pattern.

**IMPORTANT**: The goal was to make the NEW code work correctly. We did NOT care about preserving old code behavior because all legacy code was being removed. If manual testing revealed issues with the legacy path (templates, old method names, etc.), the fix was to use the new approach - NOT to patch the old code.

### Original Target Architecture

**New file structure (original target: ~600 lines total, 100% coverage on Core)**:

```
src/rwgpslib/
├── RWGPSCore.js          (~300 lines, 100% tested)
│   ├── URL parsing & validation
│   ├── Payload construction (v1 format)
│   ├── Response transformations
│   ├── Date/time formatting
│   └── Error message building
│
├── RWGPSAdapter.js       (~200 lines, thin GAS wrapper)
│   ├── UrlFetchApp.fetch() calls ONLY
│   ├── Session/credential handling
│   ├── Basic Auth header injection
│   └── Error logging
│
├── RWGPSFacade.js        (~100 lines, public API)
│   ├── 9 public methods matching current interface
│   ├── Delegates to Core for logic
│   └── Delegates to Adapter for HTTP
│
├── RWGPSCore.d.ts        (type definitions)
├── RWGPSAdapter.d.ts
├── RWGPSFacade.d.ts
└── types.js              (keep, shared types)
```

### What Was Wrong With This Plan

1. **RWGPSClient was already tested** - 81% coverage, 12 operations verified in GAS
2. **Created unnecessary layers** - RWGPSCore, RWGPSAdapter, RWGPSFacade duplicated functionality
3. **Didn't leverage existing code** - RWGPSClientCore.js had tested helpers
4. **Added complexity without benefit** - More code = more bugs

### Lessons Learned

1. **SEARCH BEFORE IMPLEMENTING** - Check what already exists and works
2. **Test first, then trust** - Our "bugs" were often test errors, not API errors
3. **Simpler is better** - Direct calls beat layer upon layer
4. **Document actual tested behavior** - See `docs/rwgps-api-tested.yaml`

---

## Work Completed Under This Plan (Partially Useful)

Some work was done under this plan that may still be useful:

### Completed Tasks

| Task | Status | Notes |
|------|--------|-------|
| Task 5.1: RWGPSCore.js | ✅ Completed | 98.87% coverage - but duplicates RWGPSClientCore |
| Task 5.2: RWGPSAdapter.js | ✅ Completed | 278 lines - but RWGPSClient does this already |
| Task 5.3: RWGPSFacade.js | ✅ Completed | 610 lines - wrapper that could call RWGPSClient |
| Task 5.4: Update exports | Not done | Not needed |
| Task 5.5: Testing | Partial | 703 tests pass |
| Task 5.6: Wire consumers | Partial | Some manual testing done |

### Files Created Under This Plan

These files exist but may not be needed:

| File | Lines | Action |
|------|-------|--------|
| RWGPSCore.js | 804 | Evaluate - may duplicate RWGPSClientCore |
| RWGPSAdapter.js | 304 | Evaluate - may duplicate RWGPSClient |
| RWGPSFacade.js | 610 | Evaluate - could be thin wrapper on RWGPSClient |
| LegacyRWGPSAdapter.js | ~100 | Keep for now - bridges old/new naming |

---

## Original Task Details (Historical)

<details>
<summary>Task 5.1: Create RWGPSCore.js (Original Plan)</summary>

**Goal**: Extract ALL business logic from RWGPSClient.js into testable Core module.

**Methods to include**:
```javascript
class RWGPSCore {
    // URL Parsing
    static parseEventUrl(url)           // Extract event ID from URL
    static parseRouteUrl(url)           // Extract route ID from URL
    static isValidEventUrl(url)         // Validate event URL format
    static isValidRouteUrl(url)         // Validate route URL format
    
    // Payload Construction
    static buildCreateEventPayload(event)  // SCCCCEvent → v1 POST payload
    static buildEditEventPayload(event)    // SCCCCEvent → v1 PUT payload
    static buildBatchTagPayload(ids, tags, action)
    static buildRouteImportPayload(sourceUrl, options)
    
    // Response Transformation
    static extractEventFromResponse(response) // v1 response → SCCCCEvent format
    static extractRouteIdFromImport(response) // Import response → route ID
    
    // Date/Time Handling
    static formatEventDate(date)        // Date → 'YYYY-MM-DD'
    static formatEventTime(date)        // Date → 'HH:MM'
    static parseEventDateTime(dateStr, timeStr) // Strings → Date
    
    // Error Handling
    static buildErrorMessage(response, context) // Consistent error formatting
}
```

</details>

<details>
<summary>Task 5.2: Create RWGPSAdapter.js (Original Plan)</summary>

**Goal**: Thin GAS wrapper with ONLY UrlFetchApp calls.

**Interface**:
```javascript
class RWGPSAdapter {
    constructor(credentialManager) { /* ... */ }
    
    // v1 API calls (Basic Auth)
    fetchV1(method, endpoint, payload = null) {
        const options = RWGPSCore.buildRequestOptions(method, payload);
        options.headers.Authorization = this._getBasicAuth();
        const url = `https://ridewithgps.com/api/v1${endpoint}`;
        return UrlFetchApp.fetch(url, options);
    }
    
    // Web API calls (session cookie)
    fetchWeb(method, path, payload = null) {
        const options = RWGPSCore.buildRequestOptions(method, payload);
        options.headers.Cookie = this._getSessionCookie();
        const url = `https://ridewithgps.com${path}`;
        return UrlFetchApp.fetch(url, options);
    }
    
    // Auth helpers (GAS-dependent)
    _getBasicAuth() { /* PropertiesService or CredentialManager */ }
    _getSessionCookie() { /* Session management */ }
}
```

</details>

<details>
<summary>Task 5.3: Create RWGPSFacade.js (Original Plan)</summary>

**Goal**: Simple facade providing the methods consumers actually use.

**Revised Method List** (7 methods):

| Method | API | Purpose |
|--------|-----|---------|
| `getEvent(eventUrl)` | v1 GET | Fetch single event |
| `editEvent(eventUrl, eventData, options?)` | v1 PUT + web | Update event (group change = logo + tag swap) |
| `createEvent(eventData, logoUrl?)` | v1 POST + web | Create event, then add group tag internally |
| `deleteEvents(eventUrls)` | v1 DELETE | Delete multiple events |
| `importRoute(routeData)` | web POST | Copy route, then add group + expiry tags internally |
| `getClubMembers()` | web GET | Fetch club membership list |
| `getOrganizers(names)` | web POST | Lookup organizer IDs by name |

</details>

---

*This file is for historical reference only. See RWGPS_TASKS.md for current plan.*
