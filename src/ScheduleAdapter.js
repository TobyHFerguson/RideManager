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
    const HyperlinkUtils = require('./HyperlinkUtils.js');
    const Row = require('./Row.js');
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
        }

        /**
         * Load all data from the spreadsheet
         * @returns {Row[]} Array of Row instances
         */
        loadAll() {
            const data = this.fiddler.getData();
            return data.map((row, index) => this._createRow(row, index + 2)); // +2 for header and 1-based indexing
        }

        /**
         * Load selected rows from the spreadsheet
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

            const ranges = this._convertCellRangesToRowRanges(rangeList);
            const allData = this.fiddler.getData();
            
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
         * Load rows younger than (after) the specified date
         * @param {Date} date - The cutoff date
         * @returns {Row[]} Array of Row instances after the date
         */
        loadYoungerRows(date) {
            const allData = this.fiddler.getData();
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
         * Load the last row in the spreadsheet
         * @returns {Row|null} The last Row instance or null if no data
         */
        loadLastRow() {
            const allData = this.fiddler.getData();
            if (allData.length === 0) {
                return null;
            }
            const lastIndex = allData.length - 1;
            return this._createRow(allData[lastIndex], lastIndex + 2);
        }

        /**
         * Save dirty rows back to the spreadsheet
         * Saves only rows that have been modified
         */
        save() {
            if (this.dirtyRows.size === 0) {
                return;
            }

            // Load all current data
            const allData = this.fiddler.getData();
            
            // Update the rows that have changed
            this.dirtyRows.forEach(row => {
                const dataIndex = row.rowNum - 2; // Convert back to 0-based array index
                if (dataIndex >= 0 && dataIndex < allData.length) {
                    // Get the data without metadata
                    const rowData = row._getData();
                    delete rowData._rowNum;
                    delete rowData._range;
                    
                    allData[dataIndex] = rowData;
                    row._markClean();
                }
            });

            // Write back to spreadsheet
            this.fiddler.setData(allData);
            
            // Store formulas for Route and Ride columns
            this._storeFormulas();
            
            SpreadsheetApp.flush();
            
            // Clear dirty rows
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

        // ===== PRIVATE METHODS =====

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
