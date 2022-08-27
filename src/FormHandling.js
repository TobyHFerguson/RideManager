// docs for the event: https://developers.google.com/apps-script/guides/triggers/events
function onFormSubmit(event) {
  let nv = event.namedValues;
  Logger.log(nv)
  Logger.log(`Name (first last): ${nv['Name (first last)']}`);
  Logger.log(`Email Address: ${nv['Email Address']}`)
  let row = {
    Date: `${nv['Ride Date']}`,
    Group: `${nv['Group']}`,
    'Start Time': `${nv['Start Time']}`,
    Route: `${nv['Route URL']}`,
    'Ride Leader': `${nv['Name (first last)']}`
  }
  addRowToSheet(row);
  selectLastRow();
  scheduleLastRow();
  sendEmail(event);
}

function addRowToSheet(row) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Consolidated Rides');
  sheet.appendRow([`${row['Date']}`, `${row['Group']}`, , `${row['Start Time']}`, `${row['Route']}`, `${row['Ride Leader']}`]);
}

function selectLastRow() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Consolidated Rides');
  let r = sheet.getLastRow();
  sheet.setActiveSelection(`A${r}:A${r}`);
  sheet.getRange(`A${r}`).setNumberFormat('ddd mm/dd');
}
 
function scheduleLastRow() {
  linkRouteURLs();
  const rwgpsService = new RWGPSService("toby.h.ferguson@icloud.com", "1rider1");
  const rwgps = new RWGPS(rwgpsService);
  const schedule = new Schedule();
  selectLastRow();
  let rows = schedule.getSelectedRows();
  let events = rows.map(row => new Event(row))
  events.forEach(event => schedule_event_(rwgps, event));
}

function schedule_event_(rwgps, event) {
  function get_template_(group) {
    switch (group) {
      case 'A': return A_TEMPLATE;
      case 'B': return B_TEMPLATE;
      case 'C': return C_TEMPLATE;
      default: throw new Error(`Unknown group: ${group}`);
    }
  }

  let g = event.group;
  let new_event_url = rwgps.copy_template_(get_template_(g));
  rwgps.edit_event(new_event_url, event);
  event.setRideLink(new_event_url);
  return new_event_url
}
function sendEmail(e) {
  var formValues = e.namedValues;
  var html = '<ul>';
  for (let k in formValues) {
    var key = k;
    var data = formValues[k];
    html += '<li>' + key + ": " + data + '</li>';
  };
  html += '</ul>';
  GmailApp.sendEmail('toby.h.ferguson@icloud.com', 'New Ride Submitted', '', { htmlBody: html });
}