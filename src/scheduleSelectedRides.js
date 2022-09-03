/** @OnlyCurrentDoc */


function scheduleSelectedRides() {
  let form = { ...credentials, method: scheduleSelectedRidesWithCredentials.name };
  do_action(form);
}

function scheduleSelectedRidesWithCredentials(rows, rwgps) {
  function schedulable_(row) { return row.errors.length == 0; }

  function schedule_event_(rwgps, row) {
    let event = new Event(row);
    function get_template_(group) {
      switch (group) {
        case 'A': return A_TEMPLATE;
        case 'B': return B_TEMPLATE;
        case 'C': return C_TEMPLATE;
        default: throw new Error(`Unknown group: ${group}`);
      }
    }

    let new_event_url = rwgps.copy_template_(get_template_(event.group));
    rwgps.edit_event(new_event_url, event);
    event.setRideLink(new_event_url);
    return new_event_url
  }

  function create_message(rows) {
    function create_error_message(rows) {
      let message = "";
      let error_rows = rows.filter(r => !schedulable_(r));
      if (error_rows.length > 0) {
        message += "These rides had errors and will not be scheduled:\n";
        let errors = error_rows.flatMap(row => row.errors.map(error => `Row ${row.rowNum}: ${error}`));
        message += errors.join("\n");
        message += "\n\n";
      }
      return message;
    }

    function create_warning_message(rows) {
      let message = "";
      let warning_rows = rows.filter((r) => schedulable_(r) && r.warnings.length > 0);
      if (warning_rows.length > 0) {
        message += "These rides had warnings but can be scheduled:\n"
        let warnings = warning_rows.flatMap(row => row.warnings.map(warning => `Row ${row.rowNum}: ${warning}`));
        message += warnings.join("\n");
        message += "\n\n";
      }
      return message;
    }

    /**
     * Create a message for all the rides that have neither errors nor warnings
     */
    function create_schedule_message(rows) {
      let message = "";
      let clean_rows = rows.filter((r) => schedulable_(r) && r.warnings.length == 0);
      if (clean_rows.length > 0) {
        message += "These rides had neither errors nor warnings and can be scheduled:\n"
        message += clean_rows.map(row => `Row ${row.rowNum}`).join("\n");
        message += "\n\n";
      }
      return message;
    }

    let message = "";
    message += create_error_message(rows);
    message += create_warning_message(rows)
    message += create_schedule_message(rows);
    return message;
  }

  function confirm_schedule(message) {
    message += `Do you want to continue to schedule all schedulable rides?`;
    let ui = SpreadsheetApp.getUi();
    let result = ui.alert(message, ui.ButtonSet.YES_NO);
    return result == ui.Button.YES
  }

  function inform_of_errors(message) {
    message += "All selected rides are unschedulable and need to have the errors fixed.";
    SpreadsheetApp.getUi().alert(message);
  }

  clear_sidebar();
  errorFuns.push((row) => {
    if (row.RideURL !== null) {
      return "This ride has already been scheduled";
    }
  });
  
  rows.forEach(row => collectErrors_(row));
  rows.forEach(row => collectWarnings_(row));
  
  let message = create_message(rows);
  create_sidebar(rows.filter(r => !schedulable_(r) || r.warnings.length > 0));
  let schedulable_rows = rows.filter(r => schedulable_(r));
  if (schedulable_rows.length === 0) {
    inform_of_errors(message);
  } else {
    if (confirm_schedule(message)) {
      let scheduled_event_urls = schedulable_rows.map(row => schedule_event_(rwgps, row));
      rwgps.remove_tags(scheduled_event_urls, ["template"]);
    }
  }

}















