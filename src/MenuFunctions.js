// @ts-check
/// <reference path="./gas-globals.d.ts" />
if (typeof require !== 'undefined') {
  const Exports = require('./Exports')
}
const head = (PropertiesService.getScriptProperties().getProperty('RWGPSLIB_VERSION') || ' ');

// These functions need to be global so that they can be
// accessed from the html client or from timers
/**
 * Execute the given command with the given credentials.
 * 
 * If no credentials are found then collect them from the user and try again.
 */

function getRWGPSLib_() {
  let lib;
  switch (head.trim()) {
    case '12':
      lib = RWGPSLib12;
      break;
    case '13':
      lib = RWGPSLib13;
      break;
    default:
      lib = RWGPSLib;
  }
  return lib;
}

/**
 * Get RWGPS adapter using internal implementation
 * @returns {InstanceType<typeof RWGPSAdapter>} RWGPS adapter instance
 */
function getRWGPSInternal() {
  const g2 = getGroupSpecs();
  const globals = getGlobals();
  globals["A_TEMPLATE"] = g2.A.TEMPLATE;
  
  return new RWGPSAdapter(globals, PropertiesService.getScriptProperties());
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

function getRWGPS() {
  // Use internal adapter if RWGPSLIB_VERSION is set to 'internal'
  // Note: Read property fresh each time, don't use cached `head` variable
  const version = (PropertiesService.getScriptProperties().getProperty('RWGPSLIB_VERSION') || '').trim();
  if (version === 'internal') {
    return getRWGPSInternal();
  }
  
  // Otherwise use external library
  const rwgpsService = getRWGPSService_();
  return getRWGPSLib_().newRWGPS(rwgpsService); 
}

const MenuFunctions = (() => {
  /**
   * Execute a ride operation using RideCoordinator
   * @param {(rows: InstanceType<typeof RowCore>[], rwgps: any, adapter: InstanceType<typeof ScheduleAdapter>, force?: boolean) => void} operation
   * @param {boolean} [force]
   */
  function executeOperation(operation, force = false) {
    const g2 = getGroupSpecs();
    const globals = getGlobals();
    globals["A_TEMPLATE"] = g2.A.TEMPLATE // Needed because RWGPSLib expects globals["A_TEMPLATE"]

    // Use getRWGPS() to automatically select internal or external implementation
    const rwgps = getRWGPS();
    
    // Create adapter and load selected rows
    const adapter = new ScheduleAdapter();
    let rows = adapter.loadSelected();
    const rowNumbers = rows.map(row => row.rowNum).join(", ");
    
    try {
      // Execute operation (validation and confirmation handled by RideCoordinator)
      operation(rows, rwgps, adapter, force);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      // Log errors
      UserLogger.log(`${operation.name}_ERROR`, error.message, { 
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
      // Note: adapter.save() is now called inside RideCoordinator operations
      // before showing success dialogs, so spreadsheet updates complete before
      // user sees confirmation. No need to save again here.
    }
  }
  
  return Object.freeze({
    cancelSelectedRides(force = false) {
      executeOperation(RideCoordinator.cancelRides, force);
    },
    importSelectedRoutes(force = false) {
      executeOperation(RideCoordinator.importRoutes, force);
    },
    reinstateSelectedRides(force = false) {
      executeOperation(RideCoordinator.reinstateRides, force);
    },
    scheduleSelectedRides(force = false) {
      executeOperation(RideCoordinator.scheduleRides, force);
    },
    unscheduleSelectedRides(force = false) {
      executeOperation(RideCoordinator.unscheduleRides, force);
    },
    updateSelectedRides(force = false) {
      executeOperation(RideCoordinator.updateRides, force);
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
          row.announcementCell && 
          row.status === 'pending'
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
        /** @type {Array<{rowNum: number, rideName: string, routeName: string, emailAddress?: string, error: string}>} */
        const failedRows = [];
        /** @type {Array<{rowNum: number, rideName: string, routeName: string, emailAddress: string}>} */
        const sentRows = [];
        
        pendingRows.forEach(row => {
          try {
            // @ts-expect-error - sendAnnouncement expects AnnouncementQueueItem but this passes Row directly
            // TODO: This should be refactored to properly convert Row to AnnouncementQueueItem or use a Row-based API
            const result = manager.sendAnnouncement(row);
            
            if (result.success) {
              row.setStatus('sent');
              row.setLastAttemptAt(new Date(now));
              sent++;
              
              // Capture send details for logging
              sentRows.push({ 
                rowNum: row.rowNum, 
                rideName: row.rideName || '(unnamed)',
                routeName: row.routeName || '(unnamed)',
                emailAddress: result.emailAddress || '(unknown)'
              });
            } else {
              failedRows.push({ 
                rowNum: row.rowNum, 
                rideName: row.rideName || '(unnamed)',
                routeName: row.routeName || '(unnamed)',
                emailAddress: result.emailAddress,
                error: result.error || 'Unknown error' 
              });
              
              // Update failure info
              row.setStatus('failed');
              row.setAttempts(row.attempts + 1);
              row.setLastError(result.error || 'Unknown error');
              row.setLastAttemptAt(new Date(now));
            }
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            failedRows.push({ 
              rowNum: row.rowNum, 
              rideName: row.rideName || '(unnamed)',
              routeName: row.routeName || '(unnamed)',
              error: err.message 
            });
          }
        });
        
        // Build row descriptions with ride/route names for logging
        const rowDescriptions = sentRows.map(r => {
          const name = r.rideName || r.routeName || '(unnamed)';
          const nameType = r.rideName ? 'ride' : 'route';
          return `${r.rowNum} (${nameType}: ${name})`;
        }).join(', ');
        
        // Log to UserLogger
        UserLogger.log('SEND_ANNOUNCEMENTS', `Rows: ${rowDescriptions}`, {
          sent: sent,
          failed: failedRows.length,
          sentRows: sentRows.map(r => ({
            rowNum: r.rowNum,
            rideName: r.rideName,
            emailAddress: r.emailAddress
          })),
          failedRows: failedRows.map(f => ({
            rowNum: f.rowNum,
            rideName: f.rideName,
            error: f.error
          }))
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