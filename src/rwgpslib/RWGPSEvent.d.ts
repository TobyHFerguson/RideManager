/**
 * RWGPS Event Types - Derived from OpenAPI spec and verified behavior
 * 
 * These types represent the RWGPS API's event data structures.
 * For the domain model, see SCCCCEvent.
 * 
 * Type hierarchy:
 * - RWGPSEventSummary: Basic event fields returned in list operations
 * - RWGPSEvent: Full event with organizers, routes (returned by GET/PUT)
 * - RWGPSEventPayload: Wrapper for POST/PUT requests { event: {...} }
 * - RWGPSEventInput: Fields valid for create/edit operations
 * 
 * Sources:
 * - docs/rwgps-openapi.yaml (EventSummary, Event, EventPayload schemas)
 * - docs/rwgps-api-tested.yaml (verified behavior, undocumented fields)
 */

/**
 * Organizer object in API responses
 * Note: For SETTING organizers, use organizer_ids (number[]) not this structure
 */
export interface RWGPSOrganizer {
    id: number;
    /** Username or display name */
    text?: string;
    name?: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Route object in API responses
 * Note: For SETTING routes, use route_ids (number[]) not this structure
 */
export interface RWGPSRoute {
    id: number;
    name?: string;
    url?: string;
    description?: string;
    distance?: number;
    elevation_gain?: number;
    user_id?: number;
}

/**
 * Basic event fields - returned in list operations
 * Matches OpenAPI EventSummary schema (docs/rwgps-openapi.yaml lines 2561-2618)
 */
export interface RWGPSEventSummary {
    id: number;
    user_id: number;
    url: string;
    html_url?: string;
    visibility: number | string;
    name: string;
    description: string | null;
    logo_url: string | null;
    banner_url: string | null;
    location: string | null;
    lat: number | null;
    lng: number | null;
    time_zone: string;
    start_date: string;
    start_time: string;
    end_date?: string;
    end_time?: string;
    all_day: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Full event object returned by GET/PUT requests
 * Extends EventSummary with organizers, routes, photos
 * Matches OpenAPI Event schema (docs/rwgps-openapi.yaml lines 2619-2645)
 */
export interface RWGPSEvent extends RWGPSEventSummary {
    /** Array of organizer objects (read-only in responses) */
    organizers: RWGPSOrganizer[];
    /** Array of associated route objects (read-only in responses) */
    routes?: RWGPSRoute[];
    /** Photos associated with the event */
    photos?: Array<{
        id: number;
        url: string;
        caption?: string;
    }>;
}

/**
 * Event input fields valid for create/edit operations
 * 
 * CRITICAL: Some fields behave differently in input vs output:
 * - organizer_ids: UNDOCUMENTED but WORKS - use this to set organizers
 * - route_ids: UNDOCUMENTED but WORKS - use this to set routes
 * - organizers: DOCUMENTED but IGNORED - do NOT use for setting
 * - visibility: number (0=public, 1=private, 2=club)
 * - all_day: boolean (per OpenAPI spec)
 */
export interface RWGPSEventInput {
    /** Event name/title (required for create) */
    name?: string;
    /** Event description */
    description?: string | null;
    /** Meeting location */
    location?: string | null;
    /** Latitude of meeting point */
    lat?: number | null;
    /** Longitude of meeting point */
    lng?: number | null;
    /** IANA timezone identifier (e.g., "America/Los_Angeles") */
    time_zone?: string;
    /** Start date (YYYY-MM-DD) */
    start_date?: string;
    /** Start time (HH:MM) */
    start_time?: string;
    /** End date (YYYY-MM-DD) */
    end_date?: string;
    /** End time (HH:MM) */
    end_time?: string;
    /** Whether this is an all-day event */
    all_day?: boolean;
    /** Visibility: 0=public, 1=private, 2=club */
    visibility?: number;
    
    /**
     * Array of user IDs to set as organizers.
     * UNDOCUMENTED but WORKS - this is the CORRECT way to set organizers.
     * @see docs/rwgps-api-tested.yaml
     */
    organizer_ids?: number[];
    
    /**
     * Array of route IDs to associate with the event.
     * UNDOCUMENTED but WORKS.
     * @see docs/rwgps-api-tested.yaml
     */
    route_ids?: number[];
}

/**
 * Request payload wrapper for POST/PUT event operations
 * Matches OpenAPI EventPayload schema (docs/rwgps-openapi.yaml lines 2646-2690)
 * 
 * @example
 * const payload: RWGPSEventPayload = {
 *     event: {
 *         name: "Saturday Morning Ride",
 *         start_date: "2025-03-15",
 *         start_time: "09:00",
 *         visibility: 0,
 *         all_day: false
 *     }
 * };
 */
export interface RWGPSEventPayload {
    event: RWGPSEventInput;
}

/**
 * Standard API response wrapper for event operations
 */
export interface RWGPSEventResponse {
    event: RWGPSEvent;
}

/**
 * Result type for RWGPSClient event operations
 * Consistent return structure across getEvent, editEvent, createEvent, etc.
 */
export interface RWGPSEventResult {
    success: boolean;
    /** Full event object when operation succeeds */
    event?: RWGPSEvent;
    /** Event URL for create operations */
    eventUrl?: string;
    /** Error message when operation fails */
    error?: string;
}
