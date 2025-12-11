/**
 * RetryQueueSpreadsheetAdapter - GAS adapter for retry queue spreadsheet I/O
 * 
 * This is a thin GAS-specific wrapper that handles spreadsheet access.
 * All business logic is in RetryQueueAdapterCore (pure JavaScript, fully tested).
 * This layer only handles GAS APIs: SpreadsheetApp, bmPreFiddler.
 * 
 * ARCHITECTURE PATTERN: Load → Work → Save
 * ========================================
 * Similar to ScheduleAdapter, this follows:
 * 1. LOAD: Create adapter and load rows
 * 2. WORK: Modify items in memory using RetryQueueCore logic
 * 3. SAVE: Persist changes in a single batch
 */

// Node.js compatibility
if (typeof require !== 'undefined') {
    var RetryQueueAdapterCore = require('./RetryQueueAdapterCore');
}

var RetryQueueSpreadsheetAdapter = (function() {
    'use strict';

    class RetryQueueSpreadsheetAdapter {
        /**
         * Creates a new RetryQueueSpreadsheetAdapter
         * @param {string} [sheetName='Calendar Retry Queue'] - Name of the sheet to manage
         * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [spreadsheet] - Optional spreadsheet object (defaults to active spreadsheet)
         */
        constructor(sheetName = 'Calendar Retry Queue', spreadsheet = null) {
            this.sheetName = sheetName;
            
            // Use provided spreadsheet or get active spreadsheet
            try {
                this.spreadsheet = spreadsheet || SpreadsheetApp.getActiveSpreadsheet();
            } catch (error) {
                throw new Error('RetryQueueSpreadsheetAdapter requires an active spreadsheet or spreadsheet parameter. Error: ' + error.message);
            }
            
            // Get or create the sheet
            this.sheet = this.spreadsheet.getSheetByName(sheetName);
            const sheetWasCreated = !this.sheet;
            if (!this.sheet) {
                this.sheet = this._createSheet(sheetName);
            }
            
            // Initialize Fiddler for data I/O
            // If sheet was just created, Fiddler needs to be initialized after the flush
            this.fiddler = bmPreFiddler.PreFiddler().getFiddler({
                sheetName: sheetName,
                createIfMissing: true
            });
            
            // If we just created the sheet, we need to ensure Fiddler sees the headers
            if (sheetWasCreated) {
                // Force Fiddler to reinitialize by calling getData once
                // This ensures Fiddler recognizes the header row
                this.fiddler.getData();
            }
            
            // Cache spreadsheet data to avoid multiple reads
            this._cachedRows = null;
        }

        /**
         * Load all queue items from the spreadsheet
         * @returns {Object[]} Array of queue items
         */
        loadAll() {
            this._ensureDataLoaded();
            return RetryQueueAdapterCore.rowsToItems(this._cachedRows);
        }

        /**
         * Save queue items back to the spreadsheet
         * @param {Object[]} items - Array of queue items
         */
        save(items) {
            const rows = RetryQueueAdapterCore.itemsToRows(items);
            this.fiddler.setData(rows);
            SpreadsheetApp.flush();
            
            // Clear cache to force reload on next operation
            this._cachedRows = null;
        }

        /**
         * Add a new item to the queue
         * @param {Object} item - Queue item to add
         */
        enqueue(item) {
            console.log('RetryQueueSpreadsheetAdapter.enqueue: Starting with item:', JSON.stringify(item));
            this._ensureDataLoaded();
            console.log('RetryQueueSpreadsheetAdapter.enqueue: Cached rows before add:', this._cachedRows.length);
            const newRows = RetryQueueAdapterCore.addRow(this._cachedRows, item);
            console.log('RetryQueueSpreadsheetAdapter.enqueue: New rows count:', newRows.length);
            this._cachedRows = newRows;
            const items = RetryQueueAdapterCore.rowsToItems(newRows);
            console.log('RetryQueueSpreadsheetAdapter.enqueue: Items to save:', items.length, JSON.stringify(items[items.length - 1]));
            this.save(items);
            console.log('RetryQueueSpreadsheetAdapter.enqueue: Save complete');
        }

        /**
         * Update an existing item in the queue
         * @param {Object} updatedItem - Updated queue item
         */
        update(updatedItem) {
            this._ensureDataLoaded();
            const newRows = RetryQueueAdapterCore.updateRow(this._cachedRows, updatedItem);
            this._cachedRows = newRows;
            this.save(RetryQueueAdapterCore.rowsToItems(newRows));
        }

        /**
         * Remove an item from the queue by ID
         * @param {string} id - Item ID to remove
         */
        remove(id) {
            this._ensureDataLoaded();
            const newRows = RetryQueueAdapterCore.removeRow(this._cachedRows, id);
            this._cachedRows = newRows;
            this.save(RetryQueueAdapterCore.rowsToItems(newRows));
        }

        /**
         * Find an item by ID
         * @param {string} id - Item ID to find
         * @returns {Object|null} Queue item or null if not found
         */
        findById(id) {
            this._ensureDataLoaded();
            const index = RetryQueueAdapterCore.findIndexById(this._cachedRows, id);
            if (index === -1) {
                return null;
            }
            return RetryQueueAdapterCore.rowToItem(this._cachedRows[index]);
        }

        /**
         * Get queue statistics
         * @returns {Object} Statistics object
         */
        getStatistics() {
            this._ensureDataLoaded();
            return RetryQueueAdapterCore.getStatistics(this._cachedRows);
        }

        /**
         * Clear the entire queue
         */
        clear() {
            this.save([]);
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
         * @private
         */
        _ensureDataLoaded() {
            if (!this._cachedRows) {
                const data = this.fiddler.getData();
                // Fiddler returns empty array if no data or sheet doesn't exist yet
                this._cachedRows = data || [];
            }
        }

        /**
         * Create the retry queue sheet with headers
         * @private
         * @param {string} sheetName - Name of sheet to create
         * @returns {GoogleAppsScript.Spreadsheet.Sheet} Created sheet
         */
        _createSheet(sheetName) {
            const sheet = this.spreadsheet.insertSheet(sheetName);
            
            // Set up headers
            const headers = RetryQueueAdapterCore.getColumnNames();
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            
            // Format header row
            const headerRange = sheet.getRange(1, 1, 1, headers.length);
            headerRange.setFontWeight('bold');
            headerRange.setBackground('#4285f4');
            headerRange.setFontColor('#ffffff');
            
            // Freeze header row
            sheet.setFrozenRows(1);
            
            // Auto-resize columns
            for (let i = 1; i <= headers.length; i++) {
                sheet.autoResizeColumn(i);
            }
            
            // Set column widths for specific columns
            const columnWidths = {
                'QueueID': 80,
                'Status': 100,
                'Type': 80,
                'RideName': 200,
                'RideURL': 350,
                'CalendarID': 250,
                'LastError': 300,
                'Params': 400
            };
            
            headers.forEach((header, index) => {
                if (columnWidths[header]) {
                    sheet.setColumnWidth(index + 1, columnWidths[header]);
                }
            });
            
            console.log(`RetryQueueSpreadsheetAdapter: Created sheet "${sheetName}" with headers`);
            
            // Flush to ensure sheet is fully created before Fiddler initialization
            SpreadsheetApp.flush();
            
            return sheet;
        }
    }

    return RetryQueueSpreadsheetAdapter;
})();

// Export for Node.js testing
if (typeof module !== 'undefined') {
    module.exports = RetryQueueSpreadsheetAdapter;
}
