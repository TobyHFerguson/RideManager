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
     * @param {unknown} eventData - Event data object to validate (unknown input to be checked)
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
     * Build request options for editEvent (PUT request)
     * 
     * @param {string} sessionCookie - Session cookie value
     * @param {import('./RWGPSEvent').RWGPSEventPayload} payload - Event data payload
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

    /**
     * Build payload for v1 API editEvent PUT request
     * Uses native v1 API format (description, start_date, start_time, organizer_ids, route_ids)
     * 
     * Adds API-only defaults for fields not in domain SCCCCEvent:
     * - visibility: 'public' (default)
     * - all_day: passed as parameter (boolean per OpenAPI spec)
     * 
     * @param {import('./RWGPSEvent').RWGPSEventInput} eventData - Event data in v1 format
     * @param {boolean} allDay - All-day event flag (boolean per OpenAPI spec)
     * @returns {import('./RWGPSEvent').RWGPSEventPayload} Payload wrapped in "event" key
     */
    static buildV1EditEventPayload(eventData, allDay) {
        /** @type {Record<string, any>} */
        const event = {
            all_day: Boolean(allDay)  // OpenAPI spec: boolean (not string "0"/"1")
        };

        // Copy v1 fields directly
        if (eventData.name !== undefined) event.name = eventData.name;
        if (eventData.description !== undefined) event.description = eventData.description;
        if (eventData.start_date !== undefined) event.start_date = eventData.start_date;
        if (eventData.start_time !== undefined) event.start_time = eventData.start_time;
        if (eventData.location !== undefined) event.location = eventData.location;
        if (eventData.time_zone !== undefined) event.time_zone = eventData.time_zone;
        
        // Convert visibility: legacy numeric values → API string values
        // Default to 'public' if not provided (Task 7.8: visibility not in domain)
        if (eventData.visibility !== undefined) {
            const vis = eventData.visibility;
            // Accept both string ('public') and legacy numeric (0) formats
            if (vis === 0 || vis === '0' || vis === 'public') {
                event.visibility = 'public';
            } else if (vis === 1 || vis === '1' || vis === 'private') {
                event.visibility = 'private';
            } else if (vis === 2 || vis === '2' || vis === 'friends_only') {
                event.visibility = 'friends_only';
            } else {
                event.visibility = String(vis); // Pass through unknown values
            }
        } else {
            // Default visibility for domain SCCCCEvent without visibility field
            event.visibility = 'public';
        }

        // Handle organizer_ids - keep as numbers (OpenAPI spec compliance)
        if (eventData.organizer_ids && Array.isArray(eventData.organizer_ids)) {
            event.organizer_ids = eventData.organizer_ids;
        }

        // Handle route_ids - keep as numbers (OpenAPI spec compliance)
        if (eventData.route_ids && Array.isArray(eventData.route_ids)) {
            event.route_ids = eventData.route_ids;
        }

        return { event };
    }

    /**
     * Build request options for v1 API editEvent (PUT request with Basic Auth)
     * 
     * @param {string} basicAuthHeader - Basic Auth header value (from buildBasicAuthHeader)
     * @param {import('./RWGPSEvent').RWGPSEventPayload} payload - Event data payload wrapped in "event" key
     * @returns {{method: string, headers: Record<string, string>, payload: string, muteHttpExceptions: boolean}} Request options
     */
    static buildV1EditEventOptions(basicAuthHeader, payload) {
        return {
            method: 'PUT',
            headers: {
                'Authorization': basicAuthHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        };
    }

    /**
     * Build request options for v1 API createEvent (POST request with Basic Auth)
     * 
     * @param {string} basicAuthHeader - Basic Auth header value (from buildBasicAuthHeader)
     * @param {import('./RWGPSEvent').RWGPSEventPayload} payload - Event data payload wrapped in "event" key
     * @returns {{method: string, headers: Record<string, string>, payload: string, muteHttpExceptions: boolean}} Request options
     */
    static buildV1CreateEventOptions(basicAuthHeader, payload) {
        return {
            method: 'POST',
            headers: {
                'Authorization': basicAuthHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        };
    }

    /**
     * Build multipart/form-data text parts for event creation with logo (pure JS, no Blob operations)
     * 
     * This method builds the text structure for multipart payload without using GAS Utilities.
     * The Adapter layer (RWGPSClient.js) handles Blob creation and byte concatenation.
     * 
     * @param {import('./RWGPSEvent').RWGPSEventInput} eventData - Event data with name, description, start_date, etc.
     * @param {any} logoBlob - Logo object with getContentType() and getName() methods
     * @param {string} boundary - Multipart boundary string
     * @returns {{textPart: string, endBoundary: string}} Text parts structure for multipart payload
     */
    static buildMultipartTextParts(eventData, logoBlob, boundary) {
        // Build v1 event payload structure (nested under 'event' key)
        const v1Payload = RWGPSClientCore.buildV1EditEventPayload(eventData, false);
        
        /** @type {string[]} */
        const parts = [];
        
        // Add each event field as a form field
        for (const key in v1Payload.event) {
            const value = v1Payload.event[key];
            
            // Handle array fields (organizer_ids, route_ids)
            if (Array.isArray(value)) {
                value.forEach(item => {
                    parts.push(
                        `--${boundary}\r\n` +
                        `Content-Disposition: form-data; name="event[${key}][]"\r\n\r\n` +
                        `${item}\r\n`
                    );
                });
            } else {
                parts.push(
                    `--${boundary}\r\n` +
                    `Content-Disposition: form-data; name="event[${key}]"\r\n\r\n` +
                    `${value}\r\n`
                );
            }
        }
        
        // Get file extension from content type
        const contentType = logoBlob.getContentType();
        let extension = 'jpg'; // Default
        if (contentType.includes('png')) extension = 'png';
        else if (contentType.includes('gif')) extension = 'gif';
        else if (contentType.includes('webp')) extension = 'webp';
        else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg';
        
        // Add logo file header
        parts.push(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="event[logo]"; filename="logo.${extension}"\r\n` +
            `Content-Type: ${contentType}\r\n\r\n`
        );
        
        // Return text parts structure (no Blob operations)
        return {
            textPart: parts.join(''),
            endBoundary: `\r\n--${boundary}--\r\n`
        };
    }

    // NOTE: buildOrganizerLookupOptions and findMatchingOrganizer were removed in Task 5.3.5
    // Organizer lookup is now done via RWGPSMembersAdapter.lookupUserIdByName() using cached members sheet

    /**
     * Build request options for batch tag update (POST request)
     * 
     * @param {string} sessionCookie - Session cookie value
     * @param {string | string[]} eventIds - Event ID(s) to update
     * @param {'add' | 'remove'} tagAction - Action to perform
     * @param {string | string[]} tagNames - Tag name(s) to add/remove
     * @returns {{method: string, headers: Record<string, string>, payload: Record<string, string>, muteHttpExceptions: boolean}} Request options
     */
    static buildBatchTagOptions(sessionCookie, eventIds, tagAction, tagNames) {
        // Convert arrays to comma-separated strings if needed
        const idsString = Array.isArray(eventIds) ? eventIds.join(',') : eventIds;
        const tagsString = Array.isArray(tagNames) ? tagNames.join(',') : tagNames;

        return {
            method: 'POST',
            headers: {
                'Cookie': sessionCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            payload: {
                tag_action: tagAction,
                tag_names: tagsString,
                event_ids: idsString
            },
            muteHttpExceptions: true
        };
    }

    /**
     * Extract route ID from URL
     * 
     * @param {string} url - Route URL
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

    /**
     * Build route copy options
     * 
     * @param {string} sessionCookie - Session cookie
     * @param {string} routeUrl - Source route URL
     * @param {{name?: string, expiry?: string, tags?: string[], userId: number}} routeData - Route copy parameters
     * @returns {{method: string, headers: Record<string, string>, payload: string, muteHttpExceptions: boolean}} Request options
     */
    static buildRouteCopyOptions(sessionCookie, routeUrl, routeData) {
        const payload = {
            user_id: routeData.userId,
            asset_type: 'route',
            privacy_code: null,
            include_photos: false,
            url: routeUrl
        };

        // Add optional fields
        if (routeData.name) {
            payload.name = routeData.name;
        }
        if (routeData.expiry) {
            payload.expiry = routeData.expiry;
        }
        if (routeData.tags) {
            payload.tags = routeData.tags;
        }

        return {
            method: 'POST',
            headers: {
                'Cookie': sessionCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            payload: JSON.stringify(payload),
            contentType: 'application/json',
            muteHttpExceptions: true
        };
    }

    /**
     * Build route tag options for batch update
     * 
     * @param {string} sessionCookie - Session cookie
     * @param {string} routeId - Route ID
     * @param {string[]} tags - Tags to add
     * @returns {{method: string, headers: Record<string, string>, payload: any, muteHttpExceptions: boolean}} Request options
     */
    static buildRouteTagOptions(sessionCookie, routeId, tags) {
        const tagsString = tags.join(',');

        return {
            method: 'POST',
            headers: {
                'Cookie': sessionCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            payload: {
                tag_action: 'add',
                tag_names: tagsString,
                route_ids: routeId
            },
            muteHttpExceptions: true
        };
    }

    /**
     * Format a Date object for v1 API
     * Converts Date to {start_date: 'YYYY-MM-DD', start_time: 'HH:MM'} format
     * 
     * @param {Date} date - Date to format
     * @returns {{start_date: string, start_time: string}} Formatted date parts
     */
    static formatDateForV1Api(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return {
            start_date: `${year}-${month}-${day}`,
            start_time: `${hours}:${minutes}`
        };
    }

    /**
     * Build expiration tag for a route
     * Format: "expires: MM/DD/YYYY"
     * 
     * @param {Date} date - Expiration date
     * @returns {string} Tag string
     */
    static buildExpirationTag(date) {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();
        
        return `expires: ${month}/${day}/${year}`;
    }

    /**
     * Parse expiration tag to extract date parts
     * 
     * @param {string | null} tag - Tag string like "expires: MM/DD/YYYY"
     * @returns {{month: number, day: number, year: number} | null} Parsed date parts or null if invalid
     */
    static parseExpirationTag(tag) {
        if (!tag || typeof tag !== 'string') {
            return null;
        }
        
        const match = tag.match(/^expires:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (!match) {
            return null;
        }
        
        return {
            month: parseInt(match[1], 10),
            day: parseInt(match[2], 10),
            year: parseInt(match[3], 10)
        };
    }

    /**
     * Check if new expiration date is newer (later) than existing tag date
     * 
     * @param {string} existingTag - Existing expiration tag like "expires: MM/DD/YYYY"
     * @param {Date} newDate - New expiration date to compare
     * @returns {boolean} True if newDate is after existing tag date
     */
    static isExpirationTagNewer(existingTag, newDate) {
        const parsed = RWGPSClientCore.parseExpirationTag(existingTag);
        if (!parsed) {
            return true; // No valid existing tag, treat as newer
        }
        
        // Create date from parsed values (month is 0-indexed in JS Date)
        const existingDate = new Date(parsed.year, parsed.month - 1, parsed.day);
        
        // Compare dates (strip time component from newDate)
        const newDateOnly = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
        
        return newDateOnly.getTime() > existingDate.getTime();
    }

    /**
     * Build URL for club members v1 API endpoint
     * 
     * @param {number} [page=1] - Page number (1-based, minimum 1)
     * @param {number} [pageSize=200] - Page size (20-200, default 200 for efficiency)
     * @returns {string} Full URL for members endpoint
     */
    static buildClubMembersUrl(page = 1, pageSize = 200) {
        // Enforce minimum page of 1
        const validPage = Math.max(1, page || 1);
        
        // Enforce pageSize bounds: min 20, max 200
        let validPageSize = pageSize || 200;
        validPageSize = Math.max(20, validPageSize);
        validPageSize = Math.min(200, validPageSize);
        
        return `https://ridewithgps.com/api/v1/members.json?page=${validPage}&page_size=${validPageSize}`;
    }

    /**
     * Check if pagination indicates more pages are available
     * 
     * @param {{next_page_url?: string | null, record_count?: number, page_count?: number, page_size?: number} | null | undefined} pagination - Pagination metadata from API response
     * @returns {boolean} True if more pages are available
     */
    static hasMorePages(pagination) {
        if (!pagination) {
            return false;
        }
        
        return !!pagination.next_page_url;
    }
}

return RWGPSClientCore;
})();

/* istanbul ignore if - Node.js/Jest export */
if (typeof module !== 'undefined') {
    module.exports = RWGPSClientCore;
}

