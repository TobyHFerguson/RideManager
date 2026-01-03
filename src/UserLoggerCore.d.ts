/**
 * UserLoggerCore - Pure log formatting logic (no GAS dependencies)
 * 
 * Type definitions for UserLoggerCore module.
 * Contains pure JavaScript functions for formatting log entries.
 */

/**
 * Formatted log entry object
 */
export interface LogEntry {
    timestamp: Date;
    user: string;
    action: string;
    details: string;
    dtrtStatus: 'Enabled' | 'Disabled';
    additionalData: string;
}

/**
 * Pure log formatting logic (100% testable)
 */
declare class UserLoggerCore {
    /**
     * Format log entry with all required fields
     * 
     * @param action - Action name (e.g., "Schedule Ride", "Update Ride")
     * @param details - Action details
     * @param additionalData - Additional data object (will be JSON stringified)
     * @param user - User email address
     * @param dtrtEnabled - DTRT status flag
     * @param timestamp - Log timestamp
     * @returns Formatted log entry
     * 
     * @example
     * ```javascript
     * const entry = UserLoggerCore.formatLogEntry(
     *   'Schedule Ride',
     *   'Row 42',
     *   { rideUrl: 'https://...' },
     *   'user@example.com',
     *   true,
     *   new Date()
     * );
     * ```
     */
    static formatLogEntry(
        action: string,
        details: string,
        additionalData: any,
        user: string,
        dtrtEnabled: boolean,
        timestamp: Date
    ): LogEntry;
    
    /**
     * Convert log entry to spreadsheet row array
     * 
     * @param entry - Log entry object
     * @returns Spreadsheet row values [timestamp, user, action, details, dtrtStatus, additionalData]
     */
    static toSpreadsheetRow(entry: LogEntry): Array<Date | string>;
    
    /**
     * Get spreadsheet header row
     * 
     * @returns Header values for User Activity Log sheet
     */
    static getHeaderRow(): string[];
}

export default UserLoggerCore;
