/** @OnlyCurrentDoc */


function scheduleSelectedEvents() {
  let form = { ...credentials, method: "scheduleSelectedEventsWithCredentials" };
  do_action(form);
}


function scheduleSelectedEventsWithCredentials(events, rwgps) {
  function schedulable_(event) { return event.errors.length == 0; }

  function schedule_event_(rwgps, event) {
    function get_template_(group) {
      switch (group) {
        case 'A': return A_TEMPLATE;
        case 'B': return B_TEMPLATE;
        case 'C': return C_TEMPLATE;
        default: throw error(`Unknown group: ${group}`);
      }
    }

    let new_event_url = rwgps.copy_template_(get_template_(event.group));
    rwgps.edit_event(new_event_url, event);
    event.setRideLink(new_event_url);
    return new_event_url
  }

  function create_message(events) {
    function create_error_message(events) {
      let message = "";
      let error_events = events.filter(e => !schedulable_(e));
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

  function confirm_schedule(message) {
    message += `Do you want to continue to schedule all schedulable events?`;
    let ui = SpreadsheetApp.getUi();
    let result = ui.alert(message, ui.ButtonSet.YES_NO);
    return result == ui.Button.YES
  }

  function inform_of_errors(message) {
    message += "All selected rows are unschedulable and need to have the errors fixed.";
    SpreadsheetApp.getUi().alert(message);
  }

  clear_sidebar();
  let message = create_message(events);
  let schedulable_events = events.filter(e => schedulable_(e));
  if (schedulable_events.length === 0) {
    inform_of_errors(message);
  } else {
    if (confirm_schedule(message)) {
      let scheduled_event_urls = schedulable_events.map(event => schedule_event_(rwgps, event));
      rwgps.remove_tags(scheduled_event_urls, ["template"]);
    }
  }
  create_sidebar(events.filter(e => e.errors.length > 0 || e.warnings.length > 0));
}










