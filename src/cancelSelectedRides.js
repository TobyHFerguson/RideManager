/** @OnlyCurrentDoc */
function cancelSelectedRides() {
    let form = { ...credentials, method: cancelSelectedRidesWithCreds.name };
    do_action(form);
  }
  
  

  function cancelSelectedRidesWithCreds(rows, rwgps) {
    /**
     * Return true iff the given row can be canceled.
     * @param {object} row - row to examine to determine if cancellable
     * @returns 
     */
    function cancelable_(row) {
      let url = row.RideURL;
      return url !== undefined && url !== null && url !== "";
    }
    
    function create_cancel_message(rows) {
      function create_cancelable_message(rows) {
        let message = "";
        let cancelable_rows = rows.filter(row => cancelable_(row));
        if (cancelable_rows.length > 0) {
          message += "These rows can be canceled:\n";
          message += cancelable_rows.map(row => `Row ${row.rowNum}`).join("\n");
          message += "\n\n";
        }
        return message;
      }
  
      function create_cancel_error_message(rows) {
        let message = "";
        let non_cancelable_rows = rows.filter(row => !cancelable_(row));
        if (non_cancelable_rows.length > 0) {
          message += "These rides don't appear to have been scheduled and cannot now be canceled:\n";
          message += non_cancelable_rows.map(row => `Row ${row.rowNum}`).join("\n");
          message += "\n\n";
        }
        return message;
      }
  
      let message = "";
      message += create_cancel_error_message(rows);
      message += create_cancelable_message(rows);
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
  
    let message = create_cancel_message(rows);
    let canceleable_events = rows.filter(row => cancelable_(row)).map(row => new Event(row));
    if (canceleable_events.length === 0) {
      inform_of_errors(message);
    } else {
      if (confirm_cancel(message)) {
        try {
          canceleable_events.forEach(event => { event.cancel(); rwgps.edit_event(event.getRideLinkURL(), event)} );
        } catch (err) {
          if (err.message.indexOf('Request failed for https://ridewithgps.com returned code 404. Truncated server response: {"success":0,"message":"Record not found"} (use muteHttpExceptions option to examine full response)') === -1) {
            throw err;
          }
        }
      }
    }
  }
  
  
  
  
  