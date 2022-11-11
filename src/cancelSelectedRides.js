/** @OnlyCurrentDoc */
function cancelSelectedRides() {
    let form = { ...credentials, method: cancelSelectedRidesWithCreds.name };
    do_action(form);
  }
  
  

  function cancelSelectedRidesWithCreds(rows, rwgps) {

    
    function create_message(rows) {
      function create_error_message(rows) {
        let message = "";
        let error_rows = rows.filter(row => row.errors.length);
        if (error_rows.length > 0) {
          message += "These rides had errors and will not be cancelled:\n";
          let errors = error_rows.flatMap(row => row.errors.map(error => `Row ${row.rowNum}: ${error}`));
          message += errors.join("\n");
          message += "\n\n";
        }
        return message;
      }
  
      function create_warning_message(rows) {
        let message = "";
        let warning_rows = rows.filter(r => r.warnings.length);
        if (warning_rows.length > 0) {
          message += "These rides had warnings and can be cancelled:\n"
          let warnings = warning_rows.flatMap(row => row.warnings.map(warning => `Row ${row.rowNum}: ${warning}`));
          message += warnings.join("\n");
          message += "\n\n";
        }
        return message;
      }
  
      /**
       * Create a message for all the rides that have neither errors nor warnings
       */
      function create_unschedule_message(rows) {
        let message = "";
        let updateable_rows = rows.filter((row) => !row.errors.length && !row.warnings.length);
        if (updateable_rows.length > 0) {
          message += "These rides had neither errors nor warnings and can be cancelled:\n"
          message += updateable_rows.map(row => `Row ${row.rowNum}`).join("\n");
          message += "\n\n";
        }
        return message;
      }
  
      let message = "";
      message += create_error_message(rows);
      message += create_warning_message(rows);
      message += create_unschedule_message(rows);
      return message;
    }
  
    function confirm_cancel(message) {
      message += "Do you want to continue to cancel all cancelable rides?"
      let ui = SpreadsheetApp.getUi();
      let result = ui.alert(message, ui.ButtonSet.YES_NO);
      return result == ui.Button.YES
    }
  
    function inform_of_errors(message) {
      message += "There are no rides that can be canceled!";
      SpreadsheetApp.getUi().alert(message);
    }
    rows.forEach(row => evalRow_(row, rwgps, [rowCheck.unscheduled, rowCheck.unmanagedRide], []));
    let message = create_message(rows);
    let canceleable_events = rows.filter(row => !row.errors.length).map(row => new Event(row));
    if (canceleable_events.length === 0) {
      inform_of_errors(message);
    } else {
      if (confirm_cancel(message)) {
        canceleable_events.forEach(event => { event.cancel(); rwgps.edit_event(event.getRideLinkURL(), event)} );
      }
    }
  }
  
  
  
  
  