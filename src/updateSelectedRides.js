/** @OnlyCurrentDoc */
if (typeof require !== 'undefined') {
  Globals = require('../Globals.js');
}

function updateSelectedRides() {
  let form = { ...credentials, method: updateSelectedRidesWithCredentials.name };
  do_action(form);
}


function updateSelectedRidesWithCredentials(rows, rwgps) {
  UIManager.processRows(rows,
    [rowCheck.unscheduled, rowCheck.unmanagedRide, rowCheck.noStartDate, rowCheck.noStartTime, rowCheck.noGroup, rowCheck.badRoute],
    [rowCheck.noRideLeader, rowCheck.noLocation, rowCheck.noAddress, rowCheck.inappropiateGroup], rwgps, RideManager.updateRows);
}










