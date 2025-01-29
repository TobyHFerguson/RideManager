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
}

function myEdit(event) {
  // console.log('onEdit triggered');
  // console.log(`Event: ${JSON.stringify(event)}`);
  const schedule = Schedule;
  schedule.onEdit(event);
}





