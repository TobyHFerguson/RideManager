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



  linkRouteURLsInSelectedRows() {
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
    function link(row) {
      let url = row.RouteURL;
      let text = row.RouteName;
      if (url === null) {
        row.setRouteLink(text, text);
        Logger.log(row.RouteURL);
        Logger.log(row.RouteName);
        url = text;
      }
      if (url != null && url !== "" && url === text) {
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
    let rows = this.getSelectedRows();
    rows.forEach(row => link(row));
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

