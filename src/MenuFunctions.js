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
  function executeCommand(command, autoconfirm = false) {
    console.time('getGroups');
    const g2 = getGroups();
    console.timeEnd('getGroups');
    Globals.groups = g2;
    Globals.A_TEMPLATE = g2.A.TEMPLATE // Needed because RWGPSLib expects Globals.A_TEMPLATE

    const rwgpsService = RWGPSLib.newRWGPSService(Credentials.username, Credentials.password, Globals);
    const rwgps = RWGPSLib.newRWGPS(rwgpsService);
    console.time('getSelectedRows');
    let rows = Schedule.getSelectedRows();
    console.timeEnd('getSelectedRows');
    console.info('User %s', Session.getActiveUser());
    console.info('Selected rows', rows.map(row => row.rowNum));
    try {
      console.time('executeCommand');
      command(rows, rwgps, autoconfirm);
      console.timeEnd('executeCommand');
    } catch (e) {
      console.error(e);
      throw (e);
    }
    finally {
      Schedule.save();
    }

    
  }
  return Object.freeze({
    cancelSelectedRides() {
      let command = Exports.getCommands().cancelSelectedRidesWithCreds;
      executeCommand(command);
    },
    importSelectedRoutes(autoconfirm = false) {
      let command = Exports.getCommands().importSelectedRoutesWithCredentials;
      executeCommand(command, autoconfirm);
    },
    linkSelectedRouteUrls() {
      let command = Exports.getCommands().linkSelectedRouteUrlsWithCredentials;
      executeCommand(command);
    },
    reinstateSelectedRides() {
      let command = Exports.getCommands().reinstateSelectedRidesWithCreds;
      executeCommand(command);
    },
    scheduleSelectedRides() {
      let command = Exports.getCommands().scheduleSelectedRidesWithCredentials;
      executeCommand(command);
    },
    unscheduleSelectedRides() {
      let command = Exports.getCommands().unscheduleSelectedRidesWithCreds;
      executeCommand(command);
    },

    updateRiderCount() {
      let command = Exports.getCommands().updateRiderCountWithCreds;
      executeCommand(command);
    },
    updateSelectedRides() {
      let command = Exports.getCommands().updateSelectedRidesWithCredentials;
      executeCommand(command);
    },
  })


})()