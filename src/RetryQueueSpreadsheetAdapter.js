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
            
            // Lazy initialization - Fiddler created on first use
            this._fiddler = null;
            
            // Cache spreadsheet data to avoid multiple reads
            this._cachedRows = null;
        }

        /**
         * Get or create Fiddler instance (lazy initialization)
         * @private
         * @returns {Fiddler} Fiddler instance
         */
        _getFiddler() {
            if (!this._fiddler) {
                this._fiddler = bmPreFiddler.PreFiddler().getFiddler({
                    sheetName: this.sheetName,
                    createIfMissing: true
                });
            }
            return this._fiddler;
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
            
            if (rows.length === 0) {
                // Queue is empty - delete the sheet to keep workspace clean
                const sheet = this.spreadsheet.getSheetByName(this.sheetName);
                if (sheet) {
                    this.spreadsheet.deleteSheet(sheet);
                    console.log(`RetryQueueSpreadsheetAdapter: Deleted empty sheet "${this.sheetName}"`);
                }
            } else {
                // Queue has items - save them
                const fiddler = this._getFiddler();
                
                // ALWAYS preserve focus - any sheet access can trigger focus change
                const originalActiveSheet = this.spreadsheet.getActiveSheet();
                console.log(`RetryQueueSpreadsheetAdapter.save: Saved active sheet: ${originalActiveSheet.getName()}`);
                
                fiddler.setData(rows);
                console.log(`RetryQueueSpreadsheetAdapter.save: About to call dumpValues`);
                fiddler.dumpValues();
                console.log(`RetryQueueSpreadsheetAdapter.save: Called dumpValues`);
                
                // Always restore original active sheet
                this.spreadsheet.setActiveSheet(originalActiveSheet);
                console.log(`RetryQueueSpreadsheetAdapter.save: Restored active sheet to ${originalActiveSheet.getName()}`);
            }
            
            // Clear cache to force reload on next operation
            this._cachedRows = null;
        }

        /**
         * Add a new item to the queue
         * @param {Object} item - Queue item to add
         */
        enqueue(item) {
            this._ensureDataLoaded();
            const newRows = RetryQueueAdapterCore.addRow(this._cachedRows, item);
            this._cachedRows = newRows;
            this.save(RetryQueueAdapterCore.rowsToItems(newRows));
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
            return this.spreadsheet.getSheetByName(this.sheetName);
        }

        // ===== PRIVATE METHODS =====

        /**
         * Ensure data is loaded and cached
         * @private
         */
        _ensureDataLoaded() {
            if (!this._cachedRows) {
                const fiddler = this._getFiddler();
                const data = fiddler.getData();
                // Fiddler returns empty array if no data or sheet doesn't exist yet
                this._cachedRows = data || [];
            }
        }
    }

    return RetryQueueSpreadsheetAdapter;
})();

// Export for Node.js testing
if (typeof module !== 'undefined') {
    module.exports = RetryQueueSpreadsheetAdapter;
}
