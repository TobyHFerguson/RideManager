const FormHandling = function () {
  function _log(m, event) {
    console.log(`FormHandling: ${m}`, event ? event.namedValues : '');
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

  function _getRideRowFromReferenceFormula(formula) {
    const A1 = formula.split('!')[1];
    const rideRow = Schedule._getRowsFromRangeA1(A1)[0];
    return rideRow;
  }

  /**
   * Return true iff the system is in the initial state
   * @param {FormRow} formRow 
   * @returns true iff the system is in the initial state
   */
  function _isInitialState(formRow) {
    return formRow.ReferenceCellFormula;
  }

  /**
   * Return true iff the system is in the planned state
   * 
   * The planned state when the form references a ride but there's no ride URL
   * @param {FormRow} formRow 
   * @param {Row} rideRow 
   */
  function _isPlannedState(formRow, rideRow) {
    return formRow.ReferenceCellFormula && !rideRow.RideURL;
  }

  /**
   * Return true iff the system is in the scheduled state
   * 
   * Its a scheduled state when the form references a ride that has a URL and the ride hasn't been cancelled
   * @param {FormRow} formRow 
   * @param {Row} rideRow 
   * @returns true iff the system is in the scheduled state
   */
  function _isScheduledState(formRow, rideRow) {
    return formRow.ReferenceCellFormula && rideRow.RideURL && !rideRow.RideName.toLowerCase().startsWith('cancelled');
  }

  /**
 * Return true iff the system is in the cancelled state
 * 
 * Its a scheduled state when the form references a ride that has a URL and the ride has been cancelled
 * @param {FormRow} formRow 
 * @param {Row} rideRow 
 * @returns true iff the system is in the cancelled state
 */
  function _isCancelledState(formRow, rideRow) {
    return formRow.ReferenceCellFormula && rideRow.RideURL && rideRow.RideName.toLowerCase().startsWith('cancelled');
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
  function _logActionResult(action, rideRow) {
    _log(`${action} a ride`);
    _log(`Errors: ${rideRow.errors ? rideRow.errors.join(', ') : []}`);
    _log(`Warnings: ${rideRow.warnings ? rideRow.warnings.join(', ') : []}`)
  }

  /**
   * Using the given form row, copy the relevant data into the given ride row, check it for errors
   * and import any foreign route
   * @param {FormRow} formRow the form row
   * @param {RWGPS} rwgps RWGPS connection
   * @param {Row} [rideRow] the ride row to be prepared - defaults to a suitable row object
   * @returns the given ride row, or a default ride row object
   */
  function _prepareRideRowFromFormRow(formRow, rwgps, rideRow) {
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
    function _importForeignRoute(formRow, rideRow, rwgps) {
      let fridx = rideRow.errors.findIndex(e => e === rowCheck.FOREIGN_ROUTE);
      if (fridx === -1) {
        // If the route in the ride row isn't foreign then clear the foreign route record in the form row
        formRow.ImportedRouteURL = '';
      }
      else {
        // remove the foreign route error from the list of errors
        rideRow.errors.splice(fridx, 1);
        // If the route has not been imported (there's no reference to it in the form row)
        // then import it and record the import.
        if (!(formRow.ImportedRouteURL)) {
          RideManager.importRows([rideRow], rwgps);
          formRow.ImportedRouteURL = rideRow.RouteURL;
        }
        // Ensure that the foreign route info is sent to the user in an error. 
        rideRow.errors.push(`Foreign route detected. Please resubmit using this URL for the route: ${formRow.ImportedRouteURL}`);
      }
    }
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
    _importForeignRoute(formRow, rideRow, rwgps);
    return rideRow;
  }

  /**
   * Planned State - process the events from the formRow, using the given rideRow and RWGPS instance 
   * 
   * The only event allowed is the 'Scheduled' event, which results in the ride being scheduled.
   * Other events will be reported as errors.
   * @param {FormRow} formRow 
   * @param {Row} rideRow 
   * @param {RWGPS} rwgps 
   */
  function _processPlannedState(formRow, rideRow, rwgps) {
    if (!formRow.isScheduledEvent) {
      Email.onlyScheduleAllowed(formRow.Email);
      return;
    }
    if (!rideRow.errors) {
      _scheduleRide(formRow, rideRow, rwgps);
    }
    Email.rideScheduled(rideRow, formRow.Email);
    _logActionResult('undeleted', rideRow);
  }

  /**
   * ScheduledState - process events
   * 
   * scheduled event - update the ride
   * deleted event - delete the ride, thereby moving to the planned state
   * canceled event - cancel the ride, thereby moving to the canceled state
   * @param {FormRow} formRow 
   * @param {Row} rideRow 
   * @param {RWGPS} rwgps 
   */
  function _processScheduledState(formRow, rideRow, rwgps) {
    function _updateRide(formRow, rideRow, rwgps) {
      _prepareRideRowFromFormRow(formRow, rwgps, rideRow);
      if (!rideRow.errors) {
        rideRow.linkRouteURL();
        RideManager.updateRows([rideRow], rwgps);
        rideRow.save();
      }
      Email.rideUpdated(rideRow, form.Email);
      _logActionResult('updated', rideRow);
    }
    function _cancelRide(formRow, rideRow, rwgps) {
      if (!rideRow.errors) {
        RideManager.cancelRows([rideRow], rwgps);
        rideRow.save();
      }
      Email.rideCancelled(rideRow, formRow.Email);
      _logActionResult('cancelled', rideRow);
    }
    function _deleteRide(rideRow, rwgps) {
      // We send the notification first because once we've deleted the 
      // ride there is no name to use to tell anyone about it!
      Email.rideDeleted(rideRow, formRow.Email);
      if (!rideRow.errors) {
        RideManager.unscheduleRows([rideRow], rwgps);
        rideRow.save();
      }
      _logActionResult('deleted', rideRow);
    }

    if (formRow.isScheduledEvent) {
      _updateRide(formRow, rideRow, rwgps);
    } else if (formRow.isCanceledEvent) {
      _cancelRide(formRow, rideRow, rwgps)
    } else {
      _deleteRide(formRow, rideRow, rwgps);
    }
  }
  /**
   * CanceledState - process the events in the canceled state
   * 
   * scheduled event - reinstate the ride, moving to the scheduled state
   * canceled event - issue a warning
   * deleted event - issue a warning
   * @param {FormRow} formRow 
   * @param {Row} rideRow 
   * @param {RWGPS} rwgps 
   */
  function _processCanceledState(formRow, rideRow, rwgps) {
    if (!formRow.isScheduledEvent) {
      Email.onlyScheduleAllowed(formRow.Email);
      return;
    }
    _prepareRideRowFromFormRow(formRow, rwgps, rideRow);
    if (!rideRow.errors) {
      rideRow.linkRouteURL();
      RideManager.reinstateRows([rideRow], rwgps);
      RideManager.updateRows([rideRow], rwgps);
      rideRow.save();
    }
    Email.rideScheduled(rideRow, form.Email);
    _logActionResult('uncancelled', rideRow);
  }


  /**
   * Schedule the given ride, ensuring the route is resolved and the row saved.
   * 
   * @param {FormRow} formRow 
   * @param {RideRow} rideRow 
   * @param {RWGPS} rwgps 
   */
  function _scheduleRide(formRow, rideRow, rwgps) {
    rideRow.linkRouteURL();
    RideManager.scheduleRows([rideRow], rwgps);
    rideRow.save();
  }

  return {
    // docs for the event: https://developers.google.com/apps-script/guides/triggers/events
    processEvent: function (event, rwgps) {
      _log("processEvent", event);
      const formRow = FormRowBuilder.createFormRow(event);
      if (_isInitialState(formRow)) {
        _processInitialState(formRow, rwgps);
      } else {
        // We have a reference to a ride row.  
        const rideRow = _getRideRowFromReferenceFormula(formRow.ReferenceCellFormula);
        if (_isScheduledState(formRow, rideRow)) {
          _processScheduledState(formRow, rideRow, rwgps);
        } else if (_isCancelledState(formRow, rideRow)) {
          _processCanceledState(formRow, rideRow, rwgps);
        } else if (_isPlannedState(formRow, rideRow)) {
          _processPlannedState(formRow, rideRow, rwgps)
        } else {
          throw new Error('Unknown state');
        }
      }
      if (formRow.helpRequestedEvent) {
        const rideRow = {};
        //TODO - make copyForm ... create a default ride row that will work everywhere
        _copyFormRowIntoRideRow(formRow, rideRow);
        Email.help(rideRow, formRow.Email)
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
