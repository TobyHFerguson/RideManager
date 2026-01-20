// @ts-check
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

function duration(msg, start, end = new Date()) {
  console.log(`${msg} duration: ${(end - start) / 1000}S`);
}

function printCallerError(...args) {
  // Error object provides stack trace where calling function is visible
  const error = new Error();
  const callerName = error.stack.split('\n')[3].match(/at (.*?)\s\(.*/)[1] || "Unknown caller"; // Extract method name
  console.error(callerName, ...args);
}

/**
 * Get route data from RWGPS
 * 
 * @deprecated Use RouteService.getRoute() directly. This function is maintained
 * for backward compatibility but delegates to RouteService which uses v1 API.
 * 
 * @param {string} url - Route URL (must match https://ridewithgps.com/routes/DIGITS pattern)
 * @param {boolean} [readThrough=false] - If true, bypass cache and fetch fresh data
 * @returns {any} Route object from RWGPS API
 * @throws {Error} If URL is invalid or route cannot be accessed
 * 
 * @see RouteService.getRoute() - The v1 API implementation this delegates to
 */
function getRoute(url, readThrough = false) {
  // Delegate to RouteService which uses v1 API via RWGPSClientFactory
  return RouteService.getRoute(url, readThrough);
}

function testGetRoute1() {
  getRoute('')
}
function testGetRoute2() {
  getRoute('https://ridewithgps.com/routes/2126861')
}

function testGetRoute3() {
  getRoute('https://ridewithgps.com/routes/2126861')
}

function testGetRoute4() {
  try {
    getRoute('https://ridewithgps.com/routes/2126')
  }
  catch (e) {
    console.log(e)
  }
}