/**
 * Initializes global variables from the 'Globals' sheet and caches them.
 * @returns {Record<string, any>} An object containing global key-value pairs.
 */
declare function initializeGlobals(): Record<string, any>;

/**
 * Retrieves global variables from cache, or initializes them if not present.
 * @returns {Record<string, any>} An object containing global key-value pairs.
 */
declare function getGlobals(): Record<string, any>;

