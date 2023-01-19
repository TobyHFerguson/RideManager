if (typeof require !== 'undefined') {
  require('./1Globals.js');
}
const Schedule = function () {
  class Schedule {
    constructor() {
      this.activeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(RideSheet.NAME);
      this.columnNames = this.activeSheet.getRange(1, 1, 1, this.activeSheet.getLastColumn()).getValues()[0].map(n => n.toLowerCase().trim());
      this.dirtyRows = new Set();
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
    // Replace this with a fixed lookup
    getColumnIndex(name) {
      let ix = this.columnNames.indexOf(name.toLowerCase().trim());
      if (ix !== -1) {
        return ix;
      }
      throw new Error(`Column name: ${name} is not known`);
    }

    getStartDate(values) { return values[this.getColumnIndex(RideSheet.STARTDATECOLUMNNAME)]; };
    getStartTime(values) { return values[this.getColumnIndex(RideSheet.STARTTIMECOLUMNNAME)]; };
    getGroup(values) { return values[this.getColumnIndex(RideSheet.GROUPCOLUMNNAME)]; };
    getRouteCell(values) { return values[this.getColumnIndex(RideSheet.ROUTECOLUMNNAME)]; };
    getRideLeader(values) { return values[this.getColumnIndex(RideSheet.RIDELEADERCOLUMNNAME)]; };
    getRideCell(values) { return values[this.getColumnIndex(RideSheet.RIDECOLUMNNAME)]; }
    getLocation(values) { return values[this.getColumnIndex(RideSheet.LOCATIONCOLUMNNAME)]; };
    getAddress(values) { return values[this.getColumnIndex(RideSheet.ADDRESSCOLUMNNAME)]; };

    setStartDate(value, values) { values[this.getColumnIndex(RideSheet.STARTDATECOLUMNNAME)] = value; };
    setStartTime(value, values) { values[this.getColumnIndex(RideSheet.STARTTIMECOLUMNNAME)] = value; };
    setGroup(value, values) { values[this.getColumnIndex(RideSheet.GROUPCOLUMNNAME)] = value; };
    setRideLeader(value, values) { values[this.getColumnIndex(RideSheet.RIDELEADERCOLUMNNAME)] = value; };
    setLocation(value, values) { values[this.getColumnIndex(RideSheet.LOCATIONCOLUMNNAME)] = value; };
    setAddress(value, values) { values[this.getColumnIndex(RideSheet.ADDRESSCOLUMNNAME)] = value; };

    highlightCell(rowNum, colName, onoff) {
      let cell = this.activeSheet.getRange(rowNum, this.getColumnIndex(colName) + 1);
      cell.setFontColor(onoff ? "red" : null);
    }
    addDirtyRow(row) {
      this.dirtyRows.add(row);
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
    // Save relies on the idea that each row in a contiguous range has all the values and rtvs for that range.
    // By using the first row in a range we can write the whole range in bulk, which is efficient.
    save() {
      const self = this;

      // Save a specific column for all the rows in a range.
      function saveColumn(colIdx, range, rtvs) {
        const colRange = range.offset(0, colIdx, range.getNumRows(), 1);
        const col_rtvs = rtvs.map(rtv => [rtv[colIdx]]);
        colRange.setRichTextValues(col_rtvs);
      }
      // Use the start row to first write out all the values in the range, then overlay the ride column and route column rtvs
      this.getRowSet(this.dirtyRows).forEach(row => {
        row.range.setValues(row.values);
        saveColumn(this.getColumnIndex(RideSheet.RIDECOLUMNNAME), row.range, row.rtvs);
        saveColumn(this.getColumnIndex(RideSheet.ROUTECOLUMNNAME), row.range, row.rtvs);
      });
      this.dirtyRows = new Set();
    }

    /**
     * Delete the ride link for the given row number.
     * @param {number} rowNum row number from which to delete ride link
     * @returns the rtv for the cell;
     */
    deleteRideLink(rowNum) {
      return this.activeSheet.getRange(rowNum, this.getColumnIndex(RideSheet.RIDECOLUMNNAME) + 1).clearContent().getRichTextValues()[0][0];
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
     * Return the rows from the range given by A1 or R1C1 notation.
     * 
     * If the range is a single cell it will be extended left and right to get the full row.
     * @param {string} A1 range specified in  A1 or R1C1 notation
     * @returns {Row[]} An array of Row objects from the given range
     */
    _getRowsFromRangeA1(A1) {
      const sourceRange = this.activeSheet.getRange(A1);
      const rowNum = sourceRange.getRowIndex();
      const lastRow = rowNum + sourceRange.getNumRows() - 1;
      const lastColumn = `C${this.activeSheet.getMaxColumns()}`;
      const rangeA1 = `R${rowNum}C1:R${lastRow}${lastColumn}`;
      // console.log(`Schedule - getting rows from rangeA1: ${rangeA1}`)
      const range = this.activeSheet.getRange(rangeA1);
      const rows = this.convertRangeToRows(range);
      return rows;
    }
    _createRowsFromRange(range) {
      const values = range.getValues();
      const richTextValues = range.getRichTextValues();
      const rows = values.map((v, i) => new Row(this, range, i, v, richTextValues[i]))
      return rows;
    }

    appendRow(row) {
      const rowData = [];
      rowData[this.getColumnIndex(RideSheet.STARTDATECOLUMNNAME)] = row.StartDate;
      rowData[this.getColumnIndex(RideSheet.GROUPCOLUMNNAME)] = row.Group;
      rowData[this.getColumnIndex(RideSheet.STARTLOCATIONCOLUMNNAME)] = row.StartLocation;
      rowData[this.getColumnIndex(RideSheet.STARTTIMECOLUMNNAME)] = row.StartTime;
      rowData[this.getColumnIndex(RideSheet.ROUTECOLUMNNAME)] = row.RouteURL;
      rowData[this.getColumnIndex(RideSheet.RIDELEADERCOLUMNNAME)] = row.RideLeaders.join(',');
      rowData[this.getColumnIndex(RideSheet.RIDECOLUMNNAME)] = '';
      rowData[this.getColumnIndex(RideSheet.ADDRESSCOLUMNNAME)] = row.RideAddress;
      rowData[this.getColumnIndex(RideSheet.LOCATIONCOLUMNNAME)] = row.Location;


      this.activeSheet.appendRow(rowData);
      const lastRow = this.getLastRow();
      this.activeSheet.getRange(`A${lastRow.rowNum}`).setNumberFormat('ddd mm/dd');
      lastRow.linkRouteURL();
      return lastRow;
    }

    /**
     * Get the last row in the spreadsheet
     * @returns {Row}
     */
    getLastRow() {
      const sheet = this.activeSheet;
      const rownum = sheet.getLastRow();
      const colnum = 1;
      const numrows = 1;
      const numcols = sheet.getLastColumn();
      const range = sheet.getRange(rownum, colnum, numrows, numcols);
      return this.convertRangeToRows(range)[0];
    }

    getRow(A1) {

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

    set StartDate(v) { this.schedule.setStartDate(v, this.myRowValues); this.schedule.addDirtyRow(this); }
    set StartTime(v) { this.schedule.setStartTime(v, this.myRowValues); this.schedule.addDirtyRow(this); }
    set Group(v) { this.schedule.setGroup(v, this.myRowValues); this.schedule.addDirtyRow(this); }
    set RideLeaders(v) {
      this.schedule.setRideLeader(Array.isArray(v) ? v.join(',') : v, this.myRowValues);
      this.schedule.addDirtyRow(this);
    }
    set Location(v) { this.schedule.setLocation(v, this.myRowValues); this.schedule.addDirtyRow(this); }
    set Address(v) { this.schedule.setAddress(v, this.myRowValues); this.schedule.addDirtyRow(this); }

    highlightRideLeader(onoff) {
      this.schedule.highlightCell(this.rowNum, RideSheet.RIDELEADERCOLUMNNAME, onoff);
      return this;
    }

    createRTV(name, url) {
      const rtv = SpreadsheetApp.newRichTextValue().setText(name).setLinkUrl(url).build()
      return rtv;
    }

    setRideLink(name, url) {
      let rtv = this.createRTV(name, url);
      this.richTextValues[this.schedule.getColumnIndex(RideSheet.RIDECOLUMNNAME)] = rtv;
      this.schedule.addDirtyRow(this);
    }
    
    deleteRideLink() {
      const nrtv = this.schedule.deleteRideLink(this.rowNum);
      this.richTextValues[this.schedule.getColumnIndex(RideSheet.RIDECOLUMNNAME)] = nrtv;
      this.schedule.addDirtyRow(this);
    }
    setRouteLink(name, url) {
      let rtv = this.createRTV(name, url);
      this.richTextValues[this.schedule.getColumnIndex(RideSheet.ROUTECOLUMNNAME)] = rtv;
      this.schedule.addDirtyRow(this);
    }
    save() {
      this.schedule.save();
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
  }

  return new Schedule();
}()

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

