# RideManager Copilot Instructions

> **Universal GAS Patterns**: For Google Apps Script development best practices (type safety, testing, 
> TDD workflow, architecture patterns, GAS API limitations), see [gas-best-practices.md](gas-best-practices.md).
> This file contains **RideManager-specific** guidelines only.

---

## Quick Reference to Universal Patterns

Before writing ANY code, review these universal guidelines in [gas-best-practices.md](gas-best-practices.md):

- **Pre-Coding Checklist (TDD Workflow)**: Write tests FIRST, achieve 100% coverage → [See gas-best-practices.md](gas-best-practices.md#pre-coding-checklist-tdd-workflow)
- **Search Before Implementing**: Always search for existing code before writing new functionality → [See gas-best-practices.md](gas-best-practices.md#search-before-implementing)
- **Type Safety**: Zero tolerance for `{any}` and `{Object}` types → [See gas-best-practices.md](gas-best-practices.md#zero-tolerance-for-any-and-object)
- **GAS API Limitations**: URLSearchParams, fetch(), setTimeout not available → [See gas-best-practices.md](gas-best-practices.md#gas-api-limitations)
- **Architecture**: Core/Adapter separation, 100% test coverage required → [See gas-best-practices.md](gas-best-practices.md#coreadapter-separation)
- **Code Modification Workflow**: Update tests, types, docs with every change → [See gas-best-practices.md](gas-best-practices.md#code-modification-workflow)

---

## 📦 Module Inventory (Canonical Implementations)

**CRITICAL: These modules contain the authoritative implementations. ALWAYS check here first.**

### RWGPS API Layer (`src/rwgpslib/`)

| Module | Purpose | Canonical For |
|--------|---------|---------------|
| `RWGPSClientCore.js` | **Pure JS logic for RWGPS API** | Multipart uploads, payload building, logo handling, event data transformation |
| `RWGPSClient.js` | **High-level RWGPS operations** | `scheduleEvent()`, `createEventWithLogo()`, `editEvent()`, login/session management |
| `RWGPSFacade.js` | Simplified API surface | Should delegate to RWGPSClientCore for complex operations |
| `RWGPSAdapter.js` | HTTP transport layer | Low-level fetch operations only |
| `RWGPSCore.js` | API payload helpers | Secondary to RWGPSClientCore for event operations |

**Logo/Multipart Upload:** Use `RWGPSClientCore.buildMultipartCreateEventPayload()` - it's tested and works.

### Domain Layer (`src/`)

| Module | Purpose | Canonical For |
|--------|---------|---------------|
| `SCCCCEvent.js` | Ride event domain model | Event name formatting, date handling, cancellation |
| `EventFactory.js` | Creates SCCCCEvent instances | `newEvent()` from Row, `fromRwgpsEvent()` from API response |
| `RowCore.js` | Row data domain model | All row field access, computed properties |
| `ValidationCore.js` | All validation logic | Row validation, scheduling validation, cancellation validation |
| `AnnouncementCore.js` | Announcement scheduling | Send time calculation, queue management, template expansion |
| `GoogleEventCore.js` | Google Calendar helpers | Calendar URL building, RichText link creation |

### Adapters (`src/`)

| Module | Purpose | Notes |
|--------|---------|-------|
| `RideManager.js` | Orchestrates ride operations | Calls domain modules, thin adapter |
| `RideCoordinator.js` | UI-to-business bridge | Validation, confirmation, then delegates to RideManager |
| `ScheduleAdapter.js` | Spreadsheet I/O | Fiddler-based, handles RichText |
| `AnnouncementManager.js` | GAS adapter for announcements | Gmail, Drive, triggers |

---

## 🚫 DEPRECATED: Templates Are GONE

**CRITICAL: This codebase NO LONGER uses RWGPS event templates.**

**Old Pattern (NEVER USE):**
```javascript
// ❌ WRONG - Templates are deprecated
const eventUrl = rwgps.copy_template_(templateUrl);  // NO!
rwgps.edit_event(eventUrl, eventData);               // NO!

// ❌ WRONG - Looking up logos from templates
for (const [group, specs] of Object.entries(groupSpecs)) {
    if (specs.Template === templateUrl) {  // NO! Don't match templates
        logoUrl = specs.LogoURL;
    }
}
```

**New Pattern (ALWAYS USE):**
```javascript
// ✅ RIGHT - Direct event creation with logo from group
const groupSpec = getGroupSpecs()[row.group];
const logoUrl = groupSpec.LogoURL;  // Logo comes from Groups table, not template
const result = facade.createEvent(eventData, logoUrl);  // Direct creation
```

**What Changed:**
- **Before:** Copy template → Edit event → Logo came from template
- **After:** Create event directly → Logo from Groups table → No templates involved

**If you see template references in code:**
1. They are LEGACY code paths being phased out
2. Do NOT add new template references
3. Do NOT try to "fix" template lookup - remove it entirely

---

## RideManager-Specific Quick Start

**CRITICAL Pre-Deployment Checks** (MANDATORY before EVERY code change):
```bash
npm run validate-all
# This runs: validate-exports → typecheck → validate-types → test
```

**Key Workflow Commands**:
- `npm run dev:push` - Deploy to dev environment (with debug version)
- `npm run prod:push` - Deploy to prod (requires clean git)
- `npm test -- --coverage` - Full test coverage report
- `npm run typecheck` - TypeScript validation (must be ZERO errors)
- `npm run validate-exports` - Verify module loading order

**RideManager-Specific Golden Rules**:
1. ✅ **RICHTEXT HYPERLINKS**: Route, Ride, and GoogleEventId columns use native GAS RichText (NOT HYPERLINK formulas). See `docs/MIGRATION_FIDDLER_TO_RICHTEXT.md` for details.
2. ✅ **SEARCH BEFORE IMPLEMENTING**: Check Module Inventory below for existing implementations. NEVER reinvent working code.
3. ✅ **NO TEMPLATES**: RWGPS templates are GONE. Logos come from Groups table, events created directly.
4. ✅ **Add new modules to `Exports.js`** or GAS won't find them.

**For universal patterns** (TDD workflow, type safety, architecture, GAS limitations), see [gas-best-practices.md](gas-best-practices.md).

---

## Architecture Overview

This is a Google Apps Script (GAS) project that manages ride scheduling through integration with RideWithGPS and Google Calendar. The codebase mixes GAS-specific APIs with standard JavaScript/Node.js code.

### Key Architectural Patterns

#### GAS vs Pure JavaScript Separation
The codebase strictly separates GAS-specific code from pure JavaScript to maximize testability:

- **Pure JavaScript modules** (can run in Node.js/Jest, MUST have 100% test coverage):
  - `SCCCC.js` - SCCCC event data model
  - `EventFactory.js` - Event creation logic
  - `Groups.js` - Group specifications
  - `Globals.js` - Global configuration
  - `Commands.js` - Business logic commands
  - `rowCheck.js` - Validation logic
  - `RouteColumnEditor.js` - Route URL/formula parsing and manipulation
  - `AnnouncementCore.js` - Announcement scheduling and template expansion
  - `TriggerManagerCore.js` - Trigger management logic (configuration, validation, scheduling decisions)
  - `HyperlinkUtils.js` - Hyperlink formula parsing
  - Dates submodule

- **GAS-dependent modules** (thin wrappers around pure JavaScript, minimal logic):
  - `ScheduleAdapter.js` - Spreadsheet I/O adapter using Fiddler
  - `RideManager.js` - RWGPS and Calendar integration
  - `UIManager.js` - User interface dialogs
  - `MenuFunctions.js` - Menu handlers
  - `triggers.js` - GAS event handlers (onOpen, onEdit, scheduled triggers)
  - `TriggerManager.js` - GAS orchestrator for TriggerManagerCore (ScriptApp operations)
  - `AnnouncementManager.js` - GAS adapter for AnnouncementCore (Gmail, SpreadsheetApp)
  - `GoogleCalendarManager.js` - Calendar API wrapper

- **Legacy mixed modules** (MUST refactor when modifying):
  - `ProcessingManager.js` - Uses PropertiesService for state management
  - `UserLogger.js` - Uses DriveApp and Session
  - **Rule**: When modifying these files, MUST extract business logic to Core modules with 100% test coverage

#### CRITICAL Architecture Rules

**Rule 1: Maximize Testable Code - Minimize GAS Execution**
- **Principle**: Anything that can be tested in Jest without requiring GAS MUST be in a pure JavaScript Core module
- This includes:
  - Business logic (calculations, decisions, state management)
  - Data transformations and marshalling (format conversions, parsing, serialization)
  - Validation rules
  - Algorithm implementations
- GAS modules should be thin adapters that ONLY:
  - Read/write from GAS services (SpreadsheetApp, PropertiesService, CalendarApp, etc.)
  - Call pure JavaScript functions
  - Handle GAS-specific errors
  - Convert between GAS types and plain JavaScript types
- **Goal**: Every code path should be verifiable through automated tests

**Rule 2: 100% Test Coverage Required**
- ALL pure JavaScript modules MUST have Jest tests with 100% code coverage
- Run tests with: `npm test -- --coverage --collectCoverageFrom='src/YourModule.js'`
- Only exception: `if (typeof require !== 'undefined')` compatibility checks
- Test files go in `test/__tests__/YourModule.test.js`
- Coverage reports generated in `coverage/` directory
- **Not just business logic**: Data marshalling, format conversions, parsing - all must be tested

**Rule 3: Testability First - Extract Before You Code**
When creating new functionality:
1. **Identify what can be tested**: Separate pure logic from GAS API calls
2. **Write pure JavaScript core logic** in `*Core.js` module (e.g., `RWGPSMembersCore.js`)
3. **Write comprehensive Jest tests** achieving 100% coverage BEFORE writing the adapter
4. **Create thin GAS adapter** in `*.js` that only handles GAS APIs
5. **Document the separation** in code comments

**Example**: RetryQueue Spreadsheet Access
```javascript
// ✅ CORRECT: Pure JS marshalling (100% tested in Jest)
// RetryQueueMarshallingCore.js
class RetryQueueMarshallingCore {
    static itemToRow(item) {
        return [
            item.id || '',
            item.operation || '',
            item.params ? JSON.stringify(item.params) : '',
            // ... all conversion logic here
        ];
    }
    static rowToItem(row) {
        return {
            id: row[0] || '',
            operation: row[1] || '',
            params: row[2] ? JSON.parse(row[2]) : {},
            // ... all parsing logic here
        };
    }
}

// ✅ CORRECT: Thin GAS adapter (only SpreadsheetApp calls)
// RetryQueueSpreadsheetAdapter.js
class RetryQueueSpreadsheetAdapter {
    save(items) {
        const sheet = this._getSheet();
        // Use Core module for conversion
        const rows = RetryQueueMarshallingCore.itemsToRows(items);
        // Only GAS API call
        sheet.getRange(2, 1, rows.length, 7).setValues(rows);
    }
    
    loadAll() {
        const sheet = this._getSheet();
        // Only GAS API call
        const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
        // Use Core module for conversion
        return RetryQueueMarshallingCore.rowsToItems(values);
    }
}

// ❌ WRONG: Data conversion inline in GAS adapter (untestable)
class RetryQueueSpreadsheetAdapter {
    save(items) {
        const sheet = this._getSheet();
        // WRONG: Conversion logic mixed with GAS calls
        const rows = items.map(item => [
            item.id || '',
            item.operation || '',
            JSON.stringify(item.params),
            // ... can't test this without GAS
        ]);
        sheet.getRange(2, 1, rows.length, 7).setValues(rows);
    }
}
```

**Why This Matters**:
- **Reliability**: Every conversion, every edge case is tested
- **Debugging**: Pure JS modules can be debugged in Node.js with full tooling
- **Refactoring**: Pure JS modules can be safely changed with test verification
- **Speed**: Jest tests run in milliseconds vs GAS manual testing
- **Confidence**: 100% coverage means all code paths are verified

**Rule 4: Dependency Injection**
Pure JavaScript modules should accept dependencies as parameters:
```javascript
// ✅ Good - testable
RetryQueueCore.createQueueItem(operation, generateId, getCurrentTime)

// ❌ Bad - hardcoded GAS dependency
createQueueItem(operation) { id: Utilities.getUuid() }
```

**Rule 4.5: MANDATORY Class Pattern for All New Code**
- **ALL new modules MUST use class pattern with static methods**
- **Classes MUST be wrapped in IIFE** for GAS compatibility (avoids "Identifier already declared" errors)
- **NEVER create new namespace pattern modules** (IIFE returning plain object)
- Namespace pattern creates TypeScript blind spots requiring `@ts-expect-error` suppressions
- `@ts-expect-error` suppresses ALL errors on line, not just namespace resolution (hides real bugs)

**GAS Syntax Limitations**:
- ❌ `static FIELD = value` - Static class fields NOT supported in GAS V8 runtime
- ✅ `static get FIELD() { return value; }` - Use static getters instead

```javascript
// ✅ CORRECT: Class wrapped in IIFE with static getters (GAS-compatible)
var ValidationCore = (function() {

class ValidationCore {
    // Static getter (NOT static field assignment)
    static get MAX_RETRIES() {
        return 3;
    }
    
    static validateForScheduling(rows, options) {
        // Call other static methods directly
        const error = ValidationCore.isUnmanagedRide(row, options.managedEventName);
        return result;
    }
    
    static isUnmanagedRide(row, managedEventName) {
        // Helper method
    }
}

return ValidationCore;
})();

if (typeof module !== 'undefined') {
    module.exports = ValidationCore;
}

// ❌ WRONG: Bare class without IIFE (causes "Identifier already declared" in GAS)
class ValidationCore {
    static MAX_RETRIES = 3;  // ❌ Static fields not supported in GAS
    static validateForScheduling(rows, options) { }
}

// ❌ WRONG: Namespace pattern (DEPRECATED - creates type safety blind spots)
var ValidationCore = (function() {
    const ValidationCore = {
        validateForScheduling(rows, options) {
            // TypeScript can't resolve this.isUnmanagedRide through module imports
            const error = this.isUnmanagedRide(row, options.managedEventName);
        },
        isUnmanagedRide(row, managedEventName) { }
    };
    return ValidationCore;
})();
```

**Why Class Pattern is Mandatory**:
- TypeScript correctly resolves static method calls (no `@ts-expect-error` needed)
- Full type checking enabled (catches missing parameters, wrong types)
- No blind spots - all errors visible at development time
- Better tooling support (IntelliSense, refactoring)
- Production bugs caught before deployment

**Converting Existing Namespace Modules**:
See GitHub Issue #XXX for tracking conversion of legacy modules (RideManagerCore, AnnouncementCore, TriggerManagerCore, etc.)

#### CRITICAL: Schedule & Row Refactoring Requirements
**Schedule & Row Classes** - Currently tightly coupled to SpreadsheetApp (MUST fix when modifying):
- These classes leak GAS dependencies throughout the codebase
- Spreadsheets are small (few hundred rows, ~20 columns), amenable to in-memory processing
- **MANDATORY architecture**: Load spreadsheet → Convert to domain objects → Pass to business layer → Merge updates → Save back
- MUST use Fiddler for I/O layer instead of direct SpreadsheetApp manipulation
- MUST keep pure JavaScript business logic separate from GAS persistence layer
- **Rule**: Any modification to Schedule/Row MUST move toward this architecture, not maintain current coupling

#### RichText Hyperlinks (Route, Ride, GoogleEventId Columns)

**CRITICAL**: These columns use native GAS RichText hyperlinks, NOT HYPERLINK formulas.

**Creating RichText Hyperlinks**:

```javascript
// Pattern: SpreadsheetApp.newRichTextValue()
const richText = SpreadsheetApp.newRichTextValue()
    .setText('Display Text')
    .setLinkUrl('https://example.com/url')
    .build();

cell.setRichTextValue(richText);
```

**Example from RowCore**:
```javascript
// When GoogleEventId is set, create RichText hyperlink
set GoogleEventId(value) {
    if (value && this._data.Group && this._data['Date Time']) {
        const calendarId = getGroupSpecs()[this._data.Group.toUpperCase()]?.GoogleCalendarId;
        if (calendarId) {
            const calendarUrl = GoogleEventCore.buildCalendarUrl(calendarId, this._data['Date Time']);
            const richText = SpreadsheetApp.newRichTextValue()
                .setText(String(value))
                .setLinkUrl(calendarUrl)
                .build();
            this._setField('GoogleEventId', richText);
            return;
        }
    }
    this._setField('GoogleEventId', value);
}
```

**Reading RichText Hyperlinks**:

```javascript
const richText = cell.getRichTextValue();
const displayText = richText.getText();
const url = richText.getLinkUrl(); // null if no link

// Check if cell has hyperlink
if (richText && richText.getLinkUrl()) {
    console.log('Cell has link:', richText.getLinkUrl());
}
```

**Why RichText Instead of HYPERLINK Formulas**:

- ✅ **Better performance**: No formula recalculation overhead
- ✅ **Cleaner data structure**: No formula parsing needed
- ✅ **Native GAS support**: Built-in API
- ✅ **Version history**: Shows actual text changes, not formula changes
- ✅ **Cell-level writes**: Can update individual cells without touching formulas

**Columns Using RichText**:

1. **Route** - Links to RWGPS route page (`https://ridewithgps.com/routes/XXXXXX`)
2. **Ride** - Links to RWGPS event page (`https://ridewithgps.com/events/XXXXXX`)
3. **GoogleEventId** - Links to Google Calendar agenda view for the ride date

**Naming convention for RichText-backed columns**:

- **Rule**: Domain properties that correspond to RichText spreadsheet columns MUST use the `Cell` suffix (camelCase) in the domain model. Example mappings:
    - Spreadsheet column `Route`    → domain property `routeCell`
    - Spreadsheet column `Ride`     → domain property `rideCell`
    - Spreadsheet column `GoogleEventId` → domain property `googleEventIdCell`
    - Spreadsheet column `Announcement`  → domain property `announcementCell`

This makes the intent explicit (value is a `{text,url}` RichText object) and prevents accidental plain-value persistence when adapter logic maps domain properties back to spreadsheet columns.

**Migration Strategy**:

When converting from HYPERLINK formulas to RichText:
- Create one-time migration script (see "One-Time Migration Scripts" section)
- Convert existing formulas to RichText hyperlinks
- Update RowCore property setters to create RichText
- Update ScheduleAdapter to handle RichText values

**See Also**:
- `docs/MIGRATION_FIDDLER_TO_RICHTEXT.md` - Complete migration documentation
- `scripts/migrate-google-event-ids.js` - Example migration script

#### One-Time Migration Scripts

**Pattern**: When changing data formats (e.g., plain text → RichText hyperlinks), create idempotent migration scripts.

**Migration Script Structure**:

```javascript
/**
 * migrate-feature-name.js
 * 
 * One-time migration utility: [Brief description of what's being migrated]
 * 
 * USAGE:
 * ======
 * 1. Deploy this script to GAS (via npm run dev:push)
 * 2. Open Script Editor in GAS
 * 3. Run `migrateFeatureName()` function
 * 4. Verify changes in spreadsheet
 * 5. Deploy updated core/adapter code
 * 
 * SAFETY:
 * =======
 * - Non-destructive: Only converts, never deletes
 * - Idempotent: Can be run multiple times safely
 * - Logging: Detailed console output
 * - Error handling: Continues on individual failures
 */

/* istanbul ignore file - GAS-only migration script */

function migrateFeatureName() {
    console.log('=== Starting Migration ===');
    
    try {
        // 1. Get sheet and validate
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Consolidated Rides');
        if (!sheet) {
            throw new Error('Sheet not found');
        }
        
        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            console.log('No data rows to process');
            return;
        }
        
        // 2. Find columns by header name (1-based indexing)
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const targetColIndex = headers.indexOf('ColumnName') + 1;
        
        if (targetColIndex === 0) {
            throw new Error('Could not find "ColumnName" column');
        }
        
        console.log(`Found column at index ${targetColIndex}`);
        console.log(`Processing ${lastRow - 1} data rows...`);
        
        // 3. Get existing data (bulk read for performance)
        const dataRange = sheet.getRange(2, targetColIndex, lastRow - 1, 1);
        const values = dataRange.getValues();
        const richTextValues = dataRange.getRichTextValues(); // For idempotency check
        
        let converted = 0;
        let skipped = 0;
        let errors = 0;
        
        // 4. Process each row
        for (let i = 0; i < values.length; i++) {
            const value = values[i][0];
            const richText = richTextValues[i][0];
            const rowNum = i + 2; // 1-based, +1 for header
            
            try {
                // Skip empty cells
                if (!value || value === '') {
                    skipped++;
                    continue;
                }
                
                // Idempotent: Skip if already migrated
                if (richText && richText.getLinkUrl()) {
                    console.log(`Row ${rowNum}: Already migrated, skipping`);
                    skipped++;
                    continue;
                }
                
                // Convert data to new format
                const newValue = convertToNewFormat(value);
                
                // Write back to cell
                const cell = sheet.getRange(rowNum, targetColIndex);
                cell.setRichTextValue(newValue);
                
                converted++;
                if (converted % 10 === 0) {
                    console.log(`  Converted ${converted} rows...`);
                }
                
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`Row ${rowNum}: ${err.message}`);
                errors++;
            }
        }
        
        // 5. Summary report
        console.log('\n=== Migration Complete ===');
        console.log(`Converted: ${converted}`);
        console.log(`Skipped: ${skipped}`);
        console.log(`Errors: ${errors}`);
        console.log('\nPlease verify changes in spreadsheet.');
        
        if (errors > 0) {
            console.warn('\nWARNING: Some cells failed. Check console log.');
        }
        
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('FATAL ERROR during migration:', err.message);
        throw error;
    }
}

/**
 * Helper: Convert data to new format
 * (Keep helper functions in same file for GAS deployment)
 */
function convertToNewFormat(oldValue) {
    // Conversion logic here
    return newValue;
}
```

**Key Properties of Migration Scripts**:

1. **Idempotent**: Can run multiple times safely
   - Check if already migrated before converting
   - Skip cells that already have the new format
   - Example: Check `richText.getLinkUrl()` for existing hyperlinks

2. **Non-destructive**: Only converts, never deletes
   - Preserve original data structure
   - Only add/modify specific fields
   - Don't touch unrelated columns

3. **Detailed logging**: Console output for debugging
   - Log progress every N rows (e.g., every 10)
   - Log skipped rows with reasons
   - Log errors with row numbers and details
   - Provide summary statistics at end

4. **Error handling**: Continues on individual failures
   - Try-catch around each row processing
   - Log error but continue to next row
   - Report total errors at end
   - Don't fail entire migration for one bad row

5. **Progress tracking**: Shows it's working
   - Log milestone counts (e.g., "Converted 50 rows...")
   - Prevents timeout concerns for long-running scripts
   - Helps estimate completion time

**Real Example: Google Event ID Migration**:

From `scripts/migrate-google-event-ids.js`:

```javascript
// Idempotency check
if (richText && richText.getLinkUrl()) {
    console.log(`Row ${rowNum}: Already has RichText link, skipping`);
    skipped++;
    continue;
}

// Data validation before conversion
if (!group || group === '') {
    console.warn(`Row ${rowNum}: Missing group, skipping`);
    skipped++;
    continue;
}

// Build new format using Core logic
const calendarUrl = buildCalendarUrl(calendarId, date);
const richTextValue = SpreadsheetApp.newRichTextValue()
    .setText(String(eventId))
    .setLinkUrl(calendarUrl)
    .build();

// Write to cell
cell.setRichTextValue(richTextValue);
```

**Migration Script Checklist**:

When creating a migration script:

- ✅ Add `/* istanbul ignore file - GAS-only migration script */` at top
- ✅ Include detailed USAGE and SAFETY comments
- ✅ Find columns by header name (not hardcoded index)
- ✅ Implement idempotency check (skip already-migrated)
- ✅ Validate data before conversion (skip invalid rows)
- ✅ Use try-catch per row (continue on errors)
- ✅ Log progress every N rows
- ✅ Provide summary statistics
- ✅ Keep helper functions inline (GAS deployment requirement)
- ✅ Test on small dataset first
- ✅ Run in dev environment before production

**Deployment Process**:

1. **Development**:
   ```bash
   npm run dev:push  # Deploy migration script
   ```

2. **Run in GAS**:
   - Open Script Editor
   - Select migration function
   - Click "Run"
   - Monitor execution logs

3. **Verify**:
   - Check spreadsheet manually
   - Verify sample rows converted correctly
   - Check for unexpected side effects

4. **Production** (if needed):
   ```bash
   npm run prod:push  # Deploy to production
   ```

5. **Cleanup** (optional):
   - After successful migration, can remove script
   - Or keep for documentation/reference

#### Google Calendar Embed URLs

**Pattern**: Link to calendar in AGENDA mode for specific date.

**buildCalendarUrl Function**:

```javascript
/**
 * Build Google Calendar embed URL showing specific date in agenda view
 * 
 * @param {string} calendarId - Calendar ID (e.g., 'groupname@gmail.com')
 * @param {Date} date - Date to display in agenda view
 * @returns {string} Calendar embed URL
 */
function buildCalendarUrl(calendarId, date) {
    // Format date as YYYYMMDD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Build URL with query parameters (manual encoding for GAS compatibility)
    // URLSearchParams not available in Google Apps Script
    const params = [
        `src=${encodeURIComponent(calendarId)}`,
        'mode=AGENDA',
        `ctz=${encodeURIComponent('America/Los_Angeles')}`,
        `dates=${dateStr}%2F${dateStr}` // Manual encoding of / as %2F
    ];
    
    return `https://calendar.google.com/calendar/embed?${params.join('&')}`;
}
```

**Used In**:

1. **GoogleEventCore.buildCalendarUrl()** - Core implementation (tested in Jest)
2. **RowCore.GoogleEventId setter** - Creates RichText when GoogleEventId is set
3. **Migration scripts** - Convert existing plain text IDs to hyperlinks

**URL Parameters Explained**:

| Parameter | Value | Purpose |
|-----------|-------|---------||
| `src` | `calendarId` | Which calendar to display (URL-encoded) |
| `mode` | `AGENDA` | Show list view (not month calendar) |
| `ctz` | `America/Los_Angeles` | Calendar timezone |
| `dates` | `YYYYMMDD/YYYYMMDD` | Highlight specific date range |

**Key Details**:

- ✅ **`mode=AGENDA`** - Shows list view, easier to find specific event
- ✅ **`dates=YYYYMMDD/YYYYMMDD`** - Single day range highlights the ride date
- ✅ **`ctz=America/Los_Angeles`** - Sets timezone to Pacific (club default)
- ✅ **Manual encoding** - Uses `encodeURIComponent()` (GAS-compatible)
- ❌ **Cannot use URLSearchParams** - Not available in GAS V8 runtime

**Example URLs**:

```javascript
// Example: SCCCC Thursday Fun Ride on Dec 5, 2025
const calendarId = 'scccc.thursday@gmail.com';
const date = new Date('2025-12-05');
const url = buildCalendarUrl(calendarId, date);

// Result:
// https://calendar.google.com/calendar/embed?
//   src=scccc.thursday%40gmail.com
//   &mode=AGENDA
//   &ctz=America%2FLos_Angeles
//   &dates=20251205%2F20251205
```

**Testing Strategy**:

**Core Module** (tested in Jest):
```javascript
// GoogleEventCore.test.js
describe('buildCalendarUrl', () => {
    it('should build calendar URL with correct parameters', () => {
        const calendarId = 'test@gmail.com';
        const date = new Date('2025-12-05');
        
        const url = GoogleEventCore.buildCalendarUrl(calendarId, date);
        
        expect(url).toContain('src=test%40gmail.com');
        expect(url).toContain('mode=AGENDA');
        expect(url).toContain('dates=20251205%2F20251205');
    });
});
```

**Adapter Module** (tested manually in GAS):
- Verify links open correct calendar
- Verify date is highlighted
- Verify agenda view displays

**Common Issues**:

**Problem**: Links don't open to correct date
```javascript
// ❌ WRONG - Using UTC date string
const date = new Date('2025-12-05T00:00:00Z'); // UTC midnight
// In PST timezone, this is 2025-12-04 4:00 PM

// ✅ CORRECT - Using local date
const date = new Date('2025-12-05'); // Local midnight
```

**Problem**: Calendar not found
```javascript
// ❌ WRONG - Incorrect calendar ID format
const calendarId = 'groupname'; // Missing @gmail.com

// ✅ CORRECT - Full email address
const calendarId = 'groupname@gmail.com';
```

**Problem**: URL encoding issues
```javascript
// ❌ WRONG - Using URLSearchParams (not available in GAS)
const params = new URLSearchParams({ src: calendarId });
const url = `https://calendar.google.com/calendar/embed?${params.toString()}`;

// ✅ CORRECT - Manual encoding with encodeURIComponent
const params = [`src=${encodeURIComponent(calendarId)}`];
const url = `https://calendar.google.com/calendar/embed?${params.join('&')}`;
```

#### Module Export/Import Pattern

**For universal module export/import patterns**, see [gas-best-practices.md](gas-best-practices.md#module-exportimport-pattern).

### Key Components

#### Schedule & Row Classes
`Schedule.js` provides the primary interface to the spreadsheet:
- Manages the "Consolidated Rides" sheet
- Provides `Row` objects that represent individual ride entries
- Handles formula storage/restoration
- Caches row data to minimize spreadsheet reads
- **Note**: Tightly coupled to SpreadsheetApp - refactoring target for better separation

#### Command Pattern
`Commands.js` contains frozen command objects executed by `MenuFunctions.js`:
- Each command receives `(rows, rwgps, force)` parameters
- Commands delegate to `RideManager.js` for actual operations
- `UIManager.processRows` handles validation and user confirmation

#### Validation System
`rowCheck.js` provides validation functions:
- Functions return error/warning messages or undefined
- Used by `UIManager.processRows` before command execution
- Distinguishes between errors (blocking) and warnings (user can override)

#### Processing Flow
1. User selects menu item in spreadsheet
2. `triggers.js` calls `MenuFunctions.js`
3. `MenuFunctions.js` gets selected rows from `Schedule.js`
4. `UIManager.processRows` validates rows using `rowCheck.js`
5. User confirms via dialog
6. `Commands.js` execute via `RideManager.js`
7. `Schedule.save()` writes changes back to spreadsheet

#### Announcement System (Major Feature)
**AnnouncementCore.js** (Pure JavaScript, 100% tested):
- Send time calculations (6 PM, 2 days before ride)
- Queue item creation and management
- Template expansion logic (replaces {FieldName} placeholders)
- Exponential backoff retry logic for failed sends
- Status transitions and validation
- Statistics calculations

**CRITICAL: Timezone Handling**:
- **Implementation uses LOCAL timezone**: All date calculations in `AnnouncementCore.js` use JavaScript's native Date object, which operates in the local timezone of the execution environment
- **In Google Apps Script**: Local timezone = `Session.getScriptTimeZone()` (configured in GAS project settings, typically 'America/Los_Angeles')
- **In Jest tests**: Local timezone = system timezone where tests run (e.g., developer's machine timezone)
- **Test Date Format**: Tests MUST use local time format (no 'Z' suffix) to match implementation behavior:
  - ✅ CORRECT: `new Date('2025-12-05T18:00:00')` - Local 6 PM
  - ❌ WRONG: `new Date('2025-12-05T18:00:00Z')` - UTC 6 PM (may be different local time depending on timezone)
- **Why this matters**: Using UTC dates in tests (with 'Z') causes timezone-dependent failures. A UTC date `2025-12-05T18:00:00Z` is interpreted as `2025-12-05 10:00 PST` in Pacific timezone, causing 8-hour offset in assertions.
- **Future enhancement**: The `timezone` parameter exists in function signatures but is currently unused. Full timezone support would require either:
  1. External library (e.g., moment-timezone) - adds dependency
  2. Manual UTC offset calculations - error-prone
  3. Intl.DateTimeFormat API - complex, browser-dependent

**AnnouncementManager.js** (GAS adapter):
- Gmail integration for sending announcements
- Google Doc template rendering
- Spreadsheet persistence for announcement queue
- Trigger scheduling for timed sends

**Key Concepts**:
- **Announcement Queue**: Spreadsheet-based (not PropertiesService) for operator visibility
- **Template Expansion**: Google Docs with {FieldName} placeholders → expanded with row data
- **Timed Sends**: Scheduled triggers fire at exact send time (with backstop at 2 AM daily)
- **Status Flow**: pending → sending → sent | failed (with retry logic)
- **Cancellation Handling**: Special logic for cancelled rides (sends cancellation email if announcement already sent)

**Documentation**:
- Operator Manual: `docs/Announcement-OperatorManual.md`
- Ride Scheduler Guide: `docs/Announcement-RideSchedulerGuide.md`
- Release Notes: `docs/Announcement-ReleaseNotes.md`

#### Trigger Management
**TriggerManagerCore.js** (Pure JavaScript, 100% tested):
- Trigger configuration and validation logic
- Scheduling decision logic (when to create/remove triggers)
- Owner validation logic
- No GAS dependencies

**TriggerManager.js** (GAS adapter):
- Thin wrapper around TriggerManagerCore
- Handles ScriptApp trigger creation/deletion
- Manages document properties for coordination
- Logs all operations to User Activity Log

**Trigger Types Managed**:
1. **onOpen** - Installable trigger (runs as owner)
2. **onEdit** - Installable trigger (runs as owner)
3. **Daily Announcement Check** - Backstop (runs 2 AM daily)
5. **Daily RWGPS Members Sync** - Backstop (runs 2 AM daily)
6. **Announcement Scheduled** - Dynamic (fires at announcement send time)

**Installation**:
- Owner-only via menu: "Ride Schedulers > Install Triggers"
- Idempotent: Safe to run multiple times
- All operations logged to User Activity Log
- **CRITICAL**: ALL triggers MUST be installed via `TriggerManager.installAllTriggers()` unless there is a clear architectural or operational reason they cannot be (e.g., external system requirements, user-specific triggers)

**Pattern**: "Backstop + Scheduled"
- Daily backstops provide self-healing (catch missed operations)
- Scheduled triggers provide precision timing
- Owner-only ensures single source of trigger management

### Testing Strategy

**For universal testing patterns** (Jest tests, coverage requirements), see [gas-best-practices.md](gas-best-practices.md#testing-strategy).

## Development Workflow (CRITICAL)

### Essential Commands

**Testing & Validation (MANDATORY before every deployment)**:
```bash
# Run all tests
npm test

# Run tests with full coverage report
npm test -- --coverage

# Run specific test file
npm test -- test/__tests__/ModuleName.test.js

# Type check (ZERO errors required)
npm run typecheck

# Validate .d.ts files match implementations (CRITICAL!)
npm run validate-types

# Validate all modules in Exports.js are defined
npm run validate-exports

# Full pre-deployment validation (runs all checks above + tests)
npm run validate-all
```

**Deployment Workflows**:
```bash
# Development deployment (with debug version)
npm run dev:push
# This runs: validate-exports → typecheck → set dev env → create debug Version.js → push to GAS

# Production deployment (requires clean git)
npm run prod:push  
# This runs: validate-exports → typecheck → verify clean git → create prod Version.js → push to GAS

# Pull from GAS (development)
npm run dev:pull

# Pull from GAS (production, requires clean git)
npm run prod:pull

# Direct clasp commands (uses clasp-wrapper.sh for credential swapping)
npm run clasp:push    # Push to current environment
npm run clasp:pull    # Pull from current environment
npm run clasp:status  # Check file sync status
npm run clasp:open    # Open project in GAS web editor
```

**Key Scripts Explained**:
- **`clasp-wrapper.sh`**: Temporarily swaps GAS credentials from `.clasp-credentials.json` to `~/.clasprc.json` for project-specific authentication. All `clasp:*` and deployment commands use this wrapper.
- **`validate-exports`**: Verifies all modules referenced in `Exports.js` are defined (catches loading order issues before GAS deployment)
- **`prepare-debug-version`**: Creates `Version.js` with current git commit hash for debugging
- **`prepare-prod-version`**: Creates `Version.js` with committed version (enforces clean git state)

### Module Addition Checklist

When adding a new module to the codebase:

1. **Create the module** following naming conventions:
   - Pure JavaScript logic: `ModuleNameCore.js`
   - GAS adapter: `ModuleName.js`
   - Type definitions: `ModuleName.d.ts` (for both)

2. **Write comprehensive tests** (Core modules ONLY):
   - Create `test/__tests__/ModuleNameCore.test.js`
   - Achieve 100% coverage
   - Run: `npm test -- --coverage --collectCoverageFrom='src/ModuleNameCore.js'`

3. **Add to Exports.js** (CRITICAL - prevents loading order issues):
   ```javascript
   // Add getter for your module
   get ModuleName() {
       return ModuleName;
   }
   ```
   - Property name MUST match the variable name in the source file
   - Run `npm run validate-exports` to verify

4. **Update gas-globals.d.ts** if module exposes global functions/classes:
   ```typescript
   declare global {
       const ModuleName: typeof ModuleNameClass;
       function globalFunction(): ReturnType;
   }
   ```

5. **Verify deployment**:
   ```bash
   npm run typecheck          # Zero errors required
   npm run validate-exports   # Verify module is accessible
   npm run dev:push          # Deploy to dev environment
   ```

### Debugging Workflow

**Local Debugging (Pure JavaScript modules)**:
```bash
# Run specific test with watch mode
npm test -- --watch test/__tests__/ModuleName.test.js

# Debug test in Node.js
node --inspect-brk node_modules/.bin/jest test/__tests__/ModuleName.test.js

# Check test coverage for specific file
npm test -- --coverage --collectCoverageFrom='src/ModuleName.js'
```

**GAS Debugging**:
1. Deploy with debug version: `npm run dev:push`
2. Open in GAS editor: `npm run clasp:open`
3. Use `console.log()` and view logs in GAS execution logs
4. Check version in spreadsheet: Menu > "Ride Schedulers" > "Show Version"
5. Check User Activity Log for operation history

**Common Issues**:
- **"Module not found" in GAS**: Run `npm run validate-exports` to check module is in Exports.js
- **Loading order issues**: Ensure module uses `Exports.ModuleName` for cross-module access
- **Type errors**: Run `npm run typecheck` and check `gas-globals.d.ts` for missing declarations
- **Failed deployment**: Check `.clasp-credentials.json` exists and is valid

### Architecture Validation

**Before committing code, verify**:

**FOR CHAT ASSISTANTS** (have `get_errors` tool):
```bash
# 0. VS Code errors (MANDATORY FIRST STEP)
get_errors(['src/'])  # Must show ZERO errors

# 1. All tests pass
npm test

# 2. Type checking passes
npm run typecheck

# 3. All modules exported
npm run validate-exports

# 4. Coverage meets requirements (pure JS modules)
npm test -- --coverage

# 5. Verify class pattern (no new namespace modules)
grep -r "^var .*= (function()" src/*.js  # Should return NOTHING

# One-liner validation:
npm test && npm run typecheck && npm run validate-exports
```

**FOR AUTONOMOUS CODING AGENTS** (no `get_errors` tool):
```bash
# 1. Type checking (MANDATORY FIRST STEP - catches method existence errors)
npm run typecheck  # Must show ZERO errors

# 2. All tests pass
npm test

# 3. All modules exported
npm run validate-exports

# 4. Coverage meets requirements (pure JS modules)
npm test -- --coverage

# One-liner validation:
npm run typecheck && npm test && npm run validate-exports
```

**CRITICAL**: The `get_errors` tool check is MANDATORY for chat assistants and must be done FIRST.
VS Code's TypeScript language server catches errors that `tsc --noEmit` may miss.
Autonomous agents MUST run `npm run typecheck` after EVERY code change.
npm test -- --coverage

# One-liner validation:
npm test && npm run typecheck && npm run validate-exports
```

**CRITICAL**: The `get_errors` tool check is MANDATORY for chat assistants and must be done FIRST.
VS Code's TypeScript language server catches errors that `tsc --noEmit` may miss.
Autonomous agents MUST run `npm run typecheck` after EVERY code change.

**Red Flags** (indicates architecture violation):
- ❌ GAS API calls in `*Core.js` files (should be pure JavaScript)
- ❌ Business logic in adapter files (should delegate to Core)
- ❌ Mixing data transformation with SpreadsheetApp calls (separate in Core + Adapter)
- ❌ Hardcoded GAS dependencies (use dependency injection)
- ❌ Tests missing or <100% coverage for Core modules
- ❌ **NEW namespace pattern modules** (use class pattern instead)
- ❌ Pattern: `var ModuleName = (function() { return { ... }; })()` (DEPRECATED)
- ❌ Using `@ts-expect-error` to hide TypeScript errors (fix root cause with class pattern)

## TypeScript Type Coverage

**For universal TypeScript type coverage patterns** (zero type errors policy, .d.ts file patterns), see [gas-best-practices.md](gas-best-practices.md#typescript-type-coverage).

## Fiddler Library (MANDATORY)
This repository uses the [bmPreFiddler](https://github.com/brucemcpherson/bmPreFiddler) to manage [Fiddler](https://github.com/brucemcpherson/bmFiddler) GAS spreadsheet access.

**CRITICAL Rule**: MUST use the bmPreFiddler library to access Fiddler spreadsheets instead of directly using the Fiddler library. Furthermore, ONLY use SpreadsheetApp for functionality not covered by Fiddler or bmPreFiddler (such as finding which rows were selected).

Note that `fiddler.getData()` returns a 1D array of objects representing the rows in the spreadsheet, and `fiddler.setData()` accepts a similar array to write back to the spreadsheet. This allows you to work with in-memory representations of the spreadsheet data, which is more efficient and testable. Furthermore the object keys are based on the column headers, making the code more readable.

Fiddler also supports formulas, which are preserved when reading and writing data, and are important for the Route and Ride columns since those contain hyperlinks generated by formulas.

### ScheduleAdapter
`ScheduleAdapter.js` is the GAS-specific adapter layer for the "Consolidated Rides" spreadsheet:
- Uses bmPreFiddler/Fiddler for bulk data I/O
- Converts spreadsheet rows to plain JavaScript objects with column names as keys
- Enriches row objects with `_rowNum` (1-based spreadsheet row) and `_range` metadata
- Provides selection handling via SpreadsheetApp for user interactions
- Supports filtering operations (younger rows, selected rows, last row)
- **MANDATORY pattern**: Load → Work with plain objects → Save back (batch operation)

#### Formula Preservation Strategy
The Route and Ride columns contain HYPERLINK formulas that must be preserved across read/write cycles:

**Storage Mechanism**:
- Formulas are stored in PropertiesService as JSON arrays after each save
- Properties: `rideColumnFormulas` and `routeColumnFormulas`
- Each property contains a 2D array from `Range.getFormulas()` (e.g., `[[formula1], [formula2], ...]`)

**Loading Process** (`_ensureDataLoaded()`):
1. `fiddler.getData()` loads spreadsheet data → returns **displayed values** (not formulas)
2. `_overlayFormulas()` loads stored formulas from PropertiesService
3. Formulas are overlaid onto Route and Ride column values
4. Result: data objects contain formula strings (e.g., `=HYPERLINK("url", "text")`) as values

**Why this approach**:
- Formulas are treated as string values beginning with '='
- Allows single unified data structure (no separate formula tracking)
- `HyperlinkUtils.parseHyperlinkFormula()` extracts URL/text from formula strings
- When `Row.RouteURL` is accessed, it parses the formula string to get the actual URL

**Saving Process - Cell-Level Precision**:
1. Each Row tracks dirty fields in a `Set<string>` (_dirtyFields)
2. When a field is modified, the column name is added to the dirty set
3. On save(), **only dirty cells** are written to the spreadsheet
4. Formula cells (values starting with '=') use `setFormula()`, others use `setValue()`
5. `SpreadsheetApp.flush()` ensures writes are committed
6. `_storeFormulas()` reads and stores current formulas in PropertiesService
7. Cache cleared to force reload on next operation

**Why Cell-Level Writes Are Critical**:
- **Version History**: Writing entire rows makes change tracking meaningless
- **Precision**: Only modified cells appear in revision history
- **Collaboration**: Reduces conflicts when multiple users work on different columns
- By writing only dirty cells, version history shows exactly what changed and when

**Critical**: Always load formulas after reading data. Row objects expect formula strings in Route/Ride columns, not displayed values.

**CRITICAL Rule**: When working with ScheduleAdapter or Row objects, you MUST follow the cell-level write pattern. NEVER write entire rows when only specific cells have changed. This preserves meaningful version history and prevents collaboration conflicts.

## RWGPS Library
This repository uses the [RWGPSLib(https://github.com/TobyHFerguson/RWGPSLib) to manage RideWithGPS API access.

## Google Calendar Integration
This repository uses the Google Calendar API to create and manage calendar events corresponding to scheduled rides.

## Common GAS + clasp Pain Points

**For universal GAS pain points and solutions** (execution quotas, LockService, PropertiesService, exponential backoff), see [gas-best-practices.md](gas-best-practices.md#common-gas--clasp-pain-points).

## Code Generation Guidelines

### MANDATORY: When modifying legacy mixed modules:
- If you touch `ProcessingManager.js` or `UserLogger.js`, you MUST extract business logic
- Create `*Core.js` module with pure JavaScript and 100% test coverage
- Leave only GAS API calls in the original file
- Do NOT add more business logic to mixed modules

### When suggesting refactorings:
- Identify whether code is GAS-dependent or could be pure JavaScript
- Suggest extracting GAS dependencies to make code testable in Jest
- Maintain the conditional import/export pattern for compatibility
- Consider using adapter pattern to isolate GAS APIs (especially for Schedule/Row)
- **ALWAYS create `*Core.js` modules for business logic with 100% test coverage**

### When adding new features:
1. **Start with pure JavaScript core** - Write business logic in `*Core.js` module
2. **Write comprehensive tests** - Achieve 100% coverage before creating GAS adapter
3. **Create thin GAS adapter** - Minimal wrapper that only handles GAS APIs
4. **Document separation** - Add comments explaining Core vs Adapter split
5. Add validation to `rowCheck.js` rather than inline in commands
6. Follow the Command pattern for new menu operations

**CRITICAL**: Steps 1-3 are MANDATORY and MUST be completed in order. Do NOT skip test writing. Do NOT create mixed modules.

### Architecture Checklist for New Code
Before creating any new functionality, verify:
- ✅ Business logic in pure JavaScript module (`*Core.js`)
- ✅ 100% Jest test coverage for pure JavaScript
- ✅ GAS code only in thin adapter layer
- ✅ Dependencies injected, not hardcoded
- ✅ Tests run successfully: `npm test -- --coverage`
- ✅ Module exported in `Exports.js`
- ✅ Follows conditional import/export pattern

### Example: Correct Architecture Pattern
```javascript
// ✅ RetryQueueCore.js - Pure JavaScript, fully tested
class RetryQueueCore {
    static calculateNextRetry(attemptCount, enqueuedAt, currentTime) {
        // Pure logic, no GAS dependencies
        const ageHours = (currentTime - enqueuedAt) / (60 * 60 * 1000);
        if (ageHours >= 48) return null;
        return currentTime + (ageHours < 1 ? 5 * 60 * 1000 : 60 * 60 * 1000);
    }
}

// ✅ RetryQueue.js - Thin GAS adapter
class RetryQueue {
    processQueue() {
        const queue = this._getQueue(); // GAS: PropertiesService
        const now = new Date().getTime(); // GAS: Date
        
        // Use core logic
        const dueItems = RetryQueueCore.getDueItems(queue, now);
        
        // GAS-specific execution
        dueItems.forEach(item => {
            const result = this._executeOperation(item); // GAS: CalendarApp
            if (!result.success) {
                const update = RetryQueueCore.updateAfterFailure(item, result.error, now);
                // Handle update with GAS persistence
            }
        });
    }
}
```

### Anti-Patterns to Avoid
❌ **Business logic in GAS modules**
```javascript
// BAD - calculation logic in GAS module
class RetryQueue {
    _calculateNextRetry(attemptCount, enqueuedAt) {
        const now = new Date().getTime(); // Can't test this!
        // ... complex logic mixed with GAS APIs
    }
}
```

❌ **Hardcoded GAS dependencies**
```javascript
// BAD - can't test without GAS
function createItem(operation) {
    return {
        id: Utilities.getUuid(), // Hardcoded GAS dependency
        ...operation
    };
}
```

❌ **No test coverage**
```javascript
// BAD - no tests = broken code waiting to happen
class NewFeature {
    complexLogic() {
        // Lots of untested code
    }
}
```

## Namespace vs Class in .d.ts Files (CRITICAL TypeScript Pattern)

**Problem**: When a JavaScript module exports an object with static-like methods (namespace pattern), the `.d.ts` file must use `declare namespace`, NOT `declare class`.

**JavaScript Implementation** (exports namespace object):
```javascript
// AnnouncementCore.js
var AnnouncementCore = {
    calculateSendTime: function(rideDate, timezone) { /* ... */ },
    expandTemplate: function(template, rowData, route) { /* ... */ },
    getDueItems: function(rows, currentTime) { /* ... */ }
};

if (typeof module !== 'undefined') {
    module.exports = AnnouncementCore;
}
```

**Type Definition Patterns**:

```typescript
// ❌ WRONG - Using 'declare class' for namespace object
declare class AnnouncementCore {
    static calculateSendTime(rideDate: Date | string, timezone: string): Date;
    static expandTemplate(template: string, rowData: any, route?: any): any;
}
export default AnnouncementCore;
```

**Why this is wrong**:
- TypeScript sees `AnnouncementCore` as a class constructor, not a namespace
- When imported in gas-globals.d.ts as `const AnnouncementCore: typeof AnnouncementCoreClass`, VS Code resolves `AnnouncementCore.method()` calls to the module import type, not the global variable
- Result: "Property 'method' does not exist on type 'typeof import(...)/AnnouncementCore')"

```typescript
// ✅ CORRECT - Using 'declare namespace' for namespace object
declare namespace AnnouncementCore {
    function calculateSendTime(rideDate: Date | string, timezone: string): Date;
    function expandTemplate(template: string, rowData: any, route?: any): any;
}
export default AnnouncementCore;
```

**Why this works**:
- Matches the actual JavaScript structure (object with functions, not class with static methods)
- When imported in gas-globals.d.ts as `const AnnouncementCore: typeof AnnouncementCore`, TypeScript correctly resolves method calls
- No conflict between module import types and global GAS variables

**gas-globals.d.ts Pattern**:
```typescript
// Import the namespace type
import type AnnouncementCore from './AnnouncementCore';

declare global {
    // Declare as global constant with the namespace type
    const AnnouncementCore: typeof AnnouncementCore;
}
```

**Key Rules**:
- ✅ Use `declare namespace` when JS exports an object with functions
- ✅ Use `function methodName()` inside namespace (not `static methodName()`)
- ✅ Use `declare class` when JS exports an actual class constructor
- ✅ Use `static methodName()` inside class for class static methods
- ✅ Match `.d.ts` structure to actual JS export structure
- ❌ Don't use `class` for namespace objects - causes "module import type" resolution issues

**Real-World Example**:
- AnnouncementCore.js exports namespace object → AnnouncementCore.d.ts uses `declare namespace`
- TriggerManager.js exports class constructor → TriggerManager.d.ts uses `declare class`
- Row.js exports class constructor → Row.d.ts uses `declare class`

**Debugging Tip**:
If you see errors like "Property 'X' does not exist on type 'typeof import(...)/ModuleName'", check:
1. Is the `.d.ts` using `declare class` when it should be `declare namespace`?
2. Is gas-globals.d.ts using the right import and declaration pattern?
3. Does the JavaScript export structure match the TypeScript declaration?

## Code Modification Workflow

**For universal code modification workflow** (verify zero type errors, update tests, update types, deployment verification), see [gas-best-practices.md](gas-best-practices.md#code-modification-workflow).

**RideManager-Specific Reminder**: Always run `get_errors(['src/'])` (chat assistants) or `npm run typecheck` (autonomous agents) after EVERY code change.

## Common Type Errors and Fixes## Common Type Errors and Fixes

**Note**: For universal type error patterns, see [gas-best-practices.md](gas-best-practices.md#common-type-errors-and-fixes). This section contains **RideManager-specific** type error examples.

### 1. AnnouncementCore/Module Import Types (RideManager-Specific)
When TypeScript sees `typeof import('./Module')`, it's treating the module as a type, not the actual exported object.

**Problem**:
```javascript
// This doesn't work - TypeScript sees the module type, not the exported object
AnnouncementCore.calculateSendTime(...)  // Error: Property 'calculateSendTime' does not exist
```

**Solution**: Add `@typedef` to properly import the module's default export:
```javascript
// At top of file after triple-slash references
/**
 * @typedef {import('./AnnouncementCore').default} AnnouncementCoreType
 */

// Then access the namespace methods normally
const time = AnnouncementCore.calculateSendTime(date, timezone);
```

### 2. Row Instance vs Class Type
Functions receiving Row instances must use `InstanceType<typeof Row>`, not just `Row`.

**Problem**:
```javascript
/**
 * @param {Row} row - WRONG: This means the Row class constructor
 */
function processRow(row) {
    row.RideName  // Error: Property 'RideName' does not exist on type 'typeof Row'
}
```

**Solution**:
```javascript
/**
 * @param {InstanceType<typeof Row>} row - CORRECT: This means a Row instance
 */
function processRow(row) {
    row.RideName  // ✅ Works - TypeScript knows this is an instance
}
```

### 3. Error Type Guards (useUnknownInCatchVariables: true)
ALL catch blocks must use type guards since errors are `unknown` type in strict mode.

**Problem**:
```javascript
catch (error) {
    console.log(error.message);  // Error: 'error' is of type 'unknown'
}
```

**Solution**:
```javascript
catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.log(err.message);  // ✅ Works
}
```

### 4. Object Return Types from Functions
When a function returns `{success: boolean, error?: string}`, JSDoc must specify the shape.

**Problem**:
```javascript
/**
 * @returns {Object}  // Too vague - TypeScript doesn't know the properties
 */
function doSomething() {
    return { success: true };
}

const result = doSomething();
if (result.success) {}  // Error: Property 'success' does not exist on type 'Object'
```

**Solution**:
```javascript
/**
 * @returns {{success: boolean, error?: string}}  // Specific shape
 */
function doSomething() {
    return { success: true };
}

const result = doSomething();
if (result.success) {}  // ✅ Works
```

### 5. Implicit any Parameters
ALL function parameters need explicit types.

**Problem**:
```javascript
function process(item) {  // Error: Parameter 'item' implicitly has an 'any' type
    return item.name;
}
```

**Solution**:
```javascript
/**
 * @param {any} item - Item to process
 */
function process(item) {
    return item.name;  // ✅ Works
}
```

### 6. Lambda/Arrow Function Parameter Types
Lambda parameters also need types when not inferrable.

**Problem**:
```javascript
items.forEach(row => {  // Error: Parameter 'row' implicitly has an 'any' type
    console.log(row.name);
});
```

**Solution**:
```javascript
items.forEach((/** @type {any} */ row) => {  // Inline JSDoc type
    console.log(row.name);  // ✅ Works
});
```

### 7. Undefined vs Null for Optional Date Fields
TypeScript distinguishes between `undefined` and `Date` in strict mode.

**Problem**:
```javascript
row.SendAt = undefined;  // Error: Type 'undefined' is not assignable to type 'Date'
```

**Solutions**:
```javascript
// Option 1: Type definition allows undefined
// In Row.d.ts: get SendAt(): Date | undefined;
row.SendAt = undefined;  // ✅ Works if type allows it

// Option 2: Use type assertion when necessary
// @ts-ignore - Clearing SendAt field (design allows undefined)
row.SendAt = undefined;

// Option 3: Use null if type definition uses Date | null
row.SendAt = null;
```

### 8. Accessing Private Properties
Private properties marked in `.d.ts` cannot be accessed directly.

**Problem**:
```javascript
row._adapter.save();  // Error: Property '_adapter' is private
```

**Solutions**:
```javascript
// Option 1: Add explanatory @ts-ignore comment
// @ts-ignore - _adapter is internal but needed for immediate save
row._adapter.save();

// Option 2: Add public method to class
// In Row class:
save() {
    this._adapter.save();
}
// Then call:
row.save();  // ✅ Public method
```

### Pre-Flight Checklist for Zero VS Code Errors

Before claiming work is complete:
1. ✅ Run `get_errors(['src/YourFile.js'])` - must show ZERO
2. ✅ Check all function parameters have JSDoc types
3. ✅ Check all catch blocks have error type guards
4. ✅ Check Row parameters use `InstanceType<typeof Row>`
5. ✅ Check return types specify object shapes `{{success: boolean}}`
6. ✅ Check lambda parameters have inline `@type` annotations
7. ✅ Check module imports have proper `@typedef` for namespace access
8. ✅ Run `npm run typecheck` - must show ZERO errors in src/

**If you have 175 errors like the example**:
- You skipped these steps
- Fix them ALL before proceeding
- Each error is a potential runtime bug
