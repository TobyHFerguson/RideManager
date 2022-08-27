function testTextFinder() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Consolidated Rides');
    var d = new Date("5/21/2022");
    var s = d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles",weekday: "short", month: "2-digit", day: "numeric" }).replace(',', '');
    var ts = sheet.createTextFinder(s);
    Logger.log(s);
    let ranges = ts.findAll();
    ranges.forEach(r => Logger.log(r.getRow()));
  }