/** @OnlyCurrentDoc */
if (typeof require !== 'undefined') {
  Globals = require('../Globals.js');
}

function updateSelectedRides() {
  let form = { ...credentials, method: updateSelectedRidesWithCredentials.name };
  do_action(form);
}


function updateSelectedRidesWithCredentials(rows, rwgps) {
  UIManager.processRows(rows, [rowCheck.unscheduled, rowCheck.unmanagedRide], [], rwgps, RideManager.updateRows);
}










