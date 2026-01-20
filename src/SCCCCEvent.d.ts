/**
 * The SCCCCEvent class represents a ride event and provides static and instance methods
 * for creating, updating, and managing event names and properties.
 * (Renamed from Event to avoid DOM Event shadowing)
 * 
 * Uses v1 API field names natively so events can be passed directly to/from RWGPS API.
 * 
 * Date/Time Model:
 * - _startDateTime (Date) is the PRIMARY storage - a single source of truth
 * - start_date/start_time are COMPUTED getters/setters for v1 API compatibility
 * 
 * API-only fields (visibility, all_day) are NOT stored here.
 * They are added by buildV1EditEventPayload with sensible defaults per OpenAPI spec:
 * - visibility: 'public' (string)
 * - all_day: false (boolean)
 */
declare class SCCCCEvent {
    // === DOMAIN FIELDS ===
    /** Event description (v1 API field name) */
    description: string | undefined;
    location: string | undefined;
    name: string | undefined;
    /** Organizer IDs (v1 API field name) - numbers per OpenAPI spec */
    organizer_ids: number[] | undefined;
    /** Route IDs - numbers per OpenAPI spec */
    route_ids: number[] | undefined;
    
    // === PRIMARY DATE/TIME STORAGE ===
    /** Primary storage for start date/time (private, use startDateTime getter/setter) */
    _startDateTime: Date | undefined;
    
    /** Primary accessor: get/set the start date/time as a Date object */
    get startDateTime(): Date | undefined;
    set startDateTime(value: Date | undefined);
    
    // === API-COMPATIBLE COMPUTED ACCESSORS ===
    /** Computed from _startDateTime: "2025-01-20" (v1 API field format) */
    get start_date(): string | undefined;
    /** Sets date portion of _startDateTime, preserving time or defaulting to midnight */
    set start_date(value: string | undefined);
    /** Computed from _startDateTime: "09:00" (v1 API field format) */
    get start_time(): string | undefined;
    /** Sets time portion of _startDateTime, preserving date */
    set start_time(value: string | undefined);
    
    // === LEGACY ALIASES (deprecated, for backward compatibility) ===
    /** @deprecated Use description instead */
    get desc(): string | undefined;
    /** @deprecated Use description instead */
    set desc(value: string | undefined);
    /** @deprecated Use organizer_ids instead */
    get organizer_tokens(): number[] | undefined;
    /** @deprecated Use organizer_ids instead */
    set organizer_tokens(value: number[] | undefined);

    constructor();

    /**
     * Creates a RegExp for managed event names based on group names.
     * @param {string[]} groupNames - Array of group names.
     * @returns {RegExp} The RegExp for managed event names.
     */
    static makeManagedRE(groupNames?: string[]): RegExp;

    /**
     * Creates the name of a Managed Event.
     * @param {Date} startDateTime - Event start date/time.
     * @param {string} groupName - Name of group.
     * @param {string} route_name - Name of route.
     * @returns {string} Name of event.
     */
    static makeManagedRideName(startDateTime: Date, groupName: string, route_name: string): string;

    /**
     * Creates the unmanaged event name by appending or updating the participant count.
     * @param {string} eventName - The current event name.
     * @returns {string} The new event name.
     */
    static makeUnmanagedRideName(eventName: string): string;

    /**
     * Returns true iff this is a Managed Ride.
     * @param {string} eventName - The event name.
     * @param {string[]} groupNames - List of all possible groups.
     * @returns {boolean} True iff this is a managed ride.
     */
    static managedEventName(eventName: string, groupNames: string[]): boolean;

    /**
     * Cancels the event by prefixing the name.
     * @returns {Event} The updated Event instance.
     */
    cancel(): Event;

    /**
     * Reinstates the event by removing the cancel prefix.
     * @returns {Event} The updated Event instance.
     */
    reinstate(): Event;

    /**
     * Returns true iff this event is a managed event.
     * @param {string[]} groupNames - List of all possible groups.
     * @returns {boolean} True iff this is a managed event.
     */
    managedEvent(groupNames: string[]): boolean;

    /**
     * Extracts the group name from a managed event name.
     * @param {string} name - The event name.
     * @param {string[]} groupNames - List of all possible groups.
     * @returns {string} The group name, or empty string if not found.
     */
    static getGroupName(name: string, groupNames: string[]): string;
}

export default SCCCCEvent;
