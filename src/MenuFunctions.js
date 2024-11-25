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
  PropertiesService.getUserProperties().deleteAllProperties();
  function executeCommand(command) {
    const fiddler = bmPreFiddler.PreFiddler().getFiddler({
      sheetName: 'Groups',
      createIfMissing: false
    })
    let groups = fiddler.getData();
    // groups = [ {"Group": "A", "Template": ..., "MIN_LENGTH": ...}]
    groups = groups.reduce((acc, curr) => {
      const { Group, ...rest } = curr;
      acc.push({ [`${Group}`]: rest });
      return acc;
    }, []);
    // groups = [ {"A": {"TEMPLATE": ..., "MIN_LENGTH": ...}}, {"B": {{"TEMPLATE": ..., "MIN_LENGTH": ...}}}]
    const g2 = groups.reduce((acc, curr) => {
      const [key, value] = Object.entries(curr)[0];
      acc[key] = value;
      return acc;
    }, {});
    Globals.groups = g2;

    const rwgpsService = RWGPSLib.newRWGPSService(Credentials.username, Credentials.password, Globals);
    const rwgps = RWGPSLib.newRWGPS(rwgpsService);
    let rows = Schedule.getSelectedRows();
    console.info('User %s', Session.getActiveUser());
    console.info('Selected rows', rows.map(row => row.rowNum));
    try {
      command(rows, rwgps);
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
    importSelectedRoutes() {
      let command = Exports.getCommands().importSelectedRoutesWithCredentials;
      executeCommand(command);
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