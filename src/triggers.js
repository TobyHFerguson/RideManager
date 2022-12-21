/** @OnlyCurrentDoc */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Ride Lead Coordinators')
    .addItem('Schedule Selected Rides', scheduleSelectedRides.name)
    .addItem('Update Selected Rides', updateSelectedRides.name)
    .addItem('Cancel Selected Rides', cancelSelectedRides.name)
    .addItem('Reinstate Selected Rides', reinstateSelectedRides.name)
    .addItem('Unschedule Selected Rides', unscheduleSelectedRides.name)
    .addSeparator()
    .addItem('Import Selected Routes', importSelectedRoutes.name)
    .addItem('Link Selected Route URLs', linkRouteURLs.name)
    .addItem('Update Rider Count', updateRiderCount.name)
    .addSeparator()
    .addItem('Clear User Credentials', clearCredentials.name)
    .addToUi();
}

function onFormSubmit(event) {
  // log_(event);
  FormHandling.processEvent(event);
}

function log_(event) {
  let rng = event.range;
  console.log(`sheet: ${rng.getSheet().getSheetName()} range ${rng.getRowIndex()}`)
  console.log(rng.getValues());
  console.log(event.values);
  let nv = event.namedValues;
  Logger.log(nv);
  console.log("=============");
  console.log(SpreadsheetApp.getActiveSheet().getDataRange().getValues());
}


function linkRouteURLs() {
  Schedule.getSelectedRows().forEach(r => r.linkRouteURL());
  Schedule.save();
}


