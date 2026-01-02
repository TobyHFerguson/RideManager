/**
 * The EventFactory provides methods to create and convert event objects for ride scheduling.
 */

import type Row from './Row';
import type { Organizer } from './Externals';

/**
 * EventFactory namespace with methods for creating and converting events
 */
declare const EventFactory: {
    /**
     * Creates a new event object from a row and organizers.
     * @param row - The row object to make event from.
     * @param organizers - The organizers (i.e. ride leaders) for this event.
     * @param event_id - The event ID (extracted from event URL).
     * @returns The created event object.
     */
    newEvent(row: RowCore, organizers: Organizer[], event_id: string | number): SCCCCEvent;

    /**
     * Converts a RWGPS event object to a SCCCCEvent.
     * @param rwgpsEvent - The RWGPS event object.
     * @returns The converted event object.
     * @throws {Error} If the event name ends with ']'.
     */
    fromRwgpsEvent(rwgpsEvent: any): SCCCCEvent;
};

export default EventFactory;
