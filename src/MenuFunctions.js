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
     * 
     * @param {*} form 
     */
    function executeCommandWithCredentials(form) {
        const rwgpsService = RWGPSLib.newRWGPSService(Credentials.username, Credentials.password, Globals);
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
    executeCommandWithCredentials(form);
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
    const credentials = Credentials;

    return Object.freeze({
        cancelSelectedRides() {
            let form = { command: "cancelSelectedRidesWithCreds" };
            executeCommand(form);
        },
        clearCredentials() {
            PropertiesService.getUserProperties().deleteAllProperties();
        },
        importSelectedRoutes() {
            let form = { command: "importSelectedRoutesWithCredentials" };
            executeCommand(form);
        },
        linkSelectedRouteUrls() {
            let form = { command: "linkSelectedRouteUrlsWithCredentials" };
            executeCommand(form);
        },
        reinstateSelectedRides() {
            let form = { command: "reinstateSelectedRidesWithCreds" };
            executeCommand(form);
        },
        scheduleSelectedRides() {
            let form = { command: "scheduleSelectedRidesWithCredentials" };
            executeCommand(form);
        },
        unscheduleSelectedRides() {
            let form = { command: "unscheduleSelectedRidesWithCreds" };
            executeCommand(form);
        },

        updateRiderCount() {
            let form = { command: "updateRiderCountWithCreds" };
            executeCommand(form);
        },
        updateSelectedRides() {
            let form = { command: "updateSelectedRidesWithCredentials" };
            executeCommand(form);
        },
    })


})()