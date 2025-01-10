/** @OnlyCurrentDoc */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Ride Lead Coordinators')
    .addItem('Schedule Selected Rides', "MenuFunctions.scheduleSelectedRides")
    .addItem('Update Selected Rides', "MenuFunctions.updateSelectedRides")
    .addItem('Cancel Selected Rides', "MenuFunctions.cancelSelectedRides")
    .addItem('Reinstate Selected Rides', "MenuFunctions.reinstateSelectedRides")
    .addItem('Unschedule Selected Rides', "MenuFunctions.unscheduleSelectedRides")
    .addSeparator()
    .addItem('Import Selected Routes', "MenuFunctions.importSelectedRoutes")
    .addItem('Link Selected Route URLs', "MenuFunctions.linkSelectedRouteUrls")
    .addItem('Update Rider Count', "MenuFunctions.updateRiderCount")
    .addToUi();
  
  const schedule = Schedule;
  schedule.storeOriginalFormulas();
}

function onEdit(event) {
  console.log('onEdit triggered');
  console.log(`Event: ${JSON.stringify(event)}`);
  const schedule = Schedule;
  schedule.onEdit(event);
}

// The value could be an rtv.
// if the url & text are defined and equal then this rtv has been auto-linked and we need to look up the url
// if the url & text are defined and unequal then linking has occurred. Return false
// if the text is defined it contains an url (that's why we have an RTV!). Return it.
// otherwise return whatever the url has

function _rtvNeedingFetch(rtv) {
  console.log(`rtv.getLinkUrl(): ${rtv.getLinkUrl()}, rtv.getText(): ${rtv.getText()}`)
  if (!rtv) return false;
  let result;
  const url = rtv.getLinkUrl();
  const text = rtv.getText();
  result = (url && text) ? ((url == text) ? url : false) : text ? text : url

  console.log(`result: ${result}`)
  return result
}

function _editRouteColumn(event) {
  let url = event.value || _rtvNeedingFetch(event.range.getRichTextValue())
  if (url) {
    const options = {
      headers: {
        Accept: "application/json" // Return json, not html
      },
    }
    try {
      const response = UrlFetchApp.fetch(url, options)
      const route = JSON.parse(response.getContentText());
      const name = `${(route.user_id !== Globals.SCCCC_USER_ID) ? Globals.FOREIGN_PREFIX : ''}` + route.name;
      event.range.setValue(`=hyperlink("${url}", "${name}")`)
    } catch (e) {
      console.log(`onEdit._editRouteColumn() - fetching ${url} got exception: ${e}`)
    }
  }
}


