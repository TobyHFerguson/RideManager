const FormHandling = function () {
  function _log(m, event) {
    console.log(`FormHandling: ${m}`, event ? event.namedValues : '');
  }
  function _cancelRide(rideRow, rwgps) {
    RideManager.cancelRows([rideRow], rwgps);
  }
/**
 * 
 * @param {FormRow} formRow 
 * @param {Row} rideRow 
 * @returns 
 */
  function _copyFormRowIntoRideRow(formRow, rideRow) {
    rideRow.StartDate = formRow.RideDate;
    rideRow.Group = formRow.Group;
    rideRow.StartTime = formRow.StartTime;
    if (rideRow.setRouteLink) {
      rideRow.setRouteLink(formRow.RouteURL, formRow.RouteURL);
    } else {
      rideRow.RouteURL = formRow.RouteURL;
    }
    rideRow.RideLeaders = formRow.FirstName + " " + formRow.LastName;
    rideRow.Email = formRow.Email;
    return rideRow;
  }

  function _deleteRide(rideRow, rwgps) {
    RideManager.unrideRows([rideRow], rwgps);
  }

  function _getRideRowFromReferenceFormula(formula) {
    const A1 = formula.split('!')[1];
    const rideRow = Schedule._getRowsFromRangeA1(A1)[0];
    return rideRow;
  }

  /**
   * Check the given form row and if the route is foreign and not yet imported then import it
   * into the given ride row, recording the import
   * 
   * The rideRow has been created from the given formRow
   * 
   * @param {Row} rideRow the row object
   * @param {FormRow} formRow the form row
   * @param {RWGPS} rwgps the RWGPS connection
   */
  //TODO - tidy up - I don't like the assumption that the rideRow has been created from the 
  // given form row. how do I check that? 
  function _importForeignRoute(rideRow, formRow, rwgps) {
    let fridx = rideRow.errors.findIndex(e => e === rowCheck.FOREIGN_ROUTE);
    if (fridx === -1) {
      // If the route in the ride row isn't foreign then clear the foreign route record in the form row
      formRow.ImportedRouteURL = '';
    }
    else {
      // remove the foreign route error from the list of errors
      rideRow.errors.splice(fridx, 1);
      // If the route has not been imported (there's no reference to it in the form row)
      // then import it.
      if (!(formRow.ImportedRouteURL)) {
        RideManager.importRows([rideRow], rwgps);
        formRow.ImportedRouteURL = rideRow.RouteURL;
      }
      // Ensure that the foreign route info is sent to the user
      rideRow.errors.push(`Foreign route detected. Please resubmit using this URL for the route: ${formRow.ImportedRouteURL}`);
    }
  }



  // Ride creation is when the form row doesn't contain a reference to a ride row.
  /**
   * 
   * @param {FormRow} formRow 
   * @returns 
   */
  function _isRideCreation(formRow) {
    return !(formRow.ReferenceCellFormula)
  }

  // Linking the form row to the ride row allows us to find the ride row when the form is 
  // resubmitted. By using formulas we're guaranteed that this reference is stable over
  // operations such as sorting and filtering.
  /**
   * 
   * @param {FormRow} formRow 
   * @param {Row} rideRow 
   */
  function _linkFormRowToRideRow(formRow, rideRow) {
    formRow.ReferenceCellFormula = `='${RideSheet.NAME}'!A${rideRow.rowNum}`;
  }

  /**
   * Notify the required people that help is needed
   * @param {FormRow} formRow 
   */
  function _notifyHelpNeeded(formRow) {
    _log('Help Needed');
  }

  /**
   * Notify the result of a resubmission
   */
  function _notifyResubmissionResult(rideRow) {
    _log("Resubmitted a ride");
    _log(`Errors: ${rideRow.errors ? rideRow.errors.join(', ') : []}`);
    _log(`Warnings: ${rideRow.warnings ? rideRow.warnings.join(', ') : []}`)
  }

  /**
   * Notify the result of a submission
   */
  function _notifySubmissionResult(rideRow, email) {
    _log("Submitted a ride");
    _log(`Errors: ${rideRow.errors ? rideRow.errors.join(', ') : []}`);
    _log(`Warnings: ${rideRow.warnings ? rideRow.warnings.join(', ') : []}`)
    Email.rideScheduled(rideRow, email);
  }

  /**
   * Using the given form row, copy the relevant data into the given ride row, check it for errors
   * and import any foreign route
   * @param {FormRow} formRow the form row
   * @param {RWGPS} rwgps RWGPS connection
   * @param {[Row]} rideRow the ride row to be prepared - defaults to a suitable row object
   * @returns the given ride row, or a default ride row object
   */
  function _prepareRideRowFromFormRow(formRow, rwgps, rideRow) {
    if (!rideRow) {
      rideRow = {
        highlight: false,
        setRouteLink: function (text, url) { this.RouteURL = url; },
        linkRouteURL: () => { },
        highlightRideLeader: function (h) { this.highlight = h; },
        set RideLeaders(v) {
          this.rls = [v];
        },
        get RideLeaders() { return this.rls; }
      };
    }
    _copyFormRowIntoRideRow(formRow, rideRow);
    evalRows([rideRow], rwgps, [rowCheck.badRoute], [rowCheck.noRideLeader, rowCheck.inappropiateGroup]);
    _importForeignRoute(rideRow, formRow, rwgps);
    return rideRow;
  }

  /**
   * Process an initial ride request.
   * 
   * @param {FormRow} formRow The form row to be processed
   * @param {RWGPS} rwgps The RWGPS connection
   */
  function _processRideCreation(formRow, rwgps) {
    _log('RideCreation');
    // The ride row here is not attached to the spreadsheet, hence the 'Data Object' name
    let rideRowDO = _prepareRideRowFromFormRow(formRow, rwgps);
    // If there are errors then report them and quit.
    if (rideRowDO.errors && rideRowDO.errors.length) {
      _notifySubmissionResult(rideRowDO, formRow.Email);
      return;
    }
    // No errors - create the ride
    // The following line creates a row that is attached to the spreadsheet.
    const rideRow = Schedule.appendRow(rideRowDO);
    // Copy over the other values from the ride row DO to the rideRow object.
    if (rideRowDO.highlight) rideRow.highlightRideLeader(true);
    rideRow.errors = rideRowDO.errors;
    rideRow.warnings = rideRowDO.warnings;
    RideManager.scheduleRows([rideRow], rwgps);
    rideRow.save();
    _linkFormRowToRideRow(formRow, rideRow);
    _notifySubmissionResult(rideRow, formRow.Email);
  }

  /**
   * Process a resubmitted ride request from the given form row
   * 
   * @param {FormRow} formRow The form row
   * @param {RWGPS} rwgps The RWGPS connection
   */
  function _processRideModification(formRow, rwgps) {
    _log('Ride Modification');
    const rideRow = _getRideRowFromReferenceFormula(formRow.ReferenceCellFormula);
    console.log('formRow.deleteRequested', formRow.deleteRequested);
    _prepareRideRowFromFormRow(formRow, rwgps, rideRow)
    // Save here in case anything goes wrong later on.
    rideRow.save();
    // Only act if there are no errors to report
    if (!(rideRow.errors && rideRow.errors.length)) {
      // Update the ride, even if it is to be deleted/cancelled!
      _updateRide(rideRow, rwgps);
      // Ride (un)deletion will result in ride (un)cancellation being ignored.
      // This is written without else ifs so that no matter which path an email will be sent,
      // errors or no. 
      if (formRow.deleteRequested) {
        // We send the notification first because once we've deleted the 
        // ride there is no name to use to tell anyone about it!
        Email.rideDeleted(rideRow, formRow.Email);
        _deleteRide(rideRow, rwgps);
        return;
      }
      if (formRow.undeleteRequested) {
        RideManager.rideRows([rideRow], rwgps);
        Email.rideScheduled(rideRow, formRow.Email);
        return;
      }
      if (formRow.cancelRequested) {
        _cancelRide(rideRow, rwgps);
        Email.rideCancelled(rideRow, formRow.Email);
        return;
      }
      if (formRow.reinstatementRequested) {
        _reinstateRide(rideRow, rwgps);
        // No need to provide a separate email for ride reinstatement.
      }
    }
    Email.rideUpdated(rideRow, formRow.Email)
    rideRow.save();
    _notifyResubmissionResult(rideRow);
  }

  function _reinstateRide(rideRow, rwgps) {
    RideManager.reinstateRows([rideRow], rwgps);
  }

  /**
   * Using the given schedule row, update the corresponding ride
   * @param {Row} rideRow Row from which to update the ride
   * @param {RWGPS} rwgps RWGPS object to connect to ride
   * @returns {Row} updated schedule row object
   */
  function _updateRide(rideRow, rwgps) {
    rideRow.linkRouteURL();
    if (rideRow.RideURL) {
      RideManager.updateRows([rideRow], rwgps);
    } else {
      RideManager.scheduleRows([rideRow], rwgps);
    }
    return rideRow;
  }

  return {
    // docs for the event: https://developers.google.com/apps-script/guides/triggers/events
    processEvent: function (event, rwgps) {
      _log("processEvent", event);
      const formRow = FormRowBuilder.createFormRow(event);
      if (_isRideCreation(formRow)) {
        _processRideCreation(formRow, rwgps);
      } else {
        _processRideModification(formRow, rwgps);
      }
      if (formRow.helpRequested) {
        const rideRow = {};
        //TODO - make copyForm ... create a default ride row that will work everywhere
        _copyFormRowIntoRideRow(formRow, rideRow);
        Email.help(rideRow, formRow)
        _notifyHelpNeeded(formRow);
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
