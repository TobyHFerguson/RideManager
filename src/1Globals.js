/**
 * This file contains definitions of constants that impact the end users of the system.
 */
const RideSheet = {
    // The RIDESHEET is the sheet used for scheduling the rides
    NAME: "Consolidated Rides",
    // these are the names of the columns in the RIDESHEET
    STARTDATECOLUMNNAME: "Date",
    GROUPCOLUMNNAME: "Group",
    STARTLOCATIONCOLUMNNAME: "Start Location",
    STARTTIMECOLUMNNAME: "Start Time",
    ROUTECOLUMNNAME: "Route",
    RIDELEADERCOLUMNNAME: "Ride Leader",
    RIDECOLUMNNAME: "Ride",
    ADDRESSCOLUMNNAME: "Address",
    LOCATIONCOLUMNNAME: "Location",
    PREFIXCOLUMNNAME: "Prefix"
}

const FormSheet = {
    // The FORMSHEET is the sheet used for collecting the form events
    NAME: "Form",
    TIMESTAMPCOLUMNNAME: "Timestamp",
    EMAILADDRESSCOLUMNNAME: "Email Address",
    FIRSTNAMECOLUMNNAME: "First name",
    LASTNAMECOLUMNNAME: "Last name",
    PHONENUMBERCOLUMNNAME: "Phone Number",
    RIDEDATECOLUMNNAME: "Ride Date",
    STARTTIMECOLUMNNAME: "Start Time",
    GROUPCOLUMNNAME: "Group",
    ROUTEURLCOLUMNNAME: "Route URL",
    STARTLOCATIONCOLUMNNAME: "Start Location",
    HELPNEEDEDCOLUMNNAME: "Help needed",
    RIDECANCELLEDCOLUMNNAME: "Ride cancelled",
    RIDEDELETEDCOLUMNNAME: "Ride Deleted",
    RIDEREFERENCECOLUMNNAME: "Ride Reference",
}

const Globals = {
    RIDE_LEADER_TBD_NAME: 'To Be Determined',

    A_TEMPLATE: `https://ridewithgps.com/events/186557-a-template`,
    B_TEMPLATE: `https://ridewithgps.com/events/186234-b-template`,
    C_TEMPLATE: `https://ridewithgps.com/events/186235-c-template`,
    SIGN_IN_URI: `https://ridewithgps.com/organizations/47/sign_in`,

    SCCCC_USER_ID: 621846,
    RIDE_LEADER_TBD_ID: 4733240,

    METERS_TO_FEET: 3.28084,
    METERS_TO_MILES: 6.213712e-4,

    // LENGTHS are in miles
    // ELEVATION_GAINS are in feet
    C_RIDE_MAX_LENGTH: 35,
    C_RIDE_MAX_ELEVATION_GAIN: 2000,
    B_RIDE_MAX_LENGTH: 50,
    B_RIDE_MAX_ELEVATION_GAIN: 3000,
    A_RIDE_MIN_LENGTH: 40,
    A_RIDE_MAX_LENGTH: 80,
    A_RIDE_MIN_ELEVATION_GAIN: 3000,

    // Number of days after an event or an import that a route will expire
    EXPIRY_DELAY: 30,
}

if (typeof module !== 'undefined') {
    module.exports = { RideSheet, FormSheet, Globals };
}
