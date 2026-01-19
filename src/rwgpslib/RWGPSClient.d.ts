/**
 * RWGPSClient.d.ts
 * 
 * Type definitions for RWGPSClient adapter (GAS layer)
 */

/**
 * RWGPS credentials
 */
export interface RWGPSCredentials {
    apiKey: string;
    authToken: string;
    username: string;
    password: string;
}

/**
 * Operation result with success flag
 */
export interface OperationResult {
    success: boolean;
    error?: string;
}

/**
 * Schedule result with event URL and event data
 */
export interface ScheduleResult extends OperationResult {
    eventUrl?: string;
    event?: any;
}

/**
 * Import result with route URL
 */
export interface ImportResult extends OperationResult {
    routeUrl?: string;
}

/**
 * RWGPSClient - Unified RWGPS API client (GAS adapter)
 */
declare class RWGPSClient {
    private apiKey: string;
    private authToken: string;
    private username: string;
    private password: string;
    private webSessionCookie: string | null;

    /**
     * Create RWGPS client
     * 
     * @param {RWGPSCredentials} credentials - RWGPS credentials
     */
    constructor(credentials: RWGPSCredentials);

    /**
     * Login to RWGPS web session
     * @returns {boolean} True if login successful
     */
    login(): boolean;

    /**
     * Schedule a new event (no templates - creates event directly)
     * 
     * Note: Organizer IDs should be looked up by caller via RWGPSMembersAdapter.lookupUserIdByName()
     * 
     * @param {any} eventData - Event data (name, desc, start_date, start_time, etc.)
     * @param {number[]} organizerIds - Array of organizer user IDs (pre-looked up)
     * @param {string} [logoUrl] - Optional logo URL
     * @returns {ScheduleResult} Result with event URL
     */
    scheduleEvent(eventData: any, organizerIds: number[], logoUrl?: string): ScheduleResult;

    /**
     * Update an existing event with new data and optionally set organizers
     * 
     * Note: Organizer IDs should be looked up by caller via RWGPSMembersAdapter.lookupUserIdByName()
     * 
     * @param {string} eventUrl - Event URL
     * @param {any} eventData - Updated event data
     * @param {number[]} organizerIds - Optional array of organizer user IDs (pre-looked up)
     * @returns {ScheduleResult} Result with event data
     */
    updateEvent(eventUrl: string, eventData: any, organizerIds?: number[]): ScheduleResult;

    /**
     * Cancel an event (adds CANCELLED prefix)
     * 
     * @param {string} eventUrl - Event URL
     * @returns {OperationResult} Result
     */
    cancelEvent(eventUrl: string): OperationResult;

    /**
     * Reinstate a cancelled event (removes CANCELLED prefix)
     * 
     * @param {string} eventUrl - Event URL
     * @returns {OperationResult} Result
     */
    reinstateEvent(eventUrl: string): OperationResult;

    /**
     * Delete an event using v1 API with Basic Auth
     * 
     * Historical Note: Previously called login() but v1 API with Basic Auth
     * doesn't need web session - removed unnecessary login call.
     * 
     * @param {string} eventUrl - Event URL
     * @returns {OperationResult} Result
     */
    deleteEvent(eventUrl: string): OperationResult;

    /**
     * Get event details
     * 
     * @param {string} eventUrl - Event URL
     * @returns {{success: boolean, event?: any, error?: string}} Result with event data
     */
    getEvent(eventUrl: string): { success: boolean; event?: any; error?: string };

    /**
     * Edit an event using single PUT with all_day=0
     * 
     * Historical Note: The double-edit pattern (all_day=1, then all_day=0) was
     * proven unnecessary through testing. All 11 working fields update correctly
     * with a single PUT request setting all_day=0.
     * 
     * @param {string} eventUrl - Event URL
     * @param {any} eventData - Event data object (from getEvent or modified)
     * @returns {{success: boolean, event?: any, error?: string}} Result with updated event data
     */
    editEvent(eventUrl: string, eventData: any): { success: boolean; event?: any; error?: string };

