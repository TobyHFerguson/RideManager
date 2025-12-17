// @ts-check
const UserLogger = (() => {
  
  /**
   * Logs user activity to a dedicated sheet in the spreadsheet
   * @param {string} action - The action performed
   * @param {string} details - Additional details about the action
   * @param {any} additionalData - Any additional data to log
   */
  function logToSheet(action, details = '', additionalData = {}) {
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let logSheet = ss.getSheetByName('User Activity Log');
      
      // Create the log sheet if it doesn't exist
      if (!logSheet) {
        logSheet = ss.insertSheet('User Activity Log');
        logSheet.getRange(1, 1, 1, 6).setValues([
          ['Timestamp', 'User', 'Action', 'Details', 'DTRT Status', 'Additional Data']
        ]);
        logSheet.getRange(1, 1, 1, 6).setFontWeight('bold');
      }
      
      const timestamp = new Date();
      const user = Session.getActiveUser()?.getEmail() || 'Unknown User';
      const dtrtStatus = PropertiesService.getUserProperties().getProperty('DTRT') === 'true' ? 'Enabled' : 'Disabled';
      
      logSheet.appendRow([
        timestamp,
        user,
        action,
        details,
        dtrtStatus,
        JSON.stringify(additionalData)
      ]);
      
    } catch (error) {
      console.error('Failed to log to sheet:', error);
    }
  }

  /**
   * Logs user activity to Google Drive as a text file
   * @param {string} action - The action performed
   * @param {string} details - Additional details about the action
   * @param {any} additionalData - Any additional data to log
   */
  function logToFile(action, details = '', additionalData = {}) {
    try {
      const fileName = 'RLC_User_Activity_Log.txt';
      const timestamp = new Date().toISOString();
      const user = Session.getActiveUser()?.getEmail() || 'Unknown User';
      const dtrtStatus = PropertiesService.getUserProperties().getProperty('DTRT') === 'true' ? 'Enabled' : 'Disabled';
      
      const logEntry = `${timestamp} | ${user} | ${action} | ${details} | DTRT: ${dtrtStatus} | ${JSON.stringify(additionalData)}\n`;
      
      // Try to find existing log file
      const files = DriveApp.getFilesByName(fileName);
      let logFile;
      
      if (files.hasNext()) {
        logFile = files.next();
        const currentContent = logFile.getBlob().getDataAsString();
        logFile.setContent(currentContent + logEntry);
      } else {
        // Create new log file
        logFile = DriveApp.createFile(fileName, logEntry, MimeType.PLAIN_TEXT);
      }
      
    } catch (error) {
      console.error('Failed to log to file:', error);
    }
  }

  return {
    /**
     * Logs user activity using the configured method
     * @param {string} action - The action performed
     * @param {string} details - Additional details about the action
     * @param {any} additionalData - Any additional data to log
     */
    log(action, details = '', additionalData = {}) {
      // Use sheet logging by default, fallback to file if needed
      logToSheet(action, details, additionalData);
    },
    
    logToSheet,
    logToFile
  };
})();
