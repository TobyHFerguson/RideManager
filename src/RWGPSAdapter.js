// @ts-check
/// <reference path="./gas-globals.d.ts" />

/**
 * RWGPSAdapter - GAS adapter for RWGPS operations
 * 
 * This is a thin adapter that:
 * - Makes GAS API calls (UrlFetchApp, PropertiesService, Utilities)
 * - Delegates all business logic to RWGPSCore (pure JavaScript)
 * 
 * Following the Core/Adapter pattern from copilot-instructions.md
 */

if (typeof require !== 'undefined') {
    var RWGPSCore = require('./RWGPSCore');
}

var RWGPSAdapter = (function() {
    /**
     * RWGPS API Adapter - handles authentication and HTTP requests
     * @class
     */
    class RWGPSAdapter {
        /**
         * @param {{RIDE_LEADER_TBD_ID: number, RIDE_LEADER_TBD_NAME: string, A_TEMPLATE: string}} globals - Global configuration
         * @param {GoogleAppsScript.Properties.Properties} scriptProperties - Script properties for credentials
         */
        constructor(globals, scriptProperties) {
            this.globals = globals;
            this.scriptProperties = scriptProperties;
            this.webSessionCookie = null;
            this._login();
        }

        /**
         * Get credentials from script properties
         * @private
         * @returns {{username: string, password: string, apiKey: string, authToken: string}}
         */
        _getCredentials() {
            const username = this.scriptProperties.getProperty('rwgps_username');
            const password = this.scriptProperties.getProperty('rwgps_password');
            const apiKey = this.scriptProperties.getProperty('rwgps_api_key');
            const authToken = this.scriptProperties.getProperty('rwgps_auth_token');

            if (!username || !password) {
                throw new Error('rwgps_username and rwgps_password must be set in Script Properties');
            }
            if (!apiKey || !authToken) {
                throw new Error('rwgps_api_key and rwgps_auth_token must be set in Script Properties');
            }

            return { username, password, apiKey, authToken };
        }

        /**
         * Login to RWGPS and get session cookie
         * @private
         */
        _login() {
            const { username, password } = this._getCredentials();
            const loginUrl = 'https://ridewithgps.com/organizations/47/sign_in';
            
            /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
            const options = {
                method: 'post',
                headers: {
                    'user-email': username,
                    'user-password': password
                },
                contentType: 'application/json',
                followRedirects: false,
                muteHttpExceptions: true
            };

            try {
                const response = UrlFetchApp.fetch(loginUrl, options);
                this._updateCookieFromResponse(response);
                
                if (!this.webSessionCookie) {
                    console.error('Login failed - no session cookie received');
                }
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`Login request failed: ${err.message}`);
                throw err;
            }
        }

        /**
         * Extract and update session cookie from response
         * @private
         * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response
         */
        _updateCookieFromResponse(response) {
            const headers = response.getAllHeaders();
            let setCookie = headers['Set-Cookie'];
            
            if (!setCookie) return;

            // Normalize to array
            /** @type {string[]} */
            const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];

            for (const cookie of cookies) {
                if (cookie.startsWith('_rwgps_3_session=')) {
                    this.webSessionCookie = cookie.split(';')[0];
                    break;
                }
            }
        }

        /**
         * Make authenticated request with web session cookie
         * @private
         * @param {string | string[]} urls - Single URL or array of URLs
         * @param {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} [options={}] - Request options
         * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse | GoogleAppsScript.URL_Fetch.HTTPResponse[]}
         */
        _fetchWithSession(urls, options = {}) {
            if (!this.webSessionCookie) {
                throw new Error('Not authenticated - no web session cookie');
            }

            const headers = {
                ...options.headers,
                'Cookie': this.webSessionCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            };

            if (Array.isArray(urls)) {
                // Batch request
                const requests = urls.map(url => ({
                    url,
                    ...options,
                    headers
                }));
                const responses = UrlFetchApp.fetchAll(requests);
                responses.forEach(r => this._updateCookieFromResponse(r));
                return responses;
            } else {
                // Single request
                const response = UrlFetchApp.fetch(urls, { ...options, headers });
                this._updateCookieFromResponse(response);
                return response;
            }
        }

        /**
         * Get a single event from RWGPS
         * @param {string} eventUrl - Public event URL
         * @returns {any} Event object
         */
        get_event(eventUrl) {
            if (!RWGPSCore.isPublicEventUrl(eventUrl)) {
                throw new Error(`Invalid public event URL: ${eventUrl}`);
            }

            /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
            const options = {
                headers: {
                    'Accept': 'application/json'
                },
                muteHttpExceptions: true
            };

            const response = /** @type {GoogleAppsScript.URL_Fetch.HTTPResponse} */ (this._fetchWithSession(eventUrl, options));
            const responseText = response.getContentText();
            return RWGPSCore.parseEventFromResponse(responseText);
        }

        /**
         * Edit an event on RWGPS
         * @param {string} eventUrl - Public event URL
         * @param {any} event - Event object with fields to update
         * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse} Response from RWGPS
         */
        edit_event(eventUrl, event) {
            if (!RWGPSCore.isPublicEventUrl(eventUrl)) {
                throw new Error(`Invalid public event URL: ${eventUrl}`);
            }

            // RWGPS bug workaround: must set all_day: "1" first, then edit with actual values
            const workaroundEvent = RWGPSCore.prepareAllDayWorkaround(event);
            const workaroundPayload = RWGPSCore.prepareEventPayload(workaroundEvent);
            
            /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
            const workaroundOptions = {
                method: 'put',
                contentType: 'application/json',
                payload: JSON.stringify(workaroundPayload),
                headers: {
                    'Accept': 'application/json'
                },
                followRedirects: false,
                muteHttpExceptions: true
            };

            // First request with all_day workaround
            this._fetchWithSession(eventUrl, workaroundOptions);

            // Second request with actual event data
            const actualPayload = RWGPSCore.prepareEventPayload(event);
            /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
            const actualOptions = {
                method: 'put',
                contentType: 'application/json',
                payload: JSON.stringify(actualPayload),
                headers: {
                    'Accept': 'application/json'
                },
                followRedirects: false,
                muteHttpExceptions: true
            };

            const response = /** @type {GoogleAppsScript.URL_Fetch.HTTPResponse} */ (this._fetchWithSession(eventUrl, actualOptions));
            
            if (response.getResponseCode() !== 200) {
                throw new Error(`Received code ${response.getResponseCode()} when editing event ${eventUrl}`);
            }

            return response;
        }

        /**
         * Copy a template event to create a new event
         * @param {string} templateUrl - Template event URL
         * @returns {string} URL of newly created event (without slug)
         */
        copy_template_(templateUrl) {
            if (!RWGPSCore.isPublicEventUrl(templateUrl)) {
                throw new Error(`Invalid public event URL: ${templateUrl}`);
            }

            const copyUrl = templateUrl + '/copy';
            const payload = RWGPSCore.buildCopyTemplatePayload();

            /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
            const options = {
                payload: payload,
                followRedirects: false,
                muteHttpExceptions: true
            };

            const response = /** @type {GoogleAppsScript.URL_Fetch.HTTPResponse} */ (this._fetchWithSession(copyUrl, options));
            const headers = response.getAllHeaders();
            return RWGPSCore.extractLocationFromHeaders(headers);
        }

        /**
         * Import a foreign route into the club library
         * @param {{url: string, name?: string, expiry?: string, tags?: string[]}} route - Route configuration
         * @returns {string} URL of imported route
         */
        importRoute(route) {
            const payload = RWGPSCore.prepareRouteImportPayload(route);
            const importUrl = route.url + '/copy.json';

            /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
            const options = {
                payload: payload,
                muteHttpExceptions: true
            };

            const response = /** @type {GoogleAppsScript.URL_Fetch.HTTPResponse} */ (this._fetchWithSession(importUrl, options));
            const result = RWGPSCore.parseImportRouteResponse(response.getContentText());

            if (!result.success) {
                throw new Error(`Route import failed: ${result.error || 'Unknown error'}`);
            }

            return result.url || '';
        }

        /**
         * Get organizer objects for ride leaders
         * @param {string | string[]} rideLeaders - Ride leader name(s)
         * @returns {Array<{id: number, text: string}>} Organizer objects
         */
        getOrganizers(rideLeaders) {
            // Normalize to array
            const names = Array.isArray(rideLeaders) ? rideLeaders : 
                          typeof rideLeaders === 'string' ? rideLeaders.split(',').map(n => n.trim()) : 
                          [];

            if (names.length === 0) {
                return [];
            }

            // Look up each organizer
            const organizers = names.map(name => this._lookupOrganizer(name));

            // Filter out TBD organizers
            const knownOrganizers = organizers.filter(o => o.id !== this.globals.RIDE_LEADER_TBD_ID);

            // Return known organizers, or TBD if none found
            return knownOrganizers.length > 0 ? knownOrganizers : 
                   [RWGPSCore.createTBDOrganizer(this.globals.RIDE_LEADER_TBD_NAME, this.globals.RIDE_LEADER_TBD_ID)];
        }

        /**
         * Look up a single organizer by name
         * @private
         * @param {string} organizerName - Organizer name to search for
         * @returns {{id: number, text: string}} Organizer object
         */
        _lookupOrganizer(organizerName) {
            if (!organizerName) {
                return RWGPSCore.createTBDOrganizer(this.globals.RIDE_LEADER_TBD_NAME, this.globals.RIDE_LEADER_TBD_ID);
            }

            const searchUrl = `${this.globals.A_TEMPLATE}/organizer_ids.json`;
            const firstName = organizerName.split(' ')[0];

            /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
            const options = {
                payload: {
                    term: firstName,
                    page: 1
                },
                muteHttpExceptions: true
            };

            const response = /** @type {GoogleAppsScript.URL_Fetch.HTTPResponse} */ (this._fetchWithSession(searchUrl, options));
            const responseCode = response.getResponseCode();

            if (responseCode === 200 || responseCode === 404) {
                const organizers = RWGPSCore.parseOrganizersResponse(response.getContentText());
                const found = RWGPSCore.findOrganizerByName(organizerName, organizers);
                
                return found || { 
                    text: organizerName, 
                    id: this.globals.RIDE_LEADER_TBD_ID 
                };
            }

            return RWGPSCore.createTBDOrganizer(this.globals.RIDE_LEADER_TBD_NAME, this.globals.RIDE_LEADER_TBD_ID);
        }

        /**
         * Set expiration date for a route
         * @param {string} routeUrl - Route URL
         * @param {Date} expiryDate - Expiration date
         * @param {boolean} _forceUpdate - Not used (kept for API compatibility)
         */
        setRouteExpiration(routeUrl, expiryDate, _forceUpdate) {
            // Implementation would require route object fetching and tag management
            // For now, this is a stub that matches the interface
            console.log(`setRouteExpiration called for ${routeUrl} with date ${expiryDate}`);
            // TODO: Implement full route expiration logic if needed
        }

        /**
         * Remove tags from events
         * @param {string | string[]} eventUrls - Event URL(s)
         * @param {string | string[]} tags - Tag name(s) to remove
         */
        unTagEvents(eventUrls, tags) {
            const urls = Array.isArray(eventUrls) ? eventUrls : [eventUrls];
            const ids = urls.map(url => RWGPSCore.extractEventId(url)).filter(id => id !== null);
            
            if (ids.length === 0) {
                throw new Error('No valid event IDs found');
            }

            const payload = RWGPSCore.buildTagPayload(ids, tags, 'remove', 'event');
            const batchUrl = 'https://ridewithgps.com/events/batch_update_tags.json';

            /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
            const options = {
                payload: payload,
                muteHttpExceptions: true
            };

            this._fetchWithSession(batchUrl, options);
        }

        /**
         * Batch delete multiple events
         * @param {string | string[]} eventUrls - Event URL(s) to delete
         */
        batch_delete_events(eventUrls) {
            const urls = Array.isArray(eventUrls) ? eventUrls : [eventUrls];
            const requests = RWGPSCore.buildDeleteRequestsForEvents(urls);

            // Use Basic Auth for delete operations
            const { apiKey, authToken } = this._getCredentials();
            const encodedAuth = Utilities.base64Encode(`${apiKey}:${authToken}`);

            const deleteRequests = requests.map(req => ({
                url: req.url,
                method: 'delete',
                headers: {
                    'Authorization': `Basic ${encodedAuth}`,
                    'Accept': 'application/json'
                },
                muteHttpExceptions: true
            }));

            UrlFetchApp.fetchAll(deleteRequests);
        }
    }

    return RWGPSAdapter;
})();

if (typeof module !== 'undefined') {
    module.exports = RWGPSAdapter;
}
