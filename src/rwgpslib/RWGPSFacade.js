/**
 * RWGPSFacade.js
 * 
 * Public API for RWGPS operations
 * Provides clean interface hiding implementation complexity
 * 
 * Features:
 * - Consistent error handling (muteHttpExceptions + result objects)
 * - Automatic tagging (group tags, route expiry)
 * - Group change support (logo + tag swap)
 * - camelCase naming convention
 * 
 * @module RWGPSFacade
 */

/// <reference path="../gas-globals.d.ts" />
/// <reference path="./RWGPSFacade.d.ts" />

// @ts-check

/* istanbul ignore if - GAS runtime check */
if (typeof require !== 'undefined') {
    var RWGPSCore = require('./RWGPSCore');
    var RWGPSAdapter = require('./RWGPSAdapter');
}

/**
 * @typedef {import('./RWGPSFacade').EventInput} EventInput
 * @typedef {import('./RWGPSFacade').EventVisibility} EventVisibility
 * @typedef {import('./RWGPSFacade').EventData} EventData
 * @typedef {import('./RWGPSFacade').EditEventOptions} EditEventOptions
 * @typedef {import('./RWGPSFacade').RouteInput} RouteInput
 * @typedef {import('./RWGPSFacade').RouteData} RouteData
 * @typedef {import('./RWGPSFacade').DeleteResult} DeleteResult
 * @typedef {import('./RWGPSFacade').ClubMember} ClubMember
 * @typedef {import('./RWGPSFacade').GlobalsProvider} GlobalsProvider
 * @typedef {import('./RWGPSFacade').Result} Result
 * @typedef {import('./RWGPSFacade').GetEventResult} GetEventResult
 * @typedef {import('./RWGPSFacade').EditEventResult} EditEventResult
 * @typedef {import('./RWGPSFacade').CreateEventResult} CreateEventResult
 * @typedef {import('./RWGPSFacade').ImportRouteResult} ImportRouteResult
 */

/**
 * RWGPSFacade - Public API for RWGPS operations
 * Uses class pattern per copilot-instructions Rule 4.5
 */
class RWGPSFacade {
    /**
     * Club ID for membership operations
     * @private
     */
    static CLUB_ID = 47;

    /**
     * Default route expiry days
     * @private
     */
    static DEFAULT_EXPIRY_DAYS = 30;

    /**
     * Create facade with adapter and globals
     * 
     * @param {any} [adapter] - RWGPSAdapter instance
     * @param {GlobalsProvider} [globals] - Globals provider for config
     */
    constructor(adapter, globals) {
        /** @type {any} */
        this._adapter = adapter;
        
        /** @type {GlobalsProvider} */
        this._globals = globals || {};
    }

    // =============================================
    // Event Operations
    // =============================================

