// @ts-check
/// <reference path="./gas-globals.d.ts" />

/**
 * ScheduleAdapter - Anti-corruption layer between spreadsheet and domain model
 * 
 * This adapter implements the Hexagonal/Ports & Adapters architecture pattern:
 * - Separates GAS dependencies (SpreadsheetApp, bmPreFiddler) from pure domain logic
 * - Maps between spreadsheet structure (column names from Globals) and RowCore domain model
 * - Handles all spreadsheet I/O using Load → Work → Save pattern
 * 
 * KEY RESPONSIBILITIES:
 * ====================
 * 1. **Column Mapping**: Builds columnMap from getGlobals() to map spreadsheet columns
 *    to RowCore domain properties (e.g., "Ride Name" column → rideName property)
 * 
 * 2. **Data Transformation**: Converts between spreadsheet representation and domain objects
 *    - Load: Spreadsheet data (column names) → RowCore instances (camelCase properties)
 *    - Save: RowCore dirty fields (camelCase) → Spreadsheet columns (Globals names)
 * 
 * 3. **Formula Preservation**: Route and Ride columns use HYPERLINK formulas which are
 *    overlaid during load so domain code sees formula strings, not displayed values
 * 
 * 4. **Automatic Dirty Tracking**: Tracks which RowCore instances have been modified via
 *    injected onDirty callback. When a RowCore is modified (via setters like setGoogleEventId()),
 *    it automatically notifies the adapter, which adds it to the dirtyRows Set. This enables:
 *    - Cell-level writes (only modified cells are written to spreadsheet)
 *    - Preserves meaningful version history in spreadsheet (shows exactly what changed)
 *    - No manual tracking required (adapter is notified automatically when row becomes dirty)
 * 
 * ARCHITECTURE PATTERN: Load → Work → Save
 * =========================================
 * All operations MUST follow this pattern:
 * 
 * 1. LOAD: Create adapter and load RowCore instances
 *    ```javascript
 *    const adapter = new ScheduleAdapter();
 *    const rows = adapter.loadAll();  // Returns RowCore[] with camelCase properties
 *    ```
 * 
 * 2. WORK: Modify RowCore domain objects in memory
 *    ```javascript
 *    rows.forEach(row => {
 *        row.setGoogleEventId(eventId);  // Marks 'googleEventId' field dirty
 *        row.clearAnnouncement();         // Marks announcement fields dirty
 *        // NO need to call adapter.markRowDirty(row) - it's automatic!
 *    });
 *    ```
 *    
 *    **Note**: RowCore automatically notifies the adapter when it becomes dirty via
 *    an injected callback. You don't need to manually track dirty rows.
 * 
 * 3. SAVE: Persist dirty rows in a single batch
 *    ```javascript
 *    adapter.save();  // Maps domain properties back to spreadsheet columns
 *                     // Writes only dirty cells (preserves version history)
 *    ```
 * 
 * COLUMN MAPPING:
 * ===============
 * Spreadsheet Column (from Globals) → Domain Property (RowCore)
 * - "Start Date/Time"    → startDate
 * - "Duration"           → duration
 * - "Group"              → group
 * - "Route"              → routeCell  (HYPERLINK formula)
 * - "Ride"               → rideCell   (HYPERLINK formula)
 * - "Ride Leaders"       → rideLeaders
 * - "Google Event ID"    → googleEventId
 * - "Location"           → location
 * - "Address"            → address
 * - "Announcement"       → announcement
 * - "SendAt"             → sendAt
 * - "Status"             → status
 * - "Attempts"           → attempts
 * - "LastError"          → lastError
 * - "LastAttemptAt"      → lastAttemptAt
 * 
 * AUTOMATIC DIRTY TRACKING:
 * =========================
 * The adapter automatically tracks which rows have been modified WITHOUT manual calls:
 * 
 * 1. **onDirty Callback Injection**: When creating a RowCore instance, the adapter injects
 *    an onDirty callback that adds the row to the dirtyRows Set.
 * 
 * 2. **Automatic Notification**: When RowCore methods like setGoogleEventId() are called,
 *    they mark fields dirty via markDirty(). The FIRST time a row becomes dirty (transitions
 *    from 0 to 1+ dirty fields), it calls the onDirty callback, notifying the adapter.
 * 
 * 3. **Single Notification**: The onDirty callback is only called ONCE per row (when it first
 *    becomes dirty), not on every field change. The dirtyRows Set naturally deduplicates.
 * 
 * 4. **Field-Level Tracking**: RowCore tracks WHICH fields are dirty (_dirtyFields Set),
 *    so save() writes only those specific cells, preserving meaningful version history.
 * 
 * Example:
 * ```javascript
 * const adapter = new ScheduleAdapter();
 * const rows = adapter.loadAll();
 * 
 * rows[0].setGoogleEventId('event123');  // → onDirty(rows[0]) called → dirtyRows.add(rows[0])
 * rows[0].setStatus('pending');          // → markDirty() called, but onDirty NOT called again
 * 
 * adapter.save();  // Writes only 'googleEventId' and 'status' cells for rows[0]
 * ```
 * 
 * PERFORMANCE OPTIMIZATION:
 * =========================
 * This pattern minimizes spreadsheet I/O:
 * - Single load per operation (cached)
 * - All business logic works on in-memory RowCore objects
 * - Single batch save writes only modified cells
 * - For N row updates: 1 load + N modifications + 1 save (not N × [load + modify + save])
 */

