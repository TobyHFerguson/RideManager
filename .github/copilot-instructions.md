# Copilot Instructions

## Architecture Overview
This is a Google Apps Script (GAS) project that manages ride scheduling through integration with RideWithGPS and Google Calendar. The codebase mixes GAS-specific APIs with standard JavaScript/Node.js code.

### Key Architectural Patterns

#### GAS vs Pure JavaScript Separation
The codebase is transitioning toward better separation between GAS-specific code and pure JavaScript:

- **Pure JavaScript modules** (can run in Node.js/Jest):
  - `Event.js` - Event data model
  - `EventFactory.js` - Event creation logic
  - `Groups.js` - Group specifications
  - `Globals.js` - Global configuration
  - `Commands.js` - Business logic commands
  - `rowCheck.js` - Validation logic
  - Dates submodule

- **GAS-dependent modules** (require SpreadsheetApp, PropertiesService, etc.):
  - `Schedule.js` - Spreadsheet interaction (tightly coupled to SpreadsheetApp)
  - `RideManager.js` - RWGPS and Calendar integration
  - `UIManager.js` - User interface dialogs
  - `MenuFunctions.js` - Menu handlers
  - `triggers.js` - GAS event handlers

- **Mixed modules** (candidates for refactoring):
  - `ProcessingManager.js` - Uses PropertiesService for state management
  - `UserLogger.js` - Uses DriveApp and Session

#### Areas for Separation Improvement
**Schedule & Row Classes** - Currently tightly coupled to SpreadsheetApp:
- These classes leak GAS dependencies throughout the codebase
- Spreadsheets are small (few hundred rows, ~20 columns), amenable to in-memory processing
- **Target architecture**: Load spreadsheet → Convert to domain objects → Pass to business layer → Merge updates → Save back
- Use Fiddler for I/O layer instead of direct SpreadsheetApp manipulation
- Keep pure JavaScript business logic separate from GAS persistence layer

#### Module Export/Import Pattern
Due to GAS limitations, the code uses a conditional module pattern:

```javascript
// At top of file for Node.js/Jest compatibility
if (typeof require !== 'undefined') {
    const SomeModule = require('./SomeModule');
}

// At bottom of file for Node.js/Jest export
if (typeof module !== 'undefined') {
    module.exports = SomeObject;
}
```

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

### Testing Strategy
- Jest tests for pure JavaScript modules (Event, EventFactory, Groups)
- GAS-specific code tested manually or via `testEvent.js` style functions
- Mock GAS APIs in Jest tests where needed

## Fiddler Library
This repository uses the [bmPreFiddler](https://github.com/brucemcpherson/bmPreFiddler) to manage [Fiddler](https://github.com/brucemcpherson/bmFiddler) GAS spreadsheet access.

To the largest extent possible, please use the bmPreFiddler library to access Fiddler spreadsheets instead of directly using the Fiddler library. Furthermore, only use SpreadsheetApp for access to functionality not covered by Fiddler or bmPreFiddler (such as finding which rows were selected).

## RWGPS Library
This repository uses the [RWGPSLib(https://github.com/TobyHFerguson/RWGPSLib) to manage RideWithGPS API access.

## Google Calendar Integration
This repository uses the Google Calendar API to create and manage calendar events corresponding to scheduled rides.

## Code Generation Guidelines

### When suggesting refactorings:
- Identify whether code is GAS-dependent or could be pure JavaScript
- Suggest extracting GAS dependencies to make code testable in Jest
- Maintain the conditional import/export pattern for compatibility
- Consider using adapter pattern to isolate GAS APIs (especially for Schedule/Row)

### When adding new features:
- Prefer pure JavaScript for business logic
- Use GAS APIs only in boundary layers (Schedule, MenuFunctions, triggers)
- Add validation to rowCheck.js rather than inline in commands
- Follow the Command pattern for new menu operations



