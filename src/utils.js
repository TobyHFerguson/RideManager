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
