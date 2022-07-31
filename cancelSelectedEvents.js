/** @OnlyCurrentDoc */
function cancelSelectedEvents() {
  let form = { ...credentials, method: "cancelSelectedEventsWithCreds" };
  do_action(form);
}

function cancelable_(event) {
  let url = event.getRideLinkURL();
  return url !== undefined && url !== null && url !== "";
}

function cancelSelectedEventsWithCreds(events, rwgps) {
  function create_cancel_message(events) {
    function create_cancelable_message(events) {
      let message = "";
      let cancelable_events = events.filter(e => cancelable_(e));
      if (cancelable_events.length > 0) {
        message += "These rows can be canceled:\n";
        message += cancelable_events.map(e => `Row ${e.rowNum}`).join("\n");
        message += "\n\n";
      }
      return message;
    }

    function create_cancel_error_message(events) {
      let message = "";
      let non_cancelable_events = events.filter(e => !cancelable_(e));
      if (non_cancelable_events.length > 0) {
        message += "These rows don't appear to have been scheduled and cannot now be canceled:\n";
        message += non_cancelable_events.map(e => `Row ${e.rowNum}`).join("\n");
        message += "\n\n";
      }
      return message;
    }

    let message = "";
    message += create_cancel_error_message(events);
    message += create_cancelable_message(events);
    return message;
  }

  function confirm_cancel(message) {
    message += "Do you want to continue to cancel all cancelable events?"
    let ui = SpreadsheetApp.getUi();
    let result = ui.alert(message, ui.ButtonSet.YES_NO);
    return result == ui.Button.YES
  }

  function inform_of_errors(message) {
    message += "There are no events that can be canceled!";
    SpreadsheetApp.getUi().alert(message);
  }

  clear_sidebar();
  let message = create_cancel_message(events);
  let cancelable_events = events.filter(e => cancelable_(e));
  if (cancelable_events.length === 0) {
    inform_of_errors(message);
  } else {
    if (confirm_cancel(message)) {
      rwgps.batch_delete_events(cancelable_events.map(e => { let url = e.getRideLinkURL(); e.deleteRideLinkURL(); return url; }));
    }
  }
}




