/**
 * The EventFactory provides methods to create and convert event objects for ride scheduling.
 */
declare const EventFactory: {
    /**
     * Creates a new event object from a row and organizers.
     * @param {Row} row - The row object to make event from.
     * @param {Organizer[]} organizers - The organizers (i.e. ride leaders) for this event.
     * @param {string|number} event_id - The event ID.
     * @returns {Event} The created event object.
     */
    newEvent(row: Row, organizers: Organizer[], event_id: string | number): Event;

    /**
     * Converts a RWGPS event object to an Event.
     * @param {any} rwgpsEvent - The RWGPS event object.
     * @returns {Event} The converted event object.
     * @throws {Error} If the event name ends with ']'.
     */
    fromRwgpsEvent(rwgpsEvent: any): Event;
};

/**
 * Organizer type for ride leaders.
 * @typedef {Object} Organizer
 * @property {string|number} id - The organizer's ID.
 * @property {string} text - The organizer's name.
 */
