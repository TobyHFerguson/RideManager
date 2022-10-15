class Schedule {
  constructor() {
    this.activeSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Consolidated Rides');
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

  highlightCell(rowNum, colName, onoff) {
    let cell = this.activeSheet.getRange(rowNum, this.getColumn(colName)+1);
    cell.setFontColor(onoff ? "red" : null);
  }
  setRideLink(rowNum, name, url) {
    let cell = this.activeSheet.getRange(rowNum, this.getColumn(RIDECOLUMNNAME) + 1);
    let rtv = SpreadsheetApp.newRichTextValue().setText(name).setLinkUrl(url).build();
    cell.setRichTextValue(rtv);
    return rtv;
  }
  setRouteLink(rowNum, name, url) {
    let cell = this.activeSheet.getRange(rowNum, this.getColumn(ROUTECOLUMNNAME) + 1);
    let rtv = SpreadsheetApp.newRichTextValue().setText(name).setLinkUrl(url).build();
    cell.setRichTextValue(rtv);
    return rtv;
  }

  deleteRideLink(rowNum) {
    this.activeSheet.getRange(rowNum, this.getColumn(RIDECOLUMNNAME) + 1).clear({ contentsOnly: true });
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
   * @returns {array} rows - an array of row objects, each one having been selected
   */
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

  linkRouteURL(row) {
    function getRouteJson(row) {
      let f = errorFuns.filter(f => f.name === "nonClubRoute_")[0];
      const error = f(row);
      if (error !== undefined) {
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
  get RouteName() { return this.schedule.getRouteName(this.richTextValues).getText(); }
  get RouteURL() { return this.schedule.getRouteURL(this.richTextValues).getLinkUrl(); }
  get RideLeader() { return this.schedule.getRideLeader(this.myRowValues); }
  get Location() { return this.schedule.getLocation(this.myRowValues); }
  get Address() { return this.schedule.getAddress(this.myRowValues); }

  highlightRideLeader(onoff) {
    this.schedule.highlightCell(this.rowNum, RIDELEADERCOLUMNNAME, onoff);
    return this;
  }

  setRideLink(name, url) {
    let rtv = this.schedule.setRideLink(this.rowNum, name, url);
    this.richTextValues[this.schedule.getColumn(RIDECOLUMNNAME)] = rtv;
  }
  get RideName() { return this.schedule.getRideURL(this.richTextValues).getText(); }
  get RideURL() { return this.schedule.getRideURL(this.richTextValues).getLinkUrl(); }
  deleteRideLink() {
    this.schedule.deleteRideLink(this.rowNum);
  }
  setRouteLink(name, url) {
    let rtv = this.schedule.setRouteLink(this.rowNum, name, url);
    this.richTextValues[this.schedule.getColumn(ROUTECOLUMNNAME)] = rtv;
  }
}

