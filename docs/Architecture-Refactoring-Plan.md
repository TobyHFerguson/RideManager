# Architecture Refactoring Plan

## Overview

This document outlines the refactoring plan to bring legacy modules into compliance with the Core/Adapter architectural pattern established in the codebase. The goal is to maximize testable code (pure JavaScript with 100% test coverage) and minimize GAS execution (thin adapter layers).

## Current State Assessment

### ✅ Exemplary Modules (Following Best Practices)
- **AnnouncementCore + AnnouncementManager**: Perfect separation of pure logic and GAS adapter
- **TriggerManagerCore + TriggerManager**: Model implementation of Core/Adapter pattern
- **RWGPSMembersCore + RWGPSMembersAdapter**: Clean data transformation with Fiddler integration
- **UserLoggerCore + UserLogger**: Pure formatting logic with thin GAS adapter
- **RouteColumnEditor**: Pure JavaScript with no GAS dependencies
- **HyperlinkUtils**: Framework-agnostic utility functions

### ❌ Legacy Modules Requiring Refactoring
- **Row + ScheduleAdapter**: Tightly coupled to SpreadsheetApp, mixed concerns
- **RideManager**: Business logic mixed with GAS API calls
- **Commands + UIManager + rowCheck**: Over-engineered with too many indirection layers

## Architecture Principles

### Core/Adapter Pattern
```javascript
// ✅ CORRECT Pattern

// 1. Pure JavaScript Core (100% tested in Jest)
// ModuleCore.js
class ModuleCore {
    static calculateSomething(input, dependencies) {
        // Pure logic, no GAS dependencies
        // Dependencies injected as parameters
        return result;
    }
}

// 2. Thin GAS Adapter (minimal logic)
// Module.js
class Module {
    doSomething() {
        // Gather inputs from GAS services
        const input = SpreadsheetApp.getActiveSheet().getValue();
        const config = getGlobals();
        
        // Use Core for business logic
        const result = ModuleCore.calculateSomething(input, config);
        
        // Apply result via GAS services
        GmailApp.sendEmail(result);
    }
}
```

### What Belongs in Core vs Adapter

**Core Modules (Pure JavaScript, 100% Tested)**:
- Business logic (calculations, decisions, state management)
- Data transformations and marshalling (format conversions, parsing, serialization)
- Validation rules and algorithms
- Template expansion and string processing
- Date calculations and formatting
- Configuration processing
- **Domain properties with clean names** (camelCase, framework-agnostic)

**Adapter Modules (Thin GAS Wrappers)**:
- SpreadsheetApp operations (read/write cells, get ranges)
- GmailApp operations (send email)
- CalendarApp operations (create/update events)
- UrlFetchApp operations (HTTP requests)
- PropertiesService operations (persistence)
- DriveApp operations (file access)
- UI operations (dialogs, alerts)
- ScriptApp operations (triggers)
- **Mapping between persistence and domain** (spreadsheet columns ↔ domain properties)
- **Configuration loading** (getGlobals(), etc.)

### CRITICAL: Anti-Corruption Layer Pattern

**The Hexagonal Architecture Principle**:

> **Domain models must NEVER depend on persistence layer structure.**
> The adapter layer is the anti-corruption boundary that mediates between external systems and the pure domain.

In this codebase:
- **RowCore** = Pure domain (uses `rideName`, `startDate` - clean property names)
- **ScheduleAdapter** = Anti-corruption layer (knows about `globals.RIDENAMECOLUMNNAME`, `globals.STARTDATETIMECOLUMNNAME`)
- **Globals spreadsheet** = External configuration (column names can change without affecting domain)

**Example of proper separation**:
```javascript
// ✅ CORRECT: Domain doesn't know about spreadsheet
const row = new RowCore({
    rideName: 'Epic Ride',
    startDate: new Date('2026-02-01')
});

// ❌ WRONG: Domain depends on spreadsheet structure
const row = new RowCore(data);
row.rideName = data[getGlobals().RIDENAMECOLUMNNAME]; // Leaky abstraction!
```

The mapping from `globals.RIDENAMECOLUMNNAME` → `rideName` happens **only in ScheduleAdapter**, never in RowCore.

## Refactoring Phases

### Phase 1: Critical Priority (Must Complete Before New Features)

#### 1.1 Extract RowCore from Row.js
**Effort**: 2-3 days  
**Priority**: Critical  
**Blocks**: All future Row-related work

**Current Problems**:
- Row class mixes domain model with spreadsheet concerns
- Direct SpreadsheetApp manipulation throughout
- Formula preservation via PropertiesService is brittle
- Difficult to test business logic

