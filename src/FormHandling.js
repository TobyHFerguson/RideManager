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
   * Process an initial ride request, updating the result appropriately.
   * 
   * @param {Event} event The Form Submit event to be processed
   * @param {RWGPS} rwgps The RWGPS connection
   * @param {Object} result the result object to be marked up
   */
  function _processInitialSubmission(event, rwgps, result) {
    _scheduleRide(event, rwgps, result);
    _linkFormRowToRideRow(event.range, result.row);
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
    // Save here in case anything goes wrong later on.
    row.save();
    _updateRide(row, rwgps, result);
    if (Form.isRideCancelled(event.range)) {
      _cancelRide(row, rwgps, result);
    } else {
      _reinstateRide(row, rwgps, result);
    }
    row.save();
  }

  function _reinstateRide(row, rwgps, result) {
    RideManager.reinstateRows([row], rwgps);
  }

  function _routeNotYetImported(event) {
    return !(Form.getImportedRouteURL(event.range));
  }
  function _scheduleRide(event, rwgps, result) {
    function _notifySubmissionErrors(event, errors) {
      console.log("Errors during submission");
      console.log(errors);
      console.log();
    }
    const newRow = { setRouteLink: function(text, url) { this.RouteURL = url; },
    linkRouteURL: () => {}
  };
    _copyFormDataIntoRow(event, newRow);
    evalRows([newRow], rwgps, [rowCheck.badRoute], []);
    console.log("FormHandling - errors")
    console.log(newRow.errors);
    let fridx = newRow.errors.findIndex(e => e === rowCheck.FOREIGN_ROUTE);
    if (fridx !== -1) {
      console.log("foreign route")
      newRow.errors.splice(fridx, 1);
      if (_routeNotYetImported(event)) {
        console.log("importing foreign route")
        RideManager.importRows([newRow], rwgps);
        Form.setImportedRouteURL(event.range, newRow.RouteURL);
        console.log(`Foreign route recorded as ${Form.getImportedRouteURL(event.range)}`)
      }
      newRow.warnings.push(`Foreign route detected. Please resubmit using this URL for the route: ${newRow.RouteURL}`)
    }
    if (newRow.errors.length) {
      _notifySubmissionErrors(event, newRow.errors);
    }
    const lastRow = Schedule.appendRow(newRow);
    RideManager.scheduleRows([lastRow], rwgps);
    lastRow.save();
    result.row = lastRow;
    return result;
  }

  /**
   * Using the given row, update the corresponding ride
   * @param {Row} row Row from which to update the ride
   * @param {RWGPS} rwgps RWGPS object to connect to ride
   * @param {Result} result result object to collect result of underlying operations
   * @returns {Result} result object
   */
  function _updateRide(row, rwgps, result) {
    row.linkRouteURL();
    RideManager.updateRows([row], rwgps);
    result.row = row;
    return result;
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
