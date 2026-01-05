// @ts-check
/**
 * RWGPSCore - Pure JavaScript business logic for RWGPS operations
 * 
 * This module contains NO GAS API calls - only pure logic that can be tested in Jest.
 * All HTTP interactions happen in RWGPSAdapter.
 * 
 * Following the Core/Adapter pattern:
 * - Core: Pure JavaScript, 100% testable
 * - Adapter: Thin GAS wrapper for UrlFetchApp calls
 */

if (typeof require !== 'undefined') {
    // Jest compatibility - no dependencies needed for Core
}

/**
 * Canonical event fields recognized by RWGPS API
 * Used to filter event objects to only valid fields
 */
const CANONICAL_EVENT_FIELDS = [
    'all_day', 'desc', 'location', 'name', 'organizer_ids',
    'routes', 'starts_at', 'visibility'
];

var RWGPSCore = (function() {
    class RWGPSCore {
        /**
         * Extract numeric ID from a RWGPS URL
         * @param {string} url - URL like "https://ridewithgps.com/events/403834-event-name"
         * @returns {string | null} The ID extracted from the URL (e.g., "403834"), or null if not found
         */
        static extractEventId(url) {
            if (!url || url.length === 0) {
                throw new Error('URL is required');
            }
            const match = url.match(/\/(\d+)(-|$)/);
            return match ? match[1] : null;
        }

        /**
         * Extract numeric ID from a RWGPS route URL
         * @param {string} url - URL like "https://ridewithgps.com/routes/12345"
         * @returns {string | null} The ID extracted from the URL
         */
        static extractRouteId(url) {
            if (!url || url.length === 0) {
                throw new Error('URL is required');
            }
            const match = url.match(/\/(\d+)(-|$)/);
            return match ? match[1] : null;
        }

        /**
         * Check if a URL is a valid public event URL
         * @param {string} url - the URL to check
         * @returns {boolean} true if the URL is a public event URL, false otherwise
         */
        static isPublicEventUrl(url) {
            if (url === null || url === undefined) {
                throw new Error('URL is required');
            }
            if (!url || url.length === 0) {
                return false;
            }
            const publicEventPattern = /^https:\/\/ridewithgps\.com\/events\/\d+[^/]*$/;
            return publicEventPattern.test(url);
        }

        /**
         * Check if a URL is a valid public route URL
         * @param {string} url - the URL to check
         * @returns {boolean} true if the URL is a public route URL, false otherwise
         */
        static isPublicRouteUrl(url) {
            if (url === null || url === undefined) {
                throw new Error('URL is required');
            }
            if (!url || url.length === 0) {
                return false;
            }
            const publicRoutePattern = /^https:\/\/ridewithgps\.com\/routes\/\d+$/;
            return publicRoutePattern.test(url);
        }

        /**
         * Filter event object to only canonical RWGPS fields
         * @param {{[key: string]: any}} event - Event object that may contain extra fields
         * @returns {{[key: string]: any}} Event object with only canonical fields
         */
        static prepareEventPayload(event) {
            if (!event || typeof event !== 'object') {
                throw new Error('Event object is required');
            }
            
            /** @type {{[key: string]: any}} */
            const filtered = {};
            for (const key of CANONICAL_EVENT_FIELDS) {
                if (key in event) {
                    filtered[key] = event[key];
                }
            }
            return filtered;
        }

        /**
         * Create event object with all_day workaround for RWGPS bug
         * RWGPS has a bug that prevents proper scheduling if all_day is not set to "1" first
         * @param {{[key: string]: any}} event - Original event object
         * @returns {{[key: string]: any}} Event with all_day: "1"
         */
        static prepareAllDayWorkaround(event) {
            return { ...event, all_day: '1' };
        }

        /**
         * Parse event from RWGPS API response JSON
         * @param {string} responseText - JSON response text from RWGPS API
         * @returns {any} The event object
         */
        static parseEventFromResponse(responseText) {
            const body = JSON.parse(responseText);
            return body.event;
        }

        /**
         * Build payload for copying a template event
         * @param {string} [name='COPIED EVENT'] - Name for the copied event
         * @returns {{[key: string]: string}} Payload for copy template request
         */
        static buildCopyTemplatePayload(name = 'COPIED EVENT') {
            return {
                'event[name]': name,
                'event[all_day]': '0',
                'event[copy_routes]': '0',
                'event[start_date]': '',
                'event[start_time]': ''
            };
        }

        /**
         * Extract and trim location URL from response headers
         * Removes slug from end of URL (everything after the ID)
         * @param {{[key: string]: string}} headers - Response headers object
         * @returns {string} The base URL without slug
         */
        static extractLocationFromHeaders(headers) {
            if (!headers.Location) {
                throw new Error('Location header not found');
            }
            // Split on '-' and take everything before the first dash after the ID
            return headers.Location.split('-')[0];
        }

        /**
         * Prepare payload for importing a foreign route
         * @param {{url: string, name?: string, expiry?: string, tags?: string[]}} route - Route object
         * @returns {{user_id: number, asset_type: string, privacy_code: null, include_photos: boolean, [key: string]: any}} Import payload
         */
        static prepareRouteImportPayload(route) {
            if (!route || typeof route !== 'object') {
                throw new Error('Route object is required');
            }
            if (!route.url || !RWGPSCore.isPublicRouteUrl(route.url)) {
                throw new Error(`Invalid foreign route URL: ${route.url}`);
            }

            return {
                user_id: 621846, // SCCCC club user ID
                asset_type: 'route',
                privacy_code: null,
                include_photos: false,
                ...route
            };
        }

        /**
         * Parse response from route import API call
         * @param {string} responseText - JSON response text
         * @returns {{success: boolean, url?: string, error?: string}} Parsed response
         */
        static parseImportRouteResponse(responseText) {
            return JSON.parse(responseText);
        }

        /**
         * Normalize ride leader name for comparison
         * Converts to lowercase and removes all whitespace
         * @param {string} name - Ride leader name
         * @returns {string} Normalized name
         */
        static normalizeRideLeaderName(name) {
            return name.toLowerCase().replace(/\s+/g, '');
        }

        /**
         * Find organizer in list by normalized name
         * @param {string} searchName - Name to search for
         * @param {Array<{id: number, text: string}>} organizers - List of organizers
         * @returns {{id: number, text: string} | null} Found organizer or null
         */
        static findOrganizerByName(searchName, organizers) {
            const normalized = RWGPSCore.normalizeRideLeaderName(searchName);
            const found = organizers.find(o => 
                RWGPSCore.normalizeRideLeaderName(o.text) === normalized
            );
            return found || null;
        }

        /**
         * Create a TBD (To Be Determined) organizer object
         * @param {string} name - Display name for TBD organizer
         * @param {number} id - ID for TBD organizer
         * @returns {{id: number, text: string}} TBD organizer object
         */
        static createTBDOrganizer(name, id) {
            return { id, text: name };
        }

        /**
         * Parse organizers from RWGPS API response
         * @param {string} responseText - JSON response text
         * @returns {Array<{id: number, text: string}>} List of organizers
         */
        static parseOrganizersResponse(responseText) {
            const body = JSON.parse(responseText);
            return body.results || [];
        }

        /**
         * Build payload for tag operations (add/remove tags from events/routes)
         * @param {string | string[]} ids - Resource ID(s)
         * @param {string | string[]} tags - Tag name(s)
         * @param {'add' | 'remove'} tagAction - Action to perform
         * @param {'event' | 'route'} resource - Resource type
         * @returns {{tag_action: string, tag_names: string, [key: string]: string}} Tag operation payload
         */
        static buildTagPayload(ids, tags, tagAction, resource) {
            if (tagAction !== 'add' && tagAction !== 'remove') {
                throw new Error(`Invalid tag_action: ${tagAction}`);
            }
            if (resource !== 'event' && resource !== 'route') {
                throw new Error(`Invalid resource: ${resource}`);
            }

            // Normalize to arrays
            const idArray = Array.isArray(ids) ? ids : [ids];
            const tagArray = Array.isArray(tags) ? tags : [tags];

            /** @type {{tag_action: string, tag_names: string, [key: string]: string}} */
            const payload = {
                tag_action: tagAction,
                tag_names: tagArray.join(',')
            };

            // Resource-specific ID field
            const idField = resource === 'event' ? 'event_ids' : 'route_ids';
            payload[idField] = idArray.join(',');

            return payload;
        }

        /**
         * Build delete requests for multiple event URLs
         * @param {string[]} eventUrls - Array of public event URLs
         * @returns {Array<{url: string, method: string}>} Array of delete request objects
         */
        static buildDeleteRequestsForEvents(eventUrls) {
            return eventUrls.map(url => {
                if (!RWGPSCore.isPublicEventUrl(url)) {
                    throw new Error(`Invalid public event URL: ${url}`);
                }
                const id = RWGPSCore.extractEventId(url);
                return {
                    url: `https://ridewithgps.com/api/v1/events/${id}.json`,
                    method: 'delete'
                };
            });
        }
    }

    return RWGPSCore;
})();

if (typeof module !== 'undefined') {
    module.exports = RWGPSCore;
}
