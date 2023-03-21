if (typeof require !== 'undefined') {
    Globals = require('./Globals.js');
  }
  
  function linkSelectedRouteUrls() {
    let form = { ...credentials, method: linkSelectedRouteUrlsWithCredentials.name };
    do_action(form);
  }
  
  function linkSelectedRouteUrlsWithCredentials(rows, rwgps) {
    const errorFuns = [rowCheck.badRoute]
    const warningFuns = []
    UIManager.processRows(rows, errorFuns, warningFuns, rwgps, () => {}, true);
  
  
  }