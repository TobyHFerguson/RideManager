/// <reference path="./gas-globals.d.ts" />
/** @OnlyCurrentDoc */

// @ts-check

const _DTRT_KEY = 'DTRT_ENABLED_FOR_'
function onOpen() {
  createMenu_();


  // We store the original formulas here so that we can restore them if the user
  // accidentally overwrites them. They need to be stored outside of the spreadsheet 
  // because the onEdit trigger will overwrite them if they are stored in the spreadsheet itself
  // and onEdit only has access to old values, not formulas.
  const adapter = new ScheduleAdapter();
  adapter.storeFormulas();
}

function createMenu_() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Ride Schedulers')
    .addItem('Schedule Selected Rides', scheduleSelectedRides_.name)
    .addItem('Update Selected Rides', updateSelectedRides_.name)
    .addItem('Cancel Selected Rides', cancelSelectedRides_.name)
    .addItem('Reinstate Selected Rides', reinstateSelectedRides_.name)
    .addItem('Unschedule Selected Rides', unscheduleSelectedRides_.name)
    .addSeparator()
    .addItem('Import Selected Routes', importSelectedRoutes_.name)
    .addSeparator()
    .addItem('Test Selected Announcements', testSendAnnouncement_.name)
    .addItem('Send Pending Announcements', sendPendingAnnouncements_.name)
    .addSeparator()
    .addItem('View Retry Queue Status', viewRetryQueueStatus_.name)
    .addItem('Process Retry Queue Now', processRetryQueueNow_.name)
    .addSeparator()
    .addItem('Install Triggers', installTriggers_.name)
    .addItem(getDTRTMenuText_(), toggleDTRT_.name)
    .addItem('Get App Version', showAppVersion_.name)
    .addToUi();
}

function getDTRTMenuText_() {
  return (dtrtIsEnabled_() ? "Disable" : "Enable") + " DTRT";
}

function dtrtIsEnabled_() {
  const userEmail = Session.getActiveUser().getEmail();
  const props = PropertiesService.getScriptProperties();
  const currentStatus = props.getProperty(_DTRT_KEY + userEmail);
  return currentStatus === 'true';
}

function toggleDTRT_() {
  const userEmail = Session.getActiveUser().getEmail();
  if (!userEmail) {
    alert_("Authorization required to identify user.");
    return;
  }

  const newStatus = dtrtIsEnabled_() ? 'false' : 'true';
  const props = PropertiesService.getScriptProperties();
  props.setProperty(_DTRT_KEY + userEmail, newStatus);
  alert_('DTRT setting has been ' + (dtrtIsEnabled_() ? 'enabled' : 'disabled'));
  createMenu_();
}



/**
 * Shows the application version in an alert box.
 * This function is called when the 'Get App Version' menu item is clicked.
 */
function showAppVersion_() {
  // Get the active spreadsheet UI.
  var ui = SpreadsheetApp.getUi();

  // Get the app version using the getAppVersion function.
  var appVersion = getAppVersion();

  // Display the app version in an alert box.
  ui.alert('App Version', 'Current App Version: ' + appVersion, ui.ButtonSet.OK);
}

function cancelSelectedRides_() {
  MenuFunctions.cancelSelectedRides();
}
function importSelectedRoutes_() {
  MenuFunctions.importSelectedRoutes();
}
function reinstateSelectedRides_() {
  MenuFunctions.reinstateSelectedRides();
}
function scheduleSelectedRides_() {
  MenuFunctions.scheduleSelectedRides();
}
function unscheduleSelectedRides_() {
  MenuFunctions.unscheduleSelectedRides();
}
function updateSelectedRides_() {
  MenuFunctions.updateSelectedRides();
}


/**
 * Reports the details of an edit event.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} event The edit event.
 */
