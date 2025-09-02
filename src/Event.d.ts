/**
 * The Event class represents a ride event and provides static and instance methods
 * for creating, updating, and managing event names and properties.
 */
declare class Event {
    all_day: string;
    auto_expire_participants: string;
    desc: string | undefined;
    location: string | undefined;
    name: string | undefined;
    organizer_tokens: string[] | undefined;
    route_ids: string[] | undefined;
    start_date: string | Date | undefined;
    start_time: string | Date | undefined;
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
     * @param {number} numRiders - Number of riders for this event.
     * @param {Date|string} start_date - Event start date.
     * @param {Date|string} start_time - Event start time.
     * @param {string} groupName - Name of group.
     * @param {string} route_name - Name of route.
     * @returns {string} Name of event.
     */
    static makeManagedRideName(numRiders: number, start_date: Date | string, start_time: Date | string, groupName: string, route_name: string): string;

    /**
     * Creates the unmanaged event name by appending or updating the participant count.
     * @param {string} eventName - The current event name.
     * @param {number} numRiders - The number of riders.
     * @returns {string} The new event name.
     */
    static makeUnmanagedRideName(eventName: string, numRiders: number): string;

    /**
     * Returns true iff this is a Managed Ride.
     * @param {string} eventName - The event name.
     * @param {string[]} groupNames - List of all possible groups.
     * @returns {boolean} True iff this is a managed ride.
     */
    static managedEventName(eventName: string, groupNames: string[]): boolean;

    /**
     * Updates the rider count in the event name.
     * @param {string} name - The event name.
     * @param {number} count - The new rider count.
     * @param {string[]} groupNames - List of all possible groups.
     * @returns {string} The updated event name.
     */
    static updateCountInName(name: string, count: number, groupNames: string[]): string;

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
     * Updates the rider count, returning true iff the rider count has changed.
     * @param {number} numRiders - Number of riders.
     * @param {string[]} groupNames - List of all possible groups.
     * @returns {boolean} True iff the rider count has changed.
     */
    updateRiderCount(numRiders: number, groupNames: string[]): boolean;

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