    /**
     * Fetch single event by URL
     * 
     * @param {string} eventUrl - Full event URL
     * @returns {GetEventResult} Result with event data or error
     */
    getEvent(eventUrl) {
        try {
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            const parsed = RWGPSCore.parseEventUrl(eventUrl);
            const response = this._adapter.fetchV1('GET', `/events/${parsed.eventId}.json`);
            
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            if (!RWGPSCore.isSuccessResponse(response)) {
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                return RWGPSCore.buildErrorResult(response, 'Get event');
            }

            const body = JSON.parse(response.getContentText());
            // v1 API wraps response in {"event": {...}}
            const eventData = body.event || body;
            
            return { success: true, data: eventData };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Update event fields, optionally change group
     * 
     * @param {string} eventUrl - Full event URL
     * @param {EventInput} eventData - Fields to update (domain types)
     * @param {EditEventOptions} [options] - Group change options
     * @returns {EditEventResult} Result with updated event or error
     */
    editEvent(eventUrl, eventData, options = {}) {
        try {
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            const parsed = RWGPSCore.parseEventUrl(eventUrl);
            
            // 1. Transform domain types to API format
            const apiData = this._transformEventInput(eventData);
            
            // 2. Build payload and send request
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            const payload = RWGPSCore.buildEditEventPayload(apiData);
            const response = this._adapter.fetchV1('PUT', `/events/${parsed.eventId}.json`, payload);
            
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            if (!RWGPSCore.isSuccessResponse(response)) {
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                return RWGPSCore.buildErrorResult(response, 'Edit event');
            }

            const body = JSON.parse(response.getContentText());
            const event = body.event || body;

            // 2. Handle group change (new capability!)
            if (options.oldGroup && options.newGroup && options.oldGroup !== options.newGroup) {
                // Update logo if new logo URL provided
                if (options.newLogoUrl) {
                    const logoResult = this._updateEventLogo(parsed.eventId, options.newLogoUrl);
                    if (!logoResult.success) {
                        // Log warning but don't fail the whole operation
                        console.warn(`Logo update failed: ${logoResult.error}`);
                    }
                }
                
                // Swap tags: remove old group tag, add new group tag
                this._removeEventTags([parsed.eventId], [options.oldGroup]);
                this._addEventTags([parsed.eventId], [options.newGroup]);
            }

            return { success: true, data: event };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Create new event, optionally with logo
     * 
     * @param {EventInput} eventData - Event data (domain types, including group for tagging)
     * @param {string | null} [logoUrl] - Optional Drive URL for event logo
     * @returns {CreateEventResult} Result with created event or error
     */
    createEvent(eventData, logoUrl = null) {
        try {
            // Transform domain types to API format
            const apiData = this._transformEventInput(eventData);
            
            /** @type {GoogleAppsScript.URL_Fetch.HTTPResponse} */
            let response;
            
            if (logoUrl) {
                // Download logo and create with multipart form
                const logoBlob = this._downloadBlob(logoUrl);
                if (!logoBlob) {
                    return { success: false, error: `Failed to download logo from ${logoUrl}` };
                }
                response = this._createEventWithLogo(apiData, logoBlob);
            } else {
                // Simple JSON POST
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                const payload = RWGPSCore.buildCreateEventPayload(apiData);
                response = this._adapter.fetchV1('POST', '/events.json', payload);
            }

            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            if (!RWGPSCore.isSuccessResponse(response)) {
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                return RWGPSCore.buildErrorResult(response, 'Create event');
            }

            const body = JSON.parse(response.getContentText());
            const event = body.event || body;

            // Add group tag automatically (internal - not exposed to consumers)
            if (eventData.group) {
                const tagResult = this._addEventTags([String(event.id)], [eventData.group]);
                if (!tagResult.success) {
                    console.warn(`Tag addition failed: ${tagResult.error}`);
                }
            }

            return { success: true, data: event };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Delete multiple events
     * 
     * @param {string[]} eventUrls - Array of event URLs to delete
     * @returns {DeleteResult[]} Array of results per event
     */
    deleteEvents(eventUrls) {
        /** @type {DeleteResult[]} */
        const results = [];
        
        for (const url of eventUrls) {
            try {
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                const parsed = RWGPSCore.parseEventUrl(url);
                const response = this._adapter.fetchV1('DELETE', `/events/${parsed.eventId}.json`);
                
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                if (RWGPSCore.isSuccessResponse(response)) {
                    results.push({ url, success: true });
                } else {
                    // @ts-expect-error - TypeScript can't resolve class methods through module imports
                    const errorMsg = RWGPSCore.buildErrorMessage(response, 'Delete');
                    results.push({ url, success: false, error: errorMsg });
                }
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                results.push({ url, success: false, error: err.message });
            }
        }
        
        return results;
    }

    // =============================================
    // Route Operations
    // =============================================

    /**
     * Import route with automatic group + expiry tagging
     * 
     * @param {RouteInput} routeData - Route import data
     * @returns {ImportRouteResult} Result with imported route or error
     */
    importRoute(routeData) {
        try {
            // Ensure authenticated for web API
            const loginResult = this._adapter.login();
            if (!loginResult.success) {
                return { success: false, error: `Login failed: ${loginResult.error}` };
            }

            // 1. Copy route
            const copyResult = this._copyRoute(routeData.sourceUrl, routeData);
            if (!copyResult.success) {
                return copyResult;
            }

            // 2. Add group + expiry tags (internal)
            /** @type {string[]} */
            const tags = [];
            
            if (routeData.group) {
                tags.push(routeData.group);
            }
            
            if (routeData.rideDate) {
                const expiryDays = this._globals.ROUTE_EXPIRY_DAYS || RWGPSFacade.DEFAULT_EXPIRY_DAYS;
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                const expiryTag = RWGPSCore.buildExpiryTag(routeData.rideDate, expiryDays);
                tags.push(expiryTag);
            }
            
            if (tags.length > 0 && copyResult.routeId) {
                const tagResult = this._addRouteTags(copyResult.routeId, tags);
                if (!tagResult.success) {
                    console.warn(`Route tag addition failed: ${tagResult.error}`);
                }
            }

            return copyResult;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    // =============================================
    // Membership Operations
    // =============================================

    /**
     * Fetch club membership list
     * 
     * @returns {{success: boolean, data?: ClubMember[], error?: string}} Result with members or error
     */
    getClubMembers() {
        try {
            const response = this._adapter.fetchWeb('GET', `/clubs/${RWGPSFacade.CLUB_ID}/table_members.json`);
            
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            if (!RWGPSCore.isSuccessResponse(response)) {
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                return RWGPSCore.buildErrorResult(response, 'Get club members');
            }

            const members = JSON.parse(response.getContentText());
            return { success: true, data: members };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    // =============================================
    // Private Methods
    // =============================================

    /**
     * Transform domain EventInput to API-compatible format
     * 
     * Handles:
     * - startDateTime (Date) → start_date + start_time strings
     * - routeUrls → route_ids (extracts IDs from URLs)
     * - visibility semantic → API value (members_only → friends_only)
     * 
     * @param {EventInput} eventData - Domain event input
     * @returns {Record<string, any>} API-compatible event data
     * @private
     */
    _transformEventInput(eventData) {
        /** @type {Record<string, any>} */
        const apiData = {};

        // Copy simple fields
        if (eventData.name !== undefined) apiData.name = eventData.name;
        if (eventData.description !== undefined) apiData.description = eventData.description;
        if (eventData.timeZone !== undefined) apiData.time_zone = eventData.timeZone;
        if (eventData.organizer_ids !== undefined) apiData.organizer_ids = eventData.organizer_ids;

        // Transform startDateTime (Date) → start_date + start_time strings
        if (eventData.startDateTime !== undefined) {
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            apiData.start_date = RWGPSCore.formatDateForV1Api(eventData.startDateTime);
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            apiData.start_time = RWGPSCore.formatTimeForV1Api(eventData.startDateTime);
        }

        // Transform visibility: members_only → friends_only (RWGPS API name)
        if (eventData.visibility !== undefined) {
            const visibilityMap = {
                'public': 'public',
                'private': 'private',
                'members_only': 'friends_only'  // Domain name → API name
            };
            apiData.visibility = visibilityMap[eventData.visibility] || eventData.visibility;
        }

        // Transform routeUrls → route_ids (extract IDs from URLs)
        if (eventData.routeUrls !== undefined && eventData.routeUrls.length > 0) {
            /** @type {string[]} */
            const routeIds = [];
            for (const url of eventData.routeUrls) {
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                const routeId = RWGPSCore.extractRouteId(url);
                if (routeId) {
                    routeIds.push(routeId);
                } else {
                    console.warn(`Could not extract route ID from URL: ${url}`);
                }
            }
            if (routeIds.length > 0) {
                apiData.route_ids = routeIds;
            }
        }

        return apiData;
    }

    /**
     * Add tags to events
     * 
     * @param {string[]} eventIds - Event IDs to tag
     * @param {string[]} tags - Tags to add
     * @returns {Result} Success or error
     * @private
     */
    _addEventTags(eventIds, tags) {
        try {
            // Ensure authenticated
            if (!this._adapter.isAuthenticated()) {
                const loginResult = this._adapter.login();
                if (!loginResult.success) {
                    return { success: false, error: `Login failed: ${loginResult.error}` };
                }
            }

            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            const payload = RWGPSCore.buildBatchTagPayload(eventIds, 'add', tags);
            const response = this._adapter.fetchWebForm('POST', '/events/batch_update_tags.json', payload);
            
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            if (!RWGPSCore.isSuccessResponse(response)) {
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                return RWGPSCore.buildErrorResult(response, 'Add event tags');
            }

            return { success: true };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Remove tags from events
     * 
     * @param {string[]} eventIds - Event IDs to untag
     * @param {string[]} tags - Tags to remove
     * @returns {Result} Success or error
     * @private
     */
    _removeEventTags(eventIds, tags) {
        try {
            if (!this._adapter.isAuthenticated()) {
                const loginResult = this._adapter.login();
                if (!loginResult.success) {
                    return { success: false, error: `Login failed: ${loginResult.error}` };
                }
            }

            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            const payload = RWGPSCore.buildBatchTagPayload(eventIds, 'remove', tags);
            const response = this._adapter.fetchWebForm('POST', '/events/batch_update_tags.json', payload);
            
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            if (!RWGPSCore.isSuccessResponse(response)) {
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                return RWGPSCore.buildErrorResult(response, 'Remove event tags');
            }

            return { success: true };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Add tags to route
     * 
     * @param {string} routeId - Route ID to tag
     * @param {string[]} tags - Tags to add
     * @returns {Result} Success or error
     * @private
     */
    _addRouteTags(routeId, tags) {
        try {
            if (!this._adapter.isAuthenticated()) {
                const loginResult = this._adapter.login();
                if (!loginResult.success) {
                    return { success: false, error: `Login failed: ${loginResult.error}` };
                }
            }

            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            const payload = RWGPSCore.buildBatchTagPayload([routeId], 'add', tags);
            const response = this._adapter.fetchWebForm('POST', '/routes/batch_update_tags.json', payload);
            
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            if (!RWGPSCore.isSuccessResponse(response)) {
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                return RWGPSCore.buildErrorResult(response, 'Add route tags');
            }

            return { success: true };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Copy route from source URL
     * 
     * @param {string} sourceUrl - Source route URL
     * @param {RouteInput} routeData - Route data for copy
     * @returns {ImportRouteResult} Result with new route or error
     * @private
     */
    _copyRoute(sourceUrl, routeData) {
        try {
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            const parsed = RWGPSCore.parseRouteUrl(sourceUrl);
            
            /** @type {Record<string, string>} */
            const formData = {};
            if (routeData.name) {
                formData['route[name]'] = routeData.name;
            }

            const response = this._adapter.fetchWebForm('POST', `/routes/${parsed.routeId}/copy.json`, formData);
            
            // Copy returns 302 redirect with Location header containing new route URL
            const statusCode = response.getResponseCode();
            if (statusCode === 302 || statusCode === 200) {
                // Extract new route URL from Location header or response
                const headers = /** @type {Record<string, string>} */ (response.getAllHeaders());
                const newRouteUrl = headers['Location'] || headers['location'];
                
                if (newRouteUrl) {
                    // @ts-expect-error - TypeScript can't resolve class methods through module imports
                    const newRouteId = RWGPSCore.extractRouteId(newRouteUrl);
                    return { 
                        success: true, 
                        routeUrl: newRouteUrl,
                        routeId: newRouteId || undefined
                    };
                }
                
                // Try to get route info from response body
                try {
                    const body = JSON.parse(response.getContentText());
                    if (body.id) {
                        return {
                            success: true,
                            routeUrl: `https://ridewithgps.com/routes/${body.id}`,
                            routeId: String(body.id),
                            data: body
                        };
                    }
                } catch (e) {
                    // Not JSON, continue
                }
            }

            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            return RWGPSCore.buildErrorResult(response, 'Copy route');
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Update event logo
     * 
     * @param {string} eventId - Event ID
     * @param {string} logoUrl - Drive URL for new logo
     * @returns {Result} Success or error
     * @private
     */
    _updateEventLogo(eventId, logoUrl) {
        try {
            const logoBlob = this._downloadBlob(logoUrl);
            if (!logoBlob) {
                return { success: false, error: `Failed to download logo from ${logoUrl}` };
            }

            // Use multipart form to update logo
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            const boundary = RWGPSCore.generateBoundary();
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            const payload = RWGPSCore.buildMultipartLogoPayload(eventId, logoBlob, boundary);
            
            const response = this._adapter.fetchV1Multipart('PUT', `/events/${eventId}.json`, payload, boundary);
            
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            if (!RWGPSCore.isSuccessResponse(response)) {
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                return RWGPSCore.buildErrorResult(response, 'Update event logo');
            }

            return { success: true };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Create event with logo using multipart form
     * 
     * @param {Record<string, any>} eventData - Event data (API-transformed)
     * @param {GoogleAppsScript.Base.Blob} logoBlob - Logo blob
     * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse} HTTP response
     * @private
     */
    _createEventWithLogo(eventData, logoBlob) {
        // @ts-expect-error - TypeScript can't resolve class methods through module imports
        const boundary = RWGPSCore.generateBoundary();
        // @ts-expect-error - TypeScript can't resolve class methods through module imports
        const payload = RWGPSCore.buildMultipartCreatePayload(eventData, logoBlob, boundary);
        
        return this._adapter.fetchV1Multipart('POST', '/events.json', payload, boundary);
    }

    /**
     * Download blob from URL (Drive or HTTP)
     * 
     * @param {string} url - URL to download from
     * @returns {GoogleAppsScript.Base.Blob | null} Downloaded blob or null
     * @private
     */
    _downloadBlob(url) {
        try {
            /* istanbul ignore next - GAS-only code */
            if (typeof UrlFetchApp !== 'undefined') {
                const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
                if (response.getResponseCode() === 200) {
                    return response.getBlob();
                }
            }
            return null;
        } catch (error) {
            return null;
        }
    }
}

/* istanbul ignore if - Node.js/Jest export */
if (typeof module !== 'undefined') {
    module.exports = RWGPSFacade;
}
