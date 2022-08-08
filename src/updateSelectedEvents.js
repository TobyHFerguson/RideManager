/** @OnlyCurrentDoc */


function updateSelectedEvents() {
  let form = { ...credentials, method: "updateSelectedEventsWithCredentials" };
  do_action(form);
}


function updateSelectedEventsWithCredentials(events, rwgps) {
  function _updateable(event) { return event.errors.length == 0; }

  function _update_event(event) {
    rwgps.edit_event(new_event_url, event);
  }

  function create_message(events) {
    function create_error_message(events) {
      let message = "";
      let error_events = events.filter(e => !_updateable(e));
      if (error_events.length > 0) {
        message += "These rows had errors and will not be scheduled:\n";
        let errors = error_events.flatMap(event => event.errors.map(error => `Row ${event.rowNum}: ${error}`));
        message += errors.join("\n");
        message += "\n\n";
      }
      return message;
    }

    function create_warning_message(events) {
      let message = "";
      let warning_events = events.filter((e) => e.warnings.length > 0);
      if (warning_events.length > 0) {
        message += "These rows had warnings and can be scheduled:\n"
        let warnings = warning_events.flatMap(event => event.warnings.map(warning => `Row ${event.rowNum}: ${warning}`));
        message += warnings.join("\n");
        message += "\n\n";
      }
      return message;
    }

    /**
     * Create a message for all the events that have neither errors nor warnings
     */
    function create_schedule_message(events) {
      let message = "";
      let clean_events = events.filter((e) => e.warnings.length == 0 && e.errors.length == 0);
      if (clean_events.length > 0) {
        message += "These rows had neither errors nor warnings and can be scheduled:\n"
        message += clean_events.map(event => `Row ${event.rowNum}`).join("\n");
        message += "\n\n";
      }
      return message;
    }
    
    let message = "";
    message += create_error_message(events);
    message += create_warning_message(events)
    message += create_schedule_message(events);
    return message;
  }

  function confirm_update(message) {
    message += `Do you want to continue to schedule all schedulable events?`;
    let ui = SpreadsheetApp.getUi();
    let result = ui.alert(message, ui.ButtonSet.YES_NO);
    return result == ui.Button.YES
  }

  function inform_of_errors(message) {
    message += "All selected rows are unschedulable and need to have the errors fixed.";
    SpreadsheetApp.getUi().alert(message);
  }

    /**
     * Compare the given event with the RWGPS event at the given event's URL. 
     * Update the given event's errors array with any issues
     * @param {object} event event to be compared
     */
  function _compare(event) {
    let url = event.getRideLinkUrl();
    if (url === null) {
      event.errors.push("Cannot update. No event has been scheduled");
      return;
    }
    let old_event = rgwps.getEvent(url);
    if (event.start_date != old_event.start_date) {
      event.errors.push(`Start date has changed (old: ${old_event.start_date}; new: ${event.start_date} ). Cannot update this event.`);
    }
    if (event.group != old_event.group) {
      event.errors.push(`Group has changed (old: ${old_event.group}; new: ${event.group} ). Cannot update this event.`);
    }
  }

  clear_sidebar();
  events.forEach(e => _compare(e));
  let message = create_message(events);
  let updateable_events = events.filter(e => _updateable(e));
  if (updateable_events.length === 0) {
    inform_of_errors(message);
  } else {
    if (confirm_update(message)) {
      updateable_events.forEach(event => rwgps.edit_event(event.getRideLinkUrl(), event));
    }
  }
  create_sidebar(events.filter(e => e.errors.length > 0 || e.warnings.length > 0));
}










