if (typeof require !== 'undefined') {
  Globals = require('../Globals.js');
}

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

  rows.filter(row => rowCheck.alreadyScheduled(row)).forEach(row => {
    start = new Date().getTime();
    const event = EventFactory.fromRow(row, rwgps)
    const numRideLeaders = !row.RideLeader ? 0 : row.RideLeader.split(',').map(rl => rl.trim()).filter(rl => rl).length;
    event.updateRiderCount(rwgps.getRSVPCount(row.RideURL) + numRideLeaders);
    rwgps.edit_event(row.RideURL, event);
    rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, Globals.EXPIRY_DELAY), true);
    row.setRideLink(event.name, row.RideURL);
    end = new Date().getTime();
    console.log(duration(`row ${row.rowNum}`, start, end));
  })
}