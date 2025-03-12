if (typeof require !== 'undefined') {
  const Exports = require('./Exports')
}

// These functions need to be global so that they can be
// accessed from the html client or from timers
/**
 * Execute the given command with the given credentials.
 * 
 * If no credentials are found then collect them from the user and try again.
 * @param {Function} command command to execute
 */

function importSelectedRoutes() {
  MenuFunctions.importSelectedRoutes();
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
function scheduleSelectedRides() {
  MenuFunctions.scheduleSelectedRides();
}
function unScheduleSelectedRides() {
  MenuFunctions.unscheduleSelectedRides();
}

const MenuFunctions = (() => {
  function executeCommand(command, force = false) {
    const g2 = getGroupSpecs();
    const globals = getGlobals();
    globals["A_TEMPLATE"] = g2.A.TEMPLATE // Needed because RWGPSLib expects globals["A_TEMPLATE"]

    const rwgpsService = RWGPSLib.newRWGPSService(Credentials.username, Credentials.password, globals);
    const rwgps = RWGPSLib.newRWGPS(rwgpsService);
    let rows = Schedule.getSelectedRows();
    console.info('User %s', Session.getActiveUser());
    try {
      command(rows, rwgps, force);
    } catch (e) {
      console.error(e);
      throw (e);
    }
    finally {
      Schedule.save();
    }

    
  }
  return Object.freeze({
    cancelSelectedRides(force = false) {
      let command = Exports.getCommands().cancelSelectedRidesWithCreds;
      executeCommand(command, force);
    },
    importSelectedRoutes(autoconfirm = false, force = false) {
      let command = Exports.getCommands().importSelectedRoutesWithCredentials;
      executeCommand(command, autoconfirm, force);
    },
    linkSelectedRouteUrls(force = false) {
      let command = Exports.getCommands().linkSelectedRouteUrlsWithCredentials;
      executeCommand(command, force);
    },
    reinstateSelectedRides(force = false) {
      let command = Exports.getCommands().reinstateSelectedRidesWithCreds;
      executeCommand(command, force);
    },
    scheduleSelectedRides(force = false) {
      let command = Exports.getCommands().scheduleSelectedRidesWithCredentials;
      executeCommand(command, force);
    },
    unscheduleSelectedRides(force = false) {
      let command = Exports.getCommands().unscheduleSelectedRidesWithCreds;
      executeCommand(command, force);
    },

    updateRiderCount(force = false) {
      let command = Exports.getCommands().updateRiderCountWithCreds;
      executeCommand(command, force);
    },
    updateSelectedRides(force = false) {
      let command = Exports.getCommands().updateSelectedRidesWithCredentials;
      executeCommand(command, force);
    },
  })


})()