**Target Architecture**:
```javascript
// RowCore.js - Pure domain model (NO spreadsheet dependencies)
class RowCore {
    constructor({
        startDate,      // Clean camelCase domain properties
        startTime,
        rideName,
        rideURL,
        routeName,
        routeURL,
        group,
        leaders,
        rowNum,
        // ... all domain properties
    }) {
        // Domain properties (NO spreadsheet column names)
        this.startDate = startDate;
        this.startTime = startTime;
        this.rideName = rideName;
        this.rideURL = rideURL;
        this.routeName = routeName;
        this.routeURL = routeURL;
        this.group = group;
        this.leaders = leaders;
        this.rowNum = rowNum;
        
        this._dirtyFields = new Set();
    }
    
    // Pure validation logic
    isScheduled() { return !!this.rideURL; }
    isPastDue(currentDate) { 
        return this.startDate < currentDate;
    }
    
    // Dirty tracking
    markDirty(field) { this._dirtyFields.add(field); }
    getDirtyFields() { return this._dirtyFields; }
}

// ScheduleAdapter.js - Anti-corruption layer
class ScheduleAdapter {
    constructor() {
        this.fiddler = bmPreFiddler.PreFiddler().getFiddler({
            sheetName: 'Consolidated Rides'
        });
        
        // Build mapping from Globals spreadsheet (spreadsheet → domain)
        const globals = getGlobals();
        this.columnMap = {
            [globals.STARTDATETIMECOLUMNNAME]: 'startDate',
            [globals.RIDENAMECOLUMNNAME]: 'rideName',
            [globals.RIDEURLCOLUMNNAME]: 'rideURL',
            [globals.ROUTENAMECOLUMNNAME]: 'routeName',
            [globals.ROUTEURLCOLUMNNAME]: 'routeURL',
            [globals.GROUPCOLUMNNAME]: 'group',
            [globals.LEADERSCOLUMNNAME]: 'leaders',
            // ... all column mappings
        };
        
        // Reverse map (domain → spreadsheet)
        this.domainToColumn = Object.fromEntries(
            Object.entries(this.columnMap).map(([col, prop]) => [prop, col])
        );
    }
    
    load() {
        const spreadsheetData = this.fiddler.getData();
        this._overlayFormulas(spreadsheetData);
        
        // Transform spreadsheet data to domain objects
        return spreadsheetData.map(rowData => {
            const domainData = {};
            for (const [columnName, domainProp] of Object.entries(this.columnMap)) {
                domainData[domainProp] = rowData[columnName];
            }
            domainData.rowNum = rowData._rowNum;
            return new RowCore(domainData);
        });
    }
    
    saveDirtyFields(rowCore) {
        const dirtyFields = rowCore.getDirtyFields();
        dirtyFields.forEach(domainProp => {
            const columnName = this.domainToColumn[domainProp];
            this._writeCell(rowCore.rowNum, columnName, rowCore[domainProp]);
        });
        SpreadsheetApp.flush();
        this._storeFormulas();
    }
}

// Consuming code uses RowCore directly
// MenuFunctions.js, RideManager.js, Commands.js, etc.
const rows = scheduleAdapter.load(); // Returns RowCore[]

rows.forEach(row => {
    console.log(row.rideName);  // Direct camelCase access
    if (row.isScheduled()) {
        // Domain logic
    }
});

// Modify and save
row.rideName = 'New Name';
row.markDirty('rideName');
scheduleAdapter.saveDirtyFields(row);
```

**Testing Strategy**:
- Test all Row business logic in Jest (100% coverage)
- Test domain model behavior with plain objects (no GAS)
- Test validation rules with various inputs
- Keep GAS integration tests separate

**Example Test**:
```javascript
// test/__tests__/RowCore.test.js
const RowCore = require('../../src/RowCore');

describe('RowCore', () => {
    it('should identify scheduled rides', () => {
        const row = new RowCore({
            rideName: 'Test Ride',
            rideURL: 'https://ridewithgps.com/events/123',
            startDate: new Date('2026-02-01')
        });
        
        expect(row.isScheduled()).toBe(true);
    });
    
    it('should identify unscheduled rides', () => {
        const row = new RowCore({
            rideName: 'Test Ride',
            rideURL: null,
            startDate: new Date('2026-02-01')
        });
        
        expect(row.isScheduled()).toBe(false);
    });
});
```

**Success Criteria**:
- ✅ RowCore uses clean camelCase property names
- ✅ RowCore has NO getGlobals() calls
- ✅ RowCore has 100% test coverage with plain objects
- ✅ ScheduleAdapter builds columnMap from getGlobals()
- ✅ ScheduleAdapter returns RowCore instances directly
- ✅ ScheduleAdapter handles ALL spreadsheet ↔ domain mapping
- ✅ **ALL consuming code updated to use RowCore directly**
- ✅ **Row.js class removed** (not needed)
- ✅ Cell-level write pattern preserved
- ✅ Zero regression in production behavior

---

#### 1.2 Extract RideManagerCore from RideManager.js
**Effort**: 3-4 days  
**Priority**: Critical  
**Blocks**: RWGPS internalization, route management improvements

**Current Problems**:
- Route preparation logic mixed with rwgps API calls
- Event name validation mixed with calendar operations
- Calendar event preparation mixed with CalendarApp calls
- Cannot test business logic without GAS

**Lines Requiring Refactoring**:
- Lines 85-103: `importRow_()` - route preparation logic
- Lines 283-321: `updateRow_()` - event name logic, validation
- Lines 37-44: `getLatLong()` - pure route data extraction

