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
    RIDEREFERENCECOLUMNNAME: "Ride Reference",
    RIDESTATECOLUMNNAME: "Ride State",
    IMPORTEDROUTECOLUMNNAME: "Imported Route"
};

if (typeof module !== 'undefined') {
    module.exports = FormSheet;
}