const FormHandling = function () {
  function _getRow(range) {
    const formula = Form.getReferenceCellFormula(range);
    const A1 = formula.split('!')[1];
    const row = Schedule._getRowsFromRangeA1(A1)[0];
    return row;
  }



  // A resubmission is when the form range contains a reference to a row.
  function _reSubmission(event) {
    return Form.getReferenceCellFormula(event.range)
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

  function _copyFormDataIntoRow(event, row) {
    const rng = event.range;
    row.StartDate = Form.getRideDate(rng);
    row.Group = Form.getGroup(rng);
    row.StartTime = Form.getStartTime(rng);
    row.setRouteLink(Form.getRouteURL(rng), Form.getRouteURL(rng));
    row.RideLeaders = [Form.getFirstName(rng) + " " + Form.getLastName(rng)];
    row.Email = Form.getEmail(rng);
    Schedule.save();
    return row;
  }

  function _scheduleRide(event, rwgps, result) {
  
    

    // eval_rows([rowData], rwgps, [rowCheck.badRoute, rowCheck.noRideLeader], []);
    // if (rowData.errors && rowData.errors.length) {
    //   result.errors = rowData.errors;
    //   return result;
    // }
    const newRow = {};
    _copyFormDataIntoRow(event, newRow);
    const lastRow = Schedule.appendRow(newRow);
    RideManager.scheduleRows([lastRow], rwgps);
    result.row = lastRow;
    return result;
  }

  return {
    // docs for the event: https://developers.google.com/apps-script/guides/triggers/events
    processEvent: function (event, rwgps) {
      const result = { errors: [], warnings: [] };
      if (!_reSubmission(event)) {
        _scheduleRide(event, rwgps, result);
        Form.setReferenceCellFormula(event.range, `='${RideSheet.NAME}'!A${result.row.rowNum}`)
        // const email = composeScheduleEmailBody(result);
        // sendEmail(event[FormSheet.EMAILADDRESSCOLUMNNAME], email);
        // console.log(result);
      } else {
        const row = _getRow(event.range);
        _copyFormDataIntoRow(event, row);
        _updateRide(row, rwgps, result);
        // console.log(result);
        // Need to handle cancel/reinstate
      }
      // Need to handle help
      Schedule.save();
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
        Schedule.save();
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
