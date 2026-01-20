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
     * @param {any} additionalData - Arbitrary user activity data (structure not constrained, will be stringified)
     * @param {string} user - User email address
     * @param {Date} timestamp - Log timestamp
     * @returns {{timestamp: Date, user: string, action: string, details: string, additionalData: string}} Formatted log entry
     */
    static formatLogEntry(action, details, additionalData, user, timestamp) {
        return {
            timestamp,
            user,
            action,
            details,
            additionalData: JSON.stringify(additionalData)
        };
    }
    
    /**
     * Convert log entry to spreadsheet row array
     * 
     * @param {{timestamp: Date, user: string, action: string, details: string, additionalData: string}} entry - Log entry object
     * @returns {Array<Date|string>} Spreadsheet row values [timestamp, user, action, details, additionalData]
     */
    static toSpreadsheetRow(entry) {
        return [
            entry.timestamp,
            entry.user,
            entry.action,
            entry.details,
            entry.additionalData
        ];
    }
    
    /**
     * Get spreadsheet header row
     * 
     * @returns {string[]} Header values for User Activity Log sheet
     */
    static getHeaderRow() {
        return ['Timestamp', 'User', 'Action', 'Details', 'Additional Data'];
    }
}

// Node.js/Jest export
return UserLoggerCore;
})();

if (typeof module !== 'undefined') {
    module.exports = UserLoggerCore;
}
