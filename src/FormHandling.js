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
   */
  function _updateRow(row, namedValues, rwgps, result) {
    console.log(`FormHandling - updating row`)
    console.log(namedValues);
    let dirty = false;
    let v = namedValues[`${FormSheet.RIDEDATECOLUMNNAME}`][0];
    if (v) row.StartDate = dates.convert(v);
    v = namedValues[`${FormSheet.STARTTIMECOLUMNNAME}`][0];
    console.log(dates.convert(v));
    if (v) row.StartTime = dates.convert(`12/30/1899 ${v}`);
    console.log(v);

    const mapping = [
      [FormSheet.GROUPCOLUMNNAME, "Group"],
      [FormSheet.ROUTEURLCOLUMNNAME, "RouteName"],
    ]
    mapping.forEach((m) => {
      let v = namedValues[`${m[0]}`][0];
      console.log(`FormHandling - namedValues[${m[0]}] = ${v}`);
      if (v) {
        try {
          row[`${m[1]}`] = v;
          dirty = true;
        } catch (e) {
          result.errors.push(e);
        }
      }
    });
    if (namedValues[`${FormSheet.FIRSTNAMECOLUMNNAME}`][0] || namedValues[`${FormSheet.LASTNAMECOLUMNNAME}`][0]) {
      let oldRideLeader = row.RideLeaders[0];
      let newRideLeader = oldRideLeader;

      let [oldFirst, oldLast] = oldRideLeader.split();
      let newFirst = namedValues[`${FormSheet.FIRSTNAMECOLUMNNAME}`][0].trim();
      let newLast = namedValues[`${FormSheet.LASTNAMECOLUMNNAME}`][0].trim();
      console.log(`FormHandling - newFirst: '${newFirst}' ${typeof newFirst}`);
      console.log(`FormHandling - newLast: '${newLast}' ${typeof newLast}`)
      if (newFirst || newLast) {
        newFirst = (newFirst && newFirst != oldFirst) ? newFirst : oldFirst;
        newLast = (newLast && newLast != oldLast) ? newLast : oldLast;
        newRideLeader = `${newFirst} ${newLast}`;
        console.log(`'${newRideLeader}'`);
      }
      if (newRideLeader !== oldRideLeader) {
        row.RideLeaders = [newRideLeader];
        dirty = true;
      }
    }
    if (dirty) {
      // checkRow(row, result);
      RideManager.updateRows([row], rwgps);
    }
    result.row = row;
    return result;
  }

  function _scheduleRide(event, rwgps, result) {
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
    processEvent: function (event, rwgps) {
      const result = { errors: [], warnings: [] };
      if (!_reSubmission(event)) {
        _scheduleRide(event, rwgps, result);
        Form.setReferenceCell(event.range, `='${RideSheet.NAME}'!A${result.row.rowNum}`)
        // const email = composeScheduleEmailBody(result);
        // sendEmail(event[FormSheet.EMAILADDRESSCOLUMNNAME], email);
        console.log(result);
      } else {
        const row = _getRow(event.range);
        _updateRow(row, event.namedValues, rwgps, result);
        console.log(result);
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
