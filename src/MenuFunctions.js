if (typeof require !== 'undefined') {
    const Exports = require('./Exports')
}

// These functions need to be global so that they can be
// accessed from the html client or from timers
function executeCommand(form) {
    if (!(form.email && form.password)) {
        askForCredentials_(form.command);
    } else {
        executeCommandWithCredentials_(form);
    }
}
function saveCredentials(obj) {
    new (Exports.getRWGPSService())(obj.email, obj.password);
    PropertiesService.getUserProperties().setProperties(obj);
    credentials = obj;
    return "Credentials Saved!";
}
function updateRiderCount() {
    MenuFunctions.updateRiderCount();
}
// These functions are called by the above two and seem to 
// need to be global too, although I'd like to eliminate that!
function askForCredentials_(command) {
    var template = HtmlService.createTemplateFromFile('getCredentialsDialog');
    template.command = command;
    var html = template.evaluate();
    SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
        .showModalDialog(html, 'RWGPS Credentials')
}
function executeCommandWithCredentials_(form) {
    const rwgpsService = new (Exports.getRWGPSService())(form.email, form.password);
    const rwgps = new (Exports.getRWGPS())(rwgpsService);
    let rows = Schedule.getSelectedRows();
    console.info('User %s', Session.getActiveUser());
    console.info('Selected rows', rows.map(row => row.rowNum));
    try {
        Exports.getCommands()[form.command](rows, rwgps);
    } catch (e) {
        console.error(e);
        throw (e);
    }
    finally {
        Schedule.save();
    }
}


const MenuFunctions = (() => {
    const credentials = PropertiesService.getUserProperties().getProperties();

    return Object.freeze({
        cancelSelectedRides() {
            let form = { ...credentials, command: "cancelSelectedRidesWithCreds" };
            executeCommand(form);
        },
        clearCredentials() {
            PropertiesService.getUserProperties().deleteAllProperties();
        },
        importSelectedRoutes() {
            let form = { ...credentials, command: "importSelectedRoutesWithCredentials" };
            executeCommand(form);
        },
        linkSelectedRouteUrls() {
            let form = { ...credentials, command: "linkSelectedRouteUrlsWithCredentials" };
            executeCommand(form);
        },
        reinstateSelectedRides() {
            let form = { ...credentials, command: "reinstateSelectedRidesWithCreds" };
            executeCommand(form);
        },
        scheduleSelectedRides() {
            let form = { ...credentials, command: "scheduleSelectedRidesWithCredentials" };
            executeCommand(form);
        },
        unscheduleSelectedRides() {
            let form = { ...credentials, command: "unscheduleSelectedRidesWithCreds" };
            executeCommand(form);
        },

        updateRiderCount() {
            let form = { ...credentials, command: "updateRiderCountWithCreds" };
            executeCommand(form);
        },
        updateSelectedRides() {
            let form = { ...credentials, command: "updateSelectedRidesWithCredentials" };
            executeCommand(form);
        },
    })


})()