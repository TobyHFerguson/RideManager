/** @OnlyCurrentDoc */
function unscheduleSelectedRides() {
  let form = { ...credentials, method: unscheduleSelectedRidesWithCreds.name };
  do_action(form);
}

function unscheduleSelectedRidesWithCreds(rows, rwgps) {
  UIManager.processRows(rows, [rowCheck.unscheduled, rowCheck.unmanagedRide], [], rwgps, RideManager.unscheduleRows);
}




