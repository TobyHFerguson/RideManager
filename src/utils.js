function myFunction() {
  let errors = ["e1",];
  let warnings = ["w1", "w2"];
  let rows = zip("", [], errors.slice(1), warnings.slice(1));
  Logger.log(`myFunction rows: ${rows} rows.length: ${rows.length}`);
  let html_cols = rows.map(r => tableColumns("d", ...r));
  Logger.log(html_cols);
  // Logger.log(tableColumns('r', ...html_cols));
}

/**
 * zip the given arrays together, filling in with the initial value
 */
function zip(init) {
  var args = [].slice.call(arguments, 1);
  var longest = args.reduce(function (a, b) {
    return a.length > b.length ? a : b
  }, []);
  return longest.map(function (_, i) {
    return args.map(function (array) {
      return array[i] !== undefined ? array[i] : init
    })
  });
}

/**
 * Create a table row from the given args
 * @param{type} string - either 'h' or 'd' for the <th>/<td> elements
 * @param{values} variadic list of values, one per column
 * Taken from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments#defining_a_function_that_creates_html_lists
 */
function tableColumns(type) {
  let begin = `<t${type}>`;
  let end = `</t${type}>`
  let html = begin;
  const args = Array.prototype.slice.call(arguments, 1);
  html += args.join(end + begin);
  html += end;
  return html;
}

/**
 * Object to compare dates with
 */
var dates = {
    convert:function(d) {
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
            d.constructor === Array ? new Date(d[0],d[1],d[2]) :
            d.constructor === Number ? new Date(d) :
            d.constructor === String ? new Date(d) :
            typeof d === "object" ? new Date(d.year,d.month,d.date) :
            NaN
        );
    },
    compare:function(a,b) {
        // Compare two dates (could be of any type supported by the convert
        // function above) and returns:
        //  -1 : if a < b
        //   0 : if a = b
        //   1 : if a > b
        // NaN : if a or b is an illegal date
        // NOTE: The code inside isFinite does an assignment (=).
        return (
            isFinite(a=this.convert(a).valueOf()) &&
            isFinite(b=this.convert(b).valueOf()) ?
            (a>b)-(a<b) :
            NaN
        );
    },
    inRange:function(d,start,end) {
        // Checks if date in d is between dates in start and end.
        // Returns a boolean or NaN:
        //    true  : if d is between start and end (inclusive)
        //    false : if d is before start or after end
        //    NaN   : if one or more of the dates is illegal.
        // NOTE: The code inside isFinite does an assignment (=).
       return (
            isFinite(d=this.convert(d).valueOf()) &&
            isFinite(start=this.convert(start).valueOf()) &&
            isFinite(end=this.convert(end).valueOf()) ?
            start <= d && d <= end :
            NaN
        );
    },
    MMDDYYYY:function(d) {
      // Returns the shortened MM/DD/YYYY version of the date
      return this.convert(d).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "numeric", day: "numeric" });
    },
    MMDD:function(d) {
      return this.convert(d).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", month: "numeric", day: "numeric" });
    },
    weekday:function(d) {
      return this.convert(d).toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "short" });
    },
    T24: function(d) {
      return this.convert(d).toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "numeric", hour12: false });
    },
    add:function(d, days) {
      let nd = this.convert(d);
      nd.setDate(nd.getDate() + days);
      return nd;
    }
}

const d = dates.convert("4/26/2022");
if (dates.MMDDYYYY(d) !== "4/26/2022") {
  console.log(`dates.convert failed - was expecting '4/26/2022', got '${dates.MMDDYYYY(d)}'` );
}
const nd = dates.add(d, 7);
if (dates.MMDDYYYY(nd) !== "5/3/2022") {
  console.log(`dates.add failed - was expecting '4/26/2022', got '${dates.MMDDYYYY(nd)}'` );
}

