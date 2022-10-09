/** @OnlyCurrentDoc */


function updateSelectedRides() {
  let form = { ...credentials, method: updateSelectedRidesWithCredentials.name };
  do_action(form);
}


function updateSelectedRidesWithCredentials(rows, rwgps) {
  function _updateable(row) { return row.errors.length === 0; }

  function _update_event(event) {
    event.updateRideName();
    rwgps.edit_event(event.getRideLinkURL(), event);
  }

  function create_message(rows) {
    function create_error_message(rows) {
      let message = "";
      let error_rows = rows.filter(row => !_updateable(row));
      if (error_rows.length > 0) {
        message += "These rides had errors and will not be updated:\n";
        let errors = error_rows.flatMap(row => row.errors.map(error => `Row ${row.rowNum}: ${error}`));
        message += errors.join("\n");
        message += "\n\n";
      }
      return message;
    }

    function create_warning_message(rows) {
      let message = "";
      let warning_rows = rows.filter((e) => _updateable(e) && e.warnings.length > 0);
      if (warning_rows.length > 0) {
        message += "These rides had warnings and can be updated:\n"
        let warnings = warning_rows.flatMap(row => row.warnings.map(warning => `Row ${row.rowNum}: ${warning}`));
        message += warnings.join("\n");
        message += "\n\n";
      }
      return message;
    }

    /**
     * Create a message for all the rides that have neither errors nor warnings
     */
    function create_update_message(rows) {
      let message = "";
      let updateable_rows = rows.filter((row) => _updateable(row) && row.warnings.length === 0);
      if (updateable_rows.length > 0) {
        message += "These rides had neither errors nor warnings and can be updated:\n"
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
    message += `Do you want to continue to update all updateable rides?`;
    let ui = SpreadsheetApp.getUi();
    let result = ui.alert(message, ui.ButtonSet.YES_NO);
    return result == ui.Button.YES
  }

  function inform_of_errors(message) {
    message += "No selected rides are updateable; they need to have the errors fixed.";
    SpreadsheetApp.getUi().alert(message);
  }

    /**
     * Compare the given row with the corresponding RWGPS event at the given event's URL. 
     * Update the given row's errors array with any issues
     * @param {object} row row to be compared
     */
  function compare_(row) {
    let url = row.RideURL;
    if (url === null) {
      row.errors.push("No ride has been scheduled");
      return;
    }
    let old_event = rwgps.get_event(url);
    let osd = old_event.starts_on;
    let nsd = row.StartDate.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    if (dates.compare(nsd,osd) !== 0) {
      row.errors.push(`Start date has changed (old: ${osd}; new: ${nsd} ).`);
    }
    let old_event_group = old_event.name.split("'")[1];
    if (row.Group !== old_event_group) {
      row.errors.push(`Group has changed (old: ${old_event_group}; new: ${row.Group} ).`);
    }
  }

  clear_sidebar();

  rows.forEach(row => {evalRow_(row, rwgps); compare_(row)});
  let message = create_message(rows);
  create_sidebar(rows.filter(row => !_updateable(row) || row.warnings.length > 0 ));
  let updateable_rows = rows.filter(row => _updateable(row));
  if (updateable_rows.length === 0) {
    inform_of_errors(message);
  } else {
    if (confirm_update(message)) {
      updateable_rows.forEach(row => _update_event(new Event(row)));
    }
  }
  
}










