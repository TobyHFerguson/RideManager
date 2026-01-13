/**
 * RWGPSClient.js
 * 
 * Thin GAS adapter for RWGPS API operations
 * Delegates business logic to RWGPSClientCore, only handles GAS I/O
 */

/* istanbul ignore if - GAS runtime check */
if (typeof require !== 'undefined') {
    var RWGPSClientCore = require('./RWGPSClientCore');
}

/**
 * RWGPSClient - Unified RWGPS API client
 * Replaces: RWGPS → RWGPSService → ApiService architecture
 */
class RWGPSClient {
    /**
     * Create RWGPS client
     * 
     * @param {{apiKey: string, authToken: string, username: string, password: string}} credentials - RWGPS credentials
     */
    constructor(credentials) {
        this.apiKey = credentials.apiKey;
        this.authToken = credentials.authToken;
        this.username = credentials.username;
        this.password = credentials.password;
        this.sessionCookies = null; // For web session authentication
    }

    /**
     * Schedule a new event from template
     * 
     * @param {string} templateUrl - Template event URL
     * @param {any} eventData - Event data
     * @param {string[]} organizerNames - Organizer names
     * @returns {{success: boolean, eventUrl?: string, error?: string}} Result
     */
    scheduleEvent(templateUrl, eventData, organizerNames) {
        // TODO: Implement in Task 3.10
        throw new Error('scheduleEvent not yet implemented');
    }

    /**
     * Update an existing event
     * 
     * @param {string} eventUrl - Event URL
     * @param {any} eventData - Updated event data
     * @returns {{success: boolean, error?: string}} Result
     */
    updateEvent(eventUrl, eventData) {
        // TODO: Implement in Task 3.11
        throw new Error('updateEvent not yet implemented');
    }

    /**
     * Cancel an event (adds CANCELLED prefix)
     * 
     * @param {string} eventUrl - Event URL
     * @returns {{success: boolean, error?: string}} Result
     */
    cancelEvent(eventUrl) {
        // TODO: Implement in Task 3.7
        throw new Error('cancelEvent not yet implemented');
    }

    /**
     * Reinstate a cancelled event (removes CANCELLED prefix)
     * 
     * @param {string} eventUrl - Event URL
     * @returns {{success: boolean, error?: string}} Result
     */
    reinstateEvent(eventUrl) {
        // TODO: Implement in Task 3.8
        throw new Error('reinstateEvent not yet implemented');
    }

    /**
     * Delete an event
     * 
     * @param {string} eventUrl - Event URL
     * @returns {{success: boolean, error?: string}} Result
     */
    deleteEvent(eventUrl) {
        // TODO: Implement in Task 3.3
        throw new Error('deleteEvent not yet implemented');
    }

    /**
     * Import a route
     * 
     * @param {string} routeUrl - Route URL
     * @param {any} options - Import options
     * @returns {{success: boolean, routeUrl?: string, error?: string}} Result
     */
    importRoute(routeUrl, options) {
        // TODO: Implement in Task 3.12
        throw new Error('importRoute not yet implemented');
    }

    /**
     * Get Basic Auth header
     * 
     * @returns {string} Basic Auth header value
     * @private
     */
    _getBasicAuthHeader() {
        return RWGPSClientCore.buildBasicAuthHeader(this.apiKey, this.authToken);
    }

    /**
     * Execute HTTP request using UrlFetchApp
     * 
     * @param {string} url - Request URL
     * @param {{method: string, headers: Record<string, string>, payload?: string, muteHttpExceptions: boolean}} options - Request options
     * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse} Response
     * @private
     */
    _fetch(url, options) {
        // GAS-only code path
        /* istanbul ignore next */
        return UrlFetchApp.fetch(url, options);
    }
}

/* istanbul ignore if - Node.js/Jest export */
if (typeof module !== 'undefined') {
    module.exports = RWGPSClient;
}
