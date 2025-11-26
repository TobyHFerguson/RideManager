/**
 * EXAMPLE: How to use the new ScheduleAdapter + Row architecture
 * 
 * This demonstrates the new pattern that separates GAS from pure JavaScript
 */

// =============================================================================
// EXAMPLE 1: Loading and processing selected rows
// =============================================================================

function processSelectedRides() {
    // Create adapter (handles all GAS operations)
    const adapter = new ScheduleAdapter();
    
    // Load selected rows - returns Row instances
    const rows = adapter.loadSelected();
    
    // Work with Row objects using same interface as before
    rows.forEach(row => {
        // Getters work the same
        console.log(`Processing ride: ${row.RideName}`);
        console.log(`Start: ${row.StartDate}`);
        console.log(`Leaders: ${row.RideLeaders.join(', ')}`);
        
        // Setters automatically mark row as dirty
        if (!row.GoogleEventId) {
            row.GoogleEventId = createCalendarEvent(row);
        }
        
        // Methods work the same
        if (row.isPlanned()) {
            row.setRideLink('Updated Name', row.RideURL);
        }
    });
    
    // Save all dirty rows in one batch operation
    adapter.save();
}

// =============================================================================
// EXAMPLE 2: Loading younger rows (like the current getYoungerRows)
// =============================================================================

function processUpcomingRides() {
    const adapter = new ScheduleAdapter();
    
    // Load rows after yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const upcomingRows = adapter.loadYoungerRows(yesterday);
    
    // Process rows
    upcomingRows.forEach(row => {
        if (row.isPlanned() && !row.isScheduled()) {
            // Create ride on RWGPS
            const rideId = createRWGPSRide(row);
            row.setRideLink(row.RouteName, `https://ridewithgps.com/rides/${rideId}`);
        }
    });
    
    // Save changes
    adapter.save();
}

// =============================================================================
// EXAMPLE 3: Working with a single row
// =============================================================================

function updateLastRow() {
    const adapter = new ScheduleAdapter();
    
    // Load just the last row
    const lastRow = adapter.loadLastRow();
    
    if (lastRow && lastRow.isPlanned()) {
        lastRow.linkRouteURL(); // Resolves route name from URL
        adapter.save();
    }
}

// =============================================================================
// EXAMPLE 4: Highlighting and other spreadsheet operations
// =============================================================================

function highlightMissingRideLeaders() {
    const adapter = new ScheduleAdapter();
    const rows = adapter.loadAll();
    
    rows.forEach(row => {
        if (row.isPlanned() && row.RideLeaders.length === 0) {
            // Highlighting is handled by adapter (GAS operation)
            row.highlightRideLeader(true);
        }
    });
    
    // No need to save for highlighting - it's immediate
}

// =============================================================================
// ARCHITECTURE BENEFITS
// =============================================================================

/**
 * 1. SAME INTERFACE: Row objects work exactly the same as before
 *    - row.RideName, row.StartDate, etc.
 *    - row.setRideLink(), row.isPlanned(), etc.
 * 
 * 2. AUTOMATIC DIRTY TRACKING: No manual saveRow() calls
 *    - Row setters automatically mark row as dirty
 *    - One adapter.save() at the end writes all changes
 * 
 * 3. PURE JAVASCRIPT ROW: Can be tested without GAS
 *    - Row is just a class that maps data
 *    - No SpreadsheetApp, Range, or other GAS APIs
 *    - Can mock in Jest tests
 * 
 * 4. GAS ISOLATED: All GAS code in ScheduleAdapter
 *    - SpreadsheetApp operations
 *    - Fiddler/bmPreFiddler calls
 *    - PropertiesService for formulas
 *    - Selection handling
 * 
 * 5. BATCH OPERATIONS: Efficient I/O
 *    - Load: One Fiddler.getData() call
 *    - Save: One Fiddler.setData() call
 *    - Better performance than row-by-row
 */
