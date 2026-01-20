/**
 * RWGPSClientFactory.js
 * 
 * Factory for creating RWGPSClient instances.
 * Single point for client creation - swappable for testing.
 * 
 * @see GitHub Issue #199 for design discussion
 */

/* istanbul ignore if - Node.js compatibility check */
if (typeof require !== 'undefined') {
    var RWGPSClient = require('./RWGPSClient');
    var CredentialManager = require('./CredentialManager');
}

/**
 * Factory for creating RWGPSClient instances
 */
var RWGPSClientFactory = {
    /**
     * Create a new RWGPSClient instance.
     * Uses CredentialManager to get credentials from Script Properties.
     * 
     * @returns {RWGPSClient} Configured RWGPSClient instance
     * @throws {Error} If required credentials are missing from Script Properties
     */
    create: function() {
        const credentialManager = new CredentialManager(PropertiesService.getScriptProperties());
        return new RWGPSClient({
            apiKey: credentialManager.getApiKey(),
            authToken: credentialManager.getAuthToken(),
            username: credentialManager.getUsername(),
            password: credentialManager.getPassword()
        });
    }
};

/* istanbul ignore if - Node.js compatibility check */
if (typeof module !== 'undefined') {
    module.exports = RWGPSClientFactory;
}
