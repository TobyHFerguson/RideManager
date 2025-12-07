/**
 * RetryQueueAdapterCore - Pure JavaScript retry queue spreadsheet adapter logic
 * 
 * This module contains business logic for converting retry queue items to/from
 * spreadsheet rows. It has NO GAS dependencies and can be fully tested in Jest.
 * 
 * The spreadsheet structure mirrors the queue item structure for easy monitoring:
 * - ID: Unique identifier
 * - Type: create | update | delete
 * - Calendar ID: Target calendar
 * - Ride URL: Stable identifier for the ride
 * - Ride Title: Human-readable ride name
 * - Row Num: Source row in Consolidated Rides sheet
 * - User Email: Who initiated the operation
 * - Enqueued At: ISO timestamp when added to queue
 * - Next Retry At: ISO timestamp for next retry attempt
 * - Attempt Count: Number of retry attempts so far
 * - Last Error: Most recent error message
 * - Status: pending | retrying | success | failed
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
                'ID',
                'Type',
                'Calendar ID',
                'Ride URL',
                'Ride Title',
                'Row Num',
                'User Email',
                'Enqueued At',
                'Next Retry At',
                'Attempt Count',
                'Last Error',
                'Status',
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
                'ID': item.id || '',
                'Type': item.type || '',
                'Calendar ID': item.calendarId || '',
                'Ride URL': item.rideUrl || '',
                'Ride Title': item.rideTitle || '',
                'Row Num': item.rowNum !== undefined ? item.rowNum : '',
                'User Email': item.userEmail || '',
                'Enqueued At': item.enqueuedAt ? new Date(item.enqueuedAt).toISOString() : '',
                'Next Retry At': item.nextRetryAt ? new Date(item.nextRetryAt).toISOString() : '',
                'Attempt Count': item.attemptCount !== undefined ? item.attemptCount : 0,
                'Last Error': item.lastError || '',
                'Status': this._determineStatus(item),
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
                id: row['ID'] || '',
                type: row['Type'] || '',
                calendarId: row['Calendar ID'] || '',
                rideUrl: row['Ride URL'] || '',
                rideTitle: row['Ride Title'] || '',
                rowNum: row['Row Num'] || undefined,
                userEmail: row['User Email'] || '',
                enqueuedAt: row['Enqueued At'] ? new Date(row['Enqueued At']).getTime() : 0,
                nextRetryAt: row['Next Retry At'] ? new Date(row['Next Retry At']).getTime() : 0,
                attemptCount: parseInt(row['Attempt Count']) || 0,
                lastError: row['Last Error'] || null,
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
            return rows.findIndex(row => row['ID'] === id);
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
            return rows.filter(row => row['ID'] !== id);
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
            
            if (!row['ID']) {
                errors.push('ID is required');
            }
            if (!row['Type'] || !['create', 'update', 'delete'].includes(row['Type'])) {
                errors.push('Type must be create, update, or delete');
            }
            if (!row['Calendar ID']) {
                errors.push('Calendar ID is required');
            }
            if (!row['Ride URL']) {
                errors.push('Ride URL is required');
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
                const timeA = new Date(a['Next Retry At']).getTime();
                const timeB = new Date(b['Next Retry At']).getTime();
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
                failed: rows.filter(r => r['Status'] === 'failed').length,
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
