if (typeof require !== 'undefined') {
    const Exports = require('./Exports')
}

// These functions need to be global so that they can be
// accessed from the html client or from timers
/**
 * Execute the given command with the given credentials.
 * 
 * If no credentials are found then collect them from the user and try again.
 * @param {Object} form form collected from html. form.command MUST be present
 */
function executeCommand(form) {
    /**
     * Collect credentials using an html based dialog and then execute the given command on the server
     * @param {string} command the name of the command (from Commands)
     */
    function askForCredentials(command) {
        var template = HtmlService.createTemplateFromFile('getCredentialsDialog');
        template.command = command;
        var html = template.evaluate();
        SpreadsheetApp.getUi() // Or DocumentApp or SlidesApp or FormApp.
            .showModalDialog(html, 'RWGPS Credentials')
    }
    /**
     * 
     * @param {*} form 
     */
    function executeCommandWithCredentials(form) {
        const rwgpsService = RWGPSLib.newRWGPSService(form.email, form.password, Globals);
        const rwgps = RWGPSLib.newRWGPS(rwgpsService);
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
    if (!(form.email && form.password)) {
        askForCredentials(form.command);
    } else {
        executeCommandWithCredentials(form);
    }
}
function saveCredentials(obj) {
    // Check that the credentials are valid - this will fail if they're not, and control
    // passed back to the forms 'onError' handler.
    RWGPSLib.newRWGPSService(obj.email, obj.password, Globals);
    PropertiesService.getUserProperties().setProperties(obj);
    credentials = obj;
    return "Credentials Saved!";
}
function updateRiderCount() {
    MenuFunctions.updateRiderCount();
}
function updateSelectedRides() {
  MenuFunctions.updateSelectedRides();
}
function updateRiderCounts() {
  MenuFunctions.updateRiderCount();
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