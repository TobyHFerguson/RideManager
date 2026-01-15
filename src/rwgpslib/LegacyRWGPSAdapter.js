/**
 * LegacyRWGPSAdapter.js
 * 
 * Adapter that wraps RWGPSFacade with legacy RWGPS method names
 * Allows existing consumers (RideManager, RideCoordinator) to work unchanged
 * while using the new architecture under the hood.
 * 
 * Legacy method names → Facade method names:
 * - get_event(url) → getEvent(url)
 * - edit_event(url, event) → editEvent(url, event)
 * - importRoute(route) → importRoute(routeData)
 * - copy_template_(url) → copyTemplate(url)
 * - getOrganizers(names) → getOrganizers(names, templateUrl)
 * - setRouteExpiration(url, date, force) → setRouteExpiration(url, date, extendOnly)
 * - unTagEvents(urls, tags) → removeEventTags(urls, tags)
 * - batch_delete_events(urls) → deleteEvents(urls)
 * 
 * @module LegacyRWGPSAdapter
 */

/// <reference path="../gas-globals.d.ts" />
/// <reference path="./RWGPSFacade.d.ts" />

// @ts-check

/* istanbul ignore if - GAS runtime check */
if (typeof require !== 'undefined') {
    var RWGPSFacade = require('./RWGPSFacade');
}

/**
 * LegacyRWGPSAdapter - Wraps RWGPSFacade with legacy method names
 * Wrapped in IIFE for GAS compatibility
 */
