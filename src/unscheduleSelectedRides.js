/** @OnlyCurrentDoc */
function unscheduleSelectedRides() {
  let form = { ...credentials, method: unscheduleSelectedRidesWithCreds.name };
  do_action(form);
}

function unscheduleable_(row) {
  return row.RideURL;
}

function unscheduleSelectedRidesWithCreds(rows, rwgps) {
  function create_unschedule_message(rows) {
    function create_unscheduleable_message(rows) {
      let message = "";
      let unscheduleable_rows = rows.filter(row => unscheduleable_(row));
      if (unscheduleable_rows.length > 0) {
        message += "These rows can be unscheduled:\n";
        message += unscheduleable_rows.map(row => `Row ${row.rowNum}`).join("\n");
        message += "\n\n";
      }
      return message;
    }

    function create_unschedule_error_message(rows) {
      let message = "";
      let non_unscheduleable_rows = rows.filter(row => !unscheduleable_(row));
      if (non_unscheduleable_rows.length > 0) {
        message += "These rides don't appear to have been scheduled and cannot now be unscheduled:\n";
        message += non_unscheduleable_rows.map(row => `Row ${row.rowNum}`).join("\n");
        message += "\n\n";
      }
      return message;
    }

    let message = "";
    message += create_unschedule_error_message(rows.filter(r => r.errors && r.errors.length));
    message += create_unscheduleable_message(rows.filter(r => !(r.errors &&r.errors.length)));
    return message;
  }

  function confirm_unschedule(message) {
    message += "Do you want to continue to unschedule all unscheduleable rides?"
    let ui = SpreadsheetApp.getUi();
    let result = ui.alert(message, ui.ButtonSet.YES_NO);
    return result == ui.Button.YES
  }

  function inform_of_errors(message) {
    message += "There are no rides that can be unscheduleed!";
    SpreadsheetApp.getUi().alert(message);
  }

  let message = create_unschedule_message(rows);
  let unschedulable_rows = rows.filter(row => unscheduleable_(row));
  sidebar.create(unschedulable_rows);
  if (unschedulable_rows.length === 0) {
    inform_of_errors(message);
  } else {
    if (confirm_unschedule(message)) {
      try {
        rwgps.batch_delete_events(unschedulable_rows.map(row => { let url = row.RideURL; row.deleteRideLink(); return url; }));
      } catch (err) {
        // Ignore the case where the event has already been deleted in rwgps land since we want it to be deleted anyway!
        if (err.message.indexOf('Request failed for https://ridewithgps.com returned code 404. Truncated server response: {"success":0,"message":"Record not found"} (use muteHttpExceptions option to examine full response)') === -1) {
          throw err;
        }
      }
    }
  }
}




