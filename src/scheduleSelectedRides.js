/** @OnlyCurrentDoc */


function scheduleSelectedRides() {
  let form = { ...credentials, method: scheduleSelectedRidesWithCredentials.name };
  do_action(form);
}

function scheduleSelectedRidesWithCredentials(rows, rwgps) {
  function schedulable_(row) { return row.errors.length == 0; }

  function schedule_event_(rwgps, row) {
    /**
     * Fixup the organizers (ie. ride leaders) in the given event. 
     * @param {object} rwgps - the rwgps object used to talk to rwgps
     * @param {object} event - the event object to be fixed
     */
    function fixup_organizers(rwgps, event) {
      const organizers = event.organizer_names.map(name => rwgps.lookupOrganizer(A_TEMPLATE, name)).reduce((p, o) => {
        if (o.id !== RIDE_LEADER_TBD_ID) {
          p.known.push(o)
        } else {
          p.unknown.push(o)
        };
        return p;
      },
        { known: [], unknown: [] });
      event.organizer_tokens = organizers.known.map(o => o.id + "");
      const names = organizers.known.map(o => o.text);

      // Only if there are no known organizers will the defaults be used
      if (!organizers.known.length) {
        event.organizer_tokens.push(RIDE_LEADER_TBD_ID + "");
        names.push(RIDE_LEADER_TBD_NAME);
      }

      event.desc = `Ride Leader${names.length > 1 ? "s" : ""}: ${names.join(', ')}

    ${event.desc}`;
    }

    let event = new Event(row);
    fixup_organizers(rwgps, event);

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
    rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, EXPIRY_DELAY), true );
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

  linkRouteURLs();
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















