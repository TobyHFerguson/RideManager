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
    getReferenceCellFormula(range) {
      const nr = range.offset(0, this.getColumnIndex(FormSheet.RIDEREFERENCECOLUMNNAME), 1, 1);
      const formula = nr.getFormula();
      return formula;
    }
    setReferenceCellFormula(range, formula) {
      let nr = range.offset(0, this.getColumnIndex(FormSheet.RIDEREFERENCECOLUMNNAME), 1, 1);
      nr.setFormula(formula);
    }
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