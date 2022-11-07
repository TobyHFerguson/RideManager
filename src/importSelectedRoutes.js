/** @OnlyCurrentDoc */


function importSelectedRoutes() {
  let form = { ...credentials, method: importSelectedRoutesWithCredentials.name };
  do_action(form);
}


function importSelectedRoutesWithCredentials(rows, rwgps) {
  function importable(row) { return row.errors.length === 0; }


  function create_message(rows) {
    function create_error_message(rows) {
      let message = "";
      let error_rows = rows.filter(row => !importable(row));
      if (error_rows.length > 0) {
        message += "These routes had errors and will not be imported:\n";
        let errors = error_rows.flatMap(row => row.errors.map(error => `Row ${row.rowNum}: ${error}`));
        message += errors.join("\n");
        message += "\n\n";
      }
      return message;
    }

    function create_warning_message(rows) {
      let message = "";
      let warning_rows = rows.filter((e) => importable(e) && e.warnings.length > 0);
      if (warning_rows.length > 0) {
        message += "These routes had warnings and can be imported:\n"
        let warnings = warning_rows.flatMap(row => row.warnings.map(warning => `Row ${row.rowNum}: ${warning}`));
        message += warnings.join("\n");
        message += "\n\n";
      }
      return message;
    }

    /**
     * Create a message for all the routes that have neither errors nor warnings
     */
    function create_update_message(rows) {
      let message = "";
      let updateable_rows = rows.filter((row) => importable(row) && row.warnings.length === 0);
      if (updateable_rows.length > 0) {
        message += "These routes had neither errors nor warnings and can be imported:\n"
        message += updateable_rows.map(row => `Row ${row.rowNum}`).join("\n");
        message += "\n\n";
      }
      return message;
    }

    let message = "";
    message += create_error_message(rows);
    message += create_warning_message(rows);
    message += create_update_message(rows);
    return message;
  }

  function confirm_update(message) {
    message += `Do you want to continue to import all importable routes?`;
    let ui = SpreadsheetApp.getUi();
    let result = ui.alert(message, ui.ButtonSet.YES_NO);
    return result == ui.Button.YES
  }

  function inform_of_errors(message) {
    message += "No selected routes are importable; they need to have the errors fixed.";
    SpreadsheetApp.getUi().alert(message);
  }
  function checkRow(row) {
    if (!row.warnings) row.warnings = [];
    if (!row.errors) row.errors = []
    if (!rowCheck.noGroup_(row)) {
      const w = rowCheck._inappropiateGroup(row);
      if (w) row.warnings.push(w);
    }
    const e = rowCheck.routeInaccessibleOrOwnedByClub(row);
    if (e) row.errors.push(e);
  }

  function makeExpiryDate(d) {
    return dates.shortString(d ? dates.add(d, EXPIRY_DELAY) : dates.add(new Date(), EXPIRY_DELAY))
  }

  rows.forEach(row => checkRow(row));
  let message = create_message(rows);
  sidebar.create(rows.filter(row => !importable(row) || row.warnings.length > 0));
  let importable_rows = rows.filter(row => importable(row));
  if (importable_rows.length === 0) {
    inform_of_errors(message);
  } else {
    if (confirm_update(message)) {
      importable_rows.forEach(row => { const url = rwgps.importRoute({ url: row.RouteURL, expiry: makeExpiryDate(row.StartDate) }); row.setRouteLink(url, url) });
    }
  }

}










