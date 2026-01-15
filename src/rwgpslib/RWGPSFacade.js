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
    var RWGPSClientCore = require('./RWGPSClientCore');
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
 * Wrapped in IIFE for GAS compatibility (avoids duplicate class declarations)
 */
var RWGPSFacade = (function() {

class RWGPSFacade {
    /**
     * Club ID for membership operations
     * @returns {number}
     */
    static get CLUB_ID() {
        return 47;
    }

    /**
     * Default route expiry days
     * @returns {number}
     */
    static get DEFAULT_EXPIRY_DAYS() {
        return 30;
    }

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
    // Template Operations (for legacy compatibility)
    // =============================================

    /**
     * Copy an event template to create a new event
     * Returns the new event URL
     * 
     * @param {string} templateUrl - URL of template event to copy
     * @returns {{success: boolean, eventUrl?: string, eventId?: string, error?: string}} Result with new event URL
     */
    copyTemplate(templateUrl) {
        try {
            // Ensure authenticated for web API
            const loginResult = this._adapter.login();
            if (!loginResult.success) {
                return { success: false, error: `Login failed: ${loginResult.error}` };
            }

            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            const parsed = RWGPSCore.parseEventUrl(templateUrl);
            
            // Copy via web API (POST to /events/{id}/copy)
            const response = this._adapter.fetchWebForm('POST', `/events/${parsed.eventId}/copy.json`, {});
            
            // Copy returns 302 redirect with Location header
            const statusCode = response.getResponseCode();
            if (statusCode === 302 || statusCode === 200) {
                const headers = /** @type {Record<string, string>} */ (response.getAllHeaders());
                const newEventUrl = headers['Location'] || headers['location'];
                
                if (newEventUrl) {
                    // Extract event ID from URL (format: "https://ridewithgps.com/events/12345-name")
                    const eventId = newEventUrl.split('/').pop()?.split('-')[0];
                    return {
                        success: true,
                        eventUrl: newEventUrl,
                        eventId: eventId
                    };
                }
            }

            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            return RWGPSCore.buildErrorResult(response, 'Copy template');
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Lookup organizers by name
     * Returns organizer objects with id and text
     * 
     * @param {string[]} names - Array of organizer names to look up
     * @param {string} templateUrl - Event URL to use for lookup (has autocomplete endpoint)
     * @returns {{success: boolean, data?: Array<{id: number, text: string}>, error?: string}} Result with organizers
     */
    getOrganizers(names, templateUrl) {
        try {
            if (!names || names.length === 0) {
                return { success: true, data: [] };
            }

            // Ensure authenticated
            if (!this._adapter.isAuthenticated()) {
                const loginResult = this._adapter.login();
                if (!loginResult.success) {
                    return { success: false, error: `Login failed: ${loginResult.error}` };
                }
            }

            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            const parsed = RWGPSCore.parseEventUrl(templateUrl);
            
            /** @type {Array<{id: number, text: string}>} */
            const organizers = [];
            
            for (const name of names) {
                const trimmedName = name.trim();
                if (!trimmedName) continue;
                
                // Use autocomplete endpoint to search for organizer
                const queryParams = `q=${encodeURIComponent(trimmedName)}`;
                const response = this._adapter.fetchWeb('GET', `/events/${parsed.eventId}/organizer_ids?${queryParams}`);
                
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                if (RWGPSCore.isSuccessResponse(response)) {
                    try {
                        const content = JSON.parse(response.getContentText());
                        const results = content.results || [];
                        
                        // Find exact match (case-insensitive, whitespace-normalized)
                        const normalizedSearch = trimmedName.toLowerCase().replace(/\s+/g, '');
                        const found = results.find((/** @type {{text: string, id: number}} */ r) => 
                            r.text.toLowerCase().replace(/\s+/g, '') === normalizedSearch
                        );
                        
                        if (found) {
                            organizers.push(found);
                        } else {
                            // Return TBD placeholder if not found
                            // Consumers should handle this with their own TBD logic
                            organizers.push({ id: -1, text: trimmedName });
                        }
                    } catch (e) {
                        organizers.push({ id: -1, text: trimmedName });
                    }
                } else {
                    organizers.push({ id: -1, text: trimmedName });
                }
            }

            return { success: true, data: organizers };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Set or update route expiration tag
     * Uses legacy format "expires: MM/DD/YYYY" for backward compatibility
     * 
     * @param {string} routeUrl - Route URL
     * @param {Date} expiryDate - New expiration date
     * @param {boolean} [extendOnly=false] - If true, only update if expiration already exists
     * @returns {Result} Success or error
     */
    setRouteExpiration(routeUrl, expiryDate, extendOnly = false) {
        try {
            if (!routeUrl) {
                return { success: true }; // No-op if no URL
            }

            // Ensure authenticated
            if (!this._adapter.isAuthenticated()) {
                const loginResult = this._adapter.login();
                if (!loginResult.success) {
                    return { success: false, error: `Login failed: ${loginResult.error}` };
                }
            }

            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            const parsed = RWGPSCore.parseRouteUrl(routeUrl);
            
            // Get current route to find existing expiry tag
            const routeResponse = this._adapter.fetchV1('GET', `/routes/${parsed.routeId}.json`);
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            if (!RWGPSCore.isSuccessResponse(routeResponse)) {
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                return RWGPSCore.buildErrorResult(routeResponse, 'Get route for expiration');
            }
            
            const routeBody = JSON.parse(routeResponse.getContentText());
            const route = routeBody.route || routeBody;
            const tagNames = route.tag_names || [];
            
            // Find existing expiration tag (legacy format: "expires: MM/DD/YYYY")
            const existingExpiry = tagNames.find((/** @type {string} */ t) => t.startsWith('expires: '));
            
            // Build new expiry tag (legacy format for backward compatibility)
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            const newExpiryTag = RWGPSCore.buildLegacyExpiryTag(expiryDate);
            
            if (!existingExpiry) {
                // No existing expiry
                if (extendOnly) {
                    // extendOnly but no existing tag - no-op
                    return { success: true };
                }
                // Add new tag
                return this._addRouteTags(parsed.routeId, [newExpiryTag]);
            } else {
                // Has existing expiry - check if new date is later
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                const existingDate = RWGPSCore.parseLegacyExpiryTag(existingExpiry);
                
                if (existingDate && expiryDate > existingDate) {
                    // Remove old, add new
                    const removeResult = this._removeRouteTags(parsed.routeId, [existingExpiry]);
                    if (!removeResult.success) {
                        return removeResult;
                    }
                    return this._addRouteTags(parsed.routeId, [newExpiryTag]);
                }
                // Existing date is same or later - no change needed
                return { success: true };
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    // =============================================
    // Tag Operations (public - for legacy compatibility)
    // =============================================

    /**
     * Remove tags from events (public version of _removeEventTags)
     * 
     * @param {string[]} eventUrls - Event URLs to untag
     * @param {string[]} tags - Tags to remove
     * @returns {Result} Success or error
     */
    removeEventTags(eventUrls, tags) {
        // Convert URLs to IDs
        /** @type {string[]} */
        const eventIds = [];
        for (const url of eventUrls) {
            try {
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                const parsed = RWGPSCore.parseEventUrl(url);
                eventIds.push(parsed.eventId);
            } catch (e) {
                // If URL parsing fails, try using as ID directly
                const idMatch = url.match(/(\d+)/);
                if (idMatch) {
                    eventIds.push(idMatch[1]);
                }
            }
        }
        
        if (eventIds.length === 0) {
            return { success: true }; // No valid IDs
        }
        
        return this._removeEventTags(eventIds, tags);
    }

    /**
     * Add tags to events
     * 
     * @param {string[]} eventUrls - Event URLs to tag
     * @param {string[]} tags - Tags to add
     * @returns {Result} Success or error
     */
    addEventTags(eventUrls, tags) {
        // Convert URLs to IDs
        /** @type {string[]} */
        const eventIds = [];
        for (const url of eventUrls) {
            try {
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                const parsed = RWGPSCore.parseEventUrl(url);
                eventIds.push(parsed.eventId);
            } catch (e) {
                const idMatch = url.match(/(\d+)/);
                if (idMatch) {
                    eventIds.push(idMatch[1]);
                }
            }
        }
        
        if (eventIds.length === 0) {
            return { success: true };
        }
        
        return this._addEventTags(eventIds, tags);
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
     * Remove tags from route
     * 
     * @param {string} routeId - Route ID to untag
     * @param {string[]} tags - Tags to remove
     * @returns {Result} Success or error
     * @private
     */
    _removeRouteTags(routeId, tags) {
        try {
            if (!this._adapter.isAuthenticated()) {
                const loginResult = this._adapter.login();
                if (!loginResult.success) {
                    return { success: false, error: `Login failed: ${loginResult.error}` };
                }
            }

            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            const payload = RWGPSCore.buildBatchTagPayload([routeId], 'remove', tags);
            const response = this._adapter.fetchWebForm('POST', '/routes/batch_update_tags.json', payload);
            
            // @ts-expect-error - TypeScript can't resolve class methods through module imports
            if (!RWGPSCore.isSuccessResponse(response)) {
                // @ts-expect-error - TypeScript can't resolve class methods through module imports
                return RWGPSCore.buildErrorResult(response, 'Remove route tags');
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
     * REUSES the proven RWGPSClientCore.buildMultipartCreateEventPayload implementation
     * 
     * @param {Record<string, any>} eventData - Event data (API-transformed)
     * @param {GoogleAppsScript.Base.Blob} logoBlob - Logo blob
     * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse} HTTP response
     * @private
     */
    _createEventWithLogo(eventData, logoBlob) {
        // Use same boundary format as working RWGPSClient
        const boundary = '----WebKitFormBoundary' + Utilities.getUuid().replace(/-/g, '');
        
        // REUSE the proven working implementation from RWGPSClientCore
        // This handles multipart encoding, logo attachment, and byte concatenation correctly
        const payload = RWGPSClientCore.buildMultipartCreateEventPayload(eventData, logoBlob, boundary);
        
        // Make direct request (same as working RWGPSClient pattern)
        const url = 'https://ridewithgps.com/api/v1/events.json';
        const options = {
            method: /** @type {GoogleAppsScript.URL_Fetch.HttpMethod} */ ('post'),
            headers: {
                'Authorization': this._adapter._getBasicAuthHeader(),
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Accept': 'application/json'
            },
            payload: payload.getBytes(),
            muteHttpExceptions: true
        };
        
        return UrlFetchApp.fetch(url, options);
    }

    /**
     * Download blob from URL (Drive or HTTP)
     * 
     * @param {string} url - URL to download from (Google Drive URL or HTTP URL)
     * @returns {GoogleAppsScript.Base.Blob | null} Downloaded blob or null
     * @private
     */
    _downloadBlob(url) {
        try {
            /* istanbul ignore next - GAS-only code */
            if (typeof DriveApp !== 'undefined' || typeof UrlFetchApp !== 'undefined') {
                // Check if it's a Google Drive URL
                // Format: https://drive.google.com/file/d/FILE_ID/view?...
                // Or: https://drive.google.com/open?id=FILE_ID
                const driveFileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || 
                                        url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                
                if (driveFileIdMatch && typeof DriveApp !== 'undefined') {
                    // It's a Drive URL - use DriveApp to get the blob
                    const fileId = driveFileIdMatch[1];
                    console.log(`_downloadBlob: Fetching from Drive, fileId=${fileId}`);
                    const file = DriveApp.getFileById(fileId);
                    return file.getBlob();
                }
                
                // Fall back to HTTP fetch for non-Drive URLs
                if (typeof UrlFetchApp !== 'undefined') {
                    console.log(`_downloadBlob: Fetching via HTTP: ${url}`);
                    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
                    if (response.getResponseCode() === 200) {
                        return response.getBlob();
                    }
                    console.warn(`_downloadBlob: HTTP fetch failed with code ${response.getResponseCode()}`);
                }
            }
            return null;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(`_downloadBlob: Error downloading from ${url}: ${err.message}`);
            return null;
        }
    }
}

return RWGPSFacade;
})();

/* istanbul ignore if - Node.js/Jest export */
if (typeof module !== 'undefined') {
    module.exports = RWGPSFacade;
}
