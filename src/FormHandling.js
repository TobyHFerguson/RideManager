const FormHandling = function () {
  function _cancelRide(row, rwgps) {
    RideManager.cancelRows([row], rwgps);
  }

  function _copyFormDataIntoRow(event, row) {
    const rng = event.range;
    row.StartDate = Form.getRideDate(rng);
    row.Group = Form.getGroup(rng);
    row.StartTime = Form.getStartTime(rng);
    if (row.setRouteLink) {
      row.setRouteLink(Form.getRouteURL(rng), Form.getRouteURL(rng));
    } else {
      row.RouteURL = Form.getRouteURL(rng);
    }
    row.RideLeaders = [Form.getFirstName(rng) + " " + Form.getLastName(rng)];
    row.Email = Form.getEmail(rng);
    return row;
  }

  function _deleteRide(row, rwgps) {
    RideManager.unscheduleRows([row], rwgps);
  }

  function _getRowFromSchedule(range) {
    const formula = Form.getReferenceCellFormula(range);
    const A1 = formula.split('!')[1];
    const row = Schedule._getRowsFromRangeA1(A1)[0];
    return row;
  }

  /**
   * Check the given row and if the route is foreign and not yet imported then import it and record the import
   * @param {Row} row the row object
   * @param {Event} event the Form Submission object
   * @param {RWGPS} rwgps the RWGPS connection
   */
  function _importForeignRoute(row, event, rwgps) {
    function _routeNotYetImported(event) {
      return !(Form.getImportedRouteURL(event.range));
    }

    let fridx = row.errors.findIndex(e => e === rowCheck.FOREIGN_ROUTE);
    if (fridx === -1) {
      // If the route isn't foreign then be sure to clear the foreign route record
      Form.setImportedRouteURL(event.range, '');
    }
    else {
      row.errors.splice(fridx, 1);
      if (_routeNotYetImported(event)) {
        RideManager.importRows([row], rwgps);
        Form.setImportedRouteURL(event.range, row.RouteURL);
      } else {
        row.RouteURL = Form.getImportedRouteURL(event.range);
      }
      row.errors.push(`Foreign route detected. Please resubmit using this URL for the route: ${row.RouteURL}`);
    }
  }

  function _isHelpNeeded(event) {
    return Form.isHelpNeeded(event.range);
  }

  // A resubmission is when the form range contains a reference to a row.
  function _isReSubmission(event) {
    return Form.getReferenceCellFormula(event.range)
  }

  // Linking the form row to the ride row allows us to find the ride row when the form is 
  // resubmitted. By using formulas we're guaranteed that this reference is stable over
  // operations such as sorting and filtering.
  function _linkFormRowToRideRow(range, row) {
    Form.setReferenceCellFormula(range, `='${RideSheet.NAME}'!A${row.rowNum}`)
  }

  /**
   * Notify the required people that help is needed
   * @param {Event} event The Form Submit event
   */
  function _notifyHelpNeeded(event) {
    console.log('Help Needed');
  }

  /**
   * Notify the result of a resubmission
   */
  function _notifyResubmissionResult(row) {
    console.log("Resubmitted a ride");
    console.log(`Errors: ${row.errors ? row.errors.join(', ') : []}`);
    console.log(`Warnings: ${row.warnings ? row.warnings.join(', ') : []}`)
  }

  /**
   * Notify the result of a submission
   */
  function _notifySubmissionResult(row, email) {
    console.log("Submitted a ride");
    console.log(`Errors: ${row.errors ? row.errors.join(', ') : []}`);
    console.log(`Warnings: ${row.warnings ? row.warnings.join(', ') : []}`)
    Email.rideSubmitted(row, email);
  }

  /**
   * Using the given event, copy the relevant data into the given row, check it for errors
   * and import any foreign route
   * @param {Event} event the form submission event
   * @param {RWGPS} rwgps RWGPS connection
   * @param {[Row]} row the row to be prepared - defaults to a suitable row object
   * @returns the given row, or the default row object
   */
  function _prepareRowFromEvent(event, rwgps, row) {
    row = row ? row : {
      highlight: false,
      setRouteLink: function (text, url) { this.RouteURL = url; },
      linkRouteURL: () => { },
      highlightRideLeader: function (h) { this.highlight = h; }
    };
    _copyFormDataIntoRow(event, row);
    evalRows([row], rwgps, [rowCheck.badRoute], [rowCheck.noRideLeader, rowCheck.inappropiateGroup]);
    _importForeignRoute(row, event, rwgps);
    return row;
  }

  /**
   * Process an initial ride request.
   * 
   * @param {Event} event The Form Submit event to be processed
   * @param {RWGPS} rwgps The RWGPS connection
   */
  function _processInitialSubmission(event, rwgps) {
    // The row Data Object here is not attached to the spreadsheet!
    let rowDO = _prepareRowFromEvent(event, rwgps);
    if (!(rowDO.errors && rowDO.errors.length)) {
      // The following line creates a row that is attached to the spreadsheet.
      const newRow = Schedule.appendRow(rowDO);
      // Copy over the other values from the DO to the newRow object.
      if (rowDO.highlight) newRow.highlightRideLeader(true);
      RideManager.scheduleRows([newRow], rwgps);
      newRow.save();
      _linkFormRowToRideRow(event.range, newRow);
      rowDO = newRow;
    }
    _notifySubmissionResult(rowDO, Form.getEmail(event.range));
  }

  /**
   * Process a resubmitted ride request
   * 
   * @param {Event} event The Form Submit event to be processed
   * @param {RWGPS} rwgps The RWGPS connection
   */
  function _processResubmission(event, rwgps) {
    const row = _getRowFromSchedule(event.range);
    _prepareRowFromEvent(event, rwgps, row)
    // Save here in case anything goes wrong later on.
    row.save();
    if (!(row.errors && row.errors.length)) {
      _updateRide(row, rwgps);
    }

    if (Form.isRideDeleted(event.range)) {
      // We send the notification first because once we've deleted the 
      // ride there is no name to use to tell anyone about it!
      Email.rideDeleted(row, Form.getEmail(event.range));
      _deleteRide(row, rwgps);
    } else {
      if (Form.isRideCancelled(event.range)) {
        _cancelRide(row, rwgps);
        Email.rideCancelled(row, Form.getEmail(event.range))
      } else {
        _reinstateRide(row, rwgps);
        Email.rideResubmitted(row, Form.getEmail(event.range))
      }
    }
    row.save();
    _notifyResubmissionResult(row);
  }

  function _reinstateRide(row, rwgps) {
    RideManager.reinstateRows([row], rwgps);
  }

  /**
   * Using the given row, update the corresponding ride
   * @param {Row} row Row from which to update the ride
   * @param {RWGPS} rwgps RWGPS object to connect to ride
   * @returns {Row} row object
   */
  function _updateRide(row, rwgps) {
    row.linkRouteURL();
    if (row.RideURL) {
      RideManager.updateRows([row], rwgps);
    } else {
      RideManager.scheduleRows([row], rwgps);
    }
    return row;
  }

  return {
    // docs for the event: https://developers.google.com/apps-script/guides/triggers/events
    processEvent: function (event, rwgps) {
      if (!_isReSubmission(event)) {
        _processInitialSubmission(event, rwgps);
      } else {
        _processResubmission(event, rwgps);
      }
      if (_isHelpNeeded(event)) {
        let row = {};
        _copyFormDataIntoRow(event, row);
        Email.help(row, Form.getEmail(event.range))
        _notifyHelpNeeded(event);
      }
    },
    tests: {
      testGoodRide: function () {
        let namedValues = {}
        namedValues[`${FormSheet.RIDEDATECOLUMNNAME}`] = ["12/31/2024"];
        namedValues[`${FormSheet.GROUPCOLUMNNAME}`] = ["A"];
        namedValues[`${FormSheet.STARTTIMECOLUMNNAME}`] = ["10:00 AM"];
        namedValues[`${FormSheet.ROUTEURLCOLUMNNAME}`] = ["https://ridewithgps.com/routes/30674325"];
        namedValues[`${FormSheet.FIRSTNAMECOLUMNNAME}`] = ["Toby"];
        namedValues[`${FormSheet.LASTNAMECOLUMNNAME}`] = ["Ferguson"];
        namedValues[`${FormSheet.EMAILADDRESSCOLUMNNAME}`] = ["toby.h.ferguson@icloud.com"];

      }
    }
  }
}();


function testGoodRide() {
  FormHandling.tests.testGoodRide();
}


function testBadRide() {
  let rideData = {
    Date: "12/30/2024",
    Group: "C",
    'Start Time': "10:00 AM",
    Route: "https://ridewithgps.com/routes/30674325",
    'Ride Leader': "Not Known",
    Email: "toby.h.ferguson@icloud.com"
  };
  FormHandling.scheduleEvent(rideData);
}
