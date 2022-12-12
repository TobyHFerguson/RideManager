/** @OnlyCurrentDoc */
function cancelSelectedRides() {
  let form = { ...credentials, method: cancelSelectedRidesWithCreds.name };
  do_action(form);
}



function cancelSelectedRidesWithCreds(rows, rwgps) {
  UIManager.processRows(rows, [rowCheck.unscheduled], [], rwgps, RideManager.cancelRows);
}




