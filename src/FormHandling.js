

if (typeof require !== 'undefined') {
  require("./Schedule");
  require("./1Globals");
}

function log(event) {
  let rng = event.range;
  console.log(`sheet: ${rng.getSheet().getSheetName()} range ${rng.getRowIndex()}`)
  console.log(rng.getValues());
  console.log(event.values);
  let nv = event.namedValues;
  Logger.log(nv);
  console.log("=============");
  console.log(SpreadsheetApp.getActiveSheet().getDataRange().getValues());
}

// A new submission is when the form range contains no reference to a row.
function newSubmission(event) {
  return Form.getReferenceCell(event.range)
}
// docs for the event: https://developers.google.com/apps-script/guides/triggers/events
function onFormSubmit(event) {
  // log(event);
  if (newSubmission(event)) {
    const result = scheduleRide(event);
    Form.setReferenceCell(event.range, `='${RideSheet.NAME}'!A${result.row.rowNum}`)
    // const email = composeScheduleEmailBody(result);
    // sendEmail(event[FormSheet.EMAILADDRESSCOLUMNNAME], email);
    console.log(result);
  } else {
    let cancelled = event[FormSheet.RIDECANCELLEDCOLUMNNAME]
    cancelled = cancelled ? cancelled.split(',')[0].trim().toLowerCase() : cancelled;
    switch (cancelled) {
      case 'no':
        // const result = reinstateRide(event);
        // const email = composeReinstateEmailBody(result);
        // sendEmail(event[FormSheet.EMAILADDRESSCOLUMNNAME], email);
        console.log('reinstate event');
      case 'yes':
        console.log('cancel event');
        break;
      default:
        console.log('modify event');
    }
  }
  Schedule.save();
}

function scheduleRide(event) {
  console.log(event.namedValues);
  function createRowData(event) {
    const nv = event.namedValues;
    const rowData = {}
    rowData.StartDate = nv[`${FormSheet.RIDEDATECOLUMNNAME}`][0];
    rowData.Group = nv[`${FormSheet.GROUPCOLUMNNAME}`][0];
    rowData.StartTime = nv[`${FormSheet.STARTTIMECOLUMNNAME}`][0];
    rowData.RouteURL = nv[`${FormSheet.ROUTEURLCOLUMNNAME}`][0];
    rowData.RouteName = nv[`${FormSheet.ROUTEURLCOLUMNNAME}`][0];
    rowData.RideLeaders = nv[`${FormSheet.FIRSTNAMECOLUMNNAME}`] + "  " + nv[`${FormSheet.LASTNAMECOLUMNNAME}`][0];
    rowData.Email = nv[`${FormSheet.EMAILADDRESSCOLUMNNAME}`][0];
    return rowData;
  }
  const rowData = createRowData(event);
  console.log(rowData);
  const result = {}
  const rwgps = new RWGPS(new RWGPSService(credentials.email, credentials.password));
  // eval_rows([rowData], rwgps, [rowCheck.badRoute, rowCheck.noRideLeader], []);
  // if (rowData.errors && rowData.errors.length) {
  //   result.errors = rowData.errors;
  //   return result;
  // }
  
  const lastRow = Schedule.appendRow(rowData);
  RideManager.scheduleRows([lastRow], rwgps);
  result.row = lastRow;
  return result;
}



function sendErrorEmail(rideData, errors) {
  var html = 'Thank you for volunteering to lead the following ride:\n'
  html += '<ul>\n';
  for (let k in rideData) {
    var key = k;
    var data = rideData[k];
    html += '<li>' + key + ": " + data + '</li>\n';
  };
  html += '</ul>\n'
  html += '<P>Unfortunately the following errors were found. Please work with your Ride Lead Coordinator to resolve them\n';
  html += '<ul>\n'
  for (const e of errors) {
    html += `<li>${e}</li>\n`;
  }
  html += '</ul>\n';
  GmailApp.sendEmail('toby.h.ferguson@icloud.com', 'New Ride Submitted', '', { htmlBody: html });
  // Logger.log(html);
}
function sendEmail(rideData, event) {
  let html = formatEmail(event);
  GmailApp.sendEmail(`${rideData.Email}`, 'New Ride Submitted', '', { htmlBody: html });
}

function formatEmail(event) {
  let sd = new Date(event.start_date).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "2-digit", day: "numeric" }).replace(',', '')
  var html = `${event.organizer_name}, `
  html += `<p>Thank you for volunteering to lead the '${event.group}' ride on ${sd}.</p>\n`
  html += `<p>The ride has now been scheduled and is live on the club calendar and in RideWithGPS. Please use the following link in any emails about the ride:<p>\n`
  html += `<a href="${event.getRideLinkURL()}">${event.name}</a>`
  html += '<p>SCCCC Ride Organization<p>';
  return html;
}

if (typeof module !== 'undefined') {
  module.exports = { findErrors_, rideAlreadyScheduled_ }
}

function testGoodRide() {
  let namedValues = {}
  namedValues[`${FormSheet.RIDEDATECOLUMNNAME}`] = ["12/31/2022"];
  namedValues[`${FormSheet.GROUPCOLUMNNAME}`] = ["A"];
  namedValues[`${FormSheet.STARTTIMECOLUMNNAME}`] = ["10:00 AM"];
  namedValues[`${FormSheet.ROUTEURLCOLUMNNAME}`] = ["https://ridewithgps.com/routes/30674325"];
  namedValues[`${FormSheet.FIRSTNAMECOLUMNNAME}`] = ["Toby"];
  namedValues[`${FormSheet.LASTNAMECOLUMNNAME}`] = ["Ferguson"];
  namedValues[`${FormSheet.EMAILADDRESSCOLUMNNAME}`] = ["toby.h.ferguson@icloud.com"];

  scheduleRide({ namedValues: namedValues });
  Schedule.save();
}

function testBadRide() {
  let rideData = {
    Date: "12/30/2022",
    Group: "C",
    'Start Time': "10:00 AM",
    Route: "https://ridewithgps.com/routes/30674325",
    'Ride Leader': "Not Known",
    Email: "toby.h.ferguson@icloud.com"
  };
  scheduleEvent(rideData);
}