function editEventReport_(event) {
  const activeUser = Session.getActiveUser();
  const userEmail = activeUser ? activeUser.getEmail() : 'Unknown User';
  console.log(`User ${userEmail} edited the spreadsheet. DTRT is ${dtrtIsEnabled_() ? 'enabled' : 'disabled'}`);
  console.log(`editHandler called with event: ${JSON.stringify(event)}`);
  console.log(`event.oldValue: ${event.oldValue}`);
  console.log(`event.value: ${event.value}`);
  console.log(`event.range.getValue(): ${event.range.getValue()}`);
  console.log(`event.range.getFormula(): ${event.range.getFormula()}`);
  if (event.range.getRichTextValue()) {
    const richText = event.range.getRichTextValue();
    console.log(`event.range.getRichTextValue().getText(): ${richText?.getText()}`);
    console.log(`event.range.getRichTextValue().getLinkUrl(): ${richText?.getLinkUrl()}`);
  }
  const adapter = new ScheduleAdapter();
  const row = adapter.loadSelected()[0];
  //  console.log(`ride URL: ${row.RideURL}`);
  console.log(`route URL: ${row.RouteURL}`);
  console.log(`isScheduled: ${row.isScheduled()}`);
}

/**
 * 
 * @param {GoogleAppsScript.Events.SheetsOnEdit} event The edit event
 */
function editHandler(event) {
  // event.value is only defined if the edited cell is a single cell
  editEventReport_(event);
  const adapter = new ScheduleAdapter();
  if (event.range.getSheet().getName() === adapter.getSheetName()) {
    return handleCRSheetEdit_(event, adapter);
  } else { // Assume that the edit was a different sheet
    console.log('Calling CacheManager.clearCache()');
    Exports.CacheManager.clearCache();
  }
}

/**
 * Handle an edit on the community rides (CR) sheet.
 *
 * Validations and behavior:
 * - Rejects multi-cell edits for route/ride areas and restores formulas for affected rows.
 * - Prevents deletion of scheduled rides (reverts the edit and restores formulas).
 * - Detects a copy/paste date quirk where the copied value may appear on range.getValue()
 *   rather than event.value and permits edits that did not actually change the cell.
 * - Prevents changing the group column for a ride once it is scheduled (reverts the edit).
 * - Delegates edits to the route column to editRouteColumn_ and restores the route formula
 *   on errors raised during that processing.
 * - On various validation failures or errors, notifies the user via alert_ and reverts/repairs
 *   the sheet state using Schedule.restoreFormula / Schedule.restoreRouteFormula as appropriate.
 *
 * This function relies on globals/helpers available in the script context:
 * Schedule, editRouteColumn_,alert_, getGlobals(), next(), etc.
 *
 * @private
 * @param {GoogleAppsScript.Events.SheetsOnEdit} event
 * @param {InstanceType<typeof ScheduleAdapter>} adapter - Reusable adapter instance
 * @returns {*|undefined} Returns the value from next() when processing continues, or undefined if the edit was rejected/handled.
 */
function handleCRSheetEdit_(event, adapter) {
  try {
    if (event.range.getNumRows() > 1 || event.range.getNumColumns() > 1) {
      alert_('Attempt to edit multiple route or ride cells. Only single cells can be edited.\n reverting back to previous values');
      for (let i = 0; i < event.range.getNumRows(); i++) {
        adapter.restoreFormula(event.range.getRow() + i, 'Ride');
        adapter.restoreFormula(event.range.getRow() + i, 'Route');
      }
      return;
    }
    const row = adapter.loadSelected()[0];
    const colNum = event.range.getColumn();
    if (adapter.isColumn(getGlobals().RIDECOLUMNNAME, colNum)) {
      alert_('No edits of Ride Column allowed.');
      event.range.setValue(event.oldValue);
      adapter.restoreFormula(event.range.getRow(), 'Ride');
      return;
    }
    // When copying a date it appears that this value is in event.range.getValue(), not in event.value!
    if ((event.value === event.oldValue) && !(event.range.getValue() || event.range.getFormula())) {
      console.log('No change to value, accepting edit');
      return;
    }
    // Don't allow group changes once scheduled
    if (row.isScheduled() && adapter.isColumn(getGlobals().GROUPCOLUMNNAME, colNum)) {
      alert_('Group changes are not allowed once the ride is scheduled.');
      event.range.setValue(event.oldValue);
      return;
    }
    if (adapter.isColumn(getGlobals().ROUTECOLUMNNAME, colNum)) {
      try {
        editRouteColumn_(event, adapter, row.isScheduled());
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        alert_(`Error: ${error.message} - the route cell will be reverted to its previous value.`);
        adapter.restoreFormula(event.range.getRow(), 'Route');
        return;
      }
    }
    return next_(adapter)
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    alert_(error.message)
    throw error
  }
}

