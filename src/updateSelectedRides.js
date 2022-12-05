/** @OnlyCurrentDoc */
if (typeof require !== 'undefined') {
  Globals = require('../Globals.js');
}

function updateSelectedRides() {
  let form = { ...credentials, method: updateSelectedRidesWithCredentials.name };
  do_action(form);
}


function updateSelectedRidesWithCredentials(rows, rwgps) {
  function _updateable(row) { return row.errors.length === 0; }


  function _update_event(row) {
    let event
    if (!Event.managedEventName(row.RideName)) {
      event = EventFactory.fromRwgpsEvent(rwgps.get_event(row.RideURL));
    } else {
      event = EventFactory.newEvent(row, rwgps.getOrganizers(row.RideLeaders));
      rwgps.setRouteExpiration(row.RouteURL, dates.add(row.StartDate, Globals.EXPIRY_DELAY), true);
    }
    event.updateRiderCount(rwgps.getRSVPCounts([row.RideURL], [row.RideLeaders]));
    event.reinstate();
    row.setRideLink(event.name, row.RideURL);
    rwgps.edit_event(row.RideURL, event);
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

  


  linkRouteURLs();
  rows.map(row => evalRow_(row, rwgps, [rowCheck.unscheduled, rowCheck.unmanagedRide]))
    .filter(row => row.errors.length === 0);
  let message = create_message(rows);
  sidebar.create(rows.filter(row => !_updateable(row) || row.warnings.length > 0));
  let updateable_rows = rows.filter(row => _updateable(row));
  if (updateable_rows.length === 0) {
    inform_of_errors(message);
  } else {
    if (confirm_update(message)) {
      updateable_rows.forEach(row => _update_event(row));
    }
  }

}










