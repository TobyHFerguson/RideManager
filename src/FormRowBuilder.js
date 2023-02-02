const FormRowBuilder = function () {
  function _log(msg, value) {
    console.log('FormRowBuilder:', msg, value);
  }
  const _activeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FormSheet.NAME);
  const _columnNames = _activeSheet.getRange(1, 1, 1, _activeSheet.getLastColumn()).getValues()[0].map(n => n.toLowerCase().trim());
  function _getColumnIndex(name) {
    const ix = _columnNames.indexOf(name.toLowerCase().trim());
    if (ix !== -1) {
      return ix;
    }
    throw new Error(`In sheet 'Form' column name: ${name} is not known`);
  }

  class FormRow {
    constructor(event) {
      this.event = event;
    }
    _getCellRange(columnName) {
      const nr = this.event.range.offset(0, _getColumnIndex(columnName), 1, 1);
      return nr;
    }

    _getValue(columnName) {
      const nr = this._getCellRange(columnName);
      const value = nr.getValue();
      return value;
    }

    _setValue(columnName, value) {
      const nr = this._getCellRange(columnName);
      nr.setValue(value);
    }

    _getFormula(columnName) {
      const nr = this._getCellRange(columnName);
      const formula = nr.getFormula();
      return formula;
    }

    _setFormula(columnName, formula) {
      const nr = this._getCellRange(columnName);
      nr.setFormula(formula);
    }

    _stateIs(value) {
      return this.RideState.toLowerCase().startsWith(value);
    }

    get ReferenceCellFormula() { return this._getFormula(FormSheet.RIDEREFERENCECOLUMNNAME) }
    set ReferenceCellFormula(formula) { this._setFormula(FormSheet.RIDEREFERENCECOLUMNNAME, formula); }
    get Timestamp() { return this._getValue(FormSheet.TIMESTAMPCOLUMNNAME); }
    get Email() { return this._getValue(FormSheet.EMAILADDRESSCOLUMNNAME); }
    get FirstName() { return this._getValue(FormSheet.FIRSTNAMECOLUMNNAME); }
    get Group() { return this._getValue(FormSheet.GROUPCOLUMNNAME); }
    get LastName() { return this._getValue(FormSheet.LASTNAMECOLUMNNAME); }
    get PhoneNumber() { return this._getValue(FormSheet.PHONENUMBERCOLUMNNAME); }
    get RideDate() { return this._getValue(FormSheet.RIDEDATECOLUMNNAME); }
    get StartTime() { return this._getValue(FormSheet.STARTTIMECOLUMNNAME); }
    get RouteURL() { return this._getValue(FormSheet.ROUTEURLCOLUMNNAME); }
    get StartLocation() { return this._getValue(FormSheet.STARTLOCATIONCOLUMNNAME); }
    get HelpNeeded() { return this._getValue(FormSheet.HELPNEEDEDCOLUMNNAME); }
    get ImportedRouteURL() { return this._getValue(FormSheet.IMPORTEDROUTECOLUMNNAME); }
    set ImportedRouteURL(url) { this._setValue(FormSheet.IMPORTEDROUTECOLUMNNAME, url) }
    get RideState() { return this._getValue(FormSheet.RIDESTATECOLUMNNAME); }
    // schedule/cancel/delete are 'events' in the sense that whenever something
    // changes in the form we want to make sure that we get to the state that the
    // user wanted. The reason we do this is that we might reject a requested state change
    // (bad route url, for example) and then when the issue is fixed the onSubmit event we
    // get no longer has the requested state change in the event.namedValues, but must be
    // extracted from the form state itself.
    get isScheduledEvent() { return this._stateIs('scheduled'); }
    get isCancelledEvent() { return this._stateIs('cancelled'); }
    get isUnscheduledEvent() { return this._stateIs('unscheduled'); }
    // We only need to handle help when its requested, so on the change itself.
    get helpRequestedEvent() { 
      const hn = this.event.namedValues[FormSheet.HELPNEEDEDCOLUMNNAME][0];
      return hn && hn.toLowerCase().startsWith('yes');
     }
  }
  return {
    createFormRow(event) {
      return new FormRow(event);
    }
  }
}()

/**
 * @typeDef FormRowBuilder
 * @type {object}
 * @property createFormRow
 */
/**
 * @typedef FormRow
 * @type {object}
 * @property{string} Email
 * @property{string} FirstName
 * @property{string} Group
 * @property{string} HelpNeeded
 * @property{string} ImportedRouteURL
 * @property{string} LastName
 * @property{string} PhoneNumber
 * @property{string} ReferenceCellFormula
 * @property{Date} RideDate
 * @property{string} RideState
 * @property{string} RouteURL
 * @property{string} StartLocation
 * @property{Date} StartTime
 * @property{Date} Timestamp
 * @property{boolean} helpRequestedEvent - true iff help has been requested
 * @property{boolean} isScheduledEvent - true iff the ride should be scheduled
 * @property{boolean} isCancelledEvent - true iff the ride should be cancelled
 * @property{boolean} isUnscheduledEvent - true iff the ride should be unscheduled
 */
function testForm() {
  const f = Form;
  let range = f.activeSheet.getRange(2, 1, 1, 3);
  console.log(`rowNum: ${range.getRow()}`)
  console.log(f.getReferenceCell(range));
  range = range.offset(1, 0);
  console.log(`rowNum: ${range.getRow()}`)
  console.log(f.getReferenceCell(range));
  f.setReferenceCellFormula(range, "='Consolidated Rides'!A12");
  console.log(f.getReferenceCell(range));
}