/**
 * Edit the route column - handles GAS interactions and delegates logic to RouteColumnEditor
 * @param {GoogleAppsScript.Events.SheetsOnEdit} event
 * @param {*} adapter - ScheduleAdapter instance
 */
function editRouteColumn_(event, adapter, scheduled) {
  // Get raw input from various possible sources
  const inputValue = event.value ||
    event.range.getRichTextValue()?.getLinkUrl() ||
    event.range.getRichTextValue()?.getText() ||
    event.range.getFormula();

  // Parse the input
  const { url } = RouteColumnEditor.parseRouteInput(inputValue);

  // Handle empty/cleared route
  if (!url) {
    if (scheduled) {
      throw new Error('When there\'s a ride the route URL cannot be empty.');
    } else {
      event.range.setValue('');
      SpreadsheetApp.flush();
      adapter.storeRouteFormulas();
      return;
    }
  }

  // Fetch route data from RWGPS (GAS operation), skipping the local cache
  const route = getRoute(url, true);

  // Prompt for foreign route name if needed (GAS operation)
  let userProvidedName;
  if (route.user_id !== getGlobals().SCCCC_USER_ID) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt(
      'Foreign Route Detected',
      'Please enter a name for the foreign route:',
      ui.ButtonSet.OK_CANCEL
    );
    if (response.getSelectedButton() == ui.Button.OK) {
      userProvidedName = response.getResponseText() || undefined;
    }
  }

  // Process the route edit (pure logic)
  const { formula, isForeign } = RouteColumnEditor.processRouteEdit({
    inputValue,
    route,
    clubUserId: getGlobals().SCCCC_USER_ID,
    foreignPrefix: getGlobals().FOREIGN_PREFIX,
    userProvidedName
  });

  // Write the formula (GAS operation)
  event.range.setValue(formula);
  SpreadsheetApp.flush();
  adapter.storeRouteFormulas();

  // Import foreign routes (GAS operation)
  if (isForeign) {
    MenuFunctions.importSelectedRoutes(true);
  }
}

/**
 * @param {string} message
 */
function alert_(message) {
  SpreadsheetApp.getUi().alert(message);
}

/**
 * Take the next action based on the current state.
 * 
 * Uses ActionSelector to determine action, then executes via MenuFunctions.
 * Only active if DTRT system is enabled.
 * 
 * @param {*} adapter - ScheduleAdapter instance
 * @returns undefined
 */
function next_(adapter) {
  const dtrtEnabled = dtrtIsEnabled_();

  if (!dtrtEnabled) {
    return;
  }

  const row = adapter.loadSelected()[0];

  // Determine what action to take (pure logic)
  const { action, message } = ActionSelector.determineNextAction({
    isScheduled: row.isScheduled(),
    isPlanned: row.isPlanned()
  }, dtrtEnabled);

  // Execute the action (GAS operations)
  const force = true;
  switch (action) {
    case 'update':
      MenuFunctions.updateSelectedRides(force);
      if (message) alert_(message);
      break;

    case 'schedule':
      MenuFunctions.scheduleSelectedRides(force);
      if (message) alert_(message);
      break;

    case 'none':
    default:
      // No action needed
      break;
  }
}

function viewRetryQueueStatus_() {
  MenuFunctions.viewRetryQueueStatus();
}

function processRetryQueueNow_() {
  MenuFunctions.processRetryQueueNow();
}

/**
 * Send pending announcements for selected rows
 */
function sendPendingAnnouncements_() {
  MenuFunctions.sendPendingAnnouncements();
}

/**
 * Process announcement queue (called by hourly trigger)
 * This function is registered by AnnouncementManager when items are queued
 */
function processAnnouncementQueue() {
  try {
    const manager = new AnnouncementManager();
    const result = manager.processQueue();
    //Debug console.log(`processAnnouncementQueue: Sent ${result.sent}, reminded ${result.reminded}, failed ${result.failed}, remaining ${result.remaining}`);
  } catch (error) {
    console.error('processAnnouncementQueue error:', error);
  }
}

