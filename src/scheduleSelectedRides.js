/** @OnlyCurrentDoc */
if (typeof require !== 'undefined') {
  Globals = require('./Globals.js');
}

function scheduleSelectedRides() {
  let form = { ...credentials, method: scheduleSelectedRidesWithCredentials.name };
  do_action(form);
}

function scheduleSelectedRidesWithCredentials(rows, rwgps) {
  errorFuns.push(rowCheck.alreadyScheduled);
  UIManager.processRows(rows, errorFuns, warningFuns, rwgps, RideManager.scheduleRows, true);


}















