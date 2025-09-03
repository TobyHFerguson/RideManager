if (typeof require !== 'undefined') {
    const {RWGPS, RWGPSService} = require('./Externals')
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