/**
 * Test announcement sending (for development/testing)
 * Sends announcements from selected rows to a test email address
 * Does NOT update the Status column, so announcements will still be sent at scheduled time
 */
function testSendAnnouncement_() {
  try {
    const ui = SpreadsheetApp.getUi();
    const adapter = new ScheduleAdapter();
    const selectedRows = adapter.loadSelected();

    if (selectedRows.length === 0) {
      ui.alert('No Selection', 'Please select one or more rows with announcements to test.', ui.ButtonSet.OK);
      return;
    }

    // Filter for rows with announcements
    const rowsWithAnnouncements = selectedRows.filter(/** @param {any} r */ r => r.Announcement);

    if (rowsWithAnnouncements.length === 0) {
      ui.alert('No Announcements',
        `None of the selected rows have announcements.\n\nSelected rows: ${selectedRows.length}`,
        ui.ButtonSet.OK);
      return;
    }

    // Ask for test email address
    const rowNumbers = rowsWithAnnouncements.map(/** @param {any} r */ r => r.rowNum).join(', ');
    const emailResponse = ui.prompt(
      'Test Email Address',
      `Enter test email address to send ${rowsWithAnnouncements.length} announcement(s) for:\nRows: ${rowNumbers}`,
      ui.ButtonSet.OK_CANCEL
    );

    if (emailResponse.getSelectedButton() !== ui.Button.OK) {
      return;
    }

    const testEmail = emailResponse.getResponseText().trim();
    if (!testEmail || !testEmail.includes('@')) {
      ui.alert('Invalid Email', 'Please enter a valid email address.', ui.ButtonSet.OK);
      return;
    }

    // Confirm
    const rideNames = rowsWithAnnouncements.map(/** @param {any} r */ r => r.RideName || 'Unknown').join('\n  • ');
    const confirmResponse = ui.alert(
      'Confirm Test Send',
      `Send ${rowsWithAnnouncements.length} announcement(s) to:\n${testEmail}\n\nRides:\n  • ${rideNames}\n\nThis will NOT update the Status column in the spreadsheet.`,
      ui.ButtonSet.YES_NO
    );

    if (confirmResponse !== ui.Button.YES) {
      return;
    }

    // Send announcements
    const manager = new AnnouncementManager();
    let successCount = 0;
    /** @type {any[]} */
    const failedRows = [];

    rowsWithAnnouncements.forEach(/** @param {any} row */(row) => {
      try {
        // Temporarily override the recipient email in globals
        const globals = getGlobals();
        const tempGlobals = { ...globals, RIDE_ANNOUNCEMENT_EMAIL: testEmail };

        // Mock getGlobals to return test email
        const originalGetGlobals = /** @type {function(): any} */ (this.getGlobals);
        this.getGlobals = /** @type {function(): any} */ (function () { return tempGlobals; });

        // Send the announcement
        const result = manager.sendAnnouncement(row);

        // Restore original getGlobals
        this.getGlobals = originalGetGlobals;

        if (result.success) {
          successCount++;
        } else {
          failedRows.push({ rowNum: row.rowNum, rideName: row.RideName, error: result.error });
        }

      } catch (e) {
        const error = /** @type {Error} */ (e);
        failedRows.push({ rowNum: row.rowNum, rideName: row.RideName, error: error.message });
        console.error(`testSendAnnouncement_ error for row ${row.rowNum}:`, error);
      }
    });

    // Report results
    let message = `Test Send Complete\n\n`;
    message += `Successfully sent: ${successCount}\n`;
    message += `Failed: ${failedRows.length}\n\n`;

    if (failedRows.length > 0) {
      message += `Failed announcements:\n`;
      failedRows.forEach(/** @param {{rowNum: number, rideName: string, error: string}} f */ f => {
        message += `  Row ${f.rowNum} (${f.rideName}): ${f.error}\n`;
      });
      message += `\n`;
    }

    if (successCount > 0) {
      message += `Check your inbox at ${testEmail} (and spam folder).\n\n`;
    }

    message += `Note: The Status column was NOT updated - announcements will still be sent at the scheduled time to the production email address.`;

    const title = failedRows.length > 0 ? 'Test Send Completed with Errors' : 'Test Send Successful';
    ui.alert(title, message, ui.ButtonSet.OK);

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('testSendAnnouncement_ error:', err);
    alert_(`Error in test send: ${err.message}`);
  }
}

