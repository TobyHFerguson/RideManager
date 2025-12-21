// @ts-check
/**
 * RetryQueueAdapterCore - Pure JavaScript retry queue spreadsheet adapter logic
 * 
 * This module contains business logic for converting retry queue items to/from
 * spreadsheet rows. It has NO GAS dependencies and can be fully tested in Jest.
 * 
 * The spreadsheet structure follows the Calendar Retry Queue specification:
 * - QueueID: Unique identifier (UUID)
 * - Status: pending | retrying | succeeded | failed | abandoned
 * - Type: create | update | delete
 * - RideName: Human-readable ride name
 * - RideURL: Stable identifier (RWGPS URL)
 * - RowNum: Source row in Consolidated Rides sheet
 * - CalendarID: Target calendar
 * - EnqueuedAt: locale date-time for when the item was enqueued
 * - NextRetryAt: locale date-time for next retry attempt
 * - AttemptCount: Number of retry attempts so far
 * - LastError: Most recent error message
 * - UserEmail: Who initiated the operation
 * - Params: JSON string of operation-specific parameters
 */

// Node.js compatibility
if (typeof require !== 'undefined') {
    // No dependencies needed - pure JavaScript
}

var RetryQueueAdapterCore = (function() {
    
    class RetryQueueAdapterCore {
        /**
         * Get column names for the retry queue spreadsheet
         * @returns {string[]} Array of column names
         */
        static getColumnNames() {
            return [
                'QueueID',
                'Status',
                'Type',
                'RideName',
                'RideURL',
                'RowNum',
                'CalendarID',
                'EnqueuedAt',
                'NextRetryAt',
                'AttemptCount',
                'LastError',
                'UserEmail',
                'Params'
            ];
        }

        /**
         * Convert queue item to spreadsheet row object
         * @param {Object} item - Queue item from RetryQueueCore
         * @returns {Object} Row object compatible with Fiddler
         */
        static itemToRow(item) {
            return {
                'QueueID': item.id || '',
                'Status': item.status || this._determineStatus(item),
                'Type': item.type || '',
                'RideName': item.rideTitle || '',
                'RideURL': item.rideUrl || '',
                'RowNum': item.rowNum !== undefined ? item.rowNum : '',
                'CalendarID': item.calendarId || '',
                'EnqueuedAt': item.enqueuedAt ? new Date(item.enqueuedAt) : '',
                'NextRetryAt': item.nextRetryAt ? new Date(item.nextRetryAt) : '',
                'AttemptCount': item.attemptCount !== undefined ? item.attemptCount : 0,
                'LastError': item.lastError || '',
                'UserEmail': item.userEmail || '',
                'Params': item.params ? JSON.stringify(item.params) : ''
            };
        }

        /**
         * Convert spreadsheet row object to queue item
         * @param {Object} row - Row object from Fiddler
         * @returns {Object} Queue item for RetryQueueCore
         */
        static rowToItem(row) {
            return {
                id: row['QueueID'] || '',
                status: row['Status'] || '',
                type: row['Type'] || '',
                rideTitle: row['RideName'] || '',
                rideUrl: row['RideURL'] || '',
                rowNum: row['RowNum'] || '',
                calendarId: row['CalendarID'] || '',
                enqueuedAt: row['EnqueuedAt'] ? new Date(row['EnqueuedAt']).getTime() : 0,
                nextRetryAt: row['NextRetryAt'] ? new Date(row['NextRetryAt']).getTime() : 0,
                attemptCount: parseInt(row['AttemptCount']) || 0,
                lastError: row['LastError'] || '',
                userEmail: row['UserEmail'] || '',
                params: row['Params'] ? JSON.parse(row['Params']) : {}
            };
        }

        /**
         * Convert array of queue items to array of row objects
         * @param {Array} items - Queue items
         * @returns {Array} Array of row objects
         */
        static itemsToRows(items) {
            return items.map(item => this.itemToRow(item));
        }

        /**
         * Convert array of row objects to array of queue items
         * @param {Array} rows - Row objects
         * @returns {Array} Array of queue items
         */
        static rowsToItems(rows) {
            return rows.map(row => this.rowToItem(row));
        }

        /**
         * Find index of item in rows array by ID
         * @param {Array} rows - Array of row objects
         * @param {string} id - Item ID to find
         * @returns {number} Index of item, or -1 if not found
         */
        static findIndexById(rows, id) {
            return rows.findIndex(row => row['QueueID'] === id);
        }

        /**
         * Update a row in the rows array
         * @param {Array} rows - Array of row objects
         * @param {Object} updatedItem - Updated queue item
         * @returns {Array} New array with updated row
         */
        static updateRow(rows, updatedItem) {
            const index = this.findIndexById(rows, updatedItem.id);
            if (index === -1) {
                return rows; // Item not found
            }
            
            const newRows = [...rows];
            newRows[index] = this.itemToRow(updatedItem);
            return newRows;
        }

        /**
         * Remove a row from the rows array by ID
         * @param {Array} rows - Array of row objects
         * @param {string} id - Item ID to remove
         * @returns {Array} New array without the row
         */
        static removeRow(rows, id) {
            return rows.filter(row => row['QueueID'] !== id);
        }

        /**
         * Add a new row to the rows array
         * @param {Array} rows - Array of row objects
         * @param {Object} newItem - New queue item
         * @returns {Array} New array with added row
         */
        static addRow(rows, newItem) {
            return [...rows, this.itemToRow(newItem)];
        }

        /**
         * Determine status from queue item state
         * @private
         * @param {Object} item - Queue item
         * @returns {string} Status string
         */
        static _determineStatus(item) {
            if (item.attemptCount === 0) {
                return 'pending';
            } else if (item.attemptCount > 0 && item.nextRetryAt) {
                return 'retrying';
            } else {
                return 'failed';
            }
        }

        /**
         * Validate row object has all required fields
         * @param {Object} row - Row object to validate
         * @returns {Object} { valid: boolean, errors: string[] }
         */
        static validateRow(row) {
            const errors = [];
            
            if (!row['QueueID']) {
                errors.push('QueueID is required');
            }
            if (!row['Type'] || !['create', 'update', 'delete'].includes(row['Type'])) {
                errors.push('Type must be create, update, or delete');
            }
            if (!row['CalendarID']) {
                errors.push('CalendarID is required');
            }
            if (!row['RideURL']) {
                errors.push('RideURL is required');
            }
            if (row['Status'] && !['pending', 'retrying', 'succeeded', 'failed', 'abandoned'].includes(row['Status'])) {
                errors.push('Status must be pending, retrying, succeeded, failed, or abandoned');
            }
            
            return {
                valid: errors.length === 0,
                errors
            };
        }

        /**
         * Sort rows by next retry time (soonest first)
         * @param {Array} rows - Array of row objects
         * @returns {Array} Sorted array
         */
        static sortByNextRetry(rows) {
            return [...rows].sort((a, b) => {
                const timeA = new Date(a['NextRetryAt']).getTime();
                const timeB = new Date(b['NextRetryAt']).getTime();
                return timeA - timeB;
            });
        }

        /**
         * Filter rows by status
         * @param {Array} rows - Array of row objects
         * @param {string} status - Status to filter by
         * @returns {Array} Filtered array
         */
        static filterByStatus(rows, status) {
            return rows.filter(row => row['Status'] === status);
        }

        /**
         * Get summary statistics from rows
         * @param {Array} rows - Array of row objects
         * @returns {Object} Statistics object
         */
        static getStatistics(rows) {
            return {
                total: rows.length,
                pending: rows.filter(r => r['Status'] === 'pending').length,
                retrying: rows.filter(r => r['Status'] === 'retrying').length,
                succeeded: rows.filter(r => r['Status'] === 'succeeded').length,
                failed: rows.filter(r => r['Status'] === 'failed').length,
                abandoned: rows.filter(r => r['Status'] === 'abandoned').length,
                byType: {
                    create: rows.filter(r => r['Type'] === 'create').length,
                    update: rows.filter(r => r['Type'] === 'update').length,
                    delete: rows.filter(r => r['Type'] === 'delete').length
                }
            };
        }
    }

    return RetryQueueAdapterCore;
})();

// Export for Node.js testing
if (typeof module !== 'undefined') {
    module.exports = RetryQueueAdapterCore;
}
