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
     * Build payload for editEvent PUT request
     * Handles conversion of event data to RWGPS API format
     * 
     * @param {any} eventData - Event data object (from getEvent or modified)
     * @param {string | number} allDay - "0" or "1" for all_day flag (string required by API)
     * @returns {any} Payload object for PUT request
     */
    static buildEditEventPayload(eventData: any, allDay: string | number): any;

    /**
     * Build request options for editEvent (PUT request)
     * 
     * @param {string} sessionCookie - Session cookie value
     * @param {any} payload - Event data payload
     * @returns {RequestOptions} Request options
     */
    static buildEditEventOptions(sessionCookie: string, payload: any): RequestOptions;

    /**
     * Build request options for organizer lookup (POST request)
     * 
     * @param {string} sessionCookie - Session cookie value
     * @param {string} organizerName - Organizer name to search for
     * @returns {RequestOptions} Request options
     */
    static buildOrganizerLookupOptions(sessionCookie: string, organizerName: string): RequestOptions;

    /**
     * Find matching organizer from API response
     * 
     * @param {Array<{id: number, text: string}>} results - API results array
     * @param {string} organizerName - Full name to match
     * @returns {{id: number, text: string} | null} Matching organizer or null
     */
    static findMatchingOrganizer(results: Array<{id: number, text: string}>, organizerName: string): {id: number, text: string} | null;

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
}

export default RWGPSClientCore;