    /**
     * Create a new event using v1 API with optional logo
     * 
     * Uses POST /api/v1/events.json with Basic Auth to create a new event.
     * If logoUrl is provided, uses multipart/form-data to include the logo.
     * 
     * @param eventData - Event data in v1 format
     * @param logoUrl - Optional logo image URL to fetch and attach
     * @returns Result with event URL and data
     */
    createEvent(eventData: {
        name: string;
        description?: string;
        start_date: string;
        start_time: string;
        visibility?: string | number;
        organizer_ids?: (string | number)[];
        route_ids?: (string | number)[];
        location?: string;
        time_zone?: string;
    }, logoUrl?: string): { success: boolean; eventUrl?: string; event?: any; error?: string };

    /**
     * Cancel an event (adds "CANCELLED: " prefix to name)
     * 
     * @param {string} eventUrl - Event URL
     * @returns {{success: boolean, event?: any, error?: string}} Result with updated event data
     */
    cancelEvent(eventUrl: string): { success: boolean; event?: any; error?: string };

    /**
     * Reinstate a cancelled event (removes "CANCELLED: " prefix from name)
     * 
     * @param {string} eventUrl - Event URL
     * @returns {{success: boolean, event?: any, error?: string}} Result with updated event data
     */
    reinstateEvent(eventUrl: string): { success: boolean; event?: any; error?: string };

    /**
     * Import (copy) a route into the club library with tags
     * 
     * @param {string} routeUrl - Source route URL to copy
     * @param {{name?: string, expiry?: string, tags?: string[], userId: number}} routeData - Route copy parameters
     * @returns {{success: boolean, routeUrl?: string, route?: any, error?: string}} Result with route URL and data
     */
    importRoute(
        routeUrl: string,
        routeData: {
            name?: string;
            expiry?: string;
            tags?: string[];
            userId: number;
        }
    ): { success: boolean; routeUrl?: string; route?: any; error?: string };

    /**
     * Get route details via API v1
     * 
     * @param {string} routeUrl - Route URL
     * @returns {{success: boolean, route?: any, error?: string}} Result
     */
    getRoute(routeUrl: string): { success: boolean; route?: any; error?: string };

    /**
     * Copy a route to club library
     * @private
     */
    private _copyRoute(routeUrl: string, routeData: any): { success: boolean; routeUrl?: string; error?: string };

    /**
     * Add tags to a route
     * @private
     */
    private _addRouteTags(routeUrl: string, tags: string[]): { success: boolean; error?: string };

    /**
     * Set route expiration date by adding an expiration tag
     * 
     * Adds a tag like "expires: MM/DD/YYYY" to the route.
     * If forceUpdate is false, will skip if new date is not later than existing tag.
     * 
     * @param routeUrl - Route URL
     * @param expiryDate - Expiration date
     * @param forceUpdate - Force update even if new date is not newer (default: false)
     */
    setRouteExpiration(routeUrl: string, expiryDate: Date, forceUpdate?: boolean): { success: boolean; skipped?: boolean; error?: string };

    // NOTE: _lookupOrganizer was removed in Task 5.3.5
    // Organizer lookup is now done via RWGPSMembersAdapter.lookupUserIdByName()

    /**
     * Remove tags from an event
     * @private
     */
    private _removeEventTags(eventId: string, tags: string[]): { success: boolean; error?: string };

    /**
     * Add tags to an event
     */
    _addEventTags(eventId: string, tags: string[]): { success: boolean; error?: string };

    /**
     * Get Basic Auth header
     * @private
     */
    private _getBasicAuthHeader(): string;

    /**
     * Update session cookie from response
     * @private
     */
    private _updateCookieFromResponse(response: GoogleAppsScript.URL_Fetch.HTTPResponse): void;

    /**
     * Prepare request with authentication
     * @private
     */
    private _prepareRequest(
        request: { url: string; method?: string; headers?: Record<string, string>; payload?: string },
        authType: 'WEB_SESSION' | 'BASIC_AUTH'
    ): any;

    /**
     * Execute HTTP request using UrlFetchApp
     * @private
     */
    private _fetch(url: string, options: any): GoogleAppsScript.URL_Fetch.HTTPResponse;

}

export default RWGPSClient;
