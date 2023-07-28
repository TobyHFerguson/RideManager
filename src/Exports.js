if (typeof require !== 'undefined') {
    const {RWGPS, RWGPSService} = require('./RWGPS')
    const Commands = require('./Commands')
    modules.export = Exports;
}

var Exports = {
    getMenuFunctions(){
        return MenuFunctions;
    },
    getCommands() {
        return Commands;
    },
    
}

