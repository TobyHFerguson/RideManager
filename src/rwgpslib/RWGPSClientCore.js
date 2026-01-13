/**
 * RWGPSClientCore.js
 * 
 * Pure JavaScript business logic for RWGPS API operations
 * NO Google Apps Script dependencies - fully testable in Jest
 * 
 * This module contains:
 * - URL parsing and validation
 * - Request option building
 * - Event data validation
 * - Authentication header generation
 */

/* istanbul ignore if - Node.js/Jest compatibility */
if (typeof require !== 'undefined') {
    // No dependencies for Core module
}

/**
 * RWGPSClientCore - Pure JavaScript business logic
 */
var RWGPSClientCore = (function() {
    /**
     * RWGPSClientCore class - Pure JavaScript business logic
     */
    class RWGPSClientCore {
    /**
     * Extract event ID from RWGPS event URL
     * 
     * @param {string} eventUrl - Full URL like "https://ridewithgps.com/events/12345"
     * @returns {{eventId: string, fullUrl: string}} Parsed URL with event ID
     */
    static parseEventUrl(eventUrl) {
        if (!eventUrl || typeof eventUrl !== 'string') {
            throw new Error('Invalid event URL: must be a non-empty string');
        }

        const eventId = RWGPSClientCore.extractEventId(eventUrl);
        if (!eventId) {
            throw new Error(`Invalid event URL: could not extract event ID from ${eventUrl}`);
        }

        return {
            eventId: eventId,
            fullUrl: eventUrl
        };
    }

    /**
     * Parse event ID from various URL formats
     * 
     * @param {string} url - URL that might contain event ID
     * @returns {string | null} Event ID or null if not found
     */
    static extractEventId(url) {
        if (!url) {
            return null;
        }

        // Match /events/12345 pattern
        const match = url.match(/\/events\/(\d+)/);
        return match ? match[1] : null;
    }

    /**
     * Build HTTP request options for fetch
     * 
     * @param {'get' | 'post' | 'put' | 'delete'} method - HTTP method
     * @param {any} [payload] - Optional request body (will be JSON stringified)
     * @param {Record<string, string>} [headers] - Optional additional headers
     * @returns {{method: string, headers: Record<string, string>, payload?: string, muteHttpExceptions: boolean}} Request options for UrlFetchApp
     */
    static buildRequestOptions(method, payload, headers) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(headers || {})
            },
            muteHttpExceptions: true
        };

        if (payload !== null && payload !== undefined) {
            options.payload = JSON.stringify(payload);
        }

        return options;
    }

    /**
     * Build Basic Auth header value
     * 
     * @param {string} apiKey - RWGPS API key
     * @param {string} authToken - RWGPS auth token
     * @returns {string} Base64-encoded Basic Auth header value
     */
    static buildBasicAuthHeader(apiKey, authToken) {
        const credentials = `${apiKey}:${authToken}`;
        
        // In Node.js/Jest, use Buffer
        /* istanbul ignore if - GAS runtime check */
        if (typeof Buffer !== 'undefined') {
            return 'Basic ' + Buffer.from(credentials).toString('base64');
        }
        
        // In GAS, use Utilities.base64Encode
        /* istanbul ignore next - GAS-only code path */
        return 'Basic ' + Utilities.base64Encode(credentials);
    }

    /**
     * Validate event data has required fields
     * 
     * @param {any} eventData - Event data object to validate
     * @returns {{valid: boolean, errors: string[]}} Validation result with errors if invalid
     */
    static validateEventData(eventData) {
        /** @type {string[]} */
        const errors = [];

        if (!eventData) {
            errors.push('Event data is required');
            return { valid: false, errors };
        }

        // Required: name
        if (!eventData.name || typeof eventData.name !== 'string' || eventData.name.trim() === '') {
            errors.push('Event name is required');
        }

        // Required: starts_at
        if (!eventData.starts_at) {
            errors.push('Start time is required');
        }

        // Optional: route_id (not required for cancelled events)
        // No validation needed - can be missing

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Build request options for getEvent (GET request)
     * 
     * @param {string} sessionCookie - Session cookie value
     * @returns {{method: string, headers: Record<string, string>, muteHttpExceptions: boolean}} Request options
     */
    static buildGetEventOptions(sessionCookie) {
        return {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cookie': sessionCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            muteHttpExceptions: true
        };
    }
}

return RWGPSClientCore;
})();

/* istanbul ignore if - Node.js/Jest export */
if (typeof module !== 'undefined') {
    module.exports = RWGPSClientCore;
}
