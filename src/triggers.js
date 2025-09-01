/** @OnlyCurrentDoc */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Ride Schedulers')
    .addItem('Schedule Selected Rides', "scheduleSelectedRides")
    .addItem('Update Selected Rides', "updateSelectedRides")
    .addItem('Cancel Selected Rides', "cancelSelectedRides")
    .addItem('Reinstate Selected Rides', "reinstateSelectedRides")
    .addItem('Unschedule Selected Rides', "unscheduleSelectedRides")
    .addSeparator()
    .addItem('Import Selected Routes', "importSelectedRoutes")
    .addItem('Link Selected Route URLs', "linkSelectedRouteUrls")
    .addItem('Update Rider Count', "updateRiderCount")
    .addToUi();

    ui.createMenu('App Actions')
      // Add a menu item 'Get App Version' that calls the 'showAppVersion' function.
      .addItem('Get App Version', 'showAppVersion')
      // Add the menu to the UI.
      .addToUi();

  // We store the original formulas here so that we can restore them if the user
  // accidentally overwrites them. They need to be stored outside of the spreadsheet 
  // because the onEdit trigger will overwrite them if they are stored in the spreadsheet itself
  // and onEdit only has access to old values, not formulas.
  Schedule.storeFormulas();
  initializeGlobals();
  initializeGroupCache();
}

/**
 * Shows the application version in an alert box.
 * This function is called when the 'Get App Version' menu item is clicked.
 */
function showAppVersion() {
  // Get the active spreadsheet UI.
  var ui = SpreadsheetApp.getUi();

  // Get the app version using the getAppVersion function.
  var appVersion = getAppVersion();

  // Display the app version in an alert box.
  ui.alert('App Version', 'Current App Version: ' + appVersion, ui.ButtonSet.OK);
}

function cancelSelectedRides() {
  MenuFunctions.cancelSelectedRides();
}
function importSelectedRoutes() {
  MenuFunctions.importSelectedRoutes();
}
function linkSelectedRouteUrls() {
  MenuFunctions.linkSelectedRouteUrls();
}
function reinstateSelectedRides() {
  MenuFunctions.reinstateSelectedRides();
}
function scheduleSelectedRides() {
  MenuFunctions.scheduleSelectedRides();
}
function unscheduleSelectedRides() {
  MenuFunctions.unscheduleSelectedRides();
}
function updateRiderCount() {
  MenuFunctions.updateRiderCount();
}
function updateSelectedRides() {
  MenuFunctions.updateSelectedRides();
}


/**
* Checks if a given range contains a specific column index.
* @param {GoogleAppsScript.Spreadsheet.Range} range The range to check.
* @param {number} columnIndex The column index (1-based) to check for.
* @return {boolean} True if the range contains the column, false otherwise.
*/
function rangeContainsColumn_(range, columnIndex) {
  const startColumn = range.getColumn();
  const endColumn = range.getLastColumn();

  return columnIndex >= startColumn && columnIndex <= endColumn;
}
function myEdit(event) {
  try {
    if (event.range.getSheet().getName() === Schedule.crSheet.getName()) {
      if (event.range.getNumRows() > 1 || event.range.getNumColumns() > 1) {
        SpreadsheetApp.getUi().alert('Attempt to edit multipled route or ride cells. Only single cells can be edited.\n reverting back to previous values');
        for (let i = 0; i < event.range.getNumRows(); i++) {
          Schedule.restoreFormula(event.range.getRow() + i);
        }
        return;
      }
      if (event.value === event.oldValue) {
        console.log('No change to value, accepting edit');
        return;
      }
      const row = Schedule.getSelectedRows()[0];
      if (!(row.isPlanned() || row.isScheduled())) {
        console.log('Ride is neither planned nor scheduled - accepting edits and returning');
        // Nothing further to do
        return;
      }
      // Don't allow group changes once scheduled
      if (row.isScheduled() && event.range.getColumn() === Schedule.getColumnIndex(getGlobals().GROUPCOLUMNNAME) + 1) {
        SpreadsheetApp.getUi().alert('Group changes are not allowed once the ride is scheduled.');
        event.range.setValue(event.oldValue);
        return;
      }
      const processingManager = new ProcessingManager((pm) => myEdit_(event, pm));
      processingManager.startProcessing
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert(e.message)
    throw e
  }
}
function myEdit_(event, pm) {
  // console.log('onEdit triggered');
  // console.log(`Event: ${JSON.stringify(event)}`);






  /**
  * Checks if a given range contains a specific column index.
  * @param {Range} range The range to check.
  * @param {number} columnIndex The column index (1-based) to check for.
  * @return {boolean} True if the range contains the column, false otherwise.
  */
  function rangeContainsColumn(range, columnIndex) {
    const startColumn = range.getColumn();
    const endColumn = range.getLastColumn();

    return columnIndex >= startColumn && columnIndex <= endColumn;
  }

  /**
   * Edits the route column in the schedule.
   */
  function _editRouteColumn(event) {
    pm.addProgress('Editing route column');
    const url = event.value || event.range.getRichTextValue().getLinkUrl() || event.range.getRichTextValue().getText();
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
      pm.addProgress('Importing foreign route');
      MenuFunctions.importSelectedRoutes(true);
      pm.addProgress('Foreign route imported');
    }
    pm.addProgress('Route column edited');
  }


  const editedRange = event.range;
  const rideColumnIndex = Schedule.getColumnIndex(getGlobals().RIDECOLUMNNAME) + 1;
  const routeColumnIndex = Schedule.getColumnIndex(getGlobals().ROUTECOLUMNNAME) + 1;

  // Logger.log(`onEdit triggered: editedColumn=${editedColumn}, rideColumnIndex=${rideColumnIndex}, routeColumnIndex=${routeColumnIndex}`);
  if (rangeContainsColumn_(editedRange, rideColumnIndex) || rangeContainsColumn_(editedRange, routeColumnIndex)) {

    if (rangeContainsColumn_(editedRange, rideColumnIndex)) {
      SpreadsheetApp.getUi().alert('The Ride cell must not be modified. It will be reverted to its previous value.');
      Schedule.restoreRideFormula(editedRange.getRow());
      return;
    }
    if (rangeContainsColumn_(editedRange, routeColumnIndex)) {
      try {
        _editRouteColumn(event);
      } catch (e) {
        SpreadsheetApp.getUi().alert(`Error: ${e.message} - the route cell will be reverted to its previous value.`);
        Schedule.restoreRouteFormula(editedRange.getRow());
        return;
      }
    }
  }
  const force = true;
  if (Schedule.getSelectedRows()[0].RideURL) {
    pm.addProgress('Updating ride');
    MenuFunctions.updateSelectedRides(force);
    pm.addProgress('Ride updated');
  } else {
    pm.addProgress('Scheduling ride');
    MenuFunctions.scheduleSelectedRides(force);
    pm.addProgress('Ride scheduled');
  }
  pm.endProcessing();
}






