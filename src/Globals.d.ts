/**
 * Type representing the global variables object
 */
export type GlobalsObject = Record<string, any>;

/**
 * Initializes global variables from the 'Globals' sheet and caches them.
 * @returns {GlobalsObject} An object containing global key-value pairs.
 */
declare function initializeGlobals(): GlobalsObject;

/**
 * Retrieves global variables from cache, or initializes them if not present.
 * @returns {GlobalsObject} An object containing global key-value pairs.
 */
declare function getGlobals(): GlobalsObject;

