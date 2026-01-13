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
 * Schedule result with event URL
 */
export interface ScheduleResult extends OperationResult {
    eventUrl?: string;
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
     * Schedule a new event from template
     * 
     * @param {string} templateUrl - Template event URL
     * @param {any} eventData - Event data
     * @param {string[]} organizerNames - Organizer names
     * @returns {ScheduleResult} Result with event URL
     */
    scheduleEvent(templateUrl: string, eventData: any, organizerNames: string[]): ScheduleResult;

    /**
     * Update an existing event
     * 
     * @param {string} eventUrl - Event URL
     * @param {any} eventData - Updated event data
     * @returns {OperationResult} Result
     */
    updateEvent(eventUrl: string, eventData: any): OperationResult;

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
     * Delete an event
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
     * Edit an event (uses double-edit pattern: all_day=1, then all_day=0)
     * 
     * @param {string} eventUrl - Event URL
     * @param {any} eventData - Event data object (from getEvent or modified)
     * @returns {{success: boolean, event?: any, error?: string}} Result with updated event data
     */
    editEvent(eventUrl: string, eventData: any): { success: boolean; event?: any; error?: string };

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
     * Import a route
     * 
     * @param {string} routeUrl - Route URL
     * @param {any} options - Import options
     * @returns {ImportResult} Result with route URL
     */
    importRoute(routeUrl: string, options: any): ImportResult;

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
