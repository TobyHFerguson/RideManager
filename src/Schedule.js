class Schedule {
  constructor() {
    this.activeSheet = SpreadsheetApp.getActiveSheet();
    this.columnNames = this.activeSheet.getRange(1, 1, 1, this.activeSheet.getLastColumn()).getValues()[0];
  }

  getColumn(name) {
    let ix = this.columnNames.indexOf(name);
    if (ix !== -1) {
      return ix;
    }
    throw new Error(`Column name: ${name} is not known`);
  }

  getStartDate(values) { return values[this.getColumn(STARTDATECOLUMNNAME)]; };
  getStartTime(values) { return values[this.getColumn(STARTTIMECOLUMNNAME)]; };
  getGroup(values) { return values[this.getColumn(GROUPCOLUMNNAME)]; };
  getRouteName(values) { return values[this.getColumn(ROUTECOLUMNNAME)]; };
  getRouteURL(values) { return values[this.getColumn(ROUTECOLUMNNAME)]; };
  getRideLeader(values) { return values[this.getColumn(RIDELEADERCOLUMNNAME)]; };
  getRideURL(values) { return values[this.getColumn(RIDECOLUMNNAME)]; }
  getLocation(values) { return values[this.getColumn(LOCATIONCOLUMNNAME)]; };
  getAddress(values) { return values[this.getColumn(ADDRESSCOLUMNNAME)]; };

  setRideLink(rowNum, name, url) {
    let cell = this.activeSheet.getRange(rowNum, this.getColumn(RIDECOLUMNNAME) + 1);
    let rtv = SpreadsheetApp.newRichTextValue().setText(name).setLinkUrl(url).build();
    cell.setRichTextValue(rtv);
  }

  deleteRideLink(rowNum) {
    this.activeSheet.getRange(rowNum, this.getColumn(RIDECOLUMNNAME) + 1).clear({contentsOnly: true});
  }

  convertRangeToRows(range) {
    let rows = []
      let values = range.getValues();
      let richTextValues = range.getRichTextValues();
      for (var offset = 0; offset < values.length; offset++) {
        rows.push(new Row(this, range, offset, values, richTextValues))
      }
      return rows;
  }

  getSelectedRows() {
    let activeSheet = this.activeSheet;
    function getRowRanges() {
      let selection = activeSheet.getSelection();
      const rangeList = selection.getActiveRangeList();
      const ranges = rangeList.getRanges();
      const lastColumn = `C${activeSheet.getMaxColumns()}`;
      const rowRangeExpression = ranges.map(r => `R${r.getRow()}C1:R${r.getRow() + r.getNumRows() - 1}${lastColumn}`);
      const rowRangeList = activeSheet.getRangeList(rowRangeExpression);
      return rowRangeList.getRanges();
    }

    let rows = [];
    let rr = getRowRanges();
    rr.forEach(range => {
      let values = range.getValues();
      let richTextValues = range.getRichTextValues();
      for (var offset = 0; offset < values.length; offset++) {
        rows.push(new Row(this, range, offset, values, richTextValues))
      }
    });
    return rows;
  }
  getLastRow() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Consolidated Rides');
    let rownum = sheet.getLastRow();
    let colnum = 1;
    let numrows = 1;
    let numcols = sheet.getLastColumn();
    let range = sheet.getRange(rownum, colnum, numrows, numcols);
    return this.convertRangeToRows(range)[0];
  }
}

class Row {
  constructor(schedule, range, offset, values, rtvs) {
    this.schedule = schedule;
    this.range = range;
    this.offset = offset;
    this.rowNum = range.getRow() + offset;
    this.values = values;
    this.rtvs = rtvs;
    this.myRowValues = values[offset];
    this.richTextValues = rtvs[offset];
  }
  getStartDate() { return this.schedule.getStartDate(this.myRowValues); }
  getStartTime() { return this.schedule.getStartTime(this.myRowValues); }
  getGroup() { return this.schedule.getGroup(this.myRowValues); }
  getRouteName() { return this.schedule.getRouteName(this.richTextValues).getText(); }
  getRouteURL() { return this.schedule.getRouteURL(this.richTextValues).getLinkUrl(); }
  getRideLeader() { return this.schedule.getRideLeader(this.myRowValues); }
  getLocation() { return this.schedule.getLocation(this.myRowValues); }
  getAddress() { return this.schedule.getAddress(this.myRowValues); }
  setRideLink(name, url) {
    this.schedule.setRideLink(this.rowNum, name, url);
  }
  getRideName() { return this.schedule.getRideURL(this.richTextValues).getText(); }
  getRideURL() { return this.schedule.getRideURL(this.richTextValues).getLinkUrl(); }
  deleteRideLink() {
    this.schedule.deleteRideLink(this.rowNum);
  }
}

