/**
 * Utility class for managing Google Calendar events.
 */
declare class GoogleCalendarManager {
    /**
     * Creates a new event in the specified calendar.
     * @param {string} calendarId - The ID of the calendar.
     * @param {string} title - The title of the event.
     * @param {Date} startTime - The start time of the event.
     * @param {Date} endTime - The end time of the event.
     * @param {string} location - The location of the event.
     * @param {string} description - The description of the event.
     * @returns {string | undefined} The event ID, or undefined if creation failed.
     */
    static createEvent(
        calendarId: string,
        title: string,
        startTime: Date,
        endTime: Date,
        location: string,
        description: string
    ): string | undefined;

    /**
     * Deletes an event from the specified calendar.
     * @param {string} calendarId - The ID of the calendar.
     * @param {string} eventId - The ID of the event to delete.
     */
    static deleteEvent(calendarId: string, eventId: string): void;

    /**
     * Updates an existing event in the specified calendar.
     * @param {string} calendarId - The ID of the calendar.
     * @param {string} eventId - The ID of the event to update.
     * @param {string} title - The new title for the event.
     * @param {Date} startTime - The new start time for the event.
     * @param {Date} endTime - The new end time for the event.
     * @param {string} location - The new location for the event.
     * @param {string} description - The new description for the event.
     */
    static updateEvent(
        calendarId: string,
        eventId: string,
        title: string,
        startTime: Date,
        endTime: Date,
        location: string,
        description: string
    ): void;
}
