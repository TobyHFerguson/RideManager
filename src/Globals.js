/**
 * This file contains definitions of constants that impact the end users of the system.
 */
const STARTDATECOLUMNNAME = "Date";
const GROUPCOLUMNNAME = "Group";
const STARTLOCATIONCOLUMNNAME = "Start Location";
const STARTTIMECOLUMNNAME = "Start Time";
const ROUTECOLUMNNAME = "Route";
const RIDELEADERCOLUMNNAME = "Ride Leader";
const RIDECOLUMNNAME = "Ride";
const ADDRESSCOLUMNNAME = "Address";
const LOCATIONCOLUMNNAME = "Location";
const PREFIXCOLUMNNAME = "Prefix";

const RIDE_LEADER_TBD_NAME = 'To Be Determined';

const A_TEMPLATE = `https://ridewithgps.com/events/186557-a-template`;
const B_TEMPLATE = `https://ridewithgps.com/events/186234-b-template`;
const C_TEMPLATE = `https://ridewithgps.com/events/186235-c-template`;
const SIGN_IN_URI = `https://ridewithgps.com/organizations/47/sign_in`;

const SCCCC_USER_ID = 621846;
const RIDE_LEADER_TBD_ID = 4733240;

const METERS_TO_FEET = 3.28084;
const METERS_TO_MILES = 6.213712e-4;

// LENGTHS are in miles
// ELEVATION_GAINS are in feet
const C_RIDE_MAX_LENGTH = 35;
const C_RIDE_MAX_ELEVATION_GAIN = 2000;
const B_RIDE_MAX_LENGTH = 50;
const B_RIDE_MAX_ELEVATION_GAIN = 3000;
const A_RIDE_MIN_LENGTH = 40;
const A_RIDE_MAX_LENGTH = 80;
const A_RIDE_MIN_ELEVATION_GAIN = 3000;

// Number of days after an event or an import that a route will expire
EXPIRY_DELAY = 30;