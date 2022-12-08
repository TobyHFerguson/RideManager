if (typeof require !== 'undefined') {
  Globals = require('../Globals.js');
}

function updateRiderCount() {
  let form = { ...credentials, method: updateRiderCountWithCreds.name };
  do_action(form);
}

function duration(msg, start, end = new Date()) {
  console.log(`${msg} duration: ${(end - start) / 1000}S`);
}

function updateRiderCountWithCreds(rows, rwgps) {
  let start = new Date().getTime();
  rows = Schedule.getYoungerRows(dates.add(new Date(), - 1));
  let end = new Date().getTime();
  duration("getYoungerRows", start, end);

  RideManager.updateRiderCounts(rows, rwgps);
  
}