/**
 * Type definitions for LegacyRWGPSAdapter
 * Provides legacy RWGPS method signatures for backward compatibility
 */

import type RWGPSFacade from './RWGPSFacade';

/** Organizer object returned by getOrganizers */
export interface Organizer {
    id: number;
    text: string;
}

/** Route import parameters (legacy format) */
export interface LegacyRouteImport {
    url: string;
    expiry?: Date;
    tags?: string[];
    name?: string;
}

/**
 * LegacyRWGPSAdapter - Wraps RWGPSFacade with legacy method names
 */
declare class LegacyRWGPSAdapter {
    /**
     * Create adapter with facade and globals
     */
    constructor(facade: InstanceType<typeof RWGPSFacade>, globals: Record<string, any>);

    // Event Operations
    
    /** Get event by URL (legacy: get_event) */
    get_event(eventUrl: string): any;
    
    /** Edit event (legacy: edit_event) */
    edit_event(eventUrl: string, eventData: any): any;
    
    /** Copy event template (legacy: copy_template_) */
    copy_template_(templateUrl: string): string;
    
    /** Batch delete events (legacy: batch_delete_events) */
    batch_delete_events(eventUrls: string[]): void;

    // Route Operations
    
    /** Import route (legacy: importRoute) */
    importRoute(route: LegacyRouteImport): string;
    
    /** Set route expiration (legacy: setRouteExpiration) */
    setRouteExpiration(routeUrl: string, expiryDate: Date, extendOnly?: boolean): this;

    // Organizer Operations
    
    /** Get organizers by name (legacy: getOrganizers) */
    getOrganizers(names: string[]): Organizer[] | Organizer;

    // Tag Operations
    
    /** Remove tags from events (legacy: unTagEvents) */
    unTagEvents(eventUrls: string[], tags: string[]): void;
    
    /** Add tags to events (legacy: tagEvents) */
    tagEvents(eventUrls: string[], tags: string[]): void;

    // Club Operations
    
    /** Get club members (legacy: get_club_members) */
    get_club_members(): any[];
}

export default LegacyRWGPSAdapter;
