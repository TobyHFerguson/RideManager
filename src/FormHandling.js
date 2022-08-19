// docs for the event: https://developers.google.com/apps-script/guides/triggers/events
function onFormSubmit(event) {
  let nv = event.namedValues;
  Logger.log(nv)
  Logger.log(`Name (first last): ${nv['Name (first last)']}`);
  Logger.log(`Email Address: ${nv['Email Address']}`)
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Consolidated Rides');
  sheet.appendRow([`${nv['Ride Date']}`, `${nv['Group']}`, , `${nv['Start Time']}`, `${nv['Route URL']}`, `${nv['Name (first last)']}`]);
  sendEmail(event);
}

function sendEmail(e) {
  var formValues = e.namedValues;
  var html = '<ul>';
  for (Key in formValues) {
    var key = Key;
    var data = formValues[Key];
    html += '<li>' + key + ": " + data + '</li>';
  };
  html += '</ul>';
  GmailApp.sendEmail('toby.h.ferguson@icloud.com', 'New Ride Submitted', '', {htmlBody: html});
}