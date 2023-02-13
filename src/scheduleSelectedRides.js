/** @OnlyCurrentDoc */
if (typeof require !== 'undefined') {
  Globals = require('./Globals.js');
}

function scheduleSelectedRides() {
  let form = { ...credentials, method: scheduleSelectedRidesWithCredentials.name };
  do_action(form);
}

function scheduleSelectedRidesWithCredentials(rows, rwgps) {
  const errorFuns = [ rowCheck.unmanagedRide, rowCheck.scheduled, rowCheck.noStartDate, rowCheck.noStartTime, rowCheck.noGroup, rowCheck.badRoute]
  const warningFuns = [rowCheck.noRideLeader, rowCheck.noLocation, rowCheck.noAddress, rowCheck.inappropiateGroup]
  UIManager.processRows(rows, errorFuns, warningFuns, rwgps, RideManager.scheduleRows, true);


}















