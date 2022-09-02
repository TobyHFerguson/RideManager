/** @OnlyCurrentDoc */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Ride Lead Coordinators')
    .addItem('Link Route URLs', linkRouteURLs.name)
    .addSeparator()
    .addItem('Schedule Selected Rides', scheduleSelectedRides.name)
    .addItem('Update Selected Rides', updateSelectedRides.name)
    .addItem('Cancel Selected Rides', cancelSelectedRides.name)
    .addSeparator()
    .addItem('Clear User Credentials', clearCredentials.name)
    .addToUi();
}



function linkRouteURLs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Consolidated Rides");
  // var routeRange = sheet.getActiveRange();
  var routeRange = sheet.getRange(`E2:E${sheet.getLastRow()}`);
  var rtvs = routeRange.getRichTextValues();
  var row = routeRange.getRow();
  for (var i = 0; i < rtvs.length; i++) {
    for (var j = 0; j< rtvs[i].length; j++) {
      let cell = rtvs[i][j];
      let url =cell.getLinkUrl();
      let text = cell.getText();
      if (url != null && url == text) {
        let route = getRouteJson(url);
         if (route.user_id !== SCCCC_USER_ID) {
          throw Error(`Row ${row + i}: ${url} is not owned by SCCCC`);
        }
        let name = route.name;
        Logger.log(`Row ${row + i} Linking ${name} to ${url}`);
        let rtv = SpreadsheetApp.newRichTextValue().setText(name).setLinkUrl(url).build();
        rtvs[i][j] = rtv;
      }
    }
  }
  routeRange.setRichTextValues(rtvs);
}

function getRouteJson(url) {
  const response = UrlFetchApp.fetch(`${url}.json`);
  const json = JSON.parse(response.getContentText());
  return json;
}
