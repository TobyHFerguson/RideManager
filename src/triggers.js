/** @OnlyCurrentDoc */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Ride Lead Coordinators')
    .addItem('Link Selected Route URLs', linkRouteURLs.name)
    .addSeparator()
    .addItem('Schedule Selected Rides', scheduleSelectedRides.name)
    .addItem('Update Selected Rides', updateSelectedRides.name)
    .addItem('Cancel Selected Rides', cancelSelectedRides.name)
    .addItem('Unschedule Selected Rides', unscheduleSelectedRides.name)
    .addSeparator()
    .addItem('Clear User Credentials', clearCredentials.name)
    .addToUi();
}



function linkRouteURLs() {
  Schedule.getSelectedRows().forEach(r => Schedule.linkRouteURL(r))
}


