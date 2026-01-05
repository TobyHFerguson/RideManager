/**
 * RWGPSCore - Type definitions for pure JavaScript RWGPS business logic
 * 
 * This module provides type-safe interfaces for RWGPS operations without GAS dependencies.
 */

declare namespace RWGPSCore {
    /**
     * Extract numeric ID from a RWGPS URL
     * @param url - URL like "https://ridewithgps.com/events/403834-event-name"
     * @returns The ID extracted from the URL (e.g., "403834"), or null if not found
     */
    function extractEventId(url: string): string | null;

    /**
     * Extract numeric ID from a RWGPS route URL
     * @param url - URL like "https://ridewithgps.com/routes/12345"
     * @returns The ID extracted from the URL
     */
    function extractRouteId(url: string): string | null;

    /**
     * Check if a URL is a valid public event URL
     * @param url - the URL to check
     * @returns true if the URL is a public event URL, false otherwise
     */
    function isPublicEventUrl(url: string): boolean;

    /**
     * Check if a URL is a valid public route URL
     * @param url - the URL to check
     * @returns true if the URL is a public route URL, false otherwise
     */
    function isPublicRouteUrl(url: string): boolean;

    /**
     * Filter event object to only canonical RWGPS fields
     * @param event - Event object that may contain extra fields
     * @returns Event object with only canonical fields
     */
    function prepareEventPayload(event: Record<string, any>): Record<string, any>;

    /**
     * Create event object with all_day workaround for RWGPS bug
     * @param event - Original event object
     * @returns Event with all_day: "1"
     */
    function prepareAllDayWorkaround(event: Record<string, any>): Record<string, any>;

    /**
     * Parse event from RWGPS API response JSON
     * @param responseText - JSON response text from RWGPS API
     * @returns The event object
     */
    function parseEventFromResponse(responseText: string): any;

    /**
     * Build payload for copying a template event
     * @param name - Name for the copied event (defaults to 'COPIED EVENT')
     * @returns Payload for copy template request
     */
    function buildCopyTemplatePayload(name?: string): Record<string, string>;

    /**
     * Extract and trim location URL from response headers
     * @param headers - Response headers object
     * @returns The base URL without slug
     */
    function extractLocationFromHeaders(headers: Record<string, string>): string;

    /**
     * Prepare payload for importing a foreign route
     * @param route - Route object with url and optional metadata
     * @returns Import payload
     */
    function prepareRouteImportPayload(route: {
        url: string;
        name?: string;
        expiry?: string;
        tags?: string[];
    }): {
        user_id: number;
        asset_type: string;
        privacy_code: null;
        include_photos: boolean;
        [key: string]: any;
    };

    /**
     * Parse response from route import API call
     * @param responseText - JSON response text
     * @returns Parsed response with success status and url/error
     */
    function parseImportRouteResponse(responseText: string): {
        success: boolean;
        url?: string;
        error?: string;
    };

    /**
     * Normalize ride leader name for comparison
     * @param name - Ride leader name
     * @returns Normalized name (lowercase, no spaces)
     */
    function normalizeRideLeaderName(name: string): string;

    /**
     * Find organizer in list by normalized name
     * @param searchName - Name to search for
     * @param organizers - List of organizers
     * @returns Found organizer or null
     */
    function findOrganizerByName(
        searchName: string,
        organizers: Array<{ id: number; text: string }>
    ): { id: number; text: string } | null;

    /**
     * Create a TBD (To Be Determined) organizer object
     * @param name - Display name for TBD organizer
     * @param id - ID for TBD organizer
     * @returns TBD organizer object
     */
    function createTBDOrganizer(name: string, id: number): { id: number; text: string };

    /**
     * Parse organizers from RWGPS API response
     * @param responseText - JSON response text
     * @returns List of organizers
     */
    function parseOrganizersResponse(responseText: string): Array<{ id: number; text: string }>;

    /**
     * Build payload for tag operations (add/remove tags from events/routes)
     * @param ids - Resource ID(s)
     * @param tags - Tag name(s)
     * @param tagAction - Action to perform ('add' or 'remove')
     * @param resource - Resource type ('event' or 'route')
     * @returns Tag operation payload
     */
    function buildTagPayload(
        ids: string | string[],
        tags: string | string[],
        tagAction: 'add' | 'remove',
        resource: 'event' | 'route'
    ): {
        tag_action: string;
        tag_names: string;
        [key: string]: string;
    };

    /**
     * Build delete requests for multiple event URLs
     * @param eventUrls - Array of public event URLs
     * @returns Array of delete request objects
     */
    function buildDeleteRequestsForEvents(
        eventUrls: string[]
    ): Array<{ url: string; method: string }>;
}

export default RWGPSCore;