// ========== TRIGGER HANDLERS ==========

/**
 * Daily backstop check for announcements
 * Runs once per day to catch missed announcements and ensure scheduled trigger exists
 * Owner-only (trigger should only be created by owner)
 */
function dailyAnnouncementCheck() {
  try {
    console.log('dailyAnnouncementCheck: Starting daily backstop check');
    UserLogger.log('DAILY_ANNOUNCEMENT_CHECK', 'Starting daily backstop check', {});

    const manager = new AnnouncementManager();

    // Process any missed or due announcements
    const result = manager.processQueue();

    console.log('dailyAnnouncementCheck: Completed', result);
    UserLogger.log('DAILY_ANNOUNCEMENT_CHECK_COMPLETE', 'Daily backstop check completed', result);

  } catch (e) {
    const error = /** @type {Error} */ (e);
    console.error('Daily announcement check failed:', error);
    UserLogger.log('DAILY_ANNOUNCEMENT_CHECK_ERROR', 'Daily backstop check failed', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Scheduled announcement trigger
 * Fires at specific time to send pending announcement(s)
 * Owner-only (trigger created by owner via TriggerManager)
 */
function announcementTrigger() {
  try {
    console.log('announcementTrigger: Processing scheduled announcements');
    UserLogger.log('ANNOUNCEMENT_TRIGGER', 'Processing scheduled announcements', {});

    const manager = new AnnouncementManager();

    // Process due announcements
    const result = manager.processQueue();

    console.log('announcementTrigger: Completed', result);
    UserLogger.log('ANNOUNCEMENT_TRIGGER_COMPLETE', 'Scheduled announcements processed', result);

    // Clean up this trigger since it has fired
    try {
      const triggerManager = new TriggerManager();
      triggerManager.removeAnnouncementTrigger();
      console.log('announcementTrigger: Cleaned up trigger');
    } catch (cleanupError) {
      console.warn('announcementTrigger: Failed to cleanup trigger:', cleanupError);
      // Non-fatal - daily backstop will handle cleanup
    }

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('announcementTrigger error:', err);
    UserLogger.log('ANNOUNCEMENT_TRIGGER_ERROR', 'Scheduled announcement processing failed', {
      error: err.message,
      stack: err.stack
    });
  }
}

/**
 * Daily backstop check for retry queue
 * Runs once per day to catch missed retries and ensure scheduled trigger exists
 * Owner-only (trigger should only be created by owner)
 */
function dailyRetryCheck() {
  try {
    console.log('dailyRetryCheck: Starting daily backstop check');
    UserLogger.log('DAILY_RETRY_CHECK', 'Starting daily backstop check', {});

    const retryQueue = new RetryQueue();

    // Process any missed or due retries
    const result = retryQueue.processQueue();

    console.log('dailyRetryCheck: Completed', result);
    UserLogger.log('DAILY_RETRY_CHECK_COMPLETE', 'Daily backstop check completed', result);

  } catch (e) {
    const error = /** @type {Error} */ (e);
    console.error('Daily retry check failed:', error);
    UserLogger.log('DAILY_RETRY_CHECK_ERROR', 'Daily backstop check failed', {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Scheduled retry queue trigger
 * Fires at specific time to process due retry operations
 * Owner-only (trigger created by owner via TriggerManager)
 */
function retryQueueTrigger() {
  try {
    console.log('retryQueueTrigger: Processing due retries');
    UserLogger.log('RETRY_QUEUE_TRIGGER', 'Processing due retries', {});

    const retryQueue = new RetryQueue();

    // Process due retries
    const result = retryQueue.processQueue();

    console.log('retryQueueTrigger: Completed', result);
    UserLogger.log('RETRY_QUEUE_TRIGGER_COMPLETE', 'Due retries processed', result);

    // Clean up this trigger since it has fired
    try {
      const triggerManager = new TriggerManager();
      triggerManager.removeRetryTrigger();
      console.log('retryQueueTrigger: Cleaned up trigger');
    } catch (cleanupError) {
      console.warn('retryQueueTrigger: Failed to cleanup trigger:', cleanupError);
      // Non-fatal - daily backstop will handle cleanup
    }

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('retryQueueTrigger error:', err);
    UserLogger.log('RETRY_QUEUE_TRIGGER_ERROR', 'Retry queue processing failed', {
      error: err.message,
      stack: err.stack
    });
  }
}

/**
 * Install all required triggers (owner-only)
 * Called from menu item: Ride Schedulers > Install Triggers
 * Idempotent: Safe to call multiple times
 */
function installTriggers_() {
  const ui = SpreadsheetApp.getUi();

  try {
    const triggerManager = new TriggerManager();

    // Check if current user is owner
    if (!triggerManager.isOwner()) {
      const owner = SpreadsheetApp.getActiveSpreadsheet().getOwner()?.getEmail() || 'unknown';
      const currentUser = Session.getEffectiveUser().getEmail();

      const message = `Only the spreadsheet owner can install triggers.\n\n` +
        `Owner: ${owner}\n` +
        `Current user: ${currentUser}\n\n` +
        `Please ask the owner to run this menu item.`;

      ui.alert('Owner Permission Required', message, ui.ButtonSet.OK);

      UserLogger.log('INSTALL_TRIGGERS_DENIED', 'Non-owner attempted to install triggers', {
        owner,
        currentUser
      });

      return;
    }

    // Confirm with owner before installing
    const confirmMessage = `This will install ALL required triggers:\n\n` +
      `• onOpen (runs when spreadsheet opens)\n` +
      `• onEdit (runs when cells are edited)\n` +
      `• Daily Announcement Check (runs at 2 AM daily)\n` +
      `• Daily Retry Queue Check (runs at 2 AM daily)\n` +
      `• Daily RWGPS Members Sync (runs at 2 AM daily)\n\n` +
      `Scheduled triggers for specific announcements or retries\n` +
      `will be created automatically as needed.\n\n` +
      `This operation is safe to run multiple times (idempotent).\n\n` +
      `Continue?`;

    const response = ui.alert('Install Triggers', confirmMessage, ui.ButtonSet.YES_NO);

    if (response !== ui.Button.YES) {
      UserLogger.log('INSTALL_TRIGGERS_CANCELLED', 'User cancelled trigger installation', {});
      return;
    }

    // Install triggers
    const summary = triggerManager.installAllTriggers();

    // Build success message
    let message = `Trigger Installation Complete\n\n`;
    message += `Installed: ${summary.installed}\n`;
    message += `Already existed: ${summary.existed}\n`;

    if (summary.failed > 0) {
      message += `Failed: ${summary.failed}\n\n`;
      message += `Check the execution log for details on failures.`;
    } else {
      message += `\nAll triggers are now active and running as the spreadsheet owner.`;
    }

    const title = summary.failed > 0 ? 'Installation Completed with Errors' : 'Installation Successful';
    ui.alert(title, message, ui.ButtonSet.OK);

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('installTriggers_ error:', err);

    const message = `Error installing triggers:\n\n${err.message}\n\n` +
      `Check the execution log for details.`;

    ui.alert('Installation Failed', message, ui.ButtonSet.OK);
  }
}

/**
 * Fetch and update RWGPS club members (called by daily trigger)
 * This function is designed to run at 2am daily via a time-based trigger
 * configured in the Apps Script project settings.
 * 
 * The trigger should be set up as:
 * - Trigger type: Time-driven
 * - Type of time based trigger: Day timer
 * - Time of day: 2am to 3am
 * 
 * Creates/updates the "RWGPS Members" sheet with current club member names.
 */
function dailyRWGPSMembersDownload() {
  try {
    // @ts-expect-error - getRWGPS is defined in RWGPSFunctions.js
    const adapter = new RWGPSMembersAdapter(getRWGPS());
    const result = adapter.updateMembers();

    console.log(`dailyRWGPSMembersDownload: Successfully updated ${result.validMembers} members (${result.filteredOut} filtered out from ${result.totalMembers} total)`);
  } catch (error) {
    console.error('dailyRWGPSMembersDownload error:', error);
    // Don't throw - let the trigger continue on next scheduled run
  }
}














