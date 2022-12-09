/** @OnlyCurrentDoc */
function reinstateSelectedRides() {
  let form = { ...credentials, method: reinstateSelectedRidesWithCreds.name };
  do_action(form);
}



function reinstateSelectedRidesWithCreds(rows, rwgps) {
  UIManager.processRows(rows, [rowCheck.unscheduled, rowCheck.notCancelled], [], rwgps, RideManager.reinstateRows);
}




