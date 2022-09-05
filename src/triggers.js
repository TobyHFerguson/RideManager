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
    for (var j = 0; j < rtvs[i].length; j++) {
      let cell = rtvs[i][j];
      let url = cell.getLinkUrl();
      let text = cell.getText();
      url = url === null ? text : url;
      if (url != null && url !== "" && url === text) {
        try {
          let route = getRouteJson(url);
          if (route.user_id !== SCCCC_USER_ID) {
            throw Error(`${url} is not owned by SCCCC`);
          }
          let name = route.name;
          Logger.log(`Row ${row + i} Linking ${name} to ${url}`);
          let rtv = SpreadsheetApp.newRichTextValue().setText(name).setLinkUrl(url).build();
          rtvs[i][j] = rtv;
        } catch (e) {
          SpreadsheetApp.getUi().alert(`Row ${row + i}: ${e.message}`);
      }
    } 
    }
  }
  routeRange.setRichTextValues(rtvs);
}

function getRouteJson(url) {
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
