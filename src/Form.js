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
        throw new Error(`Column name: ${name} is not known`);
      }
      getReferenceCellFormula(range) {
        const nr = range.offset(0, this.getColumnIndex(FormSheet.RIDEREFERENCECOLUMNNAME), 1, 1);
        const formula =  nr.getFormula();
        return formula;
      }
      setReferenceCell(range, formula) {
        let nr = range.offset(0, this.getColumnIndex(FormSheet.RIDEREFERENCECOLUMNNAME), 1, 1);
        nr.setFormula(formula);
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
    f.setReferenceCell(range, "='Consolidated Rides'!A12");
    console.log(f.getReferenceCell(range));
  }