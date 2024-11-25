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

    // Input: {"A": {"TEMPLATE": ..., "MIN_LENGTH": ...}}
    // output: {"A_RIDE_TEMPLATE": ..., "A_RIDE_MIN_LENGTH": ...}
    function flattenObject(obj) {
      const flattened = {};
      for (const [outerKey, innerObj] of Object.entries(obj)) {
        for (const [innerKey, value] of Object.entries(innerObj)) {
          flattened[`${outerKey}_RIDE_${innerKey}`] = value;
        }
      }
      return flattened;
    }

    const group_props = groups.map(g => flattenObject(g))
    group_props.forEach(obj => Object.assign(Globals, obj));

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