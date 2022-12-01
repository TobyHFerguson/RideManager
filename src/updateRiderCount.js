if (typeof require !== 'undefined') {
  Globals = require('../Globals.js');
}

function updateRiderCount() {
  let form = { ...credentials, method: updateRiderCountWithCreds.name };
  do_action(form);
}

function duration(msg, start, end) {
  return `${msg} duration: ${(end - start) / 1000}S`;
}

function updateRiderCountWithCreds(rows, rwgps) {
  let start = new Date().getTime();
  rows = Schedule.getYoungerRows(dates.add(new Date(), - 1));
  let end = new Date().getTime();
  console.log(duration("getYoungerRows", start, end));

  start = new Date().getTime();
  const scheduledRows = rows.filter(row => rowCheck.alreadyScheduled(row))
  const scheduledRowURLs = scheduledRows.map(row => row.RideURL);
  const rwgpsEvents = rwgps.get_events(scheduledRowURLs);
  const scheduledEvents = rwgpsEvents.map(e => EventFactory.fromRwgpsEvent(e));
  const rsvpCounts = rwgps.getRSVPCounts(scheduledRowURLs);
  //updatedEvents is a boolean array, where true values mean that the count has changed.
  const updatedEvents = scheduledEvents.map((event, i) => event.updateRiderCount(rsvpCounts[i] + scheduledRows[i].RideLeaders.length));
  // We only want to edit events which have changed.
  const edits = updatedEvents.reduce((p, e, i) => { if (e) { p.push({ row: scheduledRows[i], event: scheduledEvents[i] }) }; return p; }, [])
  rwgps.edit_events(edits.map(({ row, event }) => { return { url: row.RideURL, event } }));
  edits.forEach(({ row, event }) => {
    row.setRideLink(event.name, row.RideURL);
  })
  const updatedRows = edits.map(({row, event}) => row.rowNum);
  end = new Date().getTime();
  console.log(duration(`row processing (${scheduledRows.length} rows, ${updatedRows.length} updated)`, start, end));
  console.log(`rows updated: ${updatedRows.join(', ')}`);
}