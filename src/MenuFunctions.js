// @ts-check
/// <reference path="./gas-globals.d.ts" />
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
  /**
   * @param {(rows: InstanceType<typeof Row>[], rwgps: any, force?: boolean) => void} command
   * @param {boolean} [force]
   */
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
      const error = e instanceof Error ? e : new Error(String(e));
      // Log errors too
      UserLogger.log(`${command.name}_ERROR`, error.message, { 
        rowNumbers, 
        error: error.stack 
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
      let command = Commands.cancelSelectedRidesWithCreds;
      executeCommand(command, force);
    },
    importSelectedRoutes(force = false) {
      let command = Commands.importSelectedRoutesWithCredentials;
      executeCommand(command, force);
    },
    reinstateSelectedRides(force = false) {
      let command = Commands.reinstateSelectedRidesWithCreds;
      executeCommand(command, force);
    },
    scheduleSelectedRides(force = false) {
      let command = Commands.scheduleSelectedRidesWithCredentials;
      executeCommand(command, force);
    },
    unscheduleSelectedRides(force = false) {
      let command = Commands.unscheduleSelectedRidesWithCreds;
      executeCommand(command, force);
    },
    updateSelectedRides(force = false) {
      let command = Commands.updateSelectedRidesWithCredentials;
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
        message += `Total items in queue: ${status.itemCount}\n`;
        message += `Items due for retry now: ${status.statistics.dueNow}\n\n`;
        
        if (status.itemCount > 0) {
          message += `Age distribution:\n`;
          message += `  < 1 hour: ${status.statistics.byAge.lessThan1Hour}\n`;
          message += `  < 24 hours: ${status.statistics.byAge.lessThan24Hours}\n`;
          message += `  > 24 hours: ${status.statistics.byAge.moreThan24Hours}\n\n`;
          
          message += `Queue items:\n`;
          status.items.forEach((/** @type {any} */ item) => {
            message += `\n"${item.rideTitle}" - Row ${item.rowNum}\n`;
            message += `  Age: ${item.age} minutes\n`;
            message += `  Attempts: ${item.attemptCount}\n`;
            message += `  Next retry: ${item.nextRetryAt}\n`;
            message += `  User email: ${item.userEmail}\n`;
          });
        } else {
          message += `Queue is empty.`;
        }
        
        SpreadsheetApp.getUi().alert('Retry Queue Status', message, SpreadsheetApp.getUi().ButtonSet.OK);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        SpreadsheetApp.getUi().alert('Error', `Failed to get retry queue status: ${err.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
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
        const err = error instanceof Error ? error : new Error(String(error));
        SpreadsheetApp.getUi().alert('Error', `Failed to process retry queue: ${err.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
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
        /** @type {Array<{rowNum: number, error: string}>} */
        const failedRows = [];
        
        pendingRows.forEach(row => {
          try {
            // @ts-expect-error - sendAnnouncement expects AnnouncementQueueItem but this passes Row directly
            // TODO: This should be refactored to properly convert Row to AnnouncementQueueItem or use a Row-based API
            const result = manager.sendAnnouncement(row);
            
            if (result.success) {
              row.Status = 'sent';
              row.LastAttemptAt = new Date(now);
              sent++;
            } else {
              failedRows.push({ rowNum: row.rowNum, error: result.error || 'Unknown error' });
              
              // Update failure info
              const sendTime = row.SendAt ? row.SendAt.getTime() : now;
              const attempts = row.Attempts + 1;
              const failureUpdate = AnnouncementCore.calculateFailureUpdate(attempts, sendTime, result.error || 'Unknown error', now);
              
              row.Status = failureUpdate.status;
              row.Attempts = failureUpdate.attempts;
              row.LastError = failureUpdate.lastError;
              row.LastAttemptAt = new Date(now);
            }
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            failedRows.push({ rowNum: row.rowNum, error: err.message });
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
        const err = error instanceof Error ? error : new Error(String(error));
        SpreadsheetApp.getUi().alert('Error', `Failed to send announcements: ${err.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
      }
    },
  })


})()