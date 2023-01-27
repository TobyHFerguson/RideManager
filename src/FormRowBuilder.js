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

    _changeIs(columnName, value) {
      return this.event.namedValues[columnName][0].toLowerCase().startsWith(value);
    }

    _changeIsYes(columnName) {
      return this._changeIs(columnName, 'yes');
    }

    _changeIsNo(columnName) {
      return this._changeIs(columnName, 'no');
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
    get helpRequested() { return this.HelpNeeded.toLowerCase().startsWith('yes') }
    get RideCancelled() { return this._getValue(FormSheet.RIDECANCELLEDCOLUMNNAME); }
    get cancelRequested() { return this._changeIsYes(FormSheet.RIDECANCELLEDCOLUMNNAME); }
    get reinstatementRequested() { return this._changeIsNo(FormSheet.RIDECANCELLEDCOLUMNNAME); }
    get RideDeleted() { return this._getValue(FormSheet.RIDEDELETEDCOLUMNNAME); }
    get deleteRequested() { return this._changeIsYes(FormSheet.RIDEDELETEDCOLUMNNAME); }
    get undeleteRequested() { return this._changeIsNo(FormSheet.RIDEDELETEDCOLUMNNAME); }
    get ImportedRouteURL() { return this._getValue(FormSheet.IMPORTEDROUTECOLUMNNAME); }
    set ImportedRouteURL(url) { this._setValue(FormSheet.IMPORTEDROUTECOLUMNNAME, url) }
  }
  return {
    createFormRow(event) {
      return new FormRow(event);
    }
  }
}()

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
 * @property{string} RideCancelled
 * @property{string} RideDate
 * @property{string} RideDeleted
 * @property{string} RouteURL
 * @property{string} StartLocation
 * @property{string} StartTime
 * @property{string} Timestamp
 * @property{string} cancelRequested
 * @property{string} deleteRequested
 * @property{string} helpRequested
 * @property{string} reinstatementRequested
 * @property{string} undeleteRequested
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