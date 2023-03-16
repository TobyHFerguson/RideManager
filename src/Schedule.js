if (typeof require !== 'undefined') {
  Globals = require('./Globals.js');
}
const Schedule = function () {
  function log(nm, msg) {
    // console.log(`Schedule.${nm}: ${msg}`)
  }
  class Schedule {
    constructor() {
      this.activeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Consolidated Rides');
      this.columnNames = this.activeSheet.getRange(1, 1, 1, this.activeSheet.getLastColumn()).getValues()[0];
      this.rideRows = new Set();
      this.routeRows = new Set();
    }
    /**
     * Find and return all rows that are scheduled after the given day
     * @param {Date} date the day after which rows should be returned
     * @return {Row[]} the rows that are younger than the given date
     */
    getYoungerRows(date) {
      const ss = this.activeSheet;
      const dateColumn = this.getColumnIndex("Date") + 1; // +1 because we need to convert to spreadsheet indexing
      // We start the range at row 2 to allow for the heading row (row 1)
      ss.getRange(2, 1, ss.getLastRow(), ss.getLastColumn()).sort(dateColumn);
      var spreadsheet = SpreadsheetApp.getActive();
      spreadsheet.getDataRange().activate();
      try {
        spreadsheet.getDataRange().createFilter();
        spreadsheet.getActiveSheet().getRange(1, dateColumn, spreadsheet.getActiveSheet().getLastRow()).activate();
        var criteria = SpreadsheetApp.newFilterCriteria()
          .whenDateAfter(SpreadsheetApp.RelativeDate.YESTERDAY)
          .build();
        spreadsheet.getActiveSheet().getFilter().setColumnFilterCriteria(dateColumn, criteria);
        for (var i = ss.getLastRow(); i >= 2 && !ss.isRowHiddenByFilter(i); i--) {
        }
      } finally {
        spreadsheet.getActiveSheet().getFilter().remove();
      }
      const rows = this.convertRangeToRows(ss.getRange(i, 1, ss.getLastRow() - i + 1, ss.getLastColumn()));
      return rows;
    }

    getColumnIndex(name) {
      let ix = this.columnNames.indexOf(name);
      if (ix !== -1) {
        return ix;
      }
      throw new Error(`Column name: ${name} is not known`);
    }

    getStartDate(values) { return values[this.getColumnIndex(Globals.STARTDATETIMECOLUMNNAME)]; };
    getStartTime(values) { return values[this.getColumnIndex(Globals.STARTDATETIMECOLUMNNAME)]; };
    getGroup(values) { return values[this.getColumnIndex(Globals.GROUPCOLUMNNAME)]; };
    getRouteCell(values) { return values[this.getColumnIndex(Globals.ROUTECOLUMNNAME)]; };
    getRideLeader(values) { return values[this.getColumnIndex(Globals.RIDELEADERCOLUMNNAME)]; };
    getRideCell(values) { return values[this.getColumnIndex(Globals.RIDECOLUMNNAME)]; }
    getLocation(values) { return values[this.getColumnIndex(Globals.LOCATIONCOLUMNNAME)]; };
    getAddress(values) { return values[this.getColumnIndex(Globals.ADDRESSCOLUMNNAME)]; };

    highlightCell(rowNum, colName, onoff) {
      let cell = this.activeSheet.getRange(rowNum, this.getColumnIndex(colName) + 1);
      cell.setFontColor(onoff ? "red" : null);
    }
    saveRideRow(row) {
      this.rideRows.add(row);
    }
    saveRouteRow(row) {
      this.routeRows.add(row);
    }

    /**
     * Given a set of rows reduce it to those rows which have disjoint ranges
     * @param {Set(Row)} rows 
     */
    getRowSet(rows) {
      let rrs = Array.from(rows).reduce((p, row) => {
        if (!p.ranges.has(row.range)) {
          p.ranges.add(row.range);
          p.rows.add(row);
        }
        return p
      },
        { ranges: new Set(), rows: new Set() }
      );
      return rrs.rows;
    }
    save() {
      const self = this;
      function saveColumn(colIdx, range, rtvs) {
        const colRange = range.offset(0, colIdx, range.getNumRows(), 1);
        const col_rtvs = rtvs.map(rtv => [rtv[colIdx]]);
        col_rtvs.forEach(row => row.map(col =>log(`saving link ${col.getText()} ${col.getLinkUrl()}`)))
        colRange.setRichTextValues(col_rtvs);
      }
      this.getRowSet(this.rideRows).forEach(row => saveColumn(this.getColumnIndex(Globals.RIDECOLUMNNAME), row.range, row.rtvs));
      this.getRowSet(this.routeRows).forEach(row => saveColumn(this.getColumnIndex(Globals.ROUTECOLUMNNAME), row.range, row.rtvs));
      this.rideRows = new Set();
      this.routeRows = new Set();
    }



    deleteRideLink(rowNum) {
      this.activeSheet.getRange(rowNum, this.getColumnIndex(Globals.RIDECOLUMNNAME) + 1).clear({ contentsOnly: true });
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

    /**
     * Get the selected rows - assumed to be in the 'Consolidated Rides' Sheet
     * @returns {[Row]} rows - an array of row objects, each one having been selected
     */
    getSelectedRows() {
      let activeSheet = this.activeSheet;
      /**
       * Convert the given ranges (assumed to be single cell ranges) to ranges
       * that cover entire rows
       * @param {Range[]} cellRangeList List of ranges to be converted
       * @returns list of converted ranges
       */
      function convertCellRangesToRowRanges(cellRangeList) {
        const cellRanges = cellRangeList.getRanges();
        const lastColumn = `C${activeSheet.getMaxColumns()}`;
        const rowRangeExpression = cellRanges.map(r => `R${r.getRow()}C1:R${r.getRow() + r.getNumRows() - 1}${lastColumn}`);
        const rowRangeList = activeSheet.getRangeList(rowRangeExpression);
        const rowRanges = rowRangeList.getRanges();
        return rowRanges;
      }
      function getRowRanges() {
        let selection = activeSheet.getSelection();
        const rangeList = selection.getActiveRangeList();
        // The rangeList is a list of single celled ranges
        // We need to convert these ranges ranges that capture a whole row.
        const rowRanges = convertCellRangesToRowRanges(rangeList)
        return rowRanges;
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



    /**
     * Get the last row in the spreadsheet
     * @returns {Row}
     */
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
    get StartDate() { return this.schedule.getStartDate(this.myRowValues); }
    get StartTime() { return this.schedule.getStartTime(this.myRowValues); }
    get Group() { return this.schedule.getGroup(this.myRowValues); }
    get RouteName() { return this.schedule.getRouteCell(this.richTextValues).getText(); }
    get RouteURL() { return this.schedule.getRouteCell(this.richTextValues).getLinkUrl(); }
    get RideLeaders() {
      let rls = this.schedule.getRideLeader(this.myRowValues);
      return rls ? rls.split(',').map(rl => rl.trim()).filter(rl => rl) : [];
    }
    get RideName() { return this.schedule.getRideCell(this.richTextValues).getText(); }
    get RideURL() { return this.schedule.getRideCell(this.richTextValues).getLinkUrl(); }
    get Location() { return this.schedule.getLocation(this.myRowValues); }
    get Address() { return this.schedule.getAddress(this.myRowValues); }

    highlightRideLeader(onoff) {
      this.schedule.highlightCell(this.rowNum, Globals.RIDELEADERCOLUMNNAME, onoff);
      return this;
    }

    createRTV(name, url) {
      const rtv = SpreadsheetApp.newRichTextValue().setText(name).setLinkUrl(url).build()
      return rtv;
    }

    setRideLink(name, url) {
      let rtv = this.createRTV(name, url);
      this.richTextValues[this.schedule.getColumnIndex(Globals.RIDECOLUMNNAME)] = rtv;
      this.schedule.saveRideRow(this);
    }

    deleteRideLink() {
      this.schedule.deleteRideLink(this.rowNum);
    }
    setRouteLink(name, url) {
      let rtv = this.createRTV(name, url);
      this.richTextValues[this.schedule.getColumnIndex(Globals.ROUTECOLUMNNAME)] = rtv;
      this.schedule.saveRouteRow(this);
    }
    /**
    * Resolve and link the name and the url in the Route column
    * @param {Row} row - row whose route url is to be resolved and linked
    * @returns {Row} the row
    */
    linkRouteURL() {
      // Skip the header column
      if (this.rowNum === 1) return;

      const row = this;
      function getRouteJson() {
        const error = rowCheck.badRoute(row);
        if (error) {
          throw new Error(error);
        }
        let url = row.RouteURL;
        const response = UrlFetchApp.fetch(`${url}.json`, { muteHttpExceptions: true });
        switch (response.getResponseCode()) {
          case 403:
            throw new Error(`This route: ${url} is not publicly accessible`);
          case 404:
            throw new Error(`This route: ${url} cannot be found on the server`);
          case 200:
            break;
          default:
            throw new Error(`Uknown error retrieving data for ${url}`);
        }
        const json = JSON.parse(response.getContentText());
        return json;
      }
      let url = this.RouteURL;
      let text = this.RouteName;
      if (!url) {
        this.setRouteLink(text, text);
        url = text;
      }
      if (url && url === text) {
        try {
          let route = getRouteJson();
          let name = route.name;
          Logger.log(`Row ${this.rowNum}: Linking ${name} to ${url}`);
          this.setRouteLink(name, url);
        } catch (e) {
          Logger.log(`Row ${this.rowNum}: ${e.message}`);
        }
      }
    }
  }

  return new Schedule();
}()

if (typeof module !== 'undefined') {
  module.exports = Schedule;
}

// ======== TESTS ============
// getRowSet returns 2 when 3 rows are provided, two of which reference the same row. In the 
// returned set the 2 distinct rows are returned. 
function testGetRowSetWithThreeRows() {
  const r1 = { f: 'boo' };
  const r2 = { f: 'bark' };
  const row1 = { range: r1 };
  const row2 = { range: r2 };
  const row3 = { range: r1 };
  const actual = Schedule.getRowSet(new Set([row1, row2, row3]));
  if (actual.size !== 2) console.log(`Expected 2 - Actual ${actual.size}`);
  if (!actual.has(row1)) console.log(`Expected to get row1 back, but didn't`);
  if (!actual.has(row2)) console.log(`Expected to get row2 back, but didn't`)
}
// getRowSet returns 1 when only one row is provided, and the returned set contains that row
function testGetRowSetOnSingletonSet() {
  const row = { range: { fargle: 'fargle' } }
  const actual = Schedule.getRowSet(new Set([row]));
  if (actual.size !== 1) console.log(`Expected 1 - Actual ${actual.size}`)
  if (!actual.has(row)) console.log(`Expected to get the original row back, but didn't`)
}
// getRowSet returns 0 when no rows are provided
function testGetRowSetOnEmptySet() {
  const actual = Schedule.getRowSet(new Set());
  if (actual.size !== 0) console.log(`Expected 0 - Actual ${actual.size}`)
}

