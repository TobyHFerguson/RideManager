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
    const cache = CacheService.getDocumentCache();
    cache.put('Globals', globalsString, 21600); // 21600 seconds = 6 hours
    return globals;
}

function getGlobals() {
  console.log('Entering getGlobals function');
  try {
    const cache = CacheService.getDocumentCache();
    const globals = cache.get('Globals');
    if (globals) {
        console.log('Globals object from cache:', globals);
        return JSON.parse(globals);
    } else {
        console.log('Globals not found in cache, initializing globals');
        return initializeGlobals_();
    }
  } catch (error) {
    console.error('Error in getGlobals function:', error);
    return undefined;
  }
}

if (typeof module !== 'undefined') {
  module.exports = { getGlobals };
}

