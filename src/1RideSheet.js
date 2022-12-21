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
};

if (typeof module !== 'undefined') {
    module.exports = RideSheet;
}
