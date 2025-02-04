/** @OnlyCurrentDoc */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Ride Schedulers')
    .addItem('Schedule Selected Rides', "MenuFunctions.scheduleSelectedRides")
    .addItem('Update Selected Rides', "MenuFunctions.updateSelectedRides")
    .addItem('Cancel Selected Rides', "MenuFunctions.cancelSelectedRides")
    .addItem('Reinstate Selected Rides', "MenuFunctions.reinstateSelectedRides")
    .addItem('Unschedule Selected Rides', "MenuFunctions.unscheduleSelectedRides")
    .addSeparator()
    .addItem('Import Selected Routes', "MenuFunctions.importSelectedRoutes")
    .addItem('Link Selected Route URLs', "MenuFunctions.linkSelectedRouteUrls")
    .addItem('Update Rider Count', "MenuFunctions.updateRiderCount")
    .addToUi();

  // We store the original formulas here so that we can restore them if the user
  // accidentally overwrites them. They need to be stored outside of the spreadsheet 
  // because the onEdit trigger will overwrite them if they are stored in the spreadsheet itself
  // and onEdit only has access to old values, not formulas.
  const schedule = Schedule;
  schedule.storeFormulas();
  initializeGroupCache()
}

function myEdit(event) {
  console.log('onEdit triggered');
  console.log(`Event: ${JSON.stringify(event)}`);
  const schedule = Schedule;
  if (event.range.getSheet().getName() !== schedule.crSheet.getName()) { return; } // Don't worry about other sheets

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
    const url = event.value || event.range.getRichTextValue().getLinkUrl() || event.range.getRichTextValue().getText();
    const route = getRoute(url);
    let name;
    if (route.user_id !== Globals.SCCCC_USER_ID) {
      const ui = SpreadsheetApp.getUi();
      const response = ui.prompt('Foreign Route Detected', 'Please enter a name for the foreign route:', ui.ButtonSet.OK_CANCEL);
      if (response.getSelectedButton() == ui.Button.OK) {
        name = response.getResponseText();
        name = name || Globals.FOREIGN_PREFIX + route.name;
      } else {
        name = Globals.FOREIGN_PREFIX + route.name;
      }
    } else {
      name = route.name;
    }
    event.range.setValue(`=hyperlink("${url}", "${name}")`);
    schedule.storeRouteFormulas();
    if (route.user_id !== Globals.SCCCC_USER_ID) { MenuFunctions.importSelectedRoutes(true); }
  }
  
  
  const editedRange = event.range;
  const rideColumnIndex = schedule.getColumnIndex(Globals.RIDECOLUMNNAME) + 1;
  const routeColumnIndex = schedule.getColumnIndex(Globals.ROUTECOLUMNNAME) + 1;
  
  // Logger.log(`onEdit triggered: editedColumn=${editedColumn}, rideColumnIndex=${rideColumnIndex}, routeColumnIndex=${routeColumnIndex}`);
  if (rangeContainsColumn(editedRange, rideColumnIndex) || rangeContainsColumn(editedRange, routeColumnIndex)) {
    if (editedRange.getNumColumns() > 1 || editedRange.getNumRows() > 1) {
      SpreadsheetApp.getUi().alert('Attempt to edit multipled route or ride cells. Only single cells can be edited.\n reverting back to previous values');
      for (let i = 0; i < editedRange.getNumRows(); i++) {
        schedule.restoreFormula(editedRange.getRow() + i);
      }
      return;
    }
    if (rangeContainsColumn(editedRange, rideColumnIndex)) {
      SpreadsheetApp.getUi().alert('The Ride cell must not be modified. It will be reverted to its previous value.');
      schedule.restoreRideFormula(editedRange.getRow());
      return;
    }
    if (rangeContainsColumn(editedRange, routeColumnIndex)) {
      try {
        _editRouteColumn(event);
      } catch (e) {
        SpreadsheetApp.getUi().alert(`Error: ${e.message} - the route cell will be reverted to its previous value.`);
        schedule.restoreRouteFormula(editedRange.getRow());
        return;
      }
    }
  }
  const force = true;
  if (schedule.getSelectedRows()[0].RideURL) {
    MenuFunctions.updateSelectedRides(force);
    tellTheUser("Ride Updating Completed");
  } else {
    MenuFunctions.scheduleSelectedRides(force);
    tellTheUser("Ride Scheduling Completed")
  }
}

function tellTheUser(message = '') {
  const ui = SpreadsheetApp.getUi();
  ui.alert(message);
}






