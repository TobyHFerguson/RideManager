/**
 * RWGPSCore.d.ts
 * 
 * Type definitions for RWGPS API pure JavaScript business logic
 * NO GAS dependencies - fully testable in Jest
 */

/**
 * Parsed event URL result
 */
export interface ParsedEventUrl {
    eventId: string;
    fullUrl: string;
}

/**
 * Parsed route URL result
 */
export interface ParsedRouteUrl {
    routeId: string;
    fullUrl: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * HTTP request options for GAS UrlFetchApp
 */
export interface RequestOptions {
    method: string;
    headers: Record<string, string>;
    payload?: string;
    muteHttpExceptions: boolean;
}

/**
 * v1 API event payload (wrapped in "event" key)
 */
export interface V1EventPayload {
    event: {
        name?: string;
        description?: string;
        start_date?: string;
        start_time?: string;
        end_date?: string;
        end_time?: string;
        location?: string;
        time_zone?: string;
        visibility?: string;
        all_day?: string;
        organizer_ids?: string[];
        route_ids?: string[];
    };
}

/**
 * Web API event payload (flat structure)
 */
export interface WebEventPayload {
    name?: string;
    desc?: string;
    start_date?: string;
    start_time?: string;
    location?: string;
    visibility?: number;
    all_day?: string;
    organizer_tokens?: string[];
    route_ids?: string[];
}

/**
 * Normalized event response (used internally)
 */
export interface NormalizedEvent {
    id: number;
    name: string;
    desc?: string;
    starts_at?: string;
    ends_at?: string;
    location?: string;
    visibility?: number;
    all_day?: boolean;
    organizer_ids?: number[];
    routes?: Array<{ id: number }>;
}

/**
 * Organizer search result
 */
export interface OrganizerResult {
    id: number;
    text: string;
}

/**
 * SCCCCEvent-like domain object (input to transformation methods)
 */
export interface DomainEvent {
    name: string;
    desc?: string;
    start_date: Date | string;
    start_time: Date | string;
    end_date?: Date | string;
    end_time?: Date | string;
    location?: string;
    visibility?: number | string;
    all_day?: string;
    organizer_tokens?: string[];
    route_ids?: string[];
}

/**
 * RWGPSCore - Pure JavaScript business logic for RWGPS API operations
 * 
 * This class contains NO GAS dependencies and is fully testable in Jest.
 * All HTTP calls are delegated to RWGPSAdapter.
 */
declare class RWGPSCore {
    // =============================================
    // URL Parsing & Validation
    // =============================================
    
    /**
     * Parse event URL and extract event ID
     * @throws {Error} If URL is invalid or doesn't contain event ID
     */
    static parseEventUrl(eventUrl: string): ParsedEventUrl;
    
    /**
     * Parse route URL and extract route ID
     * @throws {Error} If URL is invalid or doesn't contain route ID
     */
    static parseRouteUrl(routeUrl: string): ParsedRouteUrl;
    
    /**
     * Check if URL is a valid RWGPS event URL
     */
    static isValidEventUrl(url: string | null): boolean;
    
    /**
     * Check if URL is a valid RWGPS route URL
     */
    static isValidRouteUrl(url: string | null): boolean;
    
    /**
     * Extract event ID from URL (returns null if not found)
     */
    static extractEventId(url: string | null): string | null;
    
    /**
     * Extract route ID from URL (returns null if not found)
     */
    static extractRouteId(url: string | null): string | null;

    // =============================================
    // Date/Time Formatting
    // =============================================
    
    /**
     * Format date for v1 API (YYYY-MM-DD)
     */
    static formatDateForV1Api(date: Date | string): string;
    
    /**
     * Format time for v1 API (HH:MM)
     */
    static formatTimeForV1Api(date: Date | string): string;
    
    /**
     * Parse v1 API date/time fields into Date object
     */
    static parseV1DateTime(date: string, time: string, timezone?: string): Date;

    // =============================================
    // Domain ↔ API Format Transformations
    // =============================================
    
    /**
     * Transform SCCCCEvent domain object to v1 API payload
     * Handles: desc → description, organizer_tokens → organizer_ids, visibility conversion
     */
    static toV1Payload(event: DomainEvent): V1EventPayload;
    
    /**
     * Transform SCCCCEvent domain object to web API payload
     * Preserves: desc, organizer_tokens (web API uses different field names)
     */
    static toWebPayload(event: DomainEvent): WebEventPayload;
    
    /**
     * Transform v1 API response to normalized internal format
     * Handles: description → desc, separate date/time → starts_at
     */
    static fromV1Response(response: any): NormalizedEvent | null;
    
    /**
     * Transform web API response to normalized internal format
     * Handles: organizers array → organizer_ids
     */
    static fromWebResponse(response: any): NormalizedEvent | null;

    // =============================================
    // Payload Construction
    // =============================================
    
    /**
     * Build generic HTTP request options
     */
    static buildRequestOptions(
        method: string,
        payload?: any,
        headers?: Record<string, string>
    ): RequestOptions;
    
    /**
     * Build Basic Auth header value
     */
    static buildBasicAuthHeader(apiKey: string, authToken: string): string;
    
    /**
     * Build payload for creating event via v1 API
     */
    static buildCreateEventPayload(eventData: any): V1EventPayload;
    
    /**
     * Build payload for editing event via v1 API
     */
    static buildEditEventPayload(eventData: any): V1EventPayload;

    // =============================================
    // Validation
    // =============================================
    
    /**
     * Validate event payload before API call
     */
    static validateEventPayload(payload: any): ValidationResult;
    
    /**
     * Validate route payload before API call
     */
    static validateRoutePayload(payload: any): ValidationResult;

    // =============================================
    // Error Building
    // =============================================
    
    /**
     * Build error message from HTTP response
     */
    static buildErrorMessage(response: any, context: string): string;

    // =============================================
    // Organizer Matching
    // =============================================
    
    /**
     * Find matching organizer from API results by name
     */
    static findMatchingOrganizer(
        results: OrganizerResult[] | null,
        organizerName: string
    ): OrganizerResult | null;

    // =============================================
    // Response Handling
    // =============================================
    
    /**
     * Check if HTTP response indicates success (2xx or 3xx)
     */
    static isSuccessResponse(response: GoogleAppsScript.URL_Fetch.HTTPResponse): boolean;
    
    /**
     * Build standardized error result from HTTP response
     */
    static buildErrorResult(
        response: GoogleAppsScript.URL_Fetch.HTTPResponse,
        operation: string
    ): { success: false; error: string };

    // =============================================
    // Tag Operations
    // =============================================
    
    /**
     * Build expiry tag from ride date
     * Format: EXP:YYYY-MM-DD (date + expiryDays)
     */
    static buildExpiryTag(rideDate: Date | string, expiryDays: number): string;
    
    /**
     * Build batch tag update payload for RWGPS API
     */
    static buildBatchTagPayload(
        itemIds: string[],
        action: 'add' | 'remove',
        tags: string[]
    ): Record<string, string>;

    // =============================================
    // Multipart Form Building
    // =============================================
    
    /**
     * Generate random boundary string for multipart forms
     */
    static generateBoundary(): string;
    
    /**
     * Build multipart payload for creating event with logo
     */
    static buildMultipartCreatePayload(
        eventData: Record<string, any>,
        logoBlob: GoogleAppsScript.Base.Blob,
        boundary: string
    ): string;
    
    /**
     * Build multipart payload for updating event logo
     */
    static buildMultipartLogoPayload(
        eventId: string,
        logoBlob: GoogleAppsScript.Base.Blob,
        boundary: string
    ): string;
}

export default RWGPSCore;