**Target Architecture**:
```javascript
// RideManagerCore.js - Pure business logic
class RideManagerCore {
    /**
     * Prepare route import configuration
     * @param {Object} rowData - Plain row data object
     * @param {Object} globals - Global configuration
     * @returns {Object} Route configuration for RWGPS import
     */
    static prepareRouteImport(rowData, globals) {
        const route = {
            url: rowData.RouteURL || rowData.RouteName,
            expiry: dates.MMDDYYYY(
                dates.add(
                    rowData.StartDate || new Date(), 
                    globals.EXPIRY_DELAY
                )
            ),
            tags: [rowData.Group]
        };
        
        // Pure logic: strip foreign prefix
        if (route.name?.startsWith(globals.FOREIGN_PREFIX)) {
            route.name = route.name.substring(globals.FOREIGN_PREFIX.length);
        }
        
        return route;
    }
    
    /**
     * Calculate calendar event details
     * @param {Object} rowData - Plain row data
     * @param {Object} route - Route object with lat/lng
     * @returns {Object} Calendar event configuration
     */
    static prepareCalendarEvent(rowData, route) {
        return {
            latLong: route ? `${route.first_lat},${route.first_lng}` : '',
            startDate: rowData.StartDate,
            endDate: rowData.EndDate,
            title: rowData.RideName,
            description: RideManagerCore.buildEventDescription(rowData, route)
        };
    }
    
    /**
     * Validate event name format and requirements
     * @param {string} eventName - Proposed event name
     * @param {Object} rowData - Row data for context
     * @returns {{valid: boolean, errors: string[]}} Validation result
     */
    static validateEventName(eventName, rowData) {
        const errors = [];
        
        if (!eventName || eventName.trim().length === 0) {
            errors.push('Event name cannot be empty');
        }
        
        if (eventName.length > 100) {
            errors.push('Event name too long (max 100 characters)');
        }
        
        // Additional validation rules...
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Extract lat/long from route object
     * @param {Object} route - Route object
     * @returns {string} Lat/long string or empty
     */
    static extractLatLong(route) {
        if (!route || !route.first_lat || !route.first_lng) {
            return '';
        }
        return `${route.first_lat},${route.first_lng}`;
    }
}

// RideManager.js - Thin GAS adapter
const RideManager = (function () {
    function importRow_(row, rwgps) {
        // Use core for business logic
        const routeConfig = RideManagerCore.prepareRouteImport(
            row.toPlainObject(), 
            getGlobals()
        );
        
        // Only GAS API call
        const url = rwgps.importRoute(routeConfig);
        
        // Update row (via row's own method)
        row.setRouteLink(routeConfig.name || url, url);
    }
    
    function updateRow_(row, rwgps, gcal, force) {
        // Validation using core
        const validation = RideManagerCore.validateEventName(
            row.RideName,
            row.toPlainObject()
        );
        
        if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
        }
        
        // Prepare event using core
        const route = getRoute(row.RouteURL);
        const eventConfig = RideManagerCore.prepareCalendarEvent(
            row.toPlainObject(),
            route
        );
        
        // GAS API calls only
        gcal.updateEvent(row.RideURL, eventConfig);
    }
    
    return { importRow_, updateRow_, /* ... */ };
})();
```

**Testing Strategy**:
- Test route preparation with various row configurations
- Test event name validation rules
- Test calendar event configuration building
- Test foreign prefix stripping logic
- Test edge cases (missing fields, null values)
- 100% coverage for RideManagerCore

**Success Criteria**:
- ✅ RideManagerCore has 100% test coverage
- ✅ All business logic moved to RideManagerCore
- ✅ RideManager.js only contains GAS API calls
- ✅ Zero regression in production behavior
- ✅ Easier to extend with new validation rules

---

#### 1.3 Enhance ScheduleAdapter with Better Dirty Tracking
**Effort**: 1-2 days  
**Priority**: Critical  
**Depends On**: RowCore extraction

**Current Strengths**:
- Already uses Fiddler for bulk I/O
- Cell-level write pattern (critical for version history)
- Formula preservation mechanism

**Improvements Needed**:
- Build column mapping from getGlobals() at construction
- Better integration with RowCore dirty field tracking
- Transform spreadsheet data to domain objects
- Transform domain objects back to spreadsheet updates
- More efficient batch operations for dirty cells
- Clearer separation between I/O and data transformation

**Target Architecture**:
```javascript
// ScheduleAdapter.js - Enhanced with mapping layer
class ScheduleAdapter {
    constructor() {
        this.fiddler = bmPreFiddler.PreFiddler().getFiddler({
            sheetName: 'Consolidated Rides'
        });
        
        // Build mapping from Globals spreadsheet (spreadsheet → domain)
        const globals = getGlobals();
        this.columnMap = {
            [globals.STARTDATETIMECOLUMNNAME]: 'startDate',
            [globals.RIDENAMECOLUMNNAME]: 'rideName',
            [globals.RIDEURLCOLUMNNAME]: 'rideURL',
            [globals.ROUTENAMECOLUMNNAME]: 'routeName',
            [globals.ROUTEURLCOLUMNNAME]: 'routeURL',
            [globals.GROUPCOLUMNNAME]: 'group',
            [globals.LEADERSCOLUMNNAME]: 'leaders',
            // ... all column mappings
        };
        
        // Reverse map (domain → spreadsheet)
        this.domainToColumn = Object.fromEntries(
            Object.entries(this.columnMap).map(([col, prop]) => [prop, col])
        );
    }
    
    load() {
        // Fiddler bulk load
        const spreadsheetData = this.fiddler.getData();
        
        // Overlay formulas
        this._overlayFormulas(spreadsheetData);
        
        // Transform to domain objects
        return spreadsheetData.map(rowData => {
            const domainData = {};
            for (const [columnName, domainProp] of Object.entries(this.columnMap)) {
                domainData[domainProp] = rowData[columnName];
            }
            domainData.rowNum = rowData._rowNum;
            return new RowCore(domainData);
        });
    }
    
    saveDirtyFields(rowCore) {
        const dirtyFields = rowCore.getDirtyFields();
        
        dirtyFields.forEach(domainProp => {
            const columnName = this.domainToColumn[domainProp];
            const value = rowCore[domainProp];
            
            // Cell-level write (preserves version history)
            this._writeCell(rowCore.rowNum, columnName, value);
        });
        
        SpreadsheetApp.flush();
        this._storeFormulas();
    }
}
```

**Testing Strategy**:
- Test dirty field tracking across save cycles
- Test formula preservation
- Test spreadsheet → domain transformation
- Test domain → spreadsheet transformation
- Test batch write operations
- Test cell-level precision (version history verification)

