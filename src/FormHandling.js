if (typeof require !== 'undefined') {
  require("./Schedule");
}

// docs for the event: https://developers.google.com/apps-script/guides/triggers/events
// function onFormSubmit(event) {
//   let nv = event.namedValues;
//   Logger.log(nv)
//   Logger.log(`Name (first last): ${nv['Name (first last)']}`);
//   Logger.log(`Email Address: ${nv['Email Address']}`)
//   let rideData = {
//     Date: `${nv['Ride Date']}`,
//     Group: `${nv['Group']}`,
//     'Start Time': `${nv['Start Time']}`,
//     Route: `${nv['Route URL']}`,
//     'Ride Leader': `${nv['Name (first last)']}`,
//     Email: `${nv['Email Address']}`
//   }
//   scheduleEvent(rideData);
// }

function goodRide() {
  let rideData = {
    Date: "12/31/2022",
    Group: "A",
    'Start Time': "10:00 AM",
    Route: "https://ridewithgps.com/routes/30674325",
    'Ride Leader': "Toby Ferguson",
    Email: "toby.h.ferguson@icloud.com"
  };
  scheduleEvent(rideData);
}

function badRide() {
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
/**
 * Return a string if the day of the ride is neither a Tue nor a Sat
 * @params {object} rideData data describing ride to be checked
 * @returns {string}
 */
function clubDay_(rideData) {
  const day = new Date(rideData.Date).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "long" })
  if (day !== 'Tuesday' && day !== 'Saturday') {
    return `You're trying to schedule a ride on a ${day}, but club rides are only allowed on a Tuesday or a Saturday`
  }
}

function knownRideLeader_(rideData) {
  const rwgpsService = new RWGPSService("toby.h.ferguson@icloud.com", "1rider1");
  const rwgps = new RWGPS(rwgpsService);
  const id = rwgps._lookupOrganizerId(A_TEMPLATE, rideData['Ride Leader']);
  if (id === RIDE_LEADER_TBD_ID + "") {
    return `Ride leader (${rideData['Ride Leader']}) cannot be found in the SCCCC RWGPS account`
  }
}
function rideAlreadyScheduled_(rideData) {
  let schedule = new Schedule();
  if (schedule.knownKey(rideData.Date, rideData.Group)) {
    return `There's already a${rideData.Group === "A" ? 'n' : ''} '${rideData.Group}' ride scheduled for ${rideData.Date}`
  }
}
function notOwnedBySCCCC_(rideData) {
  try {
    return new Route(rideData.Route).ownedBySCCCC() ? undefined : "Route is not owned by SCCCC";
  } catch {
    return `No route located at this URL: ${rideData.Route}`;;
  }
}

function inappropriateGroup__(group, elevation, distance) {
  switch (group) {
    case 'A':
      if (elevation < A_RIDE_MIN_ELEVATION_GAIN) {
        return `Elevation gain (${elevation}) too low for A group`
      }
      if (distance < A_RIDE_MIN_LENGTH) {
        return `Distance (${distance}) too short for A group`
      }
      if (distance > A_RIDE_MAX_LENGTH) {
        return `Distance (${distance}) too long for A group`
      }
      break;
    case 'B':
      if (elevation > B_RIDE_MAX_ELEVATION_GAIN) {
        return `Elevation gain (${elevation}) too great for B group`
      }
      if (distance > B_RIDE_MAX_LENGTH) {
        return `Distance (${distance}) too long for B group`
      }
      break;
    case 'C':
      if (elevation > C_RIDE_MAX_ELEVATION_GAIN) {
        return `Elevation gain (${elevation}) too great for C group`
      }
      if (distance > C_RIDE_MAX_LENGTH) {
        return `Distance (${distance}) too long for C group`
      }
      break;
    default:
      throw Error(`Unknown group: ${group}. Expected one of 'A', 'B', or 'C'`);
  }

}
function inappropiateGroup_(rideData) {
  var r;
  try {
    r = new Route(rideData.Route);
  } catch {
    return `No route located at this URL: ${rideData.Route}`;
  }
  const d = Math.round(r.distance() * METERS_TO_MILES);
  const e = Math.round(r.elevation_gain() * METERS_TO_FEET);
  return inappropriateGroup__(rideData.Group, e, d);
}

function findErrors_(rideData) {
  const errorFuns = [
    notOwnedBySCCCC_,
    inappropiateGroup_,
    rideAlreadyScheduled_,
    knownRideLeader_,
    clubDay_
  ]
  const errors = errorFuns.map(f => f(rideData)).filter(e => e !== undefined);
  return errors;
}
function scheduleEvent(rideData) {
  var errors = findErrors_(rideData);
  if (errors.length > 0) {
    sendErrorEmail(rideData, errors);
  } else {
    addRowToSheet(rideData);
    let event = scheduleLastRow();
    sendEmail(rideData, event);
  }
}

function addRowToSheet(row) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Consolidated Rides');
  sheet.appendRow([`${row['Date']}`, `${row['Group']}`, , `${row['Start Time']}`, `${row['Route']}`, `${row['Ride Leader']}`]);
  formatDateInLastRow();
  linkRouteURLs();
}

function formatDateInLastRow() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Consolidated Rides');
  let r = sheet.getLastRow();
  // sheet.setActiveSelection(`A${r}:A${r}`);
  sheet.getRange(`A${r}`).setNumberFormat('ddd mm/dd');
}

function scheduleLastRow() {
  const rwgpsService = new RWGPSService("toby.h.ferguson@icloud.com", "1rider1");
  const rwgps = new RWGPS(rwgpsService);
  const schedule = new Schedule();
  const lastRow = schedule.getLastRow();
  const event = new Event(lastRow);
  schedule_event_(rwgps, event);
  return event;
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
  let sd = new Date(event.start_date).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "2-digit", day: "numeric"}).replace(',', '')
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
