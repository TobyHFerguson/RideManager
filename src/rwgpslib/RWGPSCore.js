/**
 * RWGPSCore.js
 * 
 * Pure JavaScript business logic for RWGPS API operations
 * NO Google Apps Script dependencies - fully testable in Jest
 * 
 * This module contains:
 * - URL parsing and validation
 * - Date/time formatting
 * - Domain ↔ API format transformations
 * - Payload construction
 * - Validation
 * - Error message building
 * 
 * All HTTP calls are delegated to RWGPSAdapter.
 * 
 * @module RWGPSCore
 */

// @ts-check

/**
 * RWGPSCore - Pure JavaScript business logic
 * Uses class pattern with static methods per copilot-instructions Rule 4.5
 * Wrapped in IIFE for GAS compatibility (avoids duplicate class declarations)
 */
var RWGPSCore = (function() {

class RWGPSCore {
    // =============================================
    // URL Parsing & Validation
    // =============================================
    
    /**
     * Parse event URL and extract event ID
     * 
     * @param {string} eventUrl - Full URL like "https://ridewithgps.com/events/12345"
     * @returns {{eventId: string, fullUrl: string}} Parsed URL with event ID
     * @throws {Error} If URL is invalid or doesn't contain event ID
     */
    static parseEventUrl(eventUrl) {
        if (!eventUrl || typeof eventUrl !== 'string') {
            throw new Error('Invalid event URL: must be a non-empty string');
        }

        const eventId = RWGPSCore.extractEventId(eventUrl);
        if (!eventId) {
            throw new Error(`Invalid event URL: could not extract event ID from ${eventUrl}`);
        }

        return {
            eventId: eventId,
            fullUrl: eventUrl
        };
    }

    /**
     * Parse route URL and extract route ID
     * 
     * @param {string} routeUrl - Full URL like "https://ridewithgps.com/routes/12345"
     * @returns {{routeId: string, fullUrl: string}} Parsed URL with route ID
     * @throws {Error} If URL is invalid or doesn't contain route ID
     */
    static parseRouteUrl(routeUrl) {
        if (!routeUrl || typeof routeUrl !== 'string') {
            throw new Error('Invalid route URL: must be a non-empty string');
        }

        const routeId = RWGPSCore.extractRouteId(routeUrl);
        if (!routeId) {
            throw new Error(`Invalid route URL: could not extract route ID from ${routeUrl}`);
        }

        return {
            routeId: routeId,
            fullUrl: routeUrl
        };
    }

    /**
     * Check if URL is a valid RWGPS event URL
     * 
     * @param {string | null} url - URL to check
     * @returns {boolean} True if valid event URL
     */
    static isValidEventUrl(url) {
        return RWGPSCore.extractEventId(url) !== null;
    }

    /**
     * Check if URL is a valid RWGPS route URL
     * 
     * @param {string | null} url - URL to check
     * @returns {boolean} True if valid route URL
     */
    static isValidRouteUrl(url) {
        return RWGPSCore.extractRouteId(url) !== null;
    }

    /**
     * Extract event ID from URL
     * 
     * @param {string | null} url - URL that might contain event ID
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
     * Extract route ID from URL
     * 
     * @param {string | null} url - URL that might contain route ID
     * @returns {string | null} Route ID or null if not found
     */
    static extractRouteId(url) {
        if (!url) {
            return null;
        }

        // Match /routes/12345 pattern
        const match = url.match(/\/routes\/(\d+)/);
        return match ? match[1] : null;
    }

    // =============================================
    // Date/Time Formatting
    // =============================================

    /**
     * Format date for v1 API (YYYY-MM-DD)
     * 
     * @param {Date | string} date - Date object or ISO string
     * @returns {string} Formatted date string
     */
    static formatDateForV1Api(date) {
        const d = date instanceof Date ? date : new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Format time for v1 API (HH:MM)
     * 
     * @param {Date | string} date - Date object or ISO string
     * @returns {string} Formatted time string
     */
    static formatTimeForV1Api(date) {
        const d = date instanceof Date ? date : new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    /**
     * Parse v1 API date/time fields into Date object
     * 
     * @param {string} date - Date string (YYYY-MM-DD)
     * @param {string} time - Time string (HH:MM)
     * @param {string} [timezone] - Timezone (currently unused, defaults to local)
     * @returns {Date} Combined Date object
     */
    static parseV1DateTime(date, time, timezone) {
        // Combine into ISO-like string and let Date parse it
        const combined = `${date}T${time}:00`;
        return new Date(combined);
    }

    // =============================================
    // Domain ↔ API Format Transformations
    // =============================================

    /**
     * Transform SCCCCEvent domain object to v1 API payload
     * 
     * Handles:
     * - desc → description
     * - organizer_tokens → organizer_ids
     * - visibility: 0 → 'public', 1 → 'private', 2 → 'friends_only'
     * - Date objects → formatted strings
     * 
     * @param {{name: string, desc?: string, start_date: Date | string, start_time: Date | string, end_date?: Date | string, end_time?: Date | string, location?: string, visibility?: number | string, organizer_tokens?: string[], route_ids?: string[]}} event - Domain event object
     * @returns {{event: Record<string, any>}} v1 API payload wrapped in "event" key
     */
    static toV1Payload(event) {
        /** @type {Record<string, any>} */
        const payload = {
            all_day: '0'
        };

        // Required fields
        if (event.name !== undefined) {
            payload.name = event.name;
        }

        // Description: domain uses 'desc', v1 API uses 'description'
        if (event.desc !== undefined) {
            payload.description = event.desc;
        }

        // Date/time: convert Date objects to v1 format strings
        if (event.start_date !== undefined) {
            payload.start_date = RWGPSCore.formatDateForV1Api(event.start_date);
        }
        if (event.start_time !== undefined) {
            payload.start_time = RWGPSCore.formatTimeForV1Api(event.start_time);
        }
        if (event.end_date !== undefined) {
            payload.end_date = RWGPSCore.formatDateForV1Api(event.end_date);
        }
        if (event.end_time !== undefined) {
            payload.end_time = RWGPSCore.formatTimeForV1Api(event.end_time);
        }

        // Optional fields
        if (event.location !== undefined) {
            payload.location = event.location;
        }

        // Visibility: convert legacy numeric to v1 API string values
        if (event.visibility !== undefined) {
            payload.visibility = RWGPSCore._convertVisibilityToV1(event.visibility);
        }

        // Organizers: domain uses 'organizer_tokens', v1 API uses 'organizer_ids'
        if (event.organizer_tokens !== undefined) {
            payload.organizer_ids = event.organizer_tokens.map(String);
        }

        // Routes
        if (event.route_ids !== undefined) {
            payload.route_ids = event.route_ids.map(String);
        }

        return { event: payload };
    }

    /**
     * Transform SCCCCEvent domain object to web API payload
     * 
     * Web API uses different field names than v1 API:
     * - Keeps 'desc' (not 'description')
     * - Keeps 'organizer_tokens' (not 'organizer_ids')
     * 
     * @param {{name: string, desc?: string, start_date: Date | string, start_time: Date | string, location?: string, visibility?: number, organizer_tokens?: string[], route_ids?: string[]}} event - Domain event object
     * @returns {Record<string, any>} Web API payload (flat, not wrapped)
     */
    static toWebPayload(event) {
        /** @type {Record<string, any>} */
        const payload = {
            all_day: '0'
        };

        if (event.name !== undefined) {
            payload.name = event.name;
        }

        // Web API uses 'desc', not 'description'
        if (event.desc !== undefined) {
            payload.desc = event.desc;
        }

        // Date/time as strings
        if (event.start_date !== undefined) {
            payload.start_date = RWGPSCore.formatDateForV1Api(event.start_date);
        }
        if (event.start_time !== undefined) {
            payload.start_time = RWGPSCore.formatTimeForV1Api(event.start_time);
        }

        if (event.location !== undefined) {
            payload.location = event.location;
        }

        if (event.visibility !== undefined) {
            payload.visibility = event.visibility;
        }

        // Web API uses 'organizer_tokens', not 'organizer_ids'
        if (event.organizer_tokens !== undefined) {
            payload.organizer_tokens = event.organizer_tokens;
        }

        if (event.route_ids !== undefined) {
            payload.route_ids = event.route_ids;
        }

        return payload;
    }

    /**
     * Transform v1 API response to normalized internal format
     * 
     * @param {any} response - v1 API response object
     * @returns {{id: number, name: string, desc?: string, starts_at?: string, ends_at?: string, visibility?: number, all_day?: boolean, organizer_ids?: number[], routes?: Array<{id: number}>} | null} Normalized event or null
     */
    static fromV1Response(response) {
        if (!response) {
            return null;
        }

        /** @type {any} */
        const normalized = {
            id: response.id,
            name: response.name,
            all_day: response.all_day || false,
            visibility: response.visibility || 0
        };

        // description → desc (normalize to domain naming)
        if (response.description !== undefined) {
            normalized.desc = response.description;
        } else if (response.desc !== undefined) {
            normalized.desc = response.desc;
        }

        // Combine separate date/time to starts_at
        if (response.start_date && response.start_time) {
            normalized.starts_at = `${response.start_date}T${response.start_time}:00`;
        } else if (response.starts_at) {
            normalized.starts_at = response.starts_at;
        }

        // Combine end date/time
        if (response.end_date && response.end_time) {
            normalized.ends_at = `${response.end_date}T${response.end_time}:00`;
        } else if (response.ends_at) {
            normalized.ends_at = response.ends_at;
        }

        // Extract organizer IDs from organizers array
        if (response.organizers && Array.isArray(response.organizers)) {
            normalized.organizer_ids = response.organizers.map((/** @type {{id: number}} */ o) => o.id);
        }

        // Copy routes as-is
        if (response.routes) {
            normalized.routes = response.routes;
        }

        return normalized;
    }

    /**
     * Transform web API response to normalized internal format
     * 
     * @param {any} response - Web API response object
     * @returns {{id: number, name: string, desc?: string, starts_at?: string, organizer_ids?: number[], routes?: Array<{id: number}>} | null} Normalized event or null
     */
    static fromWebResponse(response) {
        if (!response) {
            return null;
        }

        /** @type {any} */
        const normalized = {
            id: response.id,
            name: response.name,
            desc: response.desc,
            starts_at: response.starts_at,
            ends_at: response.ends_at,
            all_day: response.all_day || false,
            visibility: response.visibility || 0
        };

        // Extract organizer IDs from organizers array
        if (response.organizers && Array.isArray(response.organizers)) {
            normalized.organizer_ids = response.organizers.map((/** @type {{id: number}} */ o) => o.id);
        }

        if (response.routes) {
            normalized.routes = response.routes;
        }

        return normalized;
    }

    // =============================================
    // Payload Construction
    // =============================================

    /**
     * Build HTTP request options for fetch
     * 
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {any} [payload] - Optional request body (will be JSON stringified)
     * @param {Record<string, string>} [headers] - Optional additional headers
     * @returns {{method: string, headers: Record<string, string>, payload?: string, muteHttpExceptions: boolean}} Request options
     */
    static buildRequestOptions(method, payload, headers) {
        /** @type {{method: string, headers: Record<string, string>, payload?: string, muteHttpExceptions: boolean}} */
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
        /* istanbul ignore else - GAS runtime uses Utilities.base64Encode */
        if (typeof Buffer !== 'undefined') {
            return 'Basic ' + Buffer.from(credentials).toString('base64');
        }
        
        // In GAS, use Utilities.base64Encode
        /* istanbul ignore next - GAS-only code path */
        return 'Basic ' + Utilities.base64Encode(credentials);
    }

    /**
     * Build payload for creating event via v1 API
     * 
     * @param {any} eventData - Event data object
     * @returns {{event: Record<string, any>}} Payload wrapped in "event" key
     */
    static buildCreateEventPayload(eventData) {
        return RWGPSCore._buildV1EventPayload(eventData);
    }

    /**
     * Build payload for editing event via v1 API
     * 
     * @param {any} eventData - Event data object
     * @returns {{event: Record<string, any>}} Payload wrapped in "event" key
     */
    static buildEditEventPayload(eventData) {
        return RWGPSCore._buildV1EventPayload(eventData);
    }

    /**
     * Internal: Build v1 API event payload
     * 
     * Handles both domain-style fields (description, organizer_ids) 
     * AND SCCCCEvent-style fields (desc, organizer_tokens, startDateTime)
     * 
     * @param {any} eventData - Event data
     * @returns {{event: Record<string, any>}} Payload wrapped in "event" key
     * @private
     */
    static _buildV1EventPayload(eventData) {
        /** @type {Record<string, any>} */
        const event = {};

        // Copy string fields
        if (eventData.name !== undefined) event.name = eventData.name;
        
        // Description: handle both "description" and SCCCCEvent-style "desc"
        if (eventData.description !== undefined) {
            event.description = eventData.description;
        } else if (eventData.desc !== undefined) {
            event.description = eventData.desc;
        }
        
        // Location
        if (eventData.location !== undefined) event.location = eventData.location;
        if (eventData.time_zone !== undefined) event.time_zone = eventData.time_zone;
        
        // Date/time: handle both explicit strings AND SCCCCEvent-style startDateTime
        if (eventData.start_date !== undefined) {
            event.start_date = eventData.start_date;
        } else if (eventData.startDateTime !== undefined) {
            event.start_date = RWGPSCore.formatDateForV1Api(eventData.startDateTime);
        }
        
        if (eventData.start_time !== undefined) {
            event.start_time = eventData.start_time;
        } else if (eventData.startDateTime !== undefined) {
            event.start_time = RWGPSCore.formatTimeForV1Api(eventData.startDateTime);
        }
        
        if (eventData.end_date !== undefined) event.end_date = eventData.end_date;
        if (eventData.end_time !== undefined) event.end_time = eventData.end_time;
        
        // all_day: use provided value or default to '0'
        if (eventData.all_day !== undefined) {
            event.all_day = String(eventData.all_day);
        } else {
            event.all_day = '0';
        }

        // Convert visibility
        if (eventData.visibility !== undefined) {
            event.visibility = RWGPSCore._convertVisibilityToV1(eventData.visibility);
        }

        // Handle organizer_ids: support both "organizer_ids" AND SCCCCEvent-style "organizer_tokens"
        if (eventData.organizer_ids && Array.isArray(eventData.organizer_ids)) {
            event.organizer_ids = eventData.organizer_ids.map((/** @type {string | number} */ id) => String(id));
        } else if (eventData.organizer_tokens && Array.isArray(eventData.organizer_tokens)) {
            event.organizer_ids = eventData.organizer_tokens.map((/** @type {string | number} */ id) => String(id));
        }

        // Handle route_ids (convert to strings)
        if (eventData.route_ids && Array.isArray(eventData.route_ids)) {
            event.route_ids = eventData.route_ids.map((/** @type {string | number} */ id) => String(id));
        }

        return { event };
    }

    /**
     * Convert visibility value to v1 API string format
     * 
     * @param {number | string} visibility - Visibility value (0, 1, 2 or 'public', 'private', 'friends_only')
     * @returns {string} v1 API visibility string
     * @private
     */
    static _convertVisibilityToV1(visibility) {
        if (visibility === 0 || visibility === '0' || visibility === 'public') {
            return 'public';
        } else if (visibility === 1 || visibility === '1' || visibility === 'private') {
            return 'private';
        } else if (visibility === 2 || visibility === '2' || visibility === 'friends_only') {
            return 'friends_only';
        }
        return String(visibility);
    }

    // =============================================
    // Validation
    // =============================================

    /**
     * Validate event payload before API call
     * 
     * @param {any} payload - Event payload to validate
     * @returns {{valid: boolean, errors: string[]}} Validation result
     */
    static validateEventPayload(payload) {
        /** @type {string[]} */
        const errors = [];

        if (!payload) {
            errors.push('Event data is required');
            return { valid: false, errors };
        }

        // Required: name
        if (!payload.name || typeof payload.name !== 'string' || payload.name.trim() === '') {
            errors.push('Event name is required');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate route payload before API call
     * 
     * @param {any} payload - Route payload to validate
     * @returns {{valid: boolean, errors: string[]}} Validation result
     */
    static validateRoutePayload(payload) {
        /** @type {string[]} */
        const errors = [];

        if (!payload) {
            errors.push('Route data is required');
            return { valid: false, errors };
        }

        if (!payload.url) {
            errors.push('Route URL is required');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // =============================================
    // Error Building
    // =============================================

    /**
     * Build error message from HTTP response
     * 
     * @param {any} response - HTTP response object (GAS or mock)
     * @param {string} context - Operation context for error message
     * @returns {string} Human-readable error message
     */
    static buildErrorMessage(response, context) {
        const code = response.getResponseCode ? response.getResponseCode() : 'unknown';
        let message = `${context} failed with status ${code}`;

        // Try to extract error details from response body
        if (response.getContentText) {
            try {
                const body = response.getContentText();
                const json = JSON.parse(body);
                if (json.error) {
                    message += `: ${json.error}`;
                } else if (json.message) {
                    message += `: ${json.message}`;
                }
            } catch (e) {
                // Response body is not JSON, ignore
            }
        }

        return message;
    }

    // =============================================
    // Organizer Matching
    // =============================================

    /**
     * Find matching organizer from API results by name
     * 
     * @param {Array<{id: number, text: string}> | null} results - API results array
     * @param {string} organizerName - Full name to match
     * @returns {{id: number, text: string} | null} Matching organizer or null
     */
    static findMatchingOrganizer(results, organizerName) {
        if (!results || !Array.isArray(results) || results.length === 0) {
            return null;
        }

        // Normalize: lowercase and remove spaces
        const normalizedName = organizerName.toLowerCase().split(' ').join('');
        
        const match = results.find((/** @type {{id: number, text: string}} */ result) => {
            const resultNormalized = result.text.toLowerCase().split(' ').join('');
            return resultNormalized === normalizedName;
        });

        return match || null;
    }

    // =============================================
    // Response Handling
    // =============================================

    /**
     * Check if HTTP response indicates success (2xx or 3xx)
     * 
     * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response - HTTP response
     * @returns {boolean} True if success status code
     */
    static isSuccessResponse(response) {
        const code = response.getResponseCode();
        return code >= 200 && code < 400;
    }

    /**
     * Build standardized error result from HTTP response
     * 
     * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response - HTTP response
     * @param {string} operation - Operation name for error message
     * @returns {{success: false, error: string}} Error result object
     */
    static buildErrorResult(response, operation) {
        const errorMsg = RWGPSCore.buildErrorMessage(response, operation);
        return { success: false, error: errorMsg };
    }

    // =============================================
    // Tag Operations
    // =============================================

    /**
     * Build expiry tag from ride date
     * Format: EXP:YYYY-MM-DD (date + expiryDays)
     * 
     * @param {Date | string} rideDate - Ride date
     * @param {number} expiryDays - Days after ride date to expire
     * @returns {string} Expiry tag (e.g., "EXP:2025-02-15")
     */
    static buildExpiryTag(rideDate, expiryDays) {
        const date = rideDate instanceof Date ? rideDate : new Date(rideDate);
        const expiryDate = new Date(date.getTime() + expiryDays * 24 * 60 * 60 * 1000);
        
        const year = expiryDate.getFullYear();
        const month = String(expiryDate.getMonth() + 1).padStart(2, '0');
        const day = String(expiryDate.getDate()).padStart(2, '0');
        
        return `EXP:${year}-${month}-${day}`;
    }

    /**
     * Build legacy format expiry tag
     * Format: "expires: MM/DD/YYYY" (for backward compatibility)
     * 
     * @param {Date | string} expiryDate - Expiration date
     * @returns {string} Legacy expiry tag (e.g., "expires: 02/15/2025")
     */
    static buildLegacyExpiryTag(expiryDate) {
        const date = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
        
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        
        return `expires: ${month}/${day}/${year}`;
    }

    /**
     * Parse legacy format expiry tag
     * Format: "expires: MM/DD/YYYY"
     * 
     * @param {string} tag - Legacy expiry tag
     * @returns {Date | null} Parsed date or null if invalid
     */
    static parseLegacyExpiryTag(tag) {
        if (!tag || !tag.startsWith('expires: ')) {
            return null;
        }
        
        const dateStr = tag.substring('expires: '.length);
        const parts = dateStr.split('/');
        
        if (parts.length !== 3) {
            return null;
        }
        
        const month = parseInt(parts[0], 10) - 1; // 0-indexed
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        if (isNaN(month) || isNaN(day) || isNaN(year)) {
            return null;
        }
        
        return new Date(year, month, day);
    }

    /**
     * Build batch tag update payload for RWGPS API
     * 
     * @param {string[]} itemIds - Event or route IDs to tag
     * @param {'add' | 'remove'} action - Tag action
     * @param {string[]} tags - Tags to add/remove
     * @returns {Record<string, string>} Form data payload
     */
    static buildBatchTagPayload(itemIds, action, tags) {
        /** @type {Record<string, string>} */
        const payload = {};
        
        // Add item IDs: item_ids[]=123&item_ids[]=456
        itemIds.forEach((id, index) => {
            payload[`item_ids[${index}]`] = String(id);
        });
        
        // Add action: tag_action=add or tag_action=remove
        payload['tag_action'] = action;
        
        // Add tags: tags[]=GroupA&tags[]=EXP:2025-02-15
        tags.forEach((tag, index) => {
            payload[`tags[${index}]`] = tag;
        });
        
        return payload;
    }

    // =============================================
    // Multipart Form Building
    // =============================================

    /**
     * Generate random boundary string for multipart forms
     * 
     * @returns {string} Boundary string
     */
    static generateBoundary() {
        return '----RWGPSFormBoundary' + Math.random().toString(36).substring(2);
    }

    /**
     * Build multipart payload for creating event with logo
     * 
     * @param {Record<string, any>} eventData - Event data
     * @param {GoogleAppsScript.Base.Blob} logoBlob - Logo blob
     * @param {string} boundary - Multipart boundary
     * @returns {string} Multipart form payload
     */
    static buildMultipartCreatePayload(eventData, logoBlob, boundary) {
        /** @type {string[]} */
        const parts = [];
        
        // Add event data fields
        const eventPayload = RWGPSCore.buildCreateEventPayload(eventData);
        for (const [key, value] of Object.entries(eventPayload)) {
            if (typeof value === 'object') {
                // Nested objects like event[organizers_attributes]
                for (const [subKey, subValue] of Object.entries(value)) {
                    if (Array.isArray(subValue)) {
                        subValue.forEach((item, index) => {
                            for (const [itemKey, itemValue] of Object.entries(item)) {
                                parts.push(`--${boundary}`);
                                parts.push(`Content-Disposition: form-data; name="${key}[${subKey}][${index}][${itemKey}]"`);
                                parts.push('');
                                parts.push(String(itemValue));
                            }
                        });
                    } else {
                        parts.push(`--${boundary}`);
                        parts.push(`Content-Disposition: form-data; name="${key}[${subKey}]"`);
                        parts.push('');
                        parts.push(String(subValue));
                    }
                }
            } else {
                parts.push(`--${boundary}`);
                parts.push(`Content-Disposition: form-data; name="${key}"`);
                parts.push('');
                parts.push(String(value));
            }
        }
        
        // Add logo file part
        parts.push(`--${boundary}`);
        parts.push(`Content-Disposition: form-data; name="event[image_file]"; filename="${logoBlob.getName()}"`);
        parts.push(`Content-Type: ${logoBlob.getContentType()}`);
        parts.push('');
        // Note: In actual use, this would need binary handling
        // For now, returning text representation
        parts.push('[BINARY_LOGO_DATA]');
        
        parts.push(`--${boundary}--`);
        
        return parts.join('\r\n');
    }

    /**
     * Build multipart payload for updating event logo
     * 
     * @param {string} eventId - Event ID
     * @param {GoogleAppsScript.Base.Blob} logoBlob - Logo blob
     * @param {string} boundary - Multipart boundary
     * @returns {string} Multipart form payload
     */
    static buildMultipartLogoPayload(eventId, logoBlob, boundary) {
        /** @type {string[]} */
        const parts = [];
        
        // Add logo file part only
        parts.push(`--${boundary}`);
        parts.push(`Content-Disposition: form-data; name="event[image_file]"; filename="${logoBlob.getName()}"`);
        parts.push(`Content-Type: ${logoBlob.getContentType()}`);
        parts.push('');
        // Note: In actual use, this would need binary handling
        parts.push('[BINARY_LOGO_DATA]');
        
        parts.push(`--${boundary}--`);
        
        return parts.join('\r\n');
    }
}

return RWGPSCore;
})();

/* istanbul ignore if - Node.js/Jest export */
if (typeof module !== 'undefined') {
    module.exports = RWGPSCore;
}
