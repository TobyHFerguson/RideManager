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
     * @returns {string } The event ID if successful
     * @throws Will throw an error if the calendar cannot be found or the event creation failed.
     */
    static createEvent(
        calendarId: string,
        title: string,
        startTime: Date,
        endTime: Date,
        location: string,
        description: string,
    ): string ;

    /**
     * Deletes an event from the specified calendar.
     * @param {string} calendarId - The ID of the calendar.
     * @param {string} eventId - The ID of the event to delete.
     * @throws Will throw an error if the calendar cannot be found.
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
     * @throws Will throw an error if neither the calendar nor the event can be found.
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


     /**
     * Gets a calendar by ID 
     * @param {string} calendarId - The calendar ID
     * @returns {GoogleAppsScript.Calendar.Calendar} The calendar
     * @throws Will throw an error if the calendar cannot be retrieved
     */
    static getCalendar(calendarId) : GoogleAppsScript.Calendar.Calendar
}
