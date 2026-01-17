/**
 * RWGPSLibAdapter.js
 * 
 * Adapter that provides the same interface as the external RWGPSLib library.
 * This allows the vendored RWGPS files to be used without changing the calling code.
 * 
 * The external library was accessed via: getRWGPSLib_().newCredentialManager(...) etc.
 * This adapter provides the same interface so getRWGPSLib_() can return this object.
 * 
 * NEW ARCHITECTURE (Phase 5):
 * - RWGPSFacade: Clean public API with domain-friendly types (Date, visibility enum)
 * - RWGPSCore: Pure JS business logic (URL parsing, payload building) - 100% Jest tested
 * - RWGPSAdapter: Thin GAS wrapper for HTTP calls (UrlFetchApp.fetch)
 * 
 * The new classes are exported alongside the legacy factory methods for gradual migration.
 */

// @ts-check
/* istanbul ignore file - GAS-only adapter */

/**
 * Adapter object that mimics the RWGPSLib library interface.
 * Also exports new architecture classes for gradual migration.
 */
var RWGPSLibAdapter = {
    // ========================================
    // LEGACY FACTORY METHODS (backward compatibility)
    // ========================================
    
    /**
     * Create a new CredentialManager instance
     * @param {GoogleAppsScript.Properties.Properties} scriptProperties
     * @returns {CredentialManager}
     */
    newCredentialManager: function(scriptProperties) {
        return newCredentialManager(scriptProperties);
    },
    
    /**
     * Create a new RWGPS instance (legacy API)
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
    },
    
    // ========================================
    // NEW ARCHITECTURE CLASSES (Phase 5)
    // ========================================
    
    /**
     * RWGPSCore class - Pure JavaScript business logic
     * Use for: URL parsing, date formatting, payload building
     * 100% Jest testable (no GAS dependencies)
     * @type {typeof RWGPSCore}
     */
    get RWGPSCore() {
        return RWGPSCore;
    },
    
    /**
     * RWGPSAdapter class - Thin GAS wrapper for HTTP calls
     * Use for: Direct HTTP requests when facade doesn't cover your use case
     * @type {typeof RWGPSAdapter}
     */
    get RWGPSAdapter() {
        return RWGPSAdapter;
    },
    
    /**
     * RWGPSFacade class - Clean public API with domain-friendly types
     * Use for: All standard RWGPS operations (getEvent, editEvent, createEvent, etc.)
     * @type {typeof RWGPSFacade}
     */
    get RWGPSFacade() {
        return RWGPSFacade;
    },
    
    /**
     * LegacyRWGPSAdapter class - Wraps RWGPSFacade with legacy method names
     * Use for: Drop-in replacement for legacy RWGPS class
     * @type {typeof LegacyRWGPSAdapter}
     */
    get LegacyRWGPSAdapter() {
        return LegacyRWGPSAdapter;
    },
    
    /**
     * Create a new RWGPSFacade instance with default configuration.
     * Uses getGlobals() and CredentialManager for configuration automatically.
     * @returns {RWGPSFacade}
     */
    newFacade: function() {
        // Create credential manager from script properties
        const credentialManager = new CredentialManager(PropertiesService.getScriptProperties());
        const adapter = new RWGPSAdapter(credentialManager);
        const globals = typeof getGlobals === 'function' ? getGlobals() : {};
        return new RWGPSFacade(adapter, globals);
    },
    
    /**
     * Create a new LegacyRWGPSAdapter instance.
     * Drop-in replacement for legacy RWGPS class.
     * Uses getGlobals() for configuration automatically.
     * @returns {LegacyRWGPSAdapter}
     */
    newLegacyAdapter: function() {
        const facade = this.newFacade();
        const globals = typeof getGlobals === 'function' ? getGlobals() : {};
        return new LegacyRWGPSAdapter(facade, globals);
    },
    
    /**
     * Create a new RWGPSClient instance.
     * Direct access to tested, working RWGPS operations.
     * Uses CredentialManager for authentication automatically.
     * @returns {RWGPSClient}
     */
    newClient: function() {
        const credentialManager = new CredentialManager(PropertiesService.getScriptProperties());
        return new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
    }
};
