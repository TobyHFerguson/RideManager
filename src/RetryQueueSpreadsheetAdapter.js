/**
 * RetryQueueSpreadsheetAdapter - GAS adapter for retry queue spreadsheet I/O
 * 
 * This is a thin GAS-specific wrapper that handles spreadsheet access.
 * All data marshalling is in RetryQueueMarshallingCore (pure JavaScript, fully tested).
 * This layer only handles GAS APIs: SpreadsheetApp (no Fiddler).
 * 
 * ARCHITECTURE PATTERN: Direct SpreadsheetApp Access
 * ===================================================
 * Unlike ScheduleAdapter (which uses Fiddler for complex formulas), this adapter
 * uses SpreadsheetApp directly like UserLogger. This approach:
 * - Avoids focus changes caused by Fiddler's dumpValues()
 * - Is simpler for append-only queue operations
 * - Doesn't require formula preservation
 * 
 * Pattern: getSheet() → getValues() → RetryQueueMarshallingCore → items → Core → setValues()
 */

// Node.js compatibility
if (typeof require !== 'undefined') {
    var RetryQueueMarshallingCore = require('./RetryQueueMarshallingCore');
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
            
            // Cache spreadsheet data to avoid multiple reads
            this._cachedRows = null;
        }

        /**
         * Get or create the retry queue sheet
         * @private
         * @returns {GoogleAppsScript.Spreadsheet.Sheet|null} Sheet object or null if doesn't exist
         */
        _getSheet() {
            return this.spreadsheet.getSheetByName(this.sheetName);
        }

        /**
         * Create the retry queue sheet with headers
         * @private
         * @returns {GoogleAppsScript.Spreadsheet.Sheet} Newly created sheet
         */
        _createSheet() {
            // Preserve active sheet - insertSheet() changes focus
            const originalActiveSheet = this.spreadsheet.getActiveSheet();
            
            const sheet = this.spreadsheet.insertSheet(this.sheetName);
            // Set headers from RetryQueueMarshallingCore
            const columnNames = RetryQueueMarshallingCore.getColumnNames();
            const columnCount = RetryQueueMarshallingCore.getColumnCount();
            sheet.getRange(1, 1, 1, columnCount).setValues([columnNames]);
            sheet.getRange(1, 1, 1, columnCount).setFontWeight('bold');
            sheet.setFrozenRows(1);
            
            // Restore original active sheet
            this.spreadsheet.setActiveSheet(originalActiveSheet);
            
            return sheet;
        }

        /**
         * Load all queue items from the spreadsheet
         * @returns {Object[]} Array of queue items
         */
        loadAll() {
            this._ensureDataLoaded();
            return RetryQueueMarshallingCore.rowsToItems(this._cachedRows);
        }

        /**
         * Save queue items back to the spreadsheet
         * @param {Object[]} items - Array of queue items
         */
        save(items) {
            if (items.length === 0) {
                // Queue is empty - delete the sheet to keep workspace clean
                const sheet = this._getSheet();
                if (sheet) {
                    this.spreadsheet.deleteSheet(sheet);
                    console.log(`RetryQueueSpreadsheetAdapter: Deleted empty sheet "${this.sheetName}"`);
                }
            } else {
                // Queue has items - save them using SpreadsheetApp directly
                let sheet = this._getSheet();
                
                if (!sheet) {
                    // Create sheet if it doesn't exist (like UserLogger does)
                    sheet = this._createSheet();
                }
                
                // Convert items to 2D array format for setValues()
                const rows = RetryQueueMarshallingCore.itemsToRows(items);
                const columnCount = RetryQueueMarshallingCore.getColumnCount();
                
                // Clear existing data (except header row) and write new data
                const lastRow = sheet.getLastRow();
                if (lastRow > 1) {
                    sheet.getRange(2, 1, lastRow - 1, columnCount).clear();
                }
                
                // Write all rows at once
                if (rows.length > 0) {
                    sheet.getRange(2, 1, rows.length, columnCount).setValues(rows);
                }
            }
            
            // Clear cache to force reload on next operation
            this._cachedRows = null;
        }

        /**
         * Add a new item to the queue
         * @param {Object} item - Queue item to add
         */
        enqueue(item) {
            const items = this.loadAll();
            items.push(item);
            this.save(items);
        }

        /**
         * Update an existing item in the queue
         * @param {Object} updatedItem - Updated queue item
         */
        update(updatedItem) {
            const items = this.loadAll();
            const index = items.findIndex(item => item.id === updatedItem.id);
            if (index !== -1) {
                items[index] = updatedItem;
                this.save(items);
            }
        }

        /**
         * Remove an item from the queue by ID
         * @param {string} id - Item ID to remove
         */
        remove(id) {
            const items = this.loadAll();
            const filtered = items.filter(item => item.id !== id);
            this.save(filtered);
        }

        /**
         * Find an item by ID
         * @param {string} id - Item ID to find
         * @returns {Object|null} Queue item or null if not found
         */
        findById(id) {
            const items = this.loadAll();
            return items.find(item => item.id === id) || null;
        }

        /**
         * Get queue statistics
         * @returns {Object} Statistics object with total count
         */
        getStatistics() {
            const items = this.loadAll();
            return {
                total: items.length,
                items: items
            };
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
                const sheet = this._getSheet();
                
                if (!sheet) {
                    // Sheet doesn't exist yet - return empty array
                    this._cachedRows = [];
                } else {
                    // Read all data rows (skip header)
                    const lastRow = sheet.getLastRow();
                    if (lastRow <= 1) {
                        // Only header row exists
                        this._cachedRows = [];
                    } else {
                        // Get all data rows (2D array format)
                        const columnCount = RetryQueueMarshallingCore.getColumnCount();
                        const values = sheet.getRange(2, 1, lastRow - 1, columnCount).getValues();
                        this._cachedRows = values;
                    }
                }
            }
        }
    }

    return RetryQueueSpreadsheetAdapter;
})();

// Export for Node.js testing
if (typeof module !== 'undefined') {
    module.exports = RetryQueueSpreadsheetAdapter;
}
