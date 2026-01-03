// @ts-check

// Node.js/Jest compatibility
if (typeof require !== 'undefined') {
    var UserLoggerCore = require('./UserLoggerCore');
}

/**
 * UserLogger - Thin GAS adapter for user activity logging
 * 
 * Uses UserLoggerCore for formatting logic, handles only GAS-specific operations.
 * Logs to "User Activity Log" sheet only (Drive file duplication removed).
 */
const UserLogger = (() => {
  
  /**
   * Logs user activity to a dedicated sheet in the spreadsheet
   * @param {string} action - The action performed
   * @param {string} details - Additional details about the action
   * @param {any} additionalData - Any additional data to log
   */
  function log(action, details = '', additionalData = {}) {
    try {
      // Gather GAS-dependent data
      const user = Session.getActiveUser()?.getEmail() || 'Unknown User';
      const dtrtEnabled = PropertiesService.getUserProperties()
        .getProperty('DTRT') === 'true';
      const timestamp = new Date();
      
      // Use Core for formatting
      const entry = UserLoggerCore.formatLogEntry(
        action, details, additionalData, user, dtrtEnabled, timestamp
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

  return { log };
})();
