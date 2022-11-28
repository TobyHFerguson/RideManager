/** @OnlyCurrentDoc */
if (typeof require !== 'undefined') {
  Globals = require('./Globals.js');
}

function scheduleSelectedRides() {
  let form = { ...credentials, method: scheduleSelectedRidesWithCredentials.name };
  do_action(form);
}

function scheduleSelectedRidesWithCredentials(rows, rwgps) {
  function schedulable_(row) { return row.errors.length == 0; }

  function schedule_event_(rwgps, row) {
   


    function get_template_(group) {
      switch (group) {
        case 'A': return Globals.A_TEMPLATE;
        case 'B': return Globals.B_TEMPLATE;
        case 'C': return Globals.C_TEMPLATE;
        default: throw new Error(`Unknown group: ${group}`);
      }
    }
    const event = EventFactory.newEvent(row, rwgps.getOrganizers(row.RideLeaders));
    const new_event_url = rwgps.copy_template_(get_template_(row.Group));
    rwgps.edit_event(new_event_url, event);
    rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, Globals.EXPIRY_DELAY), true );
    row.setRideLink(event.name, new_event_url);
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

rows.forEach(row => Schedule.linkRouteURL(row));
  errorFuns.push(rowCheck.alreadyScheduled);
  rows.forEach(row => evalRow_(row, rwgps));
  let message = create_message(rows);
  sidebar.create(rows.filter(r => !schedulable_(r) || r.warnings.length > 0));
  let schedulable_rows = rows.filter(r => schedulable_(r));
  if (schedulable_rows.length === 0) {
    inform_of_errors(message);
  } else {
    if (confirm_schedule(message)) {
      let scheduled_event_urls = schedulable_rows.map(row => schedule_event_(rwgps, row));
      rwgps.unTagEvents(scheduled_event_urls, ["template"]);
    }
  }

}















