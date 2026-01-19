// @ts-check
// This file is used to store global variables that are used across the project

var Globals = (function() {

/**
 * Initializes global variables from the 'Globals' sheet and caches them.
 * @returns {Object.<string, any>} An object containing global key-value pairs.
 */
function initializeGlobals_() {
    const globalData = bmPreFiddler.PreFiddler().getFiddler({
        sheetName: 'Globals',
        createIfMissing: false
    }).getData();
    const globals = globalData.reduce((/** @type {Object.<string, string | number>} */acc, /** @type {{ Key: string, Value: string | number }} */ global) => {
        const key = global.Key;
        const value = global.Value;
        acc[key] = value;
        return acc;
    }, {});

    const globalsString = JSON.stringify(globals);
    const cache = CacheService.getDocumentCache();
    if (!cache) {
        throw new Error('CacheService.getDocumentCache() returned null or undefined');
    }
    cache.put('Globals', globalsString, 21600); // 21600 seconds = 6 hours
    return globals;
}

/**
 * Initializes personal templates from the 'Personal Templates' sheet and caches them.
 * @returns {Object.<string, string>} An object mapping email addresses to template URLs.
 */
function initializePersonalTemplates_() {
    try {
        const templateData = bmPreFiddler.PreFiddler().getFiddler({
            sheetName: 'Personal Templates',
            createIfMissing: false
        }).getData();

        console.log('Personal Templates data from sheet:', templateData);
        const templates = templateData.reduce((/** @type {Object.<string, string>} */ acc, /** @type {{ Email: string, TemplateURL: string, Active: boolean | string }} */ row) => {
            const email = row.Email;
            const templateURL = row.TemplateURL;
            const active = row.Active;

            // Only include active templates with both email and URL
            if (email && templateURL && (active === true || active === 'TRUE' || active === 'true')) {
                acc[email.toLowerCase()] = templateURL;
            }
            return acc;
        }, {});

        console.log('Personal templates loaded:', templates);
        const templatesString = JSON.stringify(templates);
        const cache = CacheService.getDocumentCache();
        if (!cache) {
            throw new Error('CacheService.getDocumentCache() returned null or undefined');
        }
        cache.put('PersonalTemplates', templatesString, 3600); // 1 hour cache
        return templates;
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.warn('Personal Templates sheet not found or error reading it:', err.message);
        return {};
    }
}

class Globals {
    /**
     * Retrieves global variables from cache, or initializes them if not present.
     * @returns {Object.<string, string | number>|undefined} An object containing global key-value pairs, or undefined if an error occurs.
     */
    static getGlobals() {
        // console.log('Entering getGlobals function');
        try {
            const cache = CacheService.getDocumentCache();
            if (!cache) {
                console.error('CacheService.getDocumentCache() returned null or undefined');
                return undefined;
            }
            const globals = cache.get('Globals');
            if (globals) {
                // console.log('Globals object from cache:', globals);
                return JSON.parse(globals);
            } else {
                // console.log('Globals not found in cache, initializing globals');
                return initializeGlobals_();
            }
        } catch (error) {
            console.error('Error in getGlobals function:', error);
            return undefined;
        }
    }

    /**
     * Retrieves personal templates from cache, or initializes them if not present.
     * Returns empty object if Personal Templates sheet doesn't exist (optional feature).
     * @returns {Object.<string, string>} An object mapping email addresses to template URLs.
     */
    static getPersonalTemplates() {
        try {
            const cache = CacheService.getDocumentCache();
            if (!cache) {
                console.error('CacheService.getDocumentCache() returned null or undefined');
                return {};
            }
            const templates = cache.get('PersonalTemplates');
            if (templates) {
                console.log('Personal templates from cache:', templates);
                return JSON.parse(templates);
            } else {
                console.log('Personal templates not found in cache, initializing personal templates');
                return initializePersonalTemplates_();
            }
        } catch (error) {
            console.warn('Error in getPersonalTemplates function:', error);
            return {};
        }
    }
}

return Globals;
})();

// Global function alias for backward compatibility
// Called as global function in GAS runtime
function getGlobals() {
    return Globals.getGlobals();
}

if (typeof module !== 'undefined') {
    module.exports = Globals;
}

