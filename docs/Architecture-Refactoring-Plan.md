# Architecture Refactoring Plan

## Overview

This document outlines the refactoring plan to bring legacy modules into compliance with the Core/Adapter architectural pattern established in the codebase. The goal is to maximize testable code (pure JavaScript with 100% test coverage) and minimize GAS execution (thin adapter layers).

## Current State Assessment

### ✅ Exemplary Modules (Following Best Practices)
- **AnnouncementCore + AnnouncementManager**: Perfect separation of pure logic and GAS adapter
- **TriggerManagerCore + TriggerManager**: Model implementation of Core/Adapter pattern
- **RWGPSMembersCore + RWGPSMembersAdapter**: Clean data transformation with Fiddler integration
- **RouteColumnEditor**: Pure JavaScript with no GAS dependencies
- **HyperlinkUtils**: Framework-agnostic utility functions

### ❌ Legacy Modules Requiring Refactoring
- **Row + ScheduleAdapter**: Tightly coupled to SpreadsheetApp, mixed concerns
- **RideManager**: Business logic mixed with GAS API calls
- **rowCheck**: Validation logic mixed with UrlFetchApp calls
- **UIManager**: Minor coupling issues (lower priority)

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

**Adapter Modules (Thin GAS Wrappers)**:
- SpreadsheetApp operations (read/write cells, get ranges)
- GmailApp operations (send email)
- CalendarApp operations (create/update events)
- UrlFetchApp operations (HTTP requests)
- PropertiesService operations (persistence)
- DriveApp operations (file access)
- UI operations (dialogs, alerts)
- ScriptApp operations (triggers)

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
// RowCore.js - Pure domain model
class RowCore {
    constructor(data) {
        this._data = data; // Plain object with column names as keys
    }
    
    // Pure getters/setters
    get RideName() { return this._data['Ride Name']; }
    set RideName(value) { 
        this._data['Ride Name'] = value;
        this._dirtyFields.add('Ride Name');
    }
    
    // Pure validation logic
    isScheduled() { return !!this._data['Ride URL']; }
    isPastDue(currentDate) { 
        return this._data['Start Date'] < currentDate;
    }
    
    // Pure data transformation
    toPlainObject() { return { ...this._data }; }
}

// Row.js - Thin adapter (keeps cell-level write pattern)
class Row {
    constructor(rowCore, adapter) {
        this._core = rowCore;
        this._adapter = adapter;
    }
    
    // Delegate to core
    get RideName() { return this._core.RideName; }
    set RideName(value) { this._core.RideName = value; }
    
    // GAS operations only
    save() {
        const dirtyFields = this._core.getDirtyFields();
        this._adapter.saveDirtyFields(this._core.toPlainObject(), dirtyFields);
    }
}
```

**Testing Strategy**:
- Test all Row business logic in Jest (100% coverage)
- Test domain model behavior without GAS
- Test validation rules with various inputs
- Keep GAS integration tests separate

**Success Criteria**:
- ✅ RowCore has 100% test coverage
- ✅ All business logic moved to RowCore
- ✅ Row.js is thin adapter only
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
- Better integration with RowCore dirty field tracking
- More efficient batch operations
- Clearer separation between I/O and data manipulation

**Target Architecture**:
```javascript
// ScheduleAdapter.js - Enhanced
class ScheduleAdapter {
    load() {
        // Fiddler bulk load
        const data = this.fiddler.getData();
        
        // Overlay formulas
        this._overlayFormulas(data);
        
        // Convert to RowCore instances
        return data.map(rowData => new RowCore(rowData));
    }
    
    save(rowCores) {
        // Collect all dirty cells
        const dirtyCells = [];
        
        rowCores.forEach((rowCore, index) => {
            const dirtyFields = rowCore.getDirtyFields();
            dirtyFields.forEach(field => {
                dirtyCells.push({
                    row: index + 2, // Account for header row
                    column: this._getColumnIndex(field),
                    value: rowCore.get(field)
                });
            });
        });
        
        // Batch write only dirty cells
        this._writeCells(dirtyCells);
        
        // Store formulas for next load
        this._storeFormulas();
    }
    
    _writeCells(cells) {
        cells.forEach(cell => {
            const range = this.sheet.getRange(cell.row, cell.column);
            if (cell.value.startsWith('=')) {
                range.setFormula(cell.value);
            } else {
                range.setValue(cell.value);
            }
        });
        SpreadsheetApp.flush();
    }
}
```

**Testing Strategy**:
- Test dirty field tracking across save cycles
- Test formula preservation
- Test batch write operations
- Test cell-level precision (version history verification)

**Success Criteria**:
- ✅ Preserves cell-level write pattern
- ✅ Efficient batch operations
- ✅ Clean integration with RowCore
- ✅ Formula preservation works correctly

---

### Phase 2: High Priority

#### 2.1 Extract RowCheckCore from rowCheck.js
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
- ✅ RowCheckCore has 100% test coverage
- ✅ All validation rules testable without GAS
- ✅ Deployed to production without issues

### Overall Success:
- ✅ >80% of business logic has test coverage
- ✅ GAS-dependent code is thin, focused on I/O
- ✅ New features can be added with confidence
- ✅ Bugs are caught in tests, not production
- ✅ Refactoring is safe with test verification

---

## Timeline Estimate

| Phase | Effort | Calendar Time |
|-------|--------|---------------|
| Phase 1.1: RowCore | 2-3 days | 1 week |
| Phase 1.2: RideManagerCore | 3-4 days | 1.5 weeks |
| Phase 1.3: ScheduleAdapter | 1-2 days | 3-4 days |
| **Phase 1 Total** | **6-9 days** | **3 weeks** |
| Phase 2.1: RowCheckCore | 2-3 days | 1 week |
| **Phase 2 Total** | **2-3 days** | **1 week** |
| Phase 3 (optional) | 5-9 days | 2-3 weeks |

**Total Critical Path**: 3-4 weeks for Phase 1 & 2

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

**Last Updated**: January 1, 2026  
**Status**: Planning - Phase 1 not started  
**Next Review**: After Phase 1.1 complete
