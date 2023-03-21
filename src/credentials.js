var credentials = PropertiesService.getUserProperties().getProperties();

function askForCredentials(command) {
  var template = HtmlService.createTemplateFromFile('getCredentialsDialog');
  template.command=command;
  var html = template.evaluate();
  SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
      .showModalDialog(html, 'RWGPS Credentials')
}

function saveCredentials(obj) {
  new RWGPSService(obj.email, obj.password);
  PropertiesService.getUserProperties().setProperties(obj);
  credentials = obj;
  return "Credentials Saved!";
}