var LegacyRWGPSAdapter = (function() {

class LegacyRWGPSAdapter {
    /**
     * Create adapter with facade and globals
     * 
     * @param {InstanceType<typeof RWGPSFacade>} facade - RWGPSFacade instance
     * @param {Record<string, any>} globals - Globals for TBD values
     */
    constructor(facade, globals) {
        /** @type {InstanceType<typeof RWGPSFacade>} */
        this._facade = facade;
        
        /** @type {Record<string, any>} */
        this._globals = globals || {};
    }

    // =============================================
    // Event Operations (legacy names)
    // =============================================

    /**
     * Get event by URL
     * Legacy name: get_event
     * 
     * @param {string} eventUrl - Event URL
     * @returns {any} Event data (throws on error for legacy compatibility)
     */
    get_event(eventUrl) {
        const result = this._facade.getEvent(eventUrl);
        if (!result.success) {
            throw new Error(`get_event failed: ${result.error}`);
        }
        return result.data;
    }

    /**
     * Edit event
     * Legacy name: edit_event
     * 
     * @param {string} eventUrl - Event URL
     * @param {any} eventData - Event data to update
     * @returns {any} Response (throws on error)
     */
    edit_event(eventUrl, eventData) {
        // Legacy code expects all_day workaround - the facade handles this internally
        const result = this._facade.editEvent(eventUrl, eventData);
        if (!result.success) {
            throw new Error(`edit_event failed: ${result.error}`);
        }
        return result.data;
    }

    /**
     * Copy event template - NOW CREATES A NEW EVENT DIRECTLY
     * Legacy name: copy_template_
     * 
     * Instead of copying a template, this creates a new blank event
     * that will be immediately filled in by the subsequent edit_event() call.
     * This eliminates the dependency on template events.
     * 
     * @param {string} templateUrl - Template event URL (now ignored - kept for API compatibility)
     * @returns {string} New event URL (throws on error)
     */
    copy_template_(templateUrl) {
        // Extract group from template URL or globals for logo lookup
        // Templates are named like "A_TEMPLATE", "B_TEMPLATE" etc.
        // We need to get the group's logo URL to create the event with a logo
        
        // Get logo URL from group specs if possible
        let logoUrl = null;
        const groupSpecs = typeof getGroupSpecs === 'function' ? getGroupSpecs() : {};
        
        console.log('copy_template_: Looking for template:', templateUrl);
        console.log('copy_template_: Available group specs:', JSON.stringify(Object.keys(groupSpecs)));
        
        // Try to find which group this template belongs to
        for (const [groupName, specs] of Object.entries(groupSpecs)) {
            console.log(`copy_template_: Checking group ${groupName}, Template=${specs?.Template}, LogoURL=${specs?.LogoURL}`);
            if (specs && specs.Template === templateUrl && specs.LogoURL) {
                logoUrl = specs.LogoURL;
                console.log(`copy_template_: Found logo for group ${groupName}:`, logoUrl);
                break;
            }
        }
        
        if (!logoUrl) {
            console.warn('copy_template_: No logo URL found for template:', templateUrl);
        }
        
        // Create a minimal event that will be filled in by edit_event
        const minimalEventData = {
            name: 'Placeholder Event (being created)', // Will be overwritten by edit_event
            description: 'This event is being created...',
            visibility: 'private' // Start private, will be updated
        };
        
        const result = this._facade.createEvent(minimalEventData, logoUrl);
        if (!result.success) {
            throw new Error(`copy_template_ failed: ${result.error}`);
        }
        
        // Return full event URL (legacy code uses this)
        // The format expected is: "https://ridewithgps.com/events/12345" or just the URL portion
        const eventId = result.data?.id;
        if (eventId) {
            return `https://ridewithgps.com/events/${eventId}`;
        }
        
        throw new Error('copy_template_ failed: No event ID returned');
    }

    /**
     * Batch delete events
     * Legacy name: batch_delete_events
     * 
     * @param {string[]} eventUrls - Event URLs to delete
     * @returns {void} (throws on any error)
     */
    batch_delete_events(eventUrls) {
        const results = this._facade.deleteEvents(eventUrls);
        
        // Check for any failures
        const failures = results.filter(r => !r.success);
        if (failures.length > 0) {
            const errorMsgs = failures.map(f => `${f.url}: ${f.error}`).join('; ');
            throw new Error(`batch_delete_events had failures: ${errorMsgs}`);
        }
    }

    // =============================================
    // Route Operations (legacy names)
    // =============================================

    /**
     * Import route
     * Legacy name: importRoute
     * 
     * @param {{url: string, expiry?: Date, tags?: string[], name?: string}} route - Route import params
     * @returns {string} New route URL (throws on error)
     */
    importRoute(route) {
        const routeData = {
            sourceUrl: route.url,
            name: route.name,
            rideDate: route.expiry, // Legacy uses 'expiry' field
            group: route.tags?.[0] // First tag is typically group
        };
        
        const result = this._facade.importRoute(routeData);
        if (!result.success) {
            throw new Error(`importRoute failed: ${result.error}`);
        }
        return result.routeUrl || '';
    }

    /**
     * Set route expiration
     * Legacy name: setRouteExpiration
     * 
     * @param {string} routeUrl - Route URL
     * @param {Date} expiryDate - Expiration date  
     * @param {boolean} [extendOnly=false] - Only extend if already has expiry
     * @returns {this} Returns self for chaining
     */
    setRouteExpiration(routeUrl, expiryDate, extendOnly = false) {
        const result = this._facade.setRouteExpiration(routeUrl, expiryDate, extendOnly);
        if (!result.success) {
            console.warn(`setRouteExpiration warning: ${result.error}`);
            // Don't throw - legacy code continues on tag errors
        }
        return this;
    }

    // =============================================
    // Organizer Operations (legacy names)
    // =============================================

    /**
     * Get organizers by name
     * Legacy name: getOrganizers
     * 
     * @param {string[]} names - Organizer names to look up
     * @returns {Array<{id: number, text: string}>} Organizer objects
     */
    getOrganizers(names) {
        if (!names || names.length === 0) {
            return [];
        }

        // Use A_TEMPLATE from globals for the lookup URL
        const templateUrl = this._globals.A_TEMPLATE;
        if (!templateUrl) {
            console.warn('getOrganizers: No A_TEMPLATE in globals, returning TBD organizers');
            return names.map(name => ({ 
                id: this._globals.RIDE_LEADER_TBD_ID || -1, 
                text: name 
            }));
        }

        const result = this._facade.getOrganizers(names, templateUrl);
        if (!result.success) {
            console.warn(`getOrganizers warning: ${result.error}`);
            // Return TBD organizers on failure (legacy behavior)
            return names.map(name => ({ 
                id: this._globals.RIDE_LEADER_TBD_ID || -1, 
                text: name 
            }));
        }

        const organizers = result.data || [];
        
        // Replace -1 IDs with actual TBD ID from globals
        const tbdId = this._globals.RIDE_LEADER_TBD_ID || -1;
        const fixedOrganizers = organizers.map(o => ({
            id: o.id === -1 ? tbdId : o.id,
            text: o.text
        }));

        // Legacy behavior: if any known organizers found, return them; else return single TBD
        const knownOrganizers = fixedOrganizers.filter(o => o.id !== tbdId);
        if (knownOrganizers.length > 0) {
            return knownOrganizers;
        }
        
        // Return TBD organizer (legacy returns object, not array, when all unknown)
        return { id: tbdId, text: this._globals.RIDE_LEADER_TBD_NAME || 'TBD' };
    }

    // =============================================
    // Tag Operations (legacy names)
    // =============================================

    /**
     * Remove tags from events
     * Legacy name: unTagEvents
     * 
     * @param {string[]} eventUrls - Event URLs
     * @param {string[]} tags - Tags to remove
     * @returns {void}
     */
    unTagEvents(eventUrls, tags) {
        const result = this._facade.removeEventTags(eventUrls, tags);
        if (!result.success) {
            console.warn(`unTagEvents warning: ${result.error}`);
            // Don't throw - legacy code continues on tag errors
        }
    }

    /**
     * Add tags to events
     * Legacy name: tagEvents
     * 
     * @param {string[]} eventUrls - Event URLs  
     * @param {string[]} tags - Tags to add
     * @returns {void}
     */
    tagEvents(eventUrls, tags) {
        const result = this._facade.addEventTags(eventUrls, tags);
        if (!result.success) {
            console.warn(`tagEvents warning: ${result.error}`);
        }
    }

    // =============================================
    // Club Operations (legacy names)
    // =============================================

    /**
     * Get club members
     * Legacy name: get_club_members
     * 
     * @returns {any[]} Club members array (throws on error)
     */
    get_club_members() {
        const result = this._facade.getClubMembers();
        if (!result.success) {
            throw new Error(`get_club_members failed: ${result.error}`);
        }
        return result.data || [];
    }
}

return LegacyRWGPSAdapter;
})();

/* istanbul ignore if - Node.js/Jest export */
if (typeof module !== 'undefined') {
    module.exports = LegacyRWGPSAdapter;
}
