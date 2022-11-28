if (typeof require !== 'undefined') {
  Globals = require('./Globals.js');
}
const Schedule = function () {
  class Schedule {
    constructor() {
      this.activeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Consolidated Rides');
      this.columnNames = this.activeSheet.getRange(1, 1, 1, this.activeSheet.getLastColumn()).getValues()[0];
    }
    /**
     * Find and return all rows that are scheduled after the given day
     * @param {Date} date the day after which rows should be returned
     * @return {Row[]} the rows that are younger than the given date
     */
    getYoungerRows(date) {
      const ss = this.activeSheet;
      const dateColumn = this.getColumn("Date") + 1; // +1 because we need to convert to spreadsheet indexing
      ss.getRange(2, dateColumn, ss.getLastRow()).sort(dateColumn);
      const range = ss.getRange(1, dateColumn, ss.getLastRow())

      if (range.getFilter()) range.getFilter().remove();

      const dateFilter = range.createFilter();
      const criteria = SpreadsheetApp.newFilterCriteria()
        .whenDateAfter(date)
        .build();
      dateFilter.setColumnFilterCriteria(dateColumn, criteria);

      for (var i = 2; i<=ss.getLastRow() && ss.isRowHiddenByFilter(i); i++) {
      }
      dateFilter.remove();
      
      const rows = this.convertRangeToRows(ss.getRange(i, 1, ss.getLastRow() - i + 1, ss.getLastColumn()));
      return rows;
    }

    getColumn(name) {
      let ix = this.columnNames.indexOf(name);
      if (ix !== -1) {
        return ix;
      }
      throw new Error(`Column name: ${name} is not known`);
    }

    getStartDate(values) { return values[this.getColumn(Globals.STARTDATECOLUMNNAME)]; };
    getStartTime(values) { return values[this.getColumn(Globals.STARTTIMECOLUMNNAME)]; };
    getGroup(values) { return values[this.getColumn(Globals.GROUPCOLUMNNAME)]; };
    getRouteCell(values) { return values[this.getColumn(Globals.ROUTECOLUMNNAME)]; };
    getRideLeader(values) { return values[this.getColumn(Globals.RIDELEADERCOLUMNNAME)]; };
    getRideCell(values) { return values[this.getColumn(Globals.RIDECOLUMNNAME)]; }
    getLocation(values) { return values[this.getColumn(Globals.LOCATIONCOLUMNNAME)]; };
    getAddress(values) { return values[this.getColumn(Globals.ADDRESSCOLUMNNAME)]; };

    highlightCell(rowNum, colName, onoff) {
      let cell = this.activeSheet.getRange(rowNum, this.getColumn(colName) + 1);
      cell.setFontColor(onoff ? "red" : null);
    }
    setRideLink(rowNum, name, url) {
      let cell = this.activeSheet.getRange(rowNum, this.getColumn(Globals.RIDECOLUMNNAME) + 1);
      let rtv = SpreadsheetApp.newRichTextValue().setText(name).setLinkUrl(url).build();
      cell.setRichTextValue(rtv);
      return rtv;
    }
    setRouteLink(rowNum, name, url) {
      let cell = this.activeSheet.getRange(rowNum, this.getColumn(Globals.ROUTECOLUMNNAME) + 1);
      let rtv = SpreadsheetApp.newRichTextValue().setText(name).setLinkUrl(url).build();
      cell.setRichTextValue(rtv);
      return rtv;
    }

    deleteRideLink(rowNum) {
      this.activeSheet.getRange(rowNum, this.getColumn(Globals.RIDECOLUMNNAME) + 1).clear({ contentsOnly: true });
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
     * Resolve and link the name and the url in the Route column
     * @param {Row} row - row whose route url is to be resolved and linked
     * @returns {Row} the row
     */
     linkRouteURL(row) {
      function getRouteJson(row) {
        const error = rowCheck.badRoute_(row);
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
      let url = row.RouteURL;
      let text = row.RouteName;
      if (!url) {
        row.setRouteLink(text, text);
        url = text;
      }
      if (url && url === text) {
        try {
          let route = getRouteJson(row);
          let name = route.name;
          Logger.log(`Row ${row.rowNum}: Linking ${name} to ${url}`);
          row.setRouteLink(name, url);
        } catch (e) {
          SpreadsheetApp.getUi().alert(`Row ${row.rowNum}: ${e.message}`);
        }
      }
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
      return rls ? rls.split(',').map(rl => rl.trim()).filter(rl => rl) : [] ;
    }
    get RideName() { return this.schedule.getRideCell(this.richTextValues).getText(); }
    get RideURL() { return this.schedule.getRideCell(this.richTextValues).getLinkUrl(); }
    get Location() { return this.schedule.getLocation(this.myRowValues); }
    get Address() { return this.schedule.getAddress(this.myRowValues); }

    highlightRideLeader(onoff) {
      this.schedule.highlightCell(this.rowNum, Globals.RIDELEADERCOLUMNNAME, onoff);
      return this;
    }

    setRideLink(name, url) {
      let rtv = this.schedule.setRideLink(this.rowNum, name, url);
      this.richTextValues[this.schedule.getColumn(Globals.RIDECOLUMNNAME)] = rtv;
    }

    deleteRideLink() {
      this.schedule.deleteRideLink(this.rowNum);
    }
    setRouteLink(name, url) {
      let rtv = this.schedule.setRouteLink(this.rowNum, name, url);
      this.richTextValues[this.schedule.getColumn(Globals.ROUTECOLUMNNAME)] = rtv;
      console.log(`Row.setRouteLink - ${this.RouteName} ${this.RouteURL}`)
    }
  }

  return new Schedule();
}()

