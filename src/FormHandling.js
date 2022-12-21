




const FormHandling = function () {
  function _getRow(range) {
    const formula = Form.getReferenceCellFormula(range);
    const A1 = formula.split('!')[1];
    console.log(`FormHandling - A1: ${A1}`)
    const row = Schedule._getRowsFromRangeA1(A1)[0];
    console.log(`FormHandling - row ${row.rowNum} values: ${row.myRowValues}`)
    return row;
  }

  function _updateRow(row, namedValues, result) {
    console.log(`FormHandling - Updating row ${row.rowNum} with following changes`)
    console.log(namedValues);
  }
  
  // A resubmission is when the form range contains a reference to a row.
  function _reSubmission(event) {
    return Form.getReferenceCellFormula(event.range)
  }
  
  function _scheduleRide(event, result) {
    console.log(event.namedValues);
    function createRowData(event) {
      const nv = event.namedValues;
      const rowData = {}
      rowData.StartDate = nv[`${FormSheet.RIDEDATECOLUMNNAME}`][0];
      rowData.Group = nv[`${FormSheet.GROUPCOLUMNNAME}`][0];
      rowData.StartTime = nv[`${FormSheet.STARTTIMECOLUMNNAME}`][0];
      rowData.RouteURL = nv[`${FormSheet.ROUTEURLCOLUMNNAME}`][0];
      rowData.RouteName = nv[`${FormSheet.ROUTEURLCOLUMNNAME}`][0];
      rowData.RideLeaders = nv[`${FormSheet.FIRSTNAMECOLUMNNAME}`] + "  " + nv[`${FormSheet.LASTNAMECOLUMNNAME}`][0];
      rowData.Email = nv[`${FormSheet.EMAILADDRESSCOLUMNNAME}`][0];
      return rowData;
    }
    const rowData = createRowData(event);
    console.log(rowData);
    const rwgps = new RWGPS(new RWGPSService(credentials.email, credentials.password));
    // eval_rows([rowData], rwgps, [rowCheck.badRoute, rowCheck.noRideLeader], []);
    // if (rowData.errors && rowData.errors.length) {
    //   result.errors = rowData.errors;
    //   return result;
    // }

    const lastRow = Schedule.appendRow(rowData);
    RideManager.scheduleRows([lastRow], rwgps);
    result.row = lastRow;
    return result;
  }
  
  return {
    // docs for the event: https://developers.google.com/apps-script/guides/triggers/events
    processEvent: function (event) {
      const result = {};
      if (!_reSubmission(event)) {
        _scheduleRide(event, result);
        Form.setReferenceCell(event.range, `='${RideSheet.NAME}'!A${result.row.rowNum}`)
        // const email = composeScheduleEmailBody(result);
        // sendEmail(event[FormSheet.EMAILADDRESSCOLUMNNAME], email);
        console.log(result);
      } else {
        const row = _getRow(event.range);
        _updateRow(row, event.namedValues, result);
        // Need to handle cancel/reinstate
      }
      // Need to handle help
      Schedule.save();
    },
    tests: {
      testGoodRide: function ()  {
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
