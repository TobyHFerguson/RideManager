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

function getRoute(url) {
  const cache = CacheService.getScriptCache(); // See https://developers.google.com/apps-script/reference/cache
  let cachedRoute = cache.get(url);
  if (cachedRoute) {
    return JSON.parse(cachedRoute);
  }

  const re = /(https:\/\/ridewithgps.com\/routes\/\d+)/;
  if (!re.test(url)) {
    throw new Error(`Invalid URL: '${url}'. It doesn't match the pattern 'https://ridewithgps.com/routes/DIGITS'`);
  }
  const response = UrlFetchApp.fetch(url + ".json", { muteHttpExceptions: true });
  switch (response.getResponseCode()) {
    case 200:
      break;
    case 403:
      throw new Error('Route URL does not have public access');
    case 404:
      throw new Error(`This route cannot be found on the server`);
    default:
      throw new Error("Unknown issue with Route URL");
  }
  const route = JSON.parse(response.getContentText());
  // Routes are too big for the cache, but we don't need all the data!
  delete route.course_points;
  delete route.points_of_interest;
  delete route.track_points;
  route.has_course_points = false;
  const val = JSON.stringify(route);
  const byteSize = Utilities.newBlob(val).getBytes().length;
  cache.put(url, JSON.stringify(route), 21600); // Cache for 6 hours
  return route;
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