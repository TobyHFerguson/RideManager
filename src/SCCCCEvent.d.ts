/**
 * The SCCCCEvent class represents a ride event and provides static and instance methods
 * for creating, updating, and managing event names and properties.
 * (Renamed from Event to avoid DOM Event shadowing)
 */
declare class SCCCCEvent {
    all_day: string;
    auto_expire_participants: string;
    desc: string | undefined;
    location: string | undefined;
    name: string | undefined;
    organizer_tokens: string[] | undefined;
    route_ids: string[] | undefined;
    /** Start date/time as a proper Date object (domain type) */
    startDateTime: Date | undefined;
    visibility: number;

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
