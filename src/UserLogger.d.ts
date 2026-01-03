/**
 * UserLogger - User activity logging utilities
 * 
 * Type definitions for logging user actions to spreadsheet.
 * Uses UserLoggerCore for formatting logic (pure JavaScript).
 * Uses GAS APIs: Session, PropertiesService, SpreadsheetApp.
 * 
 * NOTE: Drive file logging removed in Phase 2.5 (unnecessary duplication)
 */

/**
 * User logger for tracking activity
 */
declare class UserLogger {
    /**
     * Log user activity to "User Activity Log" sheet
     * 
     * Uses UserLoggerCore for formatting, creates sheet if it doesn't exist.
     * 
     * @param action - The action performed (e.g., "Schedule Ride", "Update Ride")
     * @param details - Additional details about the action
     * @param additionalData - Any additional data to log (will be JSON stringified)
     * 
     * @example
     * ```javascript
     * UserLogger.log('Schedule Ride', 'Row 42', { rideUrl: 'https://...' });
     * ```
     */
    static log(action: string, details?: string, additionalData?: any): void;
}

export default UserLogger;