if (typeof require !== 'undefined') {
    var HyperlinkUtils = require('./HyperlinkUtils.js');
    var RowCore = require('./RowCore.js');
}

const ScheduleAdapter = (function() {
    'use strict';

    class ScheduleAdapter {
        /**
         * Creates a new ScheduleAdapter
         * @param {string} [sheetName='Consolidated Rides'] - Name of the sheet to manage
         */
        constructor(sheetName = 'Consolidated Rides') {
            this.sheetName = sheetName;
            this.sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
            if (!this.sheet) {
                throw new Error(`Sheet "${sheetName}" not found`);
            }
            
            // Initialize Fiddler for data I/O
            this.fiddler = bmPreFiddler.PreFiddler().getFiddler({
                sheetName: sheetName,
                createIfMissing: false
            });
            
            // Get column names from header row
            this.columnNames = this.sheet.getRange(1, 1, 1, this.sheet.getLastColumn()).getValues()[0];
            
            // Build mapping from Globals spreadsheet (spreadsheet column → domain property)
            const globals = getGlobals();
            this.columnMap = {
                [globals.STARTDATETIMECOLUMNNAME]: 'startDate',
                [globals.DURATIONCOLUMNNAME]: 'duration',
                [globals.GROUPCOLUMNNAME]: 'group',
                [globals.ROUTECOLUMNNAME]: 'routeCell',
                [globals.RIDECOLUMNNAME]: 'rideCell',
                [globals.RIDELEADERCOLUMNNAME]: 'rideLeaders',
                [globals.GOOGLEEVENTIDCOLUMNNAME]: 'googleEventId',
                [globals.LOCATIONCOLUMNNAME]: 'location',
                [globals.ADDRESSCOLUMNNAME]: 'address',
                // Announcement columns (no Globals needed - column names have no spaces)
                'Announcement': 'announcement',
                'SendAt': 'sendAt',
                'Status': 'status',
                'Attempts': 'attempts',
                'LastError': 'lastError',
                'LastAttemptAt': 'lastAttemptAt'
            };
            
            // Reverse map (domain property → spreadsheet column)
            this.domainToColumn = Object.fromEntries(
                Object.entries(this.columnMap).map(([col, prop]) => [prop, col])
            );
            
            // Store default duration from Globals for RowCore constructor
            this.defaultDuration = globals.DEFAULTRIDEDURATION;
            
            // Track rows that need saving
            this.dirtyRows = new Set();
            
            // Cache spreadsheet data to avoid multiple reads
            this._cachedData = null;
        }

        /**
         * Load all data from the spreadsheet (with caching)
         * @returns {RowCore[]} Array of RowCore instances
         */
        loadAll() {
            this._ensureDataLoaded();
            return this._cachedData.map((/** @type {any} */ row, /** @type {number} */ index) => this._createRowCore(row, index + 2));
        }

        /**
         * Load selected rows from the spreadsheet (with caching)
         * @returns {RowCore[]} Array of selected RowCore instances
         */
        loadSelected() {
            const selection = this.sheet.getSelection();
            if (!selection) {
                return [];
            }

            const rangeList = selection.getActiveRangeList();
            if (!rangeList) {
                return [];
            }

            this._ensureDataLoaded();
            const ranges = this._convertCellRangesToRowRanges(rangeList);
            const allData = this._cachedData;
            
            /** @type {RowCore[]} */
            const selectedRows = [];
            ranges.forEach((/** @type {GoogleAppsScript.Spreadsheet.Range} */ range) => {
                const startRow = range.getRow();
                const numRows = range.getNumRows();
                
                for (let i = 0; i < numRows; i++) {
                    const rowNum = startRow + i;
                    const dataIndex = rowNum - 2; // -2 for header and 0-based indexing
                    if (dataIndex >= 0 && dataIndex < allData.length) {
                        selectedRows.push(this._createRowCore(allData[dataIndex], rowNum));
                    }
                }
            });
            
            return selectedRows;
        }

        /**
         * Load rows younger than (after) the specified date (with caching)
         * @param {Date} date - The cutoff date
         * @returns {RowCore[]} Array of RowCore instances after the date
         */
        loadYoungerRows(date) {
            this._ensureDataLoaded();
            const allData = this._cachedData;
            const startDateColumn = getGlobals().STARTDATETIMECOLUMNNAME;
            
            return allData
                .map((/** @type {any} */ row, /** @type {number} */ index) => ({ data: row, rowNum: index + 2 }))
                .filter((/** @type {{ data: any, rowNum: number }} */ item) => {
                    const rowDate = new Date(item.data[startDateColumn]);
                    return rowDate > date;
                })
                .map((/** @type {{ data: any, rowNum: number }} */ item) => this._createRowCore(item.data, item.rowNum));
        }

        /**
         * Load the last row in the spreadsheet (with caching)
         * @returns {RowCore|null} The last RowCore instance or null if no data
         */
        loadLastRow() {
            this._ensureDataLoaded();
            const allData = this._cachedData;
            if (allData.length === 0) {
                return null;
            }
            const lastIndex = allData.length - 1;
            return this._createRowCore(allData[lastIndex], lastIndex + 2);
        }

        /**
         * Save dirty rows back to the spreadsheet
         * 
         * Only writes the specific dirty cells to preserve meaningful version history.
         * For each dirty row, only the modified fields are written to the spreadsheet.
         * This ensures version tracking shows exactly what changed, not all rows.
         * 
         * Maps RowCore domain properties back to spreadsheet columns using domainToColumn map.
         * 
         * CRITICAL: Formulas in Route/Ride columns are handled specially:
         * - If a formula column is dirty, we write the formula (not the value)
         */
        save() {
            if (this.dirtyRows.size === 0) {
                return;
            }

            // Write each dirty row's dirty fields
            this.dirtyRows.forEach(row => {
                const dirtyFields = row.getDirtyFields();
                if (dirtyFields.size === 0) {
                    return; // Nothing to write for this row
                }
                
                // Write each dirty field (domain property → spreadsheet column)
                dirtyFields.forEach((/** @type {string} */ domainProp) => {
                    const columnName = this.domainToColumn[domainProp];
                    if (!columnName) {
                        console.warn(`Unknown domain property: ${domainProp}, skipping`);
                        return;
                    }
                    
                    const columnIndex = this._getColumnIndex(columnName) + 1; // 1-based
                    const cell = this.sheet.getRange(row.rowNum, columnIndex);
                    const value = row[domainProp];
                    
                    try {
                        // If it's a formula (starts with '='), set as formula, else as value
                        if (value && typeof value === 'string' && value.startsWith('=')) {
                            cell.setFormula(value);
                        } else {
                            cell.setValue(value);
                        }
                    } catch (error) {
                        const err = error instanceof Error ? error : new Error(String(error));
                        console.error(`ScheduleAdapter: Failed to write ${domainProp} to row ${row.rowNum}, column ${columnName}: ${err.message}`);
                        console.error(`  Value was: ${JSON.stringify(value)}`);
                        console.error(`  This may be due to data validation rules on the spreadsheet column`);
                        // Re-throw so the error is visible to the user
                        throw new Error(`Failed to save ${columnName}: ${err.message}. Check spreadsheet data validation rules.`);
                    }
                });
                
                row.markClean();
            });
            
            // Flush to ensure all writes are committed
            SpreadsheetApp.flush();
            
            // Clear cache to force reload on next operation
            this._cachedData = null;
            this.dirtyRows.clear();
        }

        /**
         * Highlight a cell in the spreadsheet
         * @param {number} rowNum - The row number (1-based)
         * @param {string} columnName - The column name
         * @param {boolean} highlight - True to highlight (red), false to clear
         */
        highlightCell(rowNum, columnName, highlight) {
            const colIndex = this._getColumnIndex(columnName) + 1;
            const cell = this.sheet.getRange(rowNum, colIndex);
            cell.setFontColor(highlight ? "red" : null);
        }

        /**
         * Delete/clear a ride link cell
         * @param {number} rowNum - The row number (1-based)
         */
        deleteRideLink(rowNum) {
            const colIndex = this._getColumnIndex(getGlobals().RIDECOLUMNNAME) + 1;
            this.sheet.getRange(rowNum, colIndex).clear();
        }



        /**
         * Check if a column number matches a column name
         * @param {string} columnName - Column name to check
         * @param {number} columnNum - Column number (1-based)
         * @returns {boolean} True if the column matches
         */
        isColumn(columnName, columnNum) {
            return this._getColumnIndex(columnName) + 1 === columnNum;
        }

        /**
         * Get the sheet name
         * @returns {string} Sheet name
         */
        getSheetName() {
            return this.sheetName;
        }

        /**
         * Get the underlying sheet object
         * @returns {GoogleAppsScript.Spreadsheet.Sheet}
         */
        getSheet() {
            return this.sheet;
        }

        // ===== PRIVATE METHODS =====

        /**
         * Ensure data is loaded and cached
         * Overlays stored formulas onto the data so Route and Ride columns
         * contain formula strings (values starting with '=') instead of displayed values
         * @private
         */
        _ensureDataLoaded() {
            if (!this._cachedData) {
                this._cachedData = this.fiddler.getData();
                this._overlayFormulas();
            }
        }

        /**
         * Overlay stored formulas onto cached data
         * Replaces Route and Ride column values with their formula strings
         * @private
         */
        _overlayFormulas() {
            const rideColumnName = getGlobals().RIDECOLUMNNAME;
            const routeColumnName = getGlobals().ROUTECOLUMNNAME;
            const rideColumnIndex = this._getColumnIndex(rideColumnName) + 1;
            const routeColumnIndex = this._getColumnIndex(routeColumnName) + 1;
            
            // Get all formulas in batch for both columns
            const lastRow = this.sheet.getLastRow();
            if (lastRow < 2) return;
            
            const rideFormulas = this.sheet.getRange(2, rideColumnIndex, lastRow - 1, 1).getFormulas();
            const routeFormulas = this.sheet.getRange(2, routeColumnIndex, lastRow - 1, 1).getFormulas();
            
            // Overlay formulas onto cached data
            this._cachedData.forEach((/** @type {any} */ row, /** @type {number} */ index) => {
                if (rideFormulas[index] && rideFormulas[index][0]) {
                    row[rideColumnName] = rideFormulas[index][0];
                }
                if (routeFormulas[index] && routeFormulas[index][0]) {
                    row[routeColumnName] = routeFormulas[index][0];
                }
            });
        }



        /**
         * Create a RowCore instance from Fiddler data
         * Maps spreadsheet columns to domain properties using columnMap
         * @private
         * @param {Object<string, any>} data - Raw row data from Fiddler (spreadsheet column names as keys)
         * @param {number} rowNum - Spreadsheet row number (1-based)
         * @returns {InstanceType<typeof RowCore>} RowCore instance
         */
        _createRowCore(data, rowNum) {
            // Map spreadsheet data to domain properties
            /** @type {any} */
            const domainData = {};
            
            for (const [columnName, domainProp] of Object.entries(this.columnMap)) {
                domainData[domainProp] = data[columnName];
            }
            
            // Add metadata
            domainData.rowNum = rowNum;
            domainData.defaultDuration = this.defaultDuration;
            
            // Inject dirty callback - RowCore will call this when it becomes dirty
            domainData.onDirty = (/** @type {any} */ row) => {
                this.dirtyRows.add(row);
            };
            
            // @ts-expect-error - RowCore is a constructor but TypeScript sees it as module export
            return new RowCore(domainData);
        }

        /**
         * Get the column index for a column name
         * @private
         * @param {string} name - Column name
         * @returns {number} Zero-based column index
         * @throws {Error} If column name is not found
         */
        _getColumnIndex(name) {
            const ix = this.columnNames.indexOf(name);
            if (ix === -1) {
                throw new Error(`Column name: ${name} is not known`);
            }
            return ix;
        }

        /**
         * Convert cell ranges to full row ranges
         * @private
         * @param {GoogleAppsScript.Spreadsheet.RangeList} cellRangeList
         * @returns {GoogleAppsScript.Spreadsheet.Range[]} Array of row ranges
         */
        _convertCellRangesToRowRanges(cellRangeList) {
            const cellRanges = cellRangeList.getRanges();
            const lastColumn = `C${this.sheet.getMaxColumns()}`;
            const rowRangeExpression = cellRanges.map(r => 
                `R${r.getRow()}C1:R${r.getRow() + r.getNumRows() - 1}${lastColumn}`
            );
            const rowRangeList = this.sheet.getRangeList(rowRangeExpression);
            return rowRangeList.getRanges();
        }



        /**
         * Get a range for a specific column
         * @private
         * @param {string} columnName - Column name
         * @param {number} rowNum - Starting row number (1-based)
         * @param {number} numRows - Number of rows (0 = to end of sheet)
         * @returns {GoogleAppsScript.Spreadsheet.Range}
         */
        _getColumnRange(columnName, rowNum = 2, numRows = 0) {
            numRows = numRows || this.sheet.getLastRow() - 1;
            const columnIndex = this._getColumnIndex(columnName) + 1;
            return this.sheet.getRange(rowNum, columnIndex, numRows);
        }
    }

    return ScheduleAdapter;
})();

if (typeof module !== 'undefined') {
    module.exports = ScheduleAdapter;
}
