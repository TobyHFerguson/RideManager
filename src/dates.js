/**
 * Object to compare dates with
 */
const dates = {
  convert: function (d) {
    // Converts the date in d to a date-object. The input can be:
    //   a date object: returned without modification
    //  an array      : Interpreted as [year,month,day]. NOTE: month is 0-11.
    //   a number     : Interpreted as number of milliseconds
    //                  since 1 Jan 1970 (a timestamp) 
    //   a string     : Any format supported by the javascript engine, like
    //                  "YYYY/MM/DD", "MM/DD/YYYY", "Jan 31 2009" etc.
    //  an object     : Interpreted as an object with year, month and date
    //                  attributes.  **NOTE** month is 0-11.
    return (
      d.constructor === Date ? d :
        d.constructor === Array ? new Date(d[0], d[1], d[2]) :
          d.constructor === Number ? new Date(d) :
            d.constructor === String ? new Date(d) :
              typeof d === "object" ? new Date(d.year, d.month, d.date) :
                NaN
    );
  },
  compare: function (a, b) {
    // Compare two dates (could be of any type supported by the convert
    // function above) and returns:
    //  -1 : if a < b
    //   0 : if a = b
    //   1 : if a > b
    // NaN : if a or b is an illegal date
    // NOTE: The code inside isFinite does an assignment (=).
    return (
      isFinite(a = this.convert(a).valueOf()) &&
        isFinite(b = this.convert(b).valueOf()) ?
        (a > b) - (a < b) :
        NaN
    );
  },
  inRange: function (d, start, end) {
    // Checks if date in d is between dates in start and end.
    // Returns a boolean or NaN:
    //    true  : if d is between start and end (inclusive)
    //    false : if d is before start or after end
    //    NaN   : if one or more of the dates is illegal.
    // NOTE: The code inside isFinite does an assignment (=).
    return (
      isFinite(d = this.convert(d).valueOf()) &&
        isFinite(start = this.convert(start).valueOf()) &&
        isFinite(end = this.convert(end).valueOf()) ?
        start <= d && d <= end :
        NaN
    );
  },
  MMDDYYYY: function (d) {
    // Returns the shortened MM/DD/YYYY version of the date
    return isFinite(a = this.convert(d)) ? a.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "numeric", day: "numeric" }) : NaN;
  },
  YYYY_MM_DD: function (d) {
    return isFinite(a = this.convert(d)) ? a.toLocaleDateString("en-CA") : NaN;

  },
  MMDD: function (d) {
    return isFinite(a = this.convert(d)) ? a.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles",month: "numeric", day: "numeric" }) : NaN;
  },
  weekday: function (d) {
    return isFinite(a = this.convert(d)) ? a.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles",weekday: "short" }) : NaN;
  },
  T24: function (d) {
    return isFinite(a = this.convert(d)) ? a.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "numeric", hour12: false }) : NaN;
  },
  T12: function (d) {
    return isFinite(a = this.convert(d)) ? a.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "numeric", hour12: true }) : NaN;
  },
  add: function (d, days) {
    let a = this.convert(d);
    if (isFinite(a)) {
      a.setDate(d.getDate() + days);
    }
    return a;
  },
  addMinutes: function (d, minutes) {
    let a = this.convert(d);
    if (isFinite(a)) {
      a = dates.convert(Number(dates.convert(a)) + minutes * 60 * 1000);
    }
    return a;
  }
}

if (!(typeof module === 'undefined')) {
  module.exports = dates;
}
