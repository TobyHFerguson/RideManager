function updateRSVPCount() {
  let form = { ...credentials, method: updateRSVPCountWithCreds.name };
  do_action(form);
}



function updateRSVPCountWithCreds(rows, rwgps) {
  rows = Schedule.getYoungerRows(new Date());
  rows.filter(row => rowCheck.alreadyScheduled(row)).forEach(row => {
    const event = new Event(row)
    event.updateRideName(rwgps.getRSVPCount(event.getRideLinkURL()));
    rwgps.edit_event(event.getRideLinkURL(), event);
    rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, EXPIRY_DELAY), true);
  })
}