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



function linkRouteURLs() {
  Schedule.getSelectedRows().forEach(r => r.linkRouteURL());
  Schedule.save();
}


