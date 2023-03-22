if (typeof require !== 'undefined') {
    const {RWGPS, RWGPSService} = require('./RWGPS')
    const Commands = require('./Commands')
    modules.export = Exports;
}

var Exports = {
    getRWGPS() {
        return RWGPS;
    },
    getRWGPSService() {
        return RWGPSService;
    },
    getMenuFunctions(){
        return MenuFunctions;
    },
    getCommands() {
        return Commands;
    },
    
}

