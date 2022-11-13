function updateRiderCount() {
  let form = { ...credentials, method: updateRiderCountWithCreds.name };
  do_action(form);
}

function duration(msg, start, end){
  return `${msg} duration: ${(end-start)/1000}S`;
}

/**
     * Fixup the organizers (ie. ride leaders) in the given event. 
     * @param {object} rwgps - the rwgps object used to talk to rwgps
     * @param {object} event - the event object to be fixed
     */
 function fixup_organizers(rwgps, event) {
  const organizers = event.organizer_names.map(name => rwgps.lookupOrganizer(A_TEMPLATE, name)).reduce((p, o) => {
    if (o.id !== RIDE_LEADER_TBD_ID) {
      p.known.push(o)
    } else {
      p.unknown.push(o)
    };
    return p;
  },
    { known: [], unknown: [] });
  event.organizer_tokens = organizers.known.map(o => o.id + "");
  const names = organizers.known.map(o => o.text);

  // Only if there are no known organizers will the defaults be used
  if (!organizers.known.length) {
    event.organizer_tokens.push(RIDE_LEADER_TBD_ID + "");
    names.push(RIDE_LEADER_TBD_NAME);
  }

  event.desc = `Ride Leader${names.length > 1 ? "s" : ""}: ${names.join(', ')}

${event.desc}`;
}
function updateRiderCountWithCreds(rows, rwgps) {
  let start = new Date().getTime();
  rows = Schedule.getYoungerRows(new Date());
  let end = new Date().getTime();
  console.log(duration("getYoungerRows", start, end));

  rows.filter(row => !rowCheck.unmanagedRide(row) && rowCheck.alreadyScheduled(row)).forEach(row => {
    start = new Date().getTime();
    const event = new Event(row)
    fixup_organizers(rwgps, event);
    const numRideLeaders = !row.RideLeader ? 0 : row.RideLeader.split(',').map(rl => rl.trim()).filter(rl => rl).length;
    event.updateRiderCount(rwgps.getRSVPCount(row.RideURL) + numRideLeaders);
    rwgps.edit_event(row.RideURL, event);
    rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, EXPIRY_DELAY), true);
    row.setRideLink(event.name, row.RideURL);
    end = new Date().getTime();
    console.log(duration(`row ${row.rowNum}`, start, end));
  })
}