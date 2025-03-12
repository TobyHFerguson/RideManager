// This file is used to store global variables that are used across the project

function initializeGlobals_() {
    const globalData = bmPreFiddler.PreFiddler().getFiddler({
        sheetName: 'Globals',
        createIfMissing: false
    }).getData();
    const globals = globalData.reduce((acc, global) => {
        const key = global.Key;
        const value = global.Value;
        acc[key] = value;
        return acc;
    }, {});

    const globalsString = JSON.stringify(globals);
    const cache = CacheService.getScriptCache();
    cache.put('Globals', globalsString, 21600); // 21600 seconds = 6 hours
    return globals;
}

function getGlobals() {
    const cache = CacheService.getScriptCache();
    const globals = cache.get('Globals');
    if (globals) {
        return JSON.parse(globals);
    } else {
        return initializeGlobals_();
    }
}

