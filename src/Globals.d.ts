/**
 * Globals - Manage global configuration variables
 * 
 * Type definitions for global configuration retrieval.
 */

/**
 * Type representing the global variables object
 */
export type GlobalsObject = Record<string, any>;

/**
 * Type representing personal templates configuration
 */
export type PersonalTemplatesObject = Record<string, any>;

/**
 * Globals class with static methods for global configuration management
 */
declare class Globals {
    /**
     * Retrieves global variables from cache, or initializes them if not present.
     * @returns An object containing global key-value pairs.
     */
    static getGlobals(): GlobalsObject;

    /**
     * Retrieves personal templates configuration.
     * @returns An object containing personal template key-value pairs.
     */
    static getPersonalTemplates(): PersonalTemplatesObject;
}

// Global function alias for backward compatibility (declared in gas-globals.d.ts)
export function getGlobals(): GlobalsObject;

export default Globals;