**Success Criteria**:
- ✅ Builds columnMap from getGlobals() at construction
- ✅ Transforms spreadsheet data to domain objects correctly
- ✅ Transforms domain dirty fields to spreadsheet updates
- ✅ Preserves cell-level write pattern
- ✅ Efficient batch operations
- ✅ Clean integration with RowCore
- ✅ Formula preservation works correctly

---

### Phase 2: UI/Validation Layer Simplification

**GitHub Issue**: [#176 - Simplify UI/Validation Layer](https://github.com/TobyHFerguson/RideManager/issues/176)

**Overview**: Eliminate over-engineered indirection layers (Commands → UIManager → rowCheck) and replace with cleaner, testable architecture (ValidationCore + RideCoordinator + UIHelper).

**Current Problems**:
1. **Commands.js adds no value** - frozen objects that just delegate to UIManager
2. **UIManager.processRows** has too many responsibilities (validation + UI + orchestration)
3. **rowCheck** mixes pure validation logic with GAS route fetching
4. **Deep call stack** (4 layers) makes debugging difficult
5. **Hard to test** - everything tangled together
6. **Duplicate code** in UIManager special cases

**Before (4 layers)**:
```
MenuFunctions → Commands → UIManager → rowCheck → RideManager
```

**After (2 layers)**:
```
MenuFunctions → RideCoordinator → Core logic
                     ↓
        ValidationCore + UIHelper
```

#### 2.1 Create ValidationCore + UIHelper
**Effort**: 2-3 days  
**Priority**: High  
**Depends On**: Phase 1 complete (RowCore, RideManagerCore exist)

**Goal**: Extract all validation logic into pure JavaScript, create simple UI utilities.

**ValidationCore.js** - Pure validation logic (100% tested):
```javascript
class ValidationCore {
    /**
     * Validate rows for scheduling operation
     * @param {RowCore[]} rows - Rows to validate
     * @returns {Map<RowCore, {errors: string[], warnings: string[]}>}
     */
    static validateForScheduling(rows) {
        const validationMap = new Map();
        
        rows.forEach(row => {
            const errors = [];
            const warnings = [];
            
            // Error rules (blocking)
            if (this.isUnmanagedRide(row)) {
                errors.push('Unmanaged ride (no Route URL)');
            }
            if (this.isScheduled(row)) {
                errors.push('Already scheduled');
            }
            if (!row.startDate) {
                errors.push('No start date');
            }
            if (!row.group) {
                errors.push('No group');
            }
            if (this.isBadRoute(row)) {
                errors.push('Bad route (missing required fields)');
            }
            
            // Warning rules (non-blocking)
            if (!row.leaders || row.leaders.length === 0) {
                warnings.push('No ride leader specified');
            }
            if (!row.location) {
                warnings.push('No location specified');
            }
            
            validationMap.set(row, { errors, warnings });
        });
        
        return validationMap;
    }
    
    static validateForCancellation(rows) { /* ... */ }
    static validateForUpdate(rows) { /* ... */ }
    
    /**
     * Check if route metrics are inappropriate for group
     * @param {string} groupName - Group name
     * @param {number} elevationFeet - Elevation in feet
     * @param {number} distanceMiles - Distance in miles
     * @returns {string|undefined} Error message or undefined
     */
    static inappropriateGroup(groupName, elevationFeet, distanceMiles) {
        const specs = Groups[groupName];
        if (!specs) return `Unknown group: ${groupName}`;
        
        if (distanceMiles < specs.MIN_LENGTH) {
            return `Group ${groupName} rides must be at least ${specs.MIN_LENGTH} miles`;
        }
        if (elevationFeet < specs.MIN_ELEVATION) {
            return `Group ${groupName} rides must have at least ${specs.MIN_ELEVATION} feet of climbing`;
        }
        
        return undefined;
    }
    
    // Pure helper methods
    static isScheduled(row) { return !!row.rideURL; }
    static isCancelled(row) { return row.status === 'cancelled'; }
    static isUnmanagedRide(row) { return !row.routeURL; }
    static isBadRoute(row) { /* validation logic */ }
}
```

**UIHelper.js** - Simple GAS UI utilities:
```javascript
class UIHelper {
    /**
     * Confirm operation with user
     * @param {Object} options
     * @returns {{confirmed: boolean, processableRows: RowCore[]}}
     */
    static confirmOperation({ operationName, rows, validation, force }) {
        if (force) {
            const processableRows = rows.filter(r => validation.get(r).errors.length === 0);
            return { confirmed: true, processableRows };
        }
        
        const message = this.buildValidationMessage(operationName, rows, validation);
        const processableRows = rows.filter(r => validation.get(r).errors.length === 0);
        
        if (processableRows.length === 0) {
            SpreadsheetApp.getUi().alert(
                'No Processable Rides',
                message + '\n\nAll selected rides have errors.',
                SpreadsheetApp.getUi().ButtonSet.OK
            );
            return { confirmed: false, processableRows: [] };
        }
        
        const ui = SpreadsheetApp.getUi();
        const result = ui.alert(
            operationName,
            message + `\n\nProcess ${processableRows.length} ride(s)?`,
            ui.ButtonSet.YES_NO
        );
        
        return {
            confirmed: result === ui.Button.YES,
            processableRows
        };
    }
    
    static buildValidationMessage(operationName, rows, validation) {
        // Format errors, warnings, clean rows into readable message
    }
    
    static showSuccess(message) { /* ... */ }
    static showError(title, error) { /* ... */ }
}
```

**Testing Strategy**:
```javascript
describe('ValidationCore', () => {
    describe('validateForScheduling', () => {
        it('should detect missing start date', () => {
            const row = new RowCore({ startDate: null, group: 'A' });
            const validation = ValidationCore.validateForScheduling([row]);
            expect(validation.get(row).errors).toContain('No start date');
        });
        
        it('should detect already scheduled rides', () => {
            const row = new RowCore({ 
                startDate: new Date(), 
                rideURL: 'https://ridewithgps.com/events/123' 
            });
            const validation = ValidationCore.validateForScheduling([row]);
            expect(validation.get(row).errors).toContain('Already scheduled');
        });
    });
    
    describe('inappropriateGroup', () => {
        it('should validate minimum distance', () => {
            const error = ValidationCore.inappropriateGroup('A', 1000, 5);
            expect(error).toContain('must be at least');
        });
        
        it('should return undefined for valid metrics', () => {
            const error = ValidationCore.inappropriateGroup('A', 2000, 50);
            expect(error).toBeUndefined();
        });
    });
});
```

**Success Criteria**:
- ✅ ValidationCore.js created with all validation rules
- ✅ ValidationCore.test.js achieves 100% coverage
- ✅ UIHelper.js created with dialog utilities
- ✅ All validation methods return Map<RowCore, {errors[], warnings[]}>
- ✅ Types defined in .d.ts files

#### 2.2 Create RideCoordinator
**Effort**: 2-3 days  
**Priority**: High  
**Depends On**: ValidationCore, UIHelper exist

**Goal**: Orchestration layer following validate → confirm → execute pattern.

**RideCoordinator.js**:
```javascript
class RideCoordinator {
    /**
     * Orchestrate scheduling operation
     * @param {RowCore[]} rows - Rows to schedule
     * @param {RWGPS} rwgps - RWGPS service
     * @param {ScheduleAdapter} adapter - Persistence adapter
     */
    static scheduleRides(rows, rwgps, adapter) {
        // 1. Validate using pure logic
        const validation = ValidationCore.validateForScheduling(rows);
        
        // 2. Show UI and get confirmation
        const confirmation = UIHelper.confirmOperation({
            operationName: 'Schedule Rides',
            rows,
            validation,
            force: false
        });
        
        if (!confirmation.confirmed) {
            return;
        }
        
        // 3. Execute business logic
        try {
            const processableRows = confirmation.processableRows;
            
            // Use RideManagerCore for business logic
            processableRows.forEach(row => {
                const eventConfig = RideManagerCore.prepareScheduling(row, rwgps);
                rwgps.createEvent(eventConfig.rideURL, eventConfig);
                row.rideURL = eventConfig.rideURL;
                row.markDirty('rideURL');
            });
            
            // Save changes
            adapter.save(processableRows);
            
            // Log success
            UserLogger.log('scheduleRides', 'Success', {
                rowCount: processableRows.length,
                rows: processableRows.map(r => r.rowNum)
            });
            
            UIHelper.showSuccess(`Scheduled ${processableRows.length} rides successfully.`);
            
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            UserLogger.log('scheduleRides_ERROR', err.message, { stack: err.stack });
            UIHelper.showError('Scheduling failed', err);
            throw err;
        }
    }
    
    static cancelRides(rows, rwgps, adapter) { /* validate → confirm → execute */ }
    static updateRides(rows, rwgps, adapter) { /* validate → confirm → execute */ }
    static reinstateRides(rows, rwgps, adapter) { /* validate → confirm → execute */ }
}
```

**MenuFunctions.js** - Simplified:
```javascript
function scheduleSelectedRides() {
    const adapter = new ScheduleAdapter();
    const rows = adapter.loadSelected();
    const rwgps = getRWGPS();
    
    RideCoordinator.scheduleRides(rows, rwgps, adapter);
}

function cancelSelectedRides() {
    const adapter = new ScheduleAdapter();
    const rows = adapter.loadSelected();
    const rwgps = getRWGPS();
    
    RideCoordinator.cancelRides(rows, rwgps, adapter);
}
```

**Success Criteria**:
- ✅ RideCoordinator.js created with all operation methods
- ✅ All operations follow validate → confirm → execute pattern
- ✅ MenuFunctions.js updated to call RideCoordinator directly
- ✅ Commands.js deleted
- ✅ UIManager.js deleted
- ✅ rowCheck.js deleted
- ✅ Types defined in .d.ts files
- ✅ Zero regressions in production

#### Benefits of Phase 2 Refactoring
1. **Clearer flow**: 2 layers instead of 4
2. **100% testable validation**: All rules verified in Jest
3. **Simpler codebase**: Fewer files, less indirection
4. **Obvious responsibilities**: Each class has one clear purpose
5. **Easier to modify**: Add validation rules with tests
6. **Better error handling**: Centralized in RideCoordinator
7. **Consistent pattern**: All operations use same structure

---

### Phase 2.5: ProcessingManager & UserLogger Modernization

**GitHub Issue**: [#177 - Modernize ProcessingManager & UserLogger](https://github.com/TobyHFerguson/RideManager/issues/177)

**Status**: ✅ **COMPLETED**

**Overview**: Extract pure business logic from UserLogger into Core module with 100% test coverage. ProcessingManager was found to be dead code (no references) and was removed entirely.

**What Was Done**:
- **ProcessingManager**: Removed entirely (dead code - not referenced anywhere in codebase)
  - Deleted `src/ProcessingManager.js` and `src/ProcessingManager.d.ts`
  - No replacement needed as it was unused
- **UserLogger**: Extracted formatting logic to Core module
  - Created `UserLoggerCore.js` with pure formatting functions (100% tested)
  - Removed Drive file duplication (Sheet-only logging now)
  - Simplified UserLogger to thin GAS adapter

**Actual Architecture**:
- **UserLoggerCore.js**: Pure formatting logic (100% tested)
  - `formatLogEntry()` - Format log entry with all fields
  - `toSpreadsheetRow()` - Convert to spreadsheet array
  - `getHeaderRow()` - Get column headers
- **UserLogger.js**: Simplified (Sheet only, uses UserLoggerCore)
  - No Drive file duplication
  - Uses UserLoggerCore for all formatting

**Benefits Achieved**:
1. ✅ **100% test coverage** for log formatting logic (15 tests)
2. ✅ **Single persistence mechanism** in UserLogger (Sheet only)
3. ✅ **No duplicate code** (formatting logic extracted once)
4. ✅ **Removed dead code** (ProcessingManager)
5. ✅ **Testable formatting** (can verify all edge cases)

**Effort**: 1 day (less than estimated due to ProcessingManager being unused)  
**Dependencies**: Completed after Phase 2

See [Issue #177](https://github.com/TobyHFerguson/RideManager/issues/177) for detailed implementation plan.

---

### Phase 3: Optional Enhancements

#### 3.1 Extract RowCheckCore from rowCheck.js (DEPRECATED - See Phase 2)
**Note**: This item is superseded by Phase 2. The rowCheck.js file will be deleted entirely as part of the ValidationCore extraction.

#### 3.2 Internalize RWGPS Library (Optional)
**Effort**: 2-3 days  
**Priority**: High  
**Depends On**: RideManagerCore (for shared validation utilities)

**Current Problems**:
- Pure validation logic mixed with UrlFetchApp calls
- `inappropriateGroup()` function has GAS dependencies
- Cannot test validation rules without GAS

**Lines Requiring Refactoring**:
- Lines 145-168: `inappropriateGroup()` - validation logic mixed with route fetching

**Target Architecture**:
```javascript
// RowCheckCore.js - Pure validation logic
class RowCheckCore {
    /**
     * Check if group is inappropriate for route metrics
     * @param {string} groupName - Group name
     * @param {number} elevationFeet - Elevation gain in feet
     * @param {number} distanceMiles - Distance in miles
     * @returns {string|undefined} Error message or undefined
     */
    static inappropriateGroup(groupName, elevationFeet, distanceMiles) {
        if (!groupName) {
            return "No group specified";
        }
        
        const specs = Groups[groupName];
        if (!specs) {
            return `Unknown group: ${groupName}`;
        }
        
        if (distanceMiles < specs.MIN_LENGTH) {
            return `Group ${groupName} rides must be at least ${specs.MIN_LENGTH} miles`;
        }
        
        if (elevationFeet < specs.MIN_ELEVATION) {
            return `Group ${groupName} rides must have at least ${specs.MIN_ELEVATION} feet of climbing`;
        }
        
        // Additional validation rules...
        
        return undefined; // No error
    }
    
    /**
     * Validate ride date is in acceptable range
     * @param {Date} rideDate - Ride start date
     * @param {Date} currentDate - Current date for comparison
     * @returns {string|undefined} Error message or undefined
     */
    static validateRideDate(rideDate, currentDate) {
        if (!rideDate) {
            return "Ride date is required";
        }
        
        const daysDiff = (rideDate - currentDate) / (1000 * 60 * 60 * 24);
        
        if (daysDiff < 0) {
            return "Cannot schedule rides in the past";
        }
        
        if (daysDiff > 365) {
            return "Cannot schedule rides more than 1 year in advance";
        }
        
        return undefined;
    }
    
    // Other pure validation functions...
}

// rowCheck.js - GAS adapter
const rowCheck = {
    inappropriateGroup: function (row) {
        if (!row.RouteURL) return;
        
        // GAS operation: fetch route data
        const route = getRoute(row.RouteURL); // Already cached
        
        // Convert units
        const distanceMiles = Math.round(
            route.distance * getGlobals().METERS_TO_MILES
        );
        const elevationFeet = Math.round(
            route.elevation_gain * getGlobals().METERS_TO_FEET
        );
        
        // Use core for validation
        return RowCheckCore.inappropriateGroup(
            row.Group,
            elevationFeet,
            distanceMiles
        );
    },
    
    validateRideDate: function (row) {
        return RowCheckCore.validateRideDate(
            row.StartDate,
            new Date()
        );
    },
    
    // Other validation functions delegate to core...
};
```

**Testing Strategy**:
- Test all validation rules with edge cases
- Test group specifications compliance
- Test date validation boundary conditions
- Test error message formatting
- 100% coverage for RowCheckCore

**Success Criteria**:
- ✅ RowCheckCore has 100% test coverage
- ✅ All validation logic testable without GAS
- ✅ rowCheck.js only fetches data from GAS services
- ✅ Easy to add new validation rules with tests

---

### Phase 3: Optional Enhancements

#### 3.1 Internalize RWGPS Library (Optional)
**Effort**: 4-7 days  
**Priority**: Optional  
**Depends On**: RideManagerCore, RowCore

**Decision Criteria**:
- ✅ Proceed if you need features RWGPSLib doesn't provide
- ✅ Proceed if you're comfortable maintaining OAuth/API code
- ✅ Proceed if RWGPSLib has caused production issues
- ❌ Skip if external library works fine (less maintenance)

**If Proceeding**:

1. **Copy RWGPSLib code into `src/`** (1 day)
   - Audit all methods used in codebase
   - Add comprehensive type definitions to `Externals.d.ts`

2. **Refactor to Core/Adapter** (2-3 days)
   ```javascript
   // RWGPSCore.js
   class RWGPSCore {
       static prepareEventPayload(event) { 
           // Pure JSON building logic
       }
       
       static parseEventResponse(json) {
           // Pure response parsing
       }
       
       static validateEventData(event) {
           // Pure validation
       }
   }
   
   // RWGPSAdapter.js
   class RWGPSAdapter {
       getEvent(url) {
           const response = UrlFetchApp.fetch(url + '.json');
           return RWGPSCore.parseEventResponse(
               JSON.parse(response.getContentText())
           );
       }
   }
   ```

3. **Write Tests** (1-2 days)
   - Mock HTTP responses
   - Test all payload building
   - Test all response parsing
   - 100% coverage for RWGPSCore

4. **Update RideManager** (1 day)
   - Replace RWGPSLib with RWGPSAdapter
   - Should be straightforward after RideManagerCore exists

**Recommendation**: **Defer this until Phase 1 & 2 are complete**. The external library is likely fine, and your energy is better spent on the critical refactoring work.

---

#### 3.2 Extract UIManagerCore (Optional)
**Effort**: 1-2 days  
**Priority**: Low  

**Current State**: UIManager is mostly acceptable as a thin layer over SpreadsheetApp UI.

**Potential Improvement**:
```javascript
// UIManagerCore.js (optional)
class UIManagerCore {
    /**
     * Build validation message for user display
     * @param {Array} rows - Rows with validation results
     * @returns {{errorMessage: string, warningMessage: string, processableCount: number}}
     */
    static buildValidationMessage(rows) {
        const errors = [];
        const warnings = [];
        let processableCount = 0;
        
        rows.forEach(row => {
            if (row.errors.length > 0) {
                errors.push(`Row ${row.rowNum}: ${row.errors.join(', ')}`);
            } else {
                processableCount++;
                if (row.warnings.length > 0) {
                    warnings.push(`Row ${row.rowNum}: ${row.warnings.join(', ')}`);
                }
            }
        });
        
        return {
            errorMessage: errors.join('\n'),
            warningMessage: warnings.join('\n'),
            processableCount
        };
    }
}
```

**Recommendation**: **Skip unless you find bugs in message formatting**. This is a nice-to-have, not a critical improvement.

---

## Implementation Strategy

### Incremental Approach
Each refactoring should follow this pattern:
1. ✅ Create Core module with pure logic
2. ✅ Write comprehensive tests (100% coverage)
3. ✅ Update Adapter to use Core
4. ✅ Verify zero regression
5. ✅ Deploy to dev environment
6. ✅ Test in production-like scenarios
7. ✅ Deploy to production

### Testing Requirements
- **Core modules**: 100% test coverage in Jest
- **Adapter modules**: Integration tests where feasible
- **End-to-end**: Manual testing in GAS environment

### Deployment Safety
- Deploy each refactoring independently
- Use `npm run dev:push` for testing
- Verify in dev environment before `npm run prod:push`
- Keep rollback plan (git tags for each deployment)

### Pull Request Guidelines
Any PR touching Row/RideManager/rowCheck must include:
- ✅ Refactoring progress toward Core/Adapter separation
- ✅ Tests for extracted Core logic
- ✅ Updated type definitions
- ✅ Documentation updates

### Blocking Rules
- ❌ **Block new features** until Phase 1 complete (RowCore, RideManagerCore exist)
- ❌ **Block RWGPS internalization** until Phase 1 & 2 complete
- ❌ **Never remove Fiddler** - architectural regression

---

## Anti-Patterns to Avoid

### ❌ Don't Mix Business Logic with GAS Calls
```javascript
// BAD - calculation mixed with SpreadsheetApp
function calculateSomething(row) {
    const value = SpreadsheetApp.getActiveSheet().getRange('A1').getValue();
    return value * 2 + row.SomeField;
}
```

### ❌ Don't Hardcode GAS Dependencies
```javascript
// BAD - can't test without GAS
function createItem(operation) {
    return {
        id: Utilities.getUuid(), // Hardcoded GAS
        ...operation
    };
}

// GOOD - dependency injection
function createItem(operation, generateId) {
    return {
        id: generateId(),
        ...operation
    };
}
```

### ❌ Don't Add Logic to Trigger Handlers
```javascript
// BAD - business logic in trigger
function onEdit(e) {
    const value = e.range.getValue();
    if (value.includes('something')) {
        // Complex logic here...
    }
}

// GOOD - delegate to Core
function onEdit(e) {
    const value = e.range.getValue();
    const result = EditHandlerCore.processEdit(value);
    if (result.shouldUpdate) {
        e.range.setValue(result.newValue);
    }
}
```

---

## Success Metrics

### Phase 1 Complete When:
- ✅ RowCore has 100% test coverage
- ✅ RideManagerCore has 100% test coverage
- ✅ ScheduleAdapter uses enhanced dirty tracking
- ✅ All Phase 1 modules deployed to production
- ✅ Zero regressions reported
- ✅ New features can be added with test coverage

### Phase 2 Complete When:
- ✅ ValidationCore has 100% test coverage
- ✅ RideCoordinator orchestrates all operations
- ✅ UIHelper provides simple dialog utilities
- ✅ Commands.js deleted
- ✅ UIManager.js deleted
- ✅ rowCheck.js deleted
- ✅ All operations follow validate → confirm → execute pattern
- ✅ Deployed to production without issues

### Phase 2.5 Complete When:
- ✅ UserLoggerCore has 100% test coverage
- ✅ UserLogger simplified (Sheet only, no Drive file)
- ✅ ProcessingManager.js deleted (was dead code)
- ✅ All tests pass
- ✅ Deployed to production without issues

### Overall Success:
- ✅ >80% of business logic has test coverage
- ✅ GAS-dependent code is thin, focused on I/O
- ✅ New features can be added with confidence
- ✅ Bugs are caught in tests, not production
- ✅ Refactoring is safe with test verification

---

## Current Status (January 3, 2026)

### ✅ **Phases 1, 2, and 2.5: COMPLETED**

**Completed**: December 30, 2025 - January 2, 2026

**Achievements**:
- **Phase 1**: RowCore (100% coverage), RideManagerCore (100% coverage), ScheduleAdapter enhanced
- **Phase 2**: ValidationCore (95% coverage), UIHelper, RideCoordinator - deleted 965 lines of legacy code
- **Phase 2.5**: UserLoggerCore (100% coverage) - deleted 500+ lines of dead code
- **Total**: 366 passing tests across 13 test suites
- **Impact**: 1465+ lines of code removed, all replaced with testable Core modules

**Metrics**:
- Test coverage for Core modules: >95%
- Zero type errors in production
- Zero regressions reported
- All validations passing (typecheck, validate-exports, tests)

See [CHANGELOG.md](../CHANGELOG.md) for detailed release notes.

### 🔄 **Current Sprint: Sprint 1 (Documentation & Type Safety)**

**Timeline**: January 3-10, 2026 (1 week)

**Goals**:
1. ✅ Complete Phase 2 documentation (CHANGELOG, status updates) - **DONE**
2. 🔄 Audit and complete Issue #188 (eliminate remaining {Object}/{Array} types) - **IN PROGRESS**

**Next Steps**:
1. Audit all `@param {Object}` and replace with specific types
2. Audit all `@param {Array}` and replace with typed arrays
3. Review `.d.ts` files for unjustified `any` types
4. Document findings and update copilot-instructions.md

### 📋 **Future Sprints**

**Sprint 2** (Optional - Enhanced RWGPS Integration):
- Consider internalizing RWGPS library for better control
- Decision deferred until Sprint 1 complete

---

## Timeline Estimate

| Phase | Effort | Calendar Time | Status |
|-------|--------|---------------|--------|
| Phase 1.1: RowCore | 2-3 days | 1 week | ✅ **COMPLETE** (Dec 30, 2025) |
| Phase 1.2: RideManagerCore | 3-4 days | 1.5 weeks | ✅ **COMPLETE** (Jan 1, 2026) |
| Phase 1.3: ScheduleAdapter | 1-2 days | 3-4 days | ✅ **COMPLETE** (Jan 1, 2026) |
| **Phase 1 Total** | **6-9 days** | **3 weeks** | ✅ **COMPLETE** |
| Phase 2.1: ValidationCore + UIHelper | 2-3 days | 1 week | ✅ **COMPLETE** (Jan 2, 2026) |
| Phase 2.2: RideCoordinator | 2-3 days | 1 week | ✅ **COMPLETE** (Jan 2, 2026) |
| **Phase 2 Total** | **4-6 days** | **2 weeks** | ✅ **COMPLETE** |
| Phase 2.5: UserLoggerCore | 1 day | 2-3 days | ✅ **COMPLETE** (Jan 2, 2026) |
| **Phase 2.5 Total** | **1 day** | **2-3 days** | ✅ **COMPLETE** |
| **Sprint 1: Documentation & Types** | **5 days** | **1 week** | 🔄 **IN PROGRESS** |
| Phase 3 (optional RWGPS) | 5-9 days | 2-3 weeks | ⏸️ **DEFERRED** |

**Actual Timeline**: Phase 1, 2, 2.5 completed in 4 days (Dec 30 - Jan 2) vs estimated 6-7 weeks

---

## Decision: Keep Fiddler, Internalize RWGPS Later

### Fiddler: KEEP (Architectural Asset)
**Rationale**:
- ✅ Provides bulk data operations (critical for performance)
- ✅ Column name keys improve code readability
- ✅ Formula preservation handled by library
- ✅ Separation of concerns between I/O and business logic
- ✅ Removing it would be an architectural regression

**Action**: Enhance ScheduleAdapter to better leverage Fiddler patterns

### RWGPS Library: DECIDE LATER
**Rationale**:
- External library currently works fine
- Internalization adds maintenance burden
- Better to complete Core/Adapter refactoring first
- Can make informed decision after Phase 1 complete

**Action**: Defer RWGPS internalization decision until Phase 1 & 2 complete

---

## Questions & Answers

### Q: Can we do multiple phases simultaneously?
**A**: No. Each phase builds on the previous. RowCore is needed before enhancing ScheduleAdapter. RideManagerCore is needed before internalizing RWGPS.

### Q: What if we need to add a feature during refactoring?
**A**: Small bug fixes are OK. New features should wait until at least Phase 1 complete, OR include extracting the relevant Core logic as part of the feature PR.

### Q: How do we handle emergencies during refactoring?
**A**: Each phase deploys independently. Production always has a working version. Hotfixes can be applied directly to production, then merged back to refactoring branch.

### Q: Should we refactor everything at once?
**A**: No. Incremental refactoring with continuous deployment is safer. Each Core module is a deployable unit.

---

## References

- [Copilot Instructions](.github/copilot-instructions.md) - Full architectural guidelines
- [Development Workflow](Development-workflow.md) - Testing and deployment procedures
- [Announcement System](Announcement-OperatorManual.md) - Example of Core/Adapter pattern

---

**Last Updated**: January 3, 2026  
**Status**: Sprint 1 (Documentation & Type Safety) - In Progress  
**Phases Complete**: Phase 1 ✅, Phase 2 ✅, Phase 2.5 ✅  
**Next Review**: After Sprint 1 complete (January 10, 2026)
