// @ts-check
/**
 * RetryQueueMarshallingCore - Pure JavaScript data marshalling for retry queue
 * 
 * This module handles conversion between queue item objects and SpreadsheetApp 2D arrays.
 * It has NO GAS dependencies and can be fully tested in Jest.
 * 
 * Column order in 2D arrays:
 * [0] QueueID
 * [1] Operation
 * [2] Params (JSON string)
 * [3] RideURL
 * [4] EnqueuedAt (Date)
 * [5] AttemptCount (number)
 * [6] NextRetryAt (Date)
 */

var RetryQueueMarshallingCore = (function() {
    'use strict';

    class RetryQueueMarshallingCore {
        /**
         * Convert queue item to 2D array row for SpreadsheetApp
         * @param {Object} item - Queue item
         * @returns {Array} Row array [QueueID, Operation, Params, RideURL, EnqueuedAt, AttemptCount, NextRetryAt]
         */
        static itemToRow(item) {
            return [
                item.id || '',
                item.operation || '',
                item.params ? JSON.stringify(item.params) : '',
                item.rideUrl || '',
                item.enqueuedAt ? new Date(item.enqueuedAt) : '',
                item.attemptCount !== undefined ? item.attemptCount : 0,
                item.nextRetryAt ? new Date(item.nextRetryAt) : ''
            ];
        }

        /**
         * Convert 2D array row to queue item
         * @param {Array} row - Row array from SpreadsheetApp.getValues()
         * @returns {Object} Queue item
         */
        static rowToItem(row) {
            return {
                id: row[0] || '',
                operation: row[1] || '',
                params: row[2] ? JSON.parse(row[2]) : {},
                rideUrl: row[3] || '',
                enqueuedAt: row[4] ? new Date(row[4]).getTime() : 0,
                attemptCount: (row[5] !== undefined && row[5] !== '') ? row[5] : 0,
                nextRetryAt: row[6] ? new Date(row[6]).getTime() : null
            };
        }

        /**
         * Convert array of queue items to 2D array for SpreadsheetApp
         * @param {Array<Object>} items - Array of queue items
         * @returns {Array<Array>} 2D array of rows
         */
        static itemsToRows(items) {
            return items.map(item => this.itemToRow(item));
        }

        /**
         * Convert 2D array to array of queue items
         * @param {Array<Array>} rows - 2D array from SpreadsheetApp.getValues()
         * @returns {Array<Object>} Array of queue items
         */
        static rowsToItems(rows) {
            return rows.map(row => this.rowToItem(row));
        }

        /**
         * Get column names for spreadsheet headers
         * @returns {Array<string>} Column names
         */
        static getColumnNames() {
            return [
                'QueueID',
                'Operation',
                'Params',
                'RideURL',
                'EnqueuedAt',
                'AttemptCount',
                'NextRetryAt'
            ];
        }

        /**
         * Get column count
         * @returns {number} Number of columns
         */
        static getColumnCount() {
            return 7;
        }
    }

    return RetryQueueMarshallingCore;
})();

// Export for Node.js testing
if (typeof module !== 'undefined') {
    module.exports = RetryQueueMarshallingCore;
}
