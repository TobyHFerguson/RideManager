/**
 * RWGPSLibAdapter.js
 * 
 * Adapter that provides the same interface as the external RWGPSLib library.
 * This allows the vendored RWGPS files to be used without changing the calling code.
 * 
 * The external library was accessed via: getRWGPSLib_().newCredentialManager(...) etc.
 * This adapter provides the same interface so getRWGPSLib_() can return this object.
 */

// @ts-check
/* istanbul ignore file - GAS-only adapter */

/**
 * Adapter object that mimics the RWGPSLib library interface
 */
var RWGPSLibAdapter = {
    /**
     * Create a new CredentialManager instance
     * @param {GoogleAppsScript.Properties.Properties} scriptProperties
     * @returns {CredentialManager}
     */
    newCredentialManager: function(scriptProperties) {
        return newCredentialManager(scriptProperties);
    },
    
    /**
     * Create a new RWGPS instance
     * @param {RWGPSService} rwgpsService
     * @returns {RWGPS}
     */
    newRWGPS: function(rwgpsService) {
        return newRWGPS(rwgpsService);
    },
    
    /**
     * Create a new RWGPSService instance
     * @param {object} globals
     * @param {CredentialManager} credentialManager
     * @returns {RWGPSService}
     */
    newRWGPSService: function(globals, credentialManager) {
        return newRWGPSService(globals, credentialManager);
    }
};
