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
     * Transform v1 API event response to web API format
     * 
     * Converts separate start_date and start_time fields to combined starts_at timestamp
     * 
     * @param {{id: number, name: string, start_date: string, start_time: string, time_zone: string, all_day: boolean}} v1Event - v1 API event response
     * @returns {{id: number, name: string, starts_at: string, all_day: boolean}} Web API format event
     */
    static transformV1EventToWebFormat(v1Event) {
        if (!v1Event) {
            return null;
        }

        // Build ISO 8601 timestamp from separate date/time fields
        let startsAt = null;
        
        if (v1Event.start_date && v1Event.start_time) {
            // Parse "YYYY-MM-DD" and "HH:MM" into ISO 8601 with timezone offset
            const dateStr = v1Event.start_date; // e.g., "2030-03-01"
            const timeStr = v1Event.start_time; // e.g., "11:00"
            const tzStr = v1Event.time_zone || 'America/Los_Angeles'; // e.g., "America/Los_Angeles"
            
            // Combine into ISO 8601 format with timezone
            // Note: v1 API uses separate fields, we need to convert back to starts_at format
            // Format: "YYYY-MM-DDTHH:MM:SS±HH:MM"
            const combinedStr = `${dateStr}T${timeStr}:00`;
            
            // Create date object
            const dateObj = new Date(combinedStr);
            
            // Format as ISO string and add timezone offset
            // v1 API responses include timezone in the response like "America/Los_Angeles"
            // For compatibility, we'll create ISO timestamp
            // The exact timezone offset depends on DST, but we can use the original format from v1
            startsAt = combinedStr; // Return in simple format, consumer will handle timezone
        } else if (v1Event.starts_at) {
            // If v1 already has starts_at, use it
            startsAt = v1Event.starts_at;
        }

        // Transform: keep all fields but ensure starts_at is set
        /** @type {any} */
        const transformed = {
            id: v1Event.id,
            name: v1Event.name,
            starts_at: startsAt,
            all_day: v1Event.all_day || false,
            desc: v1Event.description || v1Event.desc || '',
            visibility: v1Event.visibility || 0
        };

        // Copy optional fields
        if (v1Event.organizers) transformed.organizer_ids = v1Event.organizers.map(o => o.id);
        if (v1Event.routes) transformed.routes = v1Event.routes;
        if (v1Event.ends_at) transformed.ends_at = v1Event.ends_at;
        if (v1Event.end_date && v1Event.end_time) {
            transformed.ends_at = `${v1Event.end_date}T${v1Event.end_time}:00`;
        }

        return transformed;
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

    /**
     * Build payload for v1 API editEvent PUT request
     * Uses native v1 API format (description, start_date, start_time, organizer_ids, route_ids)
     * 
     * @param {{name?: string, description?: string, start_date?: string, start_time?: string, visibility?: string | number, organizer_ids?: (string | number)[], route_ids?: (string | number)[], location?: string, time_zone?: string}} eventData - Event data in v1 format
     * @param {string} allDay - "0" or "1" for all_day flag
     * @returns {{event: {name?: string, description?: string, start_date?: string, start_time?: string, all_day?: string, visibility?: string, organizer_ids?: string[], route_ids?: string[], location?: string, time_zone?: string}}} Payload wrapped in "event" key
     */
    static buildV1EditEventPayload(eventData, allDay) {
        /** @type {Record<string, any>} */
        const event = {
            all_day: String(allDay)
        };

        // Copy string fields
        if (eventData.name !== undefined) event.name = eventData.name;
        
        // Handle description - accept both 'description' and 'desc' (web format alias)
        if (eventData.description !== undefined) {
            event.description = eventData.description;
        } else if (eventData.desc !== undefined) {
            event.description = eventData.desc;
        }
        
        // Handle start date/time - accept both v1 format AND starts_at (web format)
        if (eventData.start_date !== undefined) {
            event.start_date = eventData.start_date;
        } else if (eventData.starts_at) {
            // Parse starts_at ISO format: "2025-01-18T10:00:00-08:00"
            const startsAt = eventData.starts_at;
            // Extract date (first 10 chars)
            event.start_date = startsAt.substring(0, 10);
        }
        
        if (eventData.start_time !== undefined) {
            event.start_time = eventData.start_time;
        } else if (eventData.starts_at) {
            // Parse starts_at ISO format: "2025-01-18T10:00:00-08:00"
            const startsAt = eventData.starts_at;
            // Extract time (chars 11-16, format HH:MM)
            event.start_time = startsAt.substring(11, 16);
        }
        
        if (eventData.location !== undefined) event.location = eventData.location;
        if (eventData.time_zone !== undefined) event.time_zone = eventData.time_zone;
        
        // Convert visibility: legacy numeric values → API string values
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
        }

        // Handle organizer_ids (convert to strings)
        if (eventData.organizer_ids && Array.isArray(eventData.organizer_ids)) {
            event.organizer_ids = eventData.organizer_ids.map((/** @type {string | number} */ id) => String(id));
        }

        // Handle route_ids (convert to strings)
        if (eventData.route_ids && Array.isArray(eventData.route_ids)) {
            event.route_ids = eventData.route_ids.map((/** @type {string | number} */ id) => String(id));
        }

        return { event };
    }

    /**
     * Build request options for v1 API editEvent (PUT request with Basic Auth)
     * 
     * @param {string} basicAuthHeader - Basic Auth header value (from buildBasicAuthHeader)
     * @param {{event: any}} payload - Event data payload wrapped in "event" key
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
     * @param {{event: any}} payload - Event data payload wrapped in "event" key
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
     * @param {any} eventData - Event data with name, description, start_date, etc.
     * @param {any} logoBlob - Logo object with getContentType() and getName() methods
     * @param {string} boundary - Multipart boundary string
     * @returns {{textPart: string, endBoundary: string}} Text parts structure for multipart payload
     */
    static buildMultipartTextParts(eventData, logoBlob, boundary) {
        // Build v1 event payload structure (nested under 'event' key)
        const v1Payload = RWGPSClientCore.buildV1EditEventPayload(eventData, '0');
        
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

    /**
     * Build request options for organizer lookup (POST request)
     * 
     * @param {string} sessionCookie - Session cookie value
     * @param {string} organizerName - Organizer name to search for
     * @returns {{method: string, headers: Record<string, string>, payload: Record<string, any>, muteHttpExceptions: boolean}} Request options
     */
    static buildOrganizerLookupOptions(sessionCookie, organizerName) {
        // The API expects the first word (first name) as the search term
        const searchTerm = organizerName.split(' ')[0];
        return {
            method: 'POST',
            headers: {
                'Cookie': sessionCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            payload: {
                term: searchTerm,
                page: 1
            },
            muteHttpExceptions: true
        };
    }

    /**
     * Find matching organizer from API response
     * 
     * @param {Array<{id: number, text: string}>} results - API results array
     * @param {string} organizerName - Full name to match
     * @returns {{id: number, text: string} | null} Matching organizer or null
     */
    static findMatchingOrganizer(results, organizerName) {
        if (!results || !Array.isArray(results)) {
            return null;
        }

        // Normalize the search name for comparison
        const normalizedName = organizerName.toLowerCase().split(' ').join('');
        
        const match = results.find((/** @type {{id: number, text: string}} */ result) => {
            const resultNormalized = result.text.toLowerCase().split(' ').join('');
            return resultNormalized === normalizedName;
        });

        return match || null;
    }

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
     * Convert SCCCCEvent object to v1 API format
     * 
     * SCCCCEvent uses: startDateTime (Date), desc, organizer_tokens
     * v1 API uses: start_date, start_time, description, organizer_ids
     * 
     * @param {{name?: string, desc?: string, location?: string, startDateTime?: Date, organizer_tokens?: (string | number)[], route_ids?: (string | number)[], visibility?: number}} scccEvent - SCCCCEvent-like object
     * @returns {{name?: string, description?: string, location?: string, start_date?: string, start_time?: string, organizer_ids?: string[], route_ids?: string[], visibility?: number}} v1 API format
     */
    static convertSCCCCEventToV1Format(scccEvent) {
        /** @type {{name?: string, description?: string, location?: string, start_date?: string, start_time?: string, organizer_ids?: string[], route_ids?: string[], visibility?: number}} */
        const result = {};
        
        // Copy name directly
        if (scccEvent.name !== undefined) {
            result.name = scccEvent.name;
        }
        
        // Convert desc → description
        if (scccEvent.desc !== undefined) {
            result.description = scccEvent.desc;
        }
        
        // Copy location directly
        if (scccEvent.location !== undefined) {
            result.location = scccEvent.location;
        }
        
        // Convert startDateTime → start_date + start_time
        if (scccEvent.startDateTime !== undefined) {
            const dateParts = RWGPSClientCore.formatDateForV1Api(scccEvent.startDateTime);
            result.start_date = dateParts.start_date;
            result.start_time = dateParts.start_time;
        }
        
        // Convert organizer_tokens → organizer_ids (convert to strings)
        if (scccEvent.organizer_tokens !== undefined) {
            result.organizer_ids = scccEvent.organizer_tokens.map(id => String(id));
        }
        
        // Copy route_ids (convert to strings for consistency)
        if (scccEvent.route_ids !== undefined) {
            result.route_ids = scccEvent.route_ids.map(id => String(id));
        }
        
        // Copy visibility directly
        if (scccEvent.visibility !== undefined) {
            result.visibility = scccEvent.visibility;
        }
        
        return result;
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
}

return RWGPSClientCore;
})();

/* istanbul ignore if - Node.js/Jest export */
if (typeof module !== 'undefined') {
    module.exports = RWGPSClientCore;
}

