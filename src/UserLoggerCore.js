// @ts-check

/**
 * UserLoggerCore - Pure log formatting logic (no GAS dependencies)
 * 
 * This module contains pure JavaScript functions for formatting log entries.
 * All GAS-specific operations (SpreadsheetApp, Session, etc.) are handled by UserLogger.js.
 * 
 * Design: 100% testable in Jest, zero GAS dependencies
 */

var UserLoggerCore = (function() {
    class UserLoggerCore {
        /**
         * Format log entry with all required fields
         * 
         * @param {string} action - Action name (e.g., "Schedule Ride", "Update Ride")
         * @param {string} details - Action details
         * @param {any} additionalData - Additional data object (will be stringified)
         * @param {string} user - User email address
         * @param {boolean} dtrtEnabled - DTRT status flag
         * @param {Date} timestamp - Log timestamp
         * @returns {{timestamp: Date, user: string, action: string, details: string, dtrtStatus: string, additionalData: string}} Formatted log entry
         */
        static formatLogEntry(action, details, additionalData, user, dtrtEnabled, timestamp) {
            return {
                timestamp,
                user,
                action,
                details,
                dtrtStatus: dtrtEnabled ? 'Enabled' : 'Disabled',
                additionalData: JSON.stringify(additionalData)
            };
        }
        
        /**
         * Convert log entry to spreadsheet row array
         * 
         * @param {{timestamp: Date, user: string, action: string, details: string, dtrtStatus: string, additionalData: string}} entry - Log entry object
         * @returns {Array<Date|string>} Spreadsheet row values [timestamp, user, action, details, dtrtStatus, additionalData]
         */
        static toSpreadsheetRow(entry) {
            return [
                entry.timestamp,
                entry.user,
                entry.action,
                entry.details,
                entry.dtrtStatus,
                entry.additionalData
            ];
        }
        
        /**
         * Get spreadsheet header row
         * 
         * @returns {string[]} Header values for User Activity Log sheet
         */
        static getHeaderRow() {
            return ['Timestamp', 'User', 'Action', 'Details', 'DTRT Status', 'Additional Data'];
        }
    }
    
    return UserLoggerCore;
})();

// Node.js/Jest export
if (typeof module !== 'undefined') {
    module.exports = UserLoggerCore;
}
