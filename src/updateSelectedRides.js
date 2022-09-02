/** @OnlyCurrentDoc */


function updateSelectedRides() {
  let form = { ...credentials, method: updateSelectedRidesWithCredentials.name };
  do_action(form);
}


function updateSelectedRidesWithCredentials(events, rwgps) {
  function _updateable(event) { return event.errors.length === 0; }

  function _update_event(event) {
    event.updateRideName();
    rwgps.edit_event(event.getRideLinkURL(), event);
  }

  function create_message(events) {
    function create_error_message(events) {
      let message = "";
      let error_events = events.filter(e => !_updateable(e));
      if (error_events.length > 0) {
        message += "These rides had errors and will not be updated:\n";
        let errors = error_events.flatMap(event => event.errors.map(error => `Row ${event.rowNum}: ${error}`));
        message += errors.join("\n");
        message += "\n\n";
      }
      return message;
    }

    function create_warning_message(events) {
      let message = "";
      let warning_events = events.filter((e) => _updateable(e) && e.warnings.length > 0);
      if (warning_events.length > 0) {
        message += "These rides had warnings and can be updated:\n"
        let warnings = warning_events.flatMap(event => event.warnings.map(warning => `Row ${event.rowNum}: ${warning}`));
        message += warnings.join("\n");
        message += "\n\n";
      }
      return message;
    }

    /**
     * Create a message for all the rides that have neither errors nor warnings
     */
    function create_update_message(events) {
      let message = "";
      let updateable_events = events.filter((e) => _updateable(e) && e.warnings.length === 0);
      if (updateable_events.length > 0) {
        message += "These rides had neither errors nor warnings and can be updated:\n"
        message += updateable_events.map(event => `Row ${event.rowNum}`).join("\n");
        message += "\n\n";
      }
      return message;
    }
    
    let message = "";
    message += create_error_message(events);
    message += create_warning_message(events);
    message += create_update_message(events);
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
   * Return -1, 0, 1 if the first date is less than, equal to or greater than the second
   * @param{first} Date 
   * @param{second} Date
   */
  // function compare(first, second) {
  //   let first 
  // }
    /**
     * Compare the given event with the RWGPS event at the given event's URL. 
     * Update the given event's errors array with any issues
     * @param {object} event event to be compared
     */
  function _compare(event) {
    let url = event.getRideLinkURL();
    if (url === null) {
      event.errors.push("No ride has been scheduled");
      return;
    }
    let old_event = rwgps.get_event(url);
    if (dates.compare(event.start_date,old_event.starts_on) !== 0) {
      event.errors.push(`Start date has changed (old: ${old_event.starts_on}; new: ${event.start_date} ).`);
    }
    let old_event_group = old_event.name.split("'")[1];
    if (event.group !== old_event_group) {
      event.errors.push(`Group has changed (old: ${old_event_group}; new: ${event.group} ).`);
    }
  }

  clear_sidebar();
  events.forEach(e => _compare(e));
  let message = create_message(events);
  create_sidebar(events.filter(e => !_updateable(e) || e.warnings.length > 0 ));
  let updateable_events = events.filter(e => _updateable(e));
  if (updateable_events.length === 0) {
    inform_of_errors(message);
  } else {
    if (confirm_update(message)) {
      updateable_events.forEach(event => _update_event(event));
    }
  }
  
}










