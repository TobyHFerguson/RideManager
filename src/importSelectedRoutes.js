/** @OnlyCurrentDoc */

if (typeof require !== 'undefined') {
  Globals = require('../Globals.js');
}
function importSelectedRoutes() {
  let form = { ...credentials, method: importSelectedRoutesWithCredentials.name };
  do_action(form);
}


function importSelectedRoutesWithCredentials(rows, rwgps) {
  UIManager.processRows(rows, [rowCheck.routeInaccessibleOrOwnedByClub], [], rwgps, RideManager.importRows);
}










