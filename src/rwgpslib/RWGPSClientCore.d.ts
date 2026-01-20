/**
 * RWGPSClientCore - Pure JavaScript business logic for RWGPS operations
 * NO Google Apps Script dependencies - fully testable in Jest
 */

/**
 * Parsed event URL information
 */
export interface ParsedEventUrl {
    eventId: string;
    fullUrl: string;
}

/**
 * HTTP request options for UrlFetchApp
 */
export interface RequestOptions {
    method: 'get' | 'post' | 'put' | 'delete';
    headers: Record<string, string>;
    payload?: string;
    muteHttpExceptions: boolean;
}

/**
 * Event data validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * RWGPSClientCore class - Pure JavaScript business logic
 */
declare class RWGPSClientCore {
    /**
     * Extract event ID from RWGPS event URL
     * 
     * @param {string} eventUrl - Full URL like "https://ridewithgps.com/events/12345"
     * @returns {ParsedEventUrl} Parsed URL with event ID
     */
    static parseEventUrl(eventUrl: string): ParsedEventUrl;

    /**
     * Build HTTP request options for fetch
     * 
     * @param {'get' | 'post' | 'put' | 'delete'} method - HTTP method
     * @param {any} [payload] - Optional request body (will be JSON stringified)
     * @param {Record<string, string>} [headers] - Optional additional headers
     * @returns {RequestOptions} Request options for UrlFetchApp
     */
    static buildRequestOptions(
        method: 'get' | 'post' | 'put' | 'delete',
        payload?: any,
        headers?: Record<string, string>
    ): RequestOptions;

    /**
     * Validate event data has required fields
     * 
     * @param {any} eventData - Event data object to validate
     * @returns {ValidationResult} Validation result with errors if invalid
     */
    static validateEventData(eventData: any): ValidationResult;

    /**
     * Build Basic Auth header value
     * 
     * @param {string} apiKey - RWGPS API key
     * @param {string} authToken - RWGPS auth token
     * @returns {string} Base64-encoded Basic Auth header value
     */
    static buildBasicAuthHeader(apiKey: string, authToken: string): string;

    /**
     * Parse event ID from various URL formats
     * 
     * @param {string} url - URL that might contain event ID
     * @returns {string | null} Event ID or null if not found
     */
    static extractEventId(url: string): string | null;

    /**
     * Build request options for getEvent (GET request)
     * 
     * @param {string} sessionCookie - Session cookie value
     * @returns {RequestOptions} Request options
     */
    static buildGetEventOptions(sessionCookie: string): RequestOptions;

    /**
     * Build request options for editEvent (PUT request)
     * 
     * @param {string} sessionCookie - Session cookie value
     * @param {any} payload - Event data payload
     * @returns {RequestOptions} Request options
     */
    static buildEditEventOptions(sessionCookie: string, payload: any): RequestOptions;

    /**
     * Build payload for v1 API editEvent PUT request
     * Uses native v1 API format (description, start_date, start_time, organizer_ids, route_ids)
     * Per OpenAPI spec: all_day is boolean, organizer_ids/route_ids are number[]
     * 
     * @param eventData - Event data in v1 format
     * @param allDay - boolean for all_day flag (per OpenAPI spec)
     * @returns Payload wrapped in "event" key
     */
    static buildV1EditEventPayload(
        eventData: {
            name?: string;
            description?: string;
            start_date?: string;
            start_time?: string;
            visibility?: string | number;
            organizer_ids?: number[];
            route_ids?: number[];
            location?: string;
            time_zone?: string;
        },
        allDay: boolean
    ): { event: any };

    /**
     * Build request options for v1 API editEvent (PUT request with Basic Auth)
     * 
     * @param basicAuthHeader - Basic Auth header value (from buildBasicAuthHeader)
     * @param payload - Event data payload wrapped in "event" key
     * @returns Request options
     */
    static buildV1EditEventOptions(
        basicAuthHeader: string,
        payload: { event: any }
    ): { method: string; headers: Record<string, string>; payload: string; muteHttpExceptions: boolean };

    /**
     * Build request options for v1 API createEvent (POST request with Basic Auth)
     * 
     * @param basicAuthHeader - Basic Auth header value (from buildBasicAuthHeader)
     * @param payload - Event data payload wrapped in "event" key
     * @returns Request options
     */
    static buildV1CreateEventOptions(
        basicAuthHeader: string,
        payload: { event: any }
    ): { method: string; headers: Record<string, string>; payload: string; muteHttpExceptions: boolean };

