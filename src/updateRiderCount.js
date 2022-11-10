function updateRiderCount() {
  let form = { ...credentials, method: updateRiderCountWithCreds.name };
  do_action(form);
}



function updateRiderCountWithCreds(rows, rwgps) {
  rows = Schedule.getYoungerRows(new Date());
  rows.filter(row => rowCheck.alreadyScheduled(row)).forEach(row => {
    const event = new Event(row)
    const numRideLeaders = !row.RideLeader ? 0 : row.RideLeader.split(',').map(rl => rl.trim()).filter(rl => rl).length;
    event.updateRiderCount(rwgps.getRSVPCount(event.getRideLinkURL()) + numRideLeaders);
    rwgps.edit_event(event.getRideLinkURL(), event);
    rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, EXPIRY_DELAY), true);
  })
}