// @ts-check

/**
 * ScheduleAdapter - GAS-specific adapter for reading/writing schedule data
 * 
 * This adapter separates GAS dependencies (SpreadsheetApp, bmPreFiddler, PropertiesService)
 * from pure JavaScript business logic. It handles:
 * - Reading spreadsheet data via Fiddler
 * - Converting to/from Row domain objects
 * - Formula preservation (Route and Ride columns)
 * - Selection handling
 * - Spreadsheet-specific operations (highlighting, etc.)
 * - Tracking dirty rows for batch saves
 */

if (typeof require !== 'undefined') {
    var HyperlinkUtils = require('./HyperlinkUtils.js');
    var Row = require('./Row.js');
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
            
            // Track rows that need saving
            this.dirtyRows = new Set();
            
            // Cache spreadsheet data to avoid multiple reads
            this._cachedData = null;
        }

        /**
         * Load all data from the spreadsheet (with caching)
         * @returns {Row[]} Array of Row instances
         */
        loadAll() {
            this._ensureDataLoaded();
            return this._cachedData.map((row, index) => this._createRow(row, index + 2));
        }

        /**
         * Load selected rows from the spreadsheet (with caching)
         * @returns {Row[]} Array of selected Row instances
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
            
            const selectedRows = [];
            ranges.forEach(range => {
                const startRow = range.getRow();
                const numRows = range.getNumRows();
                
                for (let i = 0; i < numRows; i++) {
                    const rowNum = startRow + i;
                    const dataIndex = rowNum - 2; // -2 for header and 0-based indexing
                    if (dataIndex >= 0 && dataIndex < allData.length) {
                        selectedRows.push(this._createRow(allData[dataIndex], rowNum));
                    }
                }
            });
            
            return selectedRows;
        }

        /**
         * Load rows younger than (after) the specified date (with caching)
         * @param {Date} date - The cutoff date
         * @returns {Row[]} Array of Row instances after the date
         */
        loadYoungerRows(date) {
            this._ensureDataLoaded();
            const allData = this._cachedData;
            const startDateColumn = getGlobals().STARTDATETIMECOLUMNNAME;
            
            return allData
                .map((row, index) => ({ data: row, rowNum: index + 2 }))
                .filter(({ data }) => {
                    const rowDate = new Date(data[startDateColumn]);
                    return rowDate > date;
                })
                .map(({ data, rowNum }) => this._createRow(data, rowNum));
        }

        /**
         * Load the last row in the spreadsheet (with caching)
         * @returns {Row|null} The last Row instance or null if no data
         */
        loadLastRow() {
            this._ensureDataLoaded();
            const allData = this._cachedData;
            if (allData.length === 0) {
                return null;
            }
            const lastIndex = allData.length - 1;
            return this._createRow(allData[lastIndex], lastIndex + 2);
        }

        /**
         * Save dirty rows back to the spreadsheet
         * 
         * Only writes the specific dirty cells to preserve meaningful version history.
         * For each dirty row, only the modified fields are written to the spreadsheet.
         * This ensures version tracking shows exactly what changed, not all rows.
         * 
         * CRITICAL: Formulas in Route/Ride columns are handled specially:
         * - If a formula column is dirty, we write the formula (not the value)
         * - After write, formulas are stored in PropertiesService for next load
         */
        save() {
            if (this.dirtyRows.size === 0) {
                return;
            }

            // Write each dirty row's dirty fields
            this.dirtyRows.forEach(row => {
                const dirtyFields = row._getDirtyFields();
                if (dirtyFields.size === 0) {
                    return; // Nothing to write for this row
                }
                
                // Write each dirty field
                dirtyFields.forEach(columnName => {
                    const columnIndex = this._getColumnIndex(columnName) + 1; // 1-based
                    const cell = this.sheet.getRange(row.rowNum, columnIndex);
                    const value = row._data[columnName];
                    
                    // If it's a formula (starts with '='), set as formula, else as value
                    if (value && typeof value === 'string' && value.startsWith('=')) {
                        cell.setFormula(value);
                    } else {
                        cell.setValue(value);
                    }
                });
                
                row._markClean();
            });
            
            // Flush to ensure all writes are committed
            SpreadsheetApp.flush();
            
            // Store formulas for next load (needed for formula overlay)
            this._storeFormulas();
            
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
         * Store all formulas (Route and Ride columns)
         * Called on spreadsheet open to preserve formulas
         */
        storeFormulas() {
            this._storeFormulas();
        }

        /**
         * Store Route column formulas only
         */
        storeRouteFormulas() {
            this._storeRouteFormulas();
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
            const rideFormulas = this._loadFormulas('rideColumnFormulas');
            const routeFormulas = this._loadFormulas('routeColumnFormulas');
            
            const rideColumnName = getGlobals().RIDECOLUMNNAME;
            const routeColumnName = getGlobals().ROUTECOLUMNNAME;
            
            this._cachedData.forEach((row, index) => {
                if (rideFormulas && rideFormulas[index] && rideFormulas[index][0]) {
                    row[rideColumnName] = rideFormulas[index][0];
                }
                if (routeFormulas && routeFormulas[index] && routeFormulas[index][0]) {
                    row[routeColumnName] = routeFormulas[index][0];
                }
            });
        }

        /**
         * Load formulas from document properties
         * @private
         * @param {string} propertyName - Property name ('rideColumnFormulas' or 'routeColumnFormulas')
         * @returns {Array<Array<string>>|null} 2D array of formulas or null if not found
         */
        _loadFormulas(propertyName) {
            const formulasJson = PropertiesService.getDocumentProperties().getProperty(propertyName);
            return formulasJson ? JSON.parse(formulasJson) : null;
        }

        /**
         * Create a Row instance from Fiddler data
         * @private
         * @param {Object} data - Raw row data from Fiddler
         * @param {number} rowNum - Spreadsheet row number (1-based)
         * @returns {Row} Row instance
         */
        _createRow(data, rowNum) {
            const enrichedData = {
                ...data,
                _rowNum: rowNum,
                _range: this.sheet.getRange(rowNum, 1, 1, this.columnNames.length)
            };
            return new Row(enrichedData, this);
        }

        /**
         * Mark a row as dirty (needs saving)
         * Called by Row instances when they're modified
         * @private
         * @param {Row} row - The row to mark as dirty
         */
        _markRowDirty(row) {
            this.dirtyRows.add(row);
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
         * Store Route and Ride column formulas in document properties
         * @private
         */
        _storeFormulas() {
            this._storeRideFormulas();
            this._storeRouteFormulas();
        }

        /**
         * Store Ride column formulas
         * @private
         */
        _storeRideFormulas() {
            const rideFormulas = this._getColumnRange(
                getGlobals().RIDECOLUMNNAME, 
                2, 
                this.sheet.getLastRow() - 1
            ).getFormulas();
            PropertiesService.getDocumentProperties()
                .setProperty('rideColumnFormulas', JSON.stringify(rideFormulas));
        }

        /**
         * Store Route column formulas
         * @private
         */
        _storeRouteFormulas() {
            const routeFormulas = this._getColumnRange(
                getGlobals().ROUTECOLUMNNAME, 
                2, 
                this.sheet.getLastRow() - 1
            ).getFormulas();
            PropertiesService.getDocumentProperties()
                .setProperty('routeColumnFormulas', JSON.stringify(routeFormulas));
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

        /**
         * Restore a formula for a specific row and column
         * @param {number} rowNum - Spreadsheet row number (1-based)
         * @param {string} columnName - Either 'Ride' or 'Route'
         */
        restoreFormula(rowNum, columnName) {
            const indexNum = rowNum - 2; // Convert to 0-based formula array index
            const propertyName = columnName === 'Ride' ? 'rideColumnFormulas' : 'routeColumnFormulas';
            const formulas = JSON.parse(
                PropertiesService.getDocumentProperties().getProperty(propertyName)
            );
            
            if (formulas && formulas[indexNum]) {
                const formula = formulas[indexNum];
                const globalName = columnName === 'Ride' 
                    ? getGlobals().RIDECOLUMNNAME 
                    : getGlobals().ROUTECOLUMNNAME;
                this._getColumnRange(globalName, rowNum, 1).setFormula(formula);
            }
        }
    }

    return ScheduleAdapter;
})();

if (typeof module !== 'undefined') {
    module.exports = ScheduleAdapter;
}
