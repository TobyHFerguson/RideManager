var credentials = PropertiesService.getUserProperties().getProperties();

function askForCredentials(method) {
  var template = HtmlService.createTemplateFromFile('getCredentialsDialog');
  template.method=method;
  var html = template.evaluate();
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showModalDialog(html, 'RWGPS Credentials')
}

// function getCredentials(method) {
//   Logger.log(credentials.email === undefined);
//   if (credentials.email === undefined || credentials.password === undefined) {
//     askForCredentials(method);
//   } else {
//     Logger.log("Got Credentials")
//   }
// }
function clearCredentials() {
  PropertiesService.getUserProperties().deleteAllProperties();
}

function saveCredentials(obj) {
  new RWGPSService(obj.email, obj.password);
  PropertiesService.getUserProperties().setProperties(obj);
  credentials = obj;
  return "Credentials Saved!";
}
