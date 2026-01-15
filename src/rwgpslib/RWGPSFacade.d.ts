/**
 * RWGPSFacade Type Definitions
 * 
 * Public API for RWGPS operations
 */

import type RWGPSAdapter from './RWGPSAdapter';

// =============================================
// Result Types
// =============================================

/**
 * Base result type for all operations
 */
export interface Result<T = void> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Event data from API
 */
export interface EventData {
    id: number;
    name: string;
    description?: string;
    start_date?: string;
    start_time?: string;
    time_zone?: string;
    visibility?: number;
    logo_url?: string;
    organizer_ids?: number[];
    route_ids?: number[];
}

/**
 * Result from getEvent
 */
export type GetEventResult = Result<EventData>;

/**
 * Result from editEvent
 */
export type EditEventResult = Result<EventData>;

/**
 * Result from createEvent
 */
export type CreateEventResult = Result<EventData>;

/**
 * Result from deleteEvents
 */
export interface DeleteResult {
    url: string;
    success: boolean;
    error?: string;
}

/**
 * Route data from API
 */
export interface RouteData {
    id: number;
    name: string;
    distance?: number;
    elevation_gain?: number;
}

/**
 * Result from importRoute
 */
export interface ImportRouteResult extends Result<RouteData> {
    routeUrl?: string;
    routeId?: string;
}

/**
 * Club member data
 */
export interface ClubMember {
    user: {
        id: number;
        first_name: string;
        last_name: string;
    };
}

// =============================================
// Input Types
// =============================================

/**
 * Event visibility options
 * - 'public': Visible to everyone
 * - 'private': Only visible to organizers
 * - 'members_only': Only visible to club members (maps to RWGPS 'friends_only')
 */
export type EventVisibility = 'public' | 'private' | 'members_only';

/**
 * Event data for create/edit operations
 * Uses domain-friendly types - facade handles conversion to RWGPS API format
 */
export interface EventInput {
    name: string;
    description?: string;
    /** Event start date and time (facade formats for API) */
    startDateTime?: Date;
    /** Timezone (e.g., 'America/Los_Angeles') */
    timeZone?: string;
    /** Event visibility */
    visibility?: EventVisibility;
    /** Group name for tagging */
    group?: string;
    /** Organizer RWGPS user IDs */
    organizer_ids?: number[];
    /** Route URLs - facade extracts route IDs internally */
    routeUrls?: string[];
}

/**
 * Options for editEvent when changing groups
 */
export interface EditEventOptions {
    oldGroup?: string;
    newGroup?: string;
    newLogoUrl?: string;
}

/**
 * Route import data
 */
export interface RouteInput {
    sourceUrl: string;
    name?: string;
    group?: string;
    rideDate?: Date;
}

/**
 * Globals interface (for route expiry config)
 */
export interface GlobalsProvider {
    ROUTE_EXPIRY_DAYS?: number;
}

// =============================================
// RWGPSFacade Class
// =============================================

/**
 * RWGPSFacade - Public API for RWGPS operations
 */
declare class RWGPSFacade {
    /**
     * Create facade with adapter and globals
     * @param adapter - RWGPSAdapter instance (optional, creates default)
     * @param globals - Globals provider for config (optional)
     */
    constructor(adapter?: RWGPSAdapter, globals?: GlobalsProvider);

    // =============================================
    // Event Operations
    // =============================================

    /**
     * Fetch single event by URL
     * @param eventUrl - Full event URL
     * @returns Result with event data or error
     */
    getEvent(eventUrl: string): GetEventResult;

    /**
     * Update event fields, optionally change group
     * @param eventUrl - Full event URL
     * @param eventData - Fields to update
     * @param options - Group change options (logo, tags)
     * @returns Result with updated event or error
     */
    editEvent(eventUrl: string, eventData: EventInput, options?: EditEventOptions): EditEventResult;

    /**
     * Create new event, optionally with logo
     * @param eventData - Event data (including group for tagging)
     * @param logoUrl - Optional Drive URL for event logo
     * @returns Result with created event or error
     */
    createEvent(eventData: EventInput, logoUrl?: string | null): CreateEventResult;

    /**
     * Delete multiple events
     * @param eventUrls - Array of event URLs to delete
     * @returns Array of results per event
     */
    deleteEvents(eventUrls: string[]): DeleteResult[];

    // =============================================
    // Route Operations
    // =============================================

    /**
     * Import route with automatic group + expiry tagging
     * @param routeData - Route import data (sourceUrl, group, rideDate)
     * @returns Result with imported route or error
     */
    importRoute(routeData: RouteInput): ImportRouteResult;

    // =============================================
    // Membership Operations
    // =============================================

    /**
     * Fetch club membership list
     * @returns Array of club members
     */
    getClubMembers(): Result<ClubMember[]>;

    // =============================================
    // Private Methods (not for external use)
    // =============================================

    /** @private */
    _addEventTags(eventIds: string[], tags: string[]): Result;
    /** @private */
    _removeEventTags(eventIds: string[], tags: string[]): Result;
    /** @private */
    _addRouteTags(routeId: string, tags: string[]): Result;
    /** @private */
    _copyRoute(sourceUrl: string, routeData: RouteInput): ImportRouteResult;
    /** @private */
    _updateEventLogo(eventId: string, logoBlob: GoogleAppsScript.Base.Blob): Result;
}

export default RWGPSFacade;
