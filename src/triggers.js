/** @OnlyCurrentDoc */

// @ts-check
function onOpen() {
  createMenu_();


  // We store the original formulas here so that we can restore them if the user
  // accidentally overwrites them. They need to be stored outside of the spreadsheet 
  // because the onEdit trigger will overwrite them if they are stored in the spreadsheet itself
  // and onEdit only has access to old values, not formulas.
  Schedule.storeFormulas();
  initializeGlobals();
  initializeGroupCache();
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
    .addItem('Link Selected Route URLs', linkSelectedRouteUrls_.name)
    .addItem('Update Rider Count', updateRiderCount.name)
    .addSeparator()
    .addItem(getDTRTMenuText_(), toggleDTRT_.name)
    .addItem('Get App Version', showAppVersion_.name)
    .addToUi();
}

function getDTRTMenuText_() {
  return (dtrtIsEnabled_() ? "Disable" : "Enable") + " DTRT";
}

function dtrtIsEnabled_() {
  return PropertiesService.getUserProperties().getProperty('DTRT') === 'true';
}

function setDTRTSetting_(value) {
  PropertiesService.getUserProperties().setProperty('DTRT', value);
  alert_('DTRT setting has been ' + (value ? 'enabled' : 'disabled'));
}

function toggleDTRT_() {
  // Toggle the "Do The Right Thing" setting
  setDTRTSetting_(!dtrtIsEnabled_());
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
function linkSelectedRouteUrls_() {
  MenuFunctions.linkSelectedRouteUrls();
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
function updateRiderCount() {
  MenuFunctions.updateRiderCount();
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
  console.log(`myEdit called with event: ${JSON.stringify(event)}`);
  console.log(`event.oldValue: ${event.oldValue}`);
  console.log(`event.value: ${event.value}`);
  console.log(`event.range.getValue(): ${event.range.getValue()}`);
  console.log(`event.range.getFormula(): ${event.range.getFormula()}`);
  if (event.range.getRichTextValue()) {
    console.log(`event.range.getRichTextValue().getText(): ${event.range.getRichTextValue().getText()}`);
    console.log(`event.range.getRichTextValue().getLinkUrl(): ${event.range.getRichTextValue().getLinkUrl()}`);
  }
  const row = Schedule.getSelectedRows()[0];
  console.log(`Row data: ${JSON.stringify(row)}`);
  console.log(`ride URL: ${row.RideURL}`);
  console.log(`route URL: ${row.RouteURL}`);
  console.log(`isScheduled: ${row.isScheduled()}`);
}

/**
 * 
 * @param {GoogleAppsScript.Events.SheetsOnEdit} event The edit event
 */
function myEdit(event) {
  // event.value is only defined if the edited cell is a single cell
  editEventReport_(event);
  if (event.range.getSheet().getName() === Schedule.crSheet.getName()) {
    return handleCRSheetEdit_(event);
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
 * @returns {*|undefined} Returns the value from next() when processing continues, or undefined if the edit was rejected/handled.
 */
function handleCRSheetEdit_(event) {
  try {
    if (event.range.getNumRows() > 1 || event.range.getNumColumns() > 1) {
      alert_('Attempt to edit multipled route or ride cells. Only single cells can be edited.\n reverting back to previous values');
      for (let i = 0; i < event.range.getNumRows(); i++) {
        Schedule.restoreFormula(event.range.getRow() + i);
      }
      return;
    }
    const row = Schedule.getSelectedRows()[0];
    const colNum = event.range.getColumn();
    if (Schedule.isColumn(getGlobals().RIDECOLUMNNAME, colNum)) {
      alert_('No edits of Ride Column allowed.');
      event.range.setValue(event.oldValue);
      Schedule.restoreFormula(event.range.getRow());
      return;
    }
    // When copying a date it appears that this value is in event.range.getValue(), not in event.value!
    if ((event.value === event.oldValue) && !(event.range.getValue() || event.range.getFormula())) {
      console.log('No change to value, accepting edit');
      return;
    }
    // Don't allow group changes once scheduled
    if (row.isScheduled() && Schedule.isColumn(getGlobals().GROUPCOLUMNNAME, colNum)) {
      alert_('Group changes are not allowed once the ride is scheduled.');
      event.range.setValue(event.oldValue);
      return;
    }
    if (Schedule.isColumn(getGlobals().ROUTECOLUMNNAME, colNum)) {
      try {
        editRouteColumn_(event);
      } catch (e) {
        alert_(`Error: ${e.message} - the route cell will be reverted to its previous value.`);
        Schedule.restoreRouteFormula(event.range.getRow());
        return;
      }
    }
    return next_()
  } catch (e) {
    alert_(e.message)
    throw e
  }
}

function editRouteColumn_(event) {
  // pm.addProgress('Editing route column');
  let url = event.value || event.range.getRichTextValue().getLinkUrl() || event.range.getRichTextValue().getText() || event.range.getFormula();
  if (url.toLowerCase().startsWith("=hyperlink")) {
    ({ url } = parseHyperlinkFormula(url))
  }
  if (!url) {
    event.range.setValue(url);
    Schedule.storeRouteFormulas();
    return;
  }
  const route = getRoute(url);
  let name;
  if (route.user_id !== getGlobals().SCCCC_USER_ID) {
    const ui = SpreadsheetApp.getUi();
    const response = ui.prompt('Foreign Route Detected', 'Please enter a name for the foreign route:', ui.ButtonSet.OK_CANCEL);
    if (response.getSelectedButton() == ui.Button.OK) {
      name = response.getResponseText();
      name = name || getGlobals().FOREIGN_PREFIX + route.name;
    } else {
      name = getGlobals().FOREIGN_PREFIX + route.name;
    }
  } else {
    name = route.name;
  }
  event.range.setValue(`=hyperlink("${url}", "${name}")`);
  Schedule.storeRouteFormulas();
  if (route.user_id !== getGlobals().SCCCC_USER_ID) {
    // pm.addProgress('Importing foreign route');
    MenuFunctions.importSelectedRoutes(true);
    // pm.addProgress('Foreign route imported');
  }
  // pm.addProgress('Route column edited');
}

function alert_(message) {
  SpreadsheetApp.getUi().alert(message);
}

/**
 * Take the next action based on the current state.
 * 
 * Only if the dtrt system is enabled. 
 * 
 * @returns undefined
 */
function next_() {
  if (dtrtIsEnabled_()) {
    const force = true;
    const row = Schedule.getSelectedRows()[0];
    if (row.isScheduled()) {
      return MenuFunctions.updateSelectedRides(force);
    }
    if (row.isPlanned()) {
      return MenuFunctions.scheduleSelectedRides(force);
    }
  }
}






