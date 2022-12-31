const FormHandling = function () {
  function _cancelRide(row, rwgps, result) {
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
    row.RideLeaders = Form.getFirstName(rng) + " " + Form.getLastName(rng);
    row.Email = Form.getEmail(rng);
    return row;
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
      }
      row.warnings.push(`Foreign route detected. Please resubmit using this URL for the route: ${row.RouteURL}`);
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
  function _notifySubmissionResult(row) {
    console.log("Submitted a ride");
    console.log(`Errors: ${row.errors ? row.errors.join(', ') : []}`);
    console.log(`Warnings: ${row.warnings ? row.warnings.join(', ') : []}`)
  }
  /**
   * Process an initial ride request, updating the result appropriately.
   * 
   * @param {Event} event The Form Submit event to be processed
   * @param {RWGPS} rwgps The RWGPS connection
   * @param {Object} result the result object to be marked up
   */
  function _processInitialSubmission(event, rwgps) {
    const row = _scheduleRide(event, rwgps);
    if (!(row.errors && row.errors.length)) {
      _linkFormRowToRideRow(event.range, row);
    }
    _notifySubmissionResult(row);
  }

  /**
   * Process a resubmitted ride request, updating the result appropriately.
   * 
   * @param {Event} event The Form Submit event to be processed
   * @param {RWGPS} rwgps The RWGPS connection
   * @param {Ojbect} result The Result object
   */
  function _processResubmission(event, rwgps, result) {
    const row = _getRowFromSchedule(event.range);
    _copyFormDataIntoRow(event, row);
    evalRows([row], rwgps, [rowCheck.badRoute], [rowCheck.noRideLeader]);
    _importForeignRoute(row, event, rwgps);
    // Save here in case anything goes wrong later on.
    row.save();
    if (!row.errors.length) {
      _updateRide(row, rwgps);
    }
    
    if (Form.isRideCancelled(event.range)) {
      _cancelRide(row, rwgps, result);
    } else {
      _reinstateRide(row, rwgps, result);
    }
    row.save();
    _notifyResubmissionResult(row);
  }

  function _reinstateRide(row, rwgps, result) {
    RideManager.reinstateRows([row], rwgps);
  }

  function _scheduleRide(event, rwgps, result) {
    const newRow = {
      highlight: false, 
      setRouteLink: function (text, url) { this.RouteURL = url; },
      linkRouteURL: () => { },
      highlightRideLeader: function (h) { this.highlight = h; }
    };
    _copyFormDataIntoRow(event, newRow);
    evalRows([newRow], rwgps, [rowCheck.badRoute], [rowCheck.noRideLeader]);
    _importForeignRoute(newRow, event, rwgps);
    if (newRow.errors.length) {
      return newRow;
    }
    const lastRow = Schedule.appendRow(newRow);
    if (newRow.highlight) lastRow.highlightRideLeader(true);
    RideManager.scheduleRows([lastRow], rwgps);
    lastRow.save();
    lastRow.warnings = newRow.warnings;
    return lastRow;
  }

  

  /**
   * Using the given row, update the corresponding ride
   * @param {Row} row Row from which to update the ride
   * @param {RWGPS} rwgps RWGPS object to connect to ride
   * @returns {Row} row object
   */
  function _updateRide(row, rwgps) {
    row.linkRouteURL();
    RideManager.updateRows([row], rwgps);
    return row;
  }

  return {
    // docs for the event: https://developers.google.com/apps-script/guides/triggers/events
    processEvent: function (event, rwgps) {
      const result = { errors: [], warnings: [] };
      if (!_isReSubmission(event)) {
        _processInitialSubmission(event, rwgps, result);
      } else {
        _processResubmission(event, rwgps, result);
      }
      if (_isHelpNeeded(event)) {
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

        _scheduleRide({ namedValues: namedValues });
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
