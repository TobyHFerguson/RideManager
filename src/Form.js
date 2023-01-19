const Form = function () {
  class Form {
    constructor() {
      this.activeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FormSheet.NAME);
      this.columnNames = this.activeSheet.getRange(1, 1, 1, this.activeSheet.getLastColumn()).getValues()[0].map(n => n.toLowerCase().trim());
    }
    getColumnIndex(name) {
      let ix = this.columnNames.indexOf(name.toLowerCase().trim());
      if (ix !== -1) {
        return ix;
      }
      throw new Error(`In sheet 'Form' column name: ${name} is not known`);
    }
    /**
     * Return the formula from the reference cell of the given range.
     * 
     * The range is assumed to contain a single row from the Form
     * @param {Range} range Range whose reference cell formula is required
     * @returns{String} the formula
     */
    getReferenceCellFormula(range) {
      const nr = range.offset(0, this.getColumnIndex(FormSheet.RIDEREFERENCECOLUMNNAME), 1, 1);
      const formula = nr.getFormula();
      return formula;
    }
    /**
     * Set the reference cell's contents to be the given formula.
     * 
     * The range is assumed to contain a single row
     * @param {Range} range Range whose reference cell formula is to be set
     * @param {String} formula The formula
     */
    setReferenceCellFormula(range, formula) {
      let nr = range.offset(0, this.getColumnIndex(FormSheet.RIDEREFERENCECOLUMNNAME), 1, 1);
      nr.setFormula(formula);
    }
    /**
     * Return the timestamp value from the given range
     * @param {Range} range Range whose timestamp is to be returned
     * @returns{Date} the timestamp
     */
    getTimestamp(range) {
      return this._getValue(range, FormSheet.TIMESTAMPCOLUMNNAME);
    }
    getEmail(range) {
      return this._getValue(range, FormSheet.EMAILADDRESSCOLUMNNAME);
    }
    getFirstName(range) {
      return this._getValue(range, FormSheet.FIRSTNAMECOLUMNNAME);
    }
    getLastName(range) {
      return this._getValue(range, FormSheet.LASTNAMECOLUMNNAME);
    }
    getPhoneNumber(range) {
      return this._getValue(range, FormSheet.PHONENUMBERCOLUMNNAME);
    }
    getRideDate(range) {
      return this._getValue(range, FormSheet.RIDEDATECOLUMNNAME);
    }
    getStartTime(range) {
      return this._getValue(range, FormSheet.STARTTIMECOLUMNNAME);
    }
    getGroup(range) {
      return this._getValue(range, FormSheet.GROUPCOLUMNNAME);
    }
    getRouteURL(range) {
      return this._getValue(range, FormSheet.ROUTEURLCOLUMNNAME);
    }
    getStartLocation(range) {
      return this._getValue(range, FormSheet.STARTLOCATIONCOLUMNNAME);
    }
    getHelpNeeded(range) {
      return this._getValue(range, FormSheet.HELPNEEDEDCOLUMNNAME);
    }
    isHelpNeeded(range) {
      return this.getHelpNeeded(range).toLowerCase().startsWith('yes')
    }
    getRideCancelled(range) {
      return this._getValue(range, FormSheet.RIDECANCELLEDCOLUMNNAME);
    }
    isRideCancelled(range) {
      return this.getRideCancelled(range).toLowerCase().startsWith('yes')
    }
    getRideDeleted(range) {
      return this._getValue(range, FormSheet.RIDEDELETEDCOLUMNNAME);
    }
    isRideDeleted(range) {
      return this.getRideDeleted(range).toLowerCase().startsWith('yes');
    }
    /**
     * Return the imported route url value from the given range
     * @param {Range} range target range
     * @returns{String} the imported route url value
     */
    getImportedRouteURL(range) {
      return this._getValue(range, FormSheet.IMPORTEDROUTECOLUMNNAME);
    }
    /**
     * Set the imported route url for the given range
     * @param {Range} range target Range
     * @param {string} url The URL to set the imported route url to
     */
    setImportedRouteURL(range, url) {
      let nr = range.offset(0, this.getColumnIndex(FormSheet.IMPORTEDROUTECOLUMNNAME), 1, 1);
      nr.setValue(url);
    }
    _getValue(range, columnName) {
      const nr = range.offset(0, this.getColumnIndex(columnName), 1, 1);
      const value = nr.getValue();
      return value;
    }
  }
  return new Form();
}()

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