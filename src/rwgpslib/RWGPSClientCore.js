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

    /**
     * Build payload for editEvent PUT request
     * Handles conversion of event data to RWGPS API format
     * 
     * @param {any} eventData - Event data object (from getEvent or modified)
     * @param {string | number} allDay - "0" or "1" for all_day flag (string required by API)
     * @returns {any} Payload object for PUT request
     */
    static buildEditEventPayload(eventData, allDay) {
        const payload = {
            all_day: String(allDay), // API requires string "0" or "1"
            name: eventData.name,
            desc: eventData.desc || eventData.description || '',
            location: eventData.location || '',
            start_date: eventData.start_date || eventData.starts_at,
            start_time: eventData.start_time || eventData.starts_at,
            visibility: eventData.visibility !== undefined ? eventData.visibility : 0,
            auto_expire_participants: eventData.auto_expire_participants !== undefined ? 
                String(eventData.auto_expire_participants) : "1"
        };

        // Handle organizers (convert objects to token IDs)
        if (eventData.organizers && Array.isArray(eventData.organizers)) {
            payload.organizer_tokens = eventData.organizers.map((/** @type {any} */ org) => String(org.id));
        } else if (eventData.organizer_tokens) {
            payload.organizer_tokens = eventData.organizer_tokens;
        }

        // Handle routes (convert objects to IDs)
        if (eventData.routes && Array.isArray(eventData.routes)) {
            payload.route_ids = eventData.routes.map((/** @type {any} */ route) => String(route.id));
        } else if (eventData.route_ids) {
            payload.route_ids = eventData.route_ids;
        } else if (eventData.route_id) {
            payload.route_ids = [String(eventData.route_id)];
        }

        return payload;
    }

    /**
     * Build request options for editEvent (PUT request)
     * 
     * @param {string} sessionCookie - Session cookie value
     * @param {any} payload - Event data payload
     * @returns {{method: string, headers: Record<string, string>, payload: string, muteHttpExceptions: boolean}} Request options
     */
    static buildEditEventOptions(sessionCookie, payload) {
        return {
            method: 'PUT',
            headers: {
                'Accept': 'application/json',
                'Cookie': sessionCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Content-Type': 'application/json'
            },
            payload: JSON.stringify(payload),
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
