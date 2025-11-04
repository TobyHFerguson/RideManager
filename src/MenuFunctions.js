if (typeof require !== 'undefined') {
  const Exports = require('./Exports')
}
const head = (PropertiesService.getScriptProperties().getProperty('head') || 'head').toLowerCase() === 'true';

// These functions need to be global so that they can be
// accessed from the html client or from timers
/**
 * Execute the given command with the given credentials.
 * 
 * If no credentials are found then collect them from the user and try again.
 * @param {Function} command command to execute
 */

function getRWGPSLib_() {
  return head ? RWGPSLib : RWGPSLib12;
}

function getGlobals_() {
  const g2 = getGroupSpecs();
  const globals = getGlobals();
  globals["A_TEMPLATE"] = g2.A.TEMPLATE
  return globals;
}
function getRWGPSService_() {
  const credentialManager = getRWGPSLib_().newCredentialManager(PropertiesService.getScriptProperties())
  return getRWGPSLib_().newRWGPSService(getGlobals_(), credentialManager);
}

const MenuFunctions = (() => {
  function executeCommand(command, force = false) {
    const g2 = getGroupSpecs();
    const globals = getGlobals();
    globals["A_TEMPLATE"] = g2.A.TEMPLATE // Needed because RWGPSLib expects globals["A_TEMPLATE"]

    const rwgpsService = getRWGPSService_();
    const rwgps = getRWGPSLib_().newRWGPS(rwgpsService);
    let rows = Schedule.getSelectedRows();
    const rowNumbers = rows.map(row => row.rowNum).join(", ");
    
    try {
      // User logging executed after they've agreed to any warnings in UIManager
      command(rows, rwgps, force);
    } catch (e) {
      // Log errors too
      UserLogger.log(`${command.name}_ERROR`, e.message, { 
        rowNumbers, 
        error: e.stack 
      });
      
      if (e instanceof AggregateError) {
        for (const error of e.errors) {
          console.error(error.stack);
        }
      } else if (e instanceof Error) {
        console.error(e.stack);
      } else {
        console.error("Unknown error: ", e);
      }
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