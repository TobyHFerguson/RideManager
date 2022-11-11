function updateRiderCount() {
  let form = { ...credentials, method: updateRiderCountWithCreds.name };
  do_action(form);
}

function duration(msg, start, end){
  return `${msg} duration: ${(end-start)/1000}S`;
}

function updateRiderCountWithCreds(rows, rwgps) {
  let start = new Date().getTime();
  rows = Schedule.getYoungerRows(new Date());
  let end = new Date().getTime();
  console.log(duration("getYoungerRows", start, end));

  rows.filter(row => !rowCheck.unmanagedRide(row) && rowCheck.alreadyScheduled(row)).forEach(row => {
    start = new Date().getTime();
    const event = new Event(row)
    const numRideLeaders = !row.RideLeader ? 0 : row.RideLeader.split(',').map(rl => rl.trim()).filter(rl => rl).length;
    event.updateRiderCount(rwgps.getRSVPCount(event.getRideLinkURL()) + numRideLeaders);
    rwgps.edit_event(event.getRideLinkURL(), event);
    rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, EXPIRY_DELAY), true);
    end = new Date().getTime();
    console.log(duration(`row ${row.rowNum}`, start, end));
  })
}