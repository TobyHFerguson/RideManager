/**
 * UserLogger - User activity logging utilities
 * 
 * Type definitions for logging user actions to spreadsheet or Drive file.
 * Uses GAS APIs: Session, PropertiesService, SpreadsheetApp, DriveApp.
 */

/**
 * User logger for tracking activity
 */
interface UserLoggerNamespace {
    /**
     * Log user activity using the configured method (defaults to sheet logging)
     * @param action - The action performed (e.g., "Schedule Ride", "Update Ride")
     * @param details - Additional details about the action
     * @param additionalData - Any additional data to log (will be JSON stringified)
     * 
     * @example
     * ```javascript
     * UserLogger.log('Schedule Ride', 'Row 42', { rideUrl: 'https://...' });
     * ```
     */
    log(action: string, details?: string, additionalData?: any): void;

    /**
     * Log user activity to a dedicated sheet in the spreadsheet
     * Creates "User Activity Log" sheet if it doesn't exist
     * 
     * Columns: Timestamp, User, Action, Details, DTRT Status, Additional Data
     * 
     * @param action - The action performed
     * @param details - Additional details about the action
     * @param additionalData - Any additional data to log
     */
    logToSheet(action: string, details?: string, additionalData?: any): void;

    /**
     * Log user activity to Google Drive as a text file
     * Creates or appends to "RLC_User_Activity_Log.txt" in Drive
     * 
     * @param action - The action performed
     * @param details - Additional details about the action
     * @param additionalData - Any additional data to log
     */
    logToFile(action: string, details?: string, additionalData?: any): void;
}

declare const UserLogger: UserLoggerNamespace;

export default UserLogger;
