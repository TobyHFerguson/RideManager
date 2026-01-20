// @ts-check

// Note: UserLoggerCore is NOT imported here because:
// 1. In GAS runtime, it is available as a global class
// 2. In tests, it needs to be mocked/injected by the test setup
// 3. Importing it shadows the global and breaks TypeScript resolution

/**
 * UserLogger - Thin GAS adapter for user activity logging
 * 
 * Uses UserLoggerCore for formatting logic, handles only GAS-specific operations.
 * Logs to "User Activity Log" sheet only (Drive file duplication removed).
 */
var UserLogger = (function() {

class UserLogger {
  /**
   * Logs user activity to a dedicated sheet in the spreadsheet
   * @param {string} action - The action performed
   * @param {string} details - Additional details about the action
   * @param {any} additionalData - Arbitrary user activity data (structure not constrained, will be stringified)
   */
  static log(action, details = '', additionalData = {}) {
    try {
      // Gather GAS-dependent data
      const user = Session.getActiveUser()?.getEmail() || 'Unknown User';

      const timestamp = new Date();
      
      // Use Core for formatting
      const entry = UserLoggerCore.formatLogEntry(
        action, details, additionalData, user, timestamp
      );
      
      // Write to sheet only (no Drive file duplication)
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let logSheet = ss.getSheetByName('User Activity Log');
      
      if (!logSheet) {
        logSheet = ss.insertSheet('User Activity Log');
        const header = UserLoggerCore.getHeaderRow();
        logSheet.getRange(1, 1, 1, header.length).setValues([header]);
        logSheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
      }
      
      logSheet.appendRow(UserLoggerCore.toSpreadsheetRow(entry));
      
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to log:', err.message);
    }
  }
}

return UserLogger;
})();

if (typeof module !== 'undefined') {
    module.exports = UserLogger;
}