    /**
     * Build multipart/form-data text parts for event creation with logo (pure JS, no Blob operations)
     * 
     * @param {any} eventData - Event data with name, description, start_date, etc.
     * @param {any} logoBlob - Logo object with getContentType() and getName() methods
     * @param {string} boundary - Multipart boundary string
     * @returns {{textPart: string, endBoundary: string}} Text parts structure for multipart payload
     */
    static buildMultipartTextParts(
        eventData: any,
        logoBlob: any,
        boundary: string
    ): { textPart: string; endBoundary: string };

    // NOTE: buildOrganizerLookupOptions and findMatchingOrganizer were removed in Task 5.3.5
    // Organizer lookup is now done via RWGPSMembersAdapter.lookupUserIdByName()

    /**
     * Build request options for batch tag update (POST request)
     * 
     * @param {string} sessionCookie - Session cookie value
     * @param {string | string[]} eventIds - Event ID(s) to update
     * @param {'add' | 'remove'} tagAction - Action to perform
     * @param {string | string[]} tagNames - Tag name(s) to add/remove
     * @returns {RequestOptions} Request options
     */
    static buildBatchTagOptions(sessionCookie: string, eventIds: string | string[], tagAction: 'add' | 'remove', tagNames: string | string[]): RequestOptions;

    /**
     * Extract route ID from URL
     * 
     * @param {string} url - Route URL
     * @returns {string | null} Route ID or null if not found
     */
    static extractRouteId(url: string): string | null;

    /**
     * Build route copy options
     * 
     * @param {string} sessionCookie - Session cookie
     * @param {string} routeUrl - Source route URL
     * @param {{name?: string, expiry?: string, tags?: string[], userId: number}} routeData - Route copy parameters
     * @returns {RequestOptions} Request options
     */
    static buildRouteCopyOptions(sessionCookie: string, routeUrl: string, routeData: {name?: string, expiry?: string, tags?: string[], userId: number}): RequestOptions;

    /**
     * Build route tag options for batch update
     * 
     * @param {string} sessionCookie - Session cookie
     * @param {string} routeId - Route ID
     * @param {string[]} tags - Tags to add
     * @returns {RequestOptions} Request options
     */
    static buildRouteTagOptions(sessionCookie: string, routeId: string, tags: string[]): RequestOptions;

    /**
     * Format a Date object for v1 API
     * Converts Date to {start_date: 'YYYY-MM-DD', start_time: 'HH:MM'} format
     * 
     * @param {Date} date - Date to format
     * @returns {{start_date: string, start_time: string}} Formatted date parts
     */
    static formatDateForV1Api(date: Date): { start_date: string; start_time: string };

    /**
     * Build expiration tag for a route
     * 
     * @param {Date} date - Expiration date
     * @returns {string} Tag in format "expires: MM/DD/YYYY"
     */
    static buildExpirationTag(date: Date): string;

    /**
     * Parse expiration tag to extract date parts
     * 
     * @param {string | null} tag - Tag string like "expires: MM/DD/YYYY"
     * @returns {{month: number, day: number, year: number} | null} Parsed date parts or null
     */
    static parseExpirationTag(tag: string | null): { month: number; day: number; year: number } | null;

    /**
     * Check if new expiration date is newer than existing tag date
     * 
     * @param {string} existingTag - Existing expiration tag
     * @param {Date} newDate - New expiration date to compare
     * @returns {boolean} True if newDate is after existing tag date
     */
    static isExpirationTagNewer(existingTag: string, newDate: Date): boolean;

    /**
     * Build URL for club members v1 API endpoint
     * 
     * @param {number} [page=1] - Page number (1-based, minimum 1)
     * @param {number} [pageSize=200] - Page size (20-200, default 200 for efficiency)
     * @returns {string} Full URL for members endpoint
     */
    static buildClubMembersUrl(page?: number, pageSize?: number): string;

    /**
     * Check if pagination indicates more pages are available
     * 
     * @param {PaginationMeta | null | undefined} pagination - Pagination metadata from API response
     * @returns {boolean} True if more pages are available
     */
    static hasMorePages(pagination: PaginationMeta | null | undefined): boolean;
}

/**
 * Pagination metadata from RWGPS API response
 */
export interface PaginationMeta {
    record_count: number;
    page_count: number;
    page_size: number;
    next_page_url: string | null;
}

export default RWGPSClientCore;

