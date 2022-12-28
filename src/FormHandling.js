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
   * Update the given row from the selection of namedValues.
   * 
   * Although the function will always complete if there are any errors then the underlying ride 
   * won't have been updated. 
   * @param {Row} row The row to be updated
   * @param {Object} namedValues The NV object from the Form Submit event
   * @param {RWGPS} rwgp The rwgps connection to update the actual event
   * @param {Object} result the result object to be updated
   * @return {boolean} true iff the row has been updated
   */
  function _updateRow(row, namedValues, rwgps, result) {
    console.log(`FormHandling - updating row`)
    console.log(namedValues);
    let updated = false;
    let v = namedValues[`${FormSheet.RIDEDATECOLUMNNAME}`][0];
    if (v) { row.StartDate = dates.convert(v); updated = true; }
    v = namedValues[`${FormSheet.STARTTIMECOLUMNNAME}`][0];
    if (v) { row.StartTime = dates.convert(`12/30/1899 ${v}`); updated = true; }
    v = namedValues[`${FormSheet.GROUPCOLUMNNAME}`][0];
    if (v) { row.Group = v; updated = true; }
    v = namedValues[`${FormSheet.ROUTEURLCOLUMNNAME}`][0];
    if (v) { row.setRouteLink(v, v); row.linkRouteURL(); updated = true; };


    if (namedValues[`${FormSheet.FIRSTNAMECOLUMNNAME}`][0] || namedValues[`${FormSheet.LASTNAMECOLUMNNAME}`][0]) {
      let oldRideLeader = row.RideLeaders[0];
      let newRideLeader = oldRideLeader;

      const [oldFirst, oldLast] = oldRideLeader.split(' ');
      let newFirst = namedValues[`${FormSheet.FIRSTNAMECOLUMNNAME}`][0].trim();
      let newLast = namedValues[`${FormSheet.LASTNAMECOLUMNNAME}`][0].trim();
      newFirst = (newFirst && newFirst !== oldFirst) ? newFirst : oldFirst;
      newLast = (newLast && newLast !== oldLast) ? newLast : oldLast;
      newRideLeader = `${newFirst} ${newLast}`;
      if (newRideLeader !== oldRideLeader) {
        row.RideLeaders = [newRideLeader];
        updated = true;
      }
    }
    return updated;
  }

  /**
   * Using the given row, update the corresponding ride
   * @param {Row} row Row from which to update the ride
   * @param {RWGPS} rwgps RWGPS object to connect to ride
   * @param {Result} result result object to collect result of underlying operations
   * @returns {Result} result object
   */
  function updateRide(row, rwgps, result) {
    row.linkRouteURL();
    RideManager.updateRows([row], rwgps);
    result.row = row;
    return result;
  }

  function copyFormDataIntoRow(event, row) {
    const rng = event.range;
    row.StartDate = Form.getRideDate(rng);
    row.Group = Form.getGroup(rng);
    row.StartTime = Form.getStartTime(rng);
    row.RouteURL = Form.getRouteURL(rng);
    row.RouteName = Form.getRouteURL(rng);
    row.RideLeaders = Form.getFirstName(rng) + " " + Form.getLastName(rng);
    row.Email = Form.getEmail(rng);
    return row;
  }

  function _scheduleRide(event, rwgps, result) {
  
    

    // eval_rows([rowData], rwgps, [rowCheck.badRoute, rowCheck.noRideLeader], []);
    // if (rowData.errors && rowData.errors.length) {
    //   result.errors = rowData.errors;
    //   return result;
    // }
    const newRow = {};
    copyFormDataIntoRow(event, newRow);
    console.log(newRow);
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
        if (_updateRow(row, event.namedValues, result)) {
          updateRide(row, rwgps, result);
        };
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
