/**
 * RWGPSAdapter - Type definitions for GAS adapter
 * 
 * This adapter provides the same interface as the external RWGPSLib but uses
 * internal RWGPSCore for business logic.
 */

/**
 * RWGPS API Adapter - handles authentication and HTTP requests
 */
declare class RWGPSAdapter {
    /**
     * Create a new RWGPS adapter
     * @param globals - Global configuration with RIDE_LEADER_TBD_ID, RIDE_LEADER_TBD_NAME, A_TEMPLATE
     * @param scriptProperties - Script properties for credentials
     */
    constructor(
        globals: {
            RIDE_LEADER_TBD_ID: number;
            RIDE_LEADER_TBD_NAME: string;
            A_TEMPLATE: string;
        },
        scriptProperties: GoogleAppsScript.Properties.Properties
    );

    /**
     * Get a single event from RWGPS
     * @param eventUrl - Public event URL
     * @returns Event object
     */
    get_event(eventUrl: string): any;

    /**
     * Edit an event on RWGPS
     * @param eventUrl - Public event URL
     * @param event - Event object with fields to update
     * @returns Response from RWGPS
     */
    edit_event(eventUrl: string, event: any): GoogleAppsScript.URL_Fetch.HTTPResponse;

    /**
     * Copy a template event to create a new event
     * @param templateUrl - Template event URL
     * @returns URL of newly created event (without slug)
     */
    copy_template_(templateUrl: string): string;

    /**
     * Import a foreign route into the club library
     * @param route - Route configuration with url and optional metadata
     * @returns URL of imported route
     */
    importRoute(route: {
        url: string;
        name?: string;
        expiry?: string;
        tags?: string[];
    }): string;

    /**
     * Get organizer objects for ride leaders
     * @param rideLeaders - Ride leader name(s), string or array
     * @returns Organizer objects with id and text
     */
    getOrganizers(rideLeaders: string | string[]): Array<{ id: number; text: string }>;

    /**
     * Set expiration date for a route
     * @param routeUrl - Route URL
     * @param expiryDate - Expiration date
     * @param forceUpdate - Whether to force update (not currently used)
     */
    setRouteExpiration(routeUrl: string, expiryDate: Date, forceUpdate: boolean): void;

    /**
     * Remove tags from events
     * @param eventUrls - Event URL(s)
     * @param tags - Tag name(s) to remove
     */
    unTagEvents(eventUrls: string | string[], tags: string | string[]): void;

    /**
     * Batch delete multiple events
     * @param eventUrls - Event URL(s) to delete
     */
    batch_delete_events(eventUrls: string | string[]): void;
}

export default RWGPSAdapter;
