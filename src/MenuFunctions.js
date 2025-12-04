if (typeof require !== 'undefined') {
  const Exports = require('./Exports')
}
const head = (PropertiesService.getScriptProperties().getProperty('head') || 'head').toLowerCase() === 'true';

// These functions need to be global so that they can be
// accessed from the html client or from timers
/**
 * Execute the given command with the given credentials.
 * 
 * If no credentials are found then collect them from the user and try again.
 * @param {Function} command command to execute
 */

function getRWGPSLib_() {
  return head ? RWGPSLib : RWGPSLib12;
}

function getGlobals_() {
  const g2 = getGroupSpecs();
  const globals = getGlobals();
  globals["A_TEMPLATE"] = g2.A.TEMPLATE
  return globals;
}
function getRWGPSService_() {
  const credentialManager = getRWGPSLib_().newCredentialManager(PropertiesService.getScriptProperties())
  return getRWGPSLib_().newRWGPSService(getGlobals_(), credentialManager);
}

const MenuFunctions = (() => {
  function executeCommand(command, force = false) {
    const g2 = getGroupSpecs();
    const globals = getGlobals();
    globals["A_TEMPLATE"] = g2.A.TEMPLATE // Needed because RWGPSLib expects globals["A_TEMPLATE"]

    const rwgpsService = getRWGPSService_();
    const rwgps = getRWGPSLib_().newRWGPS(rwgpsService);
    
    // Create adapter and load selected rows
    const adapter = new ScheduleAdapter();
    let rows = adapter.loadSelected();
    const rowNumbers = rows.map(row => row.rowNum).join(", ");
    
    try {
      // User logging executed after they've agreed to any warnings in UIManager
      command(rows, rwgps, force);
    } catch (e) {
      // Log errors too
      UserLogger.log(`${command.name}_ERROR`, e.message, { 
        rowNumbers, 
        error: e.stack 
      });
      
      if (e instanceof AggregateError) {
        for (const error of e.errors) {
          console.error(error.stack);
        }
      } else if (e instanceof Error) {
        console.error(e.stack);
      } else {
        console.error("Unknown error: ", e);
      }
      throw (e);
    }
    finally {
      // Save all dirty rows
      adapter.save();
    }
  }
  
  return Object.freeze({
    cancelSelectedRides(force = false) {
      let command = Exports.Commands.cancelSelectedRidesWithCreds;
      executeCommand(command, force);
    },
    importSelectedRoutes(autoconfirm = false, force = false) {
      let command = Exports.Commands.importSelectedRoutesWithCredentials;
      executeCommand(command, autoconfirm, force);
    },
    linkSelectedRouteUrls(force = false) {
      let command = Exports.Commands.linkSelectedRouteUrlsWithCredentials;
      executeCommand(command, force);
    },
    reinstateSelectedRides(force = false) {
      let command = Exports.Commands.reinstateSelectedRidesWithCreds;
      executeCommand(command, force);
    },
    scheduleSelectedRides(force = false) {
      let command = Exports.Commands.scheduleSelectedRidesWithCredentials;
      executeCommand(command, force);
    },
    unscheduleSelectedRides(force = false) {
      let command = Exports.Commands.unscheduleSelectedRidesWithCreds;
      executeCommand(command, force);
    },

    updateRiderCount(force = false) {
      let command = Exports.Commands.updateRiderCountWithCreds;
      executeCommand(command, force);
    },
    updateSelectedRides(force = false) {
      let command = Exports.Commands.updateSelectedRidesWithCredentials;
      executeCommand(command, force);
    },
    
    /**
     * View retry queue status
     */
    viewRetryQueueStatus() {
      try {
        const retryQueue = new RetryQueue();
        const status = retryQueue.getStatus();
        
        let message = `Retry Queue Status\n\n`;
        message += `Total items in queue: ${status.totalItems}\n`;
        message += `Items due for retry now: ${status.dueNow}\n\n`;
        
        if (status.totalItems > 0) {
          message += `Age distribution:\n`;
          message += `  < 1 hour: ${status.byAge.lessThan1Hour}\n`;
          message += `  < 24 hours: ${status.byAge.lessThan24Hours}\n`;
          message += `  > 24 hours: ${status.byAge.moreThan24Hours}\n\n`;
          
          message += `Queue items:\n`;
          status.items.forEach(item => {
            message += `\n"${item.rideTitle}" - Row ${item.rowNum}\n`;
            message += `  Age: ${item.ageMinutes} minutes\n`;
            message += `  Attempts: ${item.attemptCount}\n`;
            message += `  Next retry: ${item.nextRetryAt}\n`;
            message += `  User email: ${item.userEmail}\n`;
          });
        } else {
          message += `Queue is empty.`;
        }
        
        SpreadsheetApp.getUi().alert('Retry Queue Status', message, SpreadsheetApp.getUi().ButtonSet.OK);
      } catch (error) {
        SpreadsheetApp.getUi().alert('Error', `Failed to get retry queue status: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
      }
    },
    
    /**
     * Manually trigger retry queue processing
     */
    processRetryQueueNow() {
      try {
        const retryQueue = new RetryQueue();
        const result = retryQueue.processQueue();
        
        let message = `Retry Queue Processing Complete\n\n`;
        message += `Processed: ${result.processed}\n`;
        message += `Succeeded: ${result.succeeded}\n`;
        message += `Failed: ${result.failed}\n`;
        message += `Remaining in queue: ${result.remaining}`;
        
        SpreadsheetApp.getUi().alert('Queue Processed', message, SpreadsheetApp.getUi().ButtonSet.OK);
      } catch (error) {
        SpreadsheetApp.getUi().alert('Error', `Failed to process retry queue: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
      }
    },
    
    /**
     * Send pending announcements for selected rows
     * Immediately sends announcements that are pending (ignoring SendAt time)
     */
    sendPendingAnnouncements() {
      try {
        const ui = SpreadsheetApp.getUi();
        const adapter = new ScheduleAdapter();
        const selectedRows = adapter.loadSelected();
        
        if (selectedRows.length === 0) {
          ui.alert('No Selection', 'Please select one or more rows with pending announcements.', ui.ButtonSet.OK);
          return;
        }
        
        // Filter for rows with pending announcements
        const pendingRows = selectedRows.filter(row => 
          row.Announcement && 
          row.Status === 'pending'
        );
        
        if (pendingRows.length === 0) {
          ui.alert('No Pending Announcements', 
            `None of the selected rows have pending announcements.\n\n` +
            `Selected rows: ${selectedRows.length}`, 
            ui.ButtonSet.OK);
          return;
        }
        
        // Confirm action
        const rowNumbers = pendingRows.map(r => r.rowNum).join(', ');
        const confirmMessage = `Send announcements for ${pendingRows.length} row(s)?\n\n` +
          `Rows: ${rowNumbers}\n\n` +
          `This will immediately send the announcements, regardless of the scheduled send time.`;
        
        const response = ui.alert('Confirm Send', confirmMessage, ui.ButtonSet.YES_NO);
        if (response !== ui.Button.YES) {
          return;
        }
        
        // Send announcements
        const manager = new AnnouncementManager();
        const now = new Date().getTime();
        let sent = 0;
        const failedRows = [];
        
        pendingRows.forEach(row => {
          try {
            const result = manager.sendAnnouncement(row);
            
            if (result.success) {
              row.Status = 'sent';
              row.LastAttemptAt = new Date(now);
              sent++;
            } else {
              failedRows.push({ rowNum: row.rowNum, error: result.error });
              
              // Update failure info
              const sendTime = row.SendAt.getTime();
              const attempts = row.Attempts + 1;
              const failureUpdate = Exports.AnnouncementCore.calculateFailureUpdate(attempts, sendTime, result.error, now);
              
              row.Status = failureUpdate.status;
              row.Attempts = failureUpdate.attempts;
              row.LastError = failureUpdate.lastError;
              row.LastAttemptAt = new Date(now);
            }
          } catch (error) {
            failedRows.push({ rowNum: row.rowNum, error: error.message });
          }
        });
        
        // Save all changes
        adapter.save();
        
        // Report results
        let message = `Announcement Processing Complete\n\n`;
        message += `Successfully sent: ${sent}\n`;
        message += `Failed: ${failedRows.length}\n`;
        
        if (failedRows.length > 0) {
          message += `\nFailed rows:\n`;
          failedRows.forEach(f => {
            message += `  Row ${f.rowNum}: ${f.error}\n`;
          });
        }
        
        const title = failedRows.length > 0 ? 'Completed with Errors' : 'Success';
        ui.alert(title, message, ui.ButtonSet.OK);
        
      } catch (error) {
        SpreadsheetApp.getUi().alert('Error', `Failed to send announcements: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
      }
    },
  })


})()