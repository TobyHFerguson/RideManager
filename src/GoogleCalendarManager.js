// @ts-check
var GoogleCalendarManager = (function() {

class GoogleCalendarManager {
    /**
     * Gets a calendar by ID with retry logic to handle temporary unavailability
     * @param {string} calendarId - The calendar ID
     * @returns {GoogleAppsScript.Calendar.Calendar} The calendar
     * @throws Will throw an error if the calendar cannot be retrieved
     */
    static getCalendar(calendarId) {
        const calendar = CalendarApp.getCalendarById(calendarId);
        if (!calendar) {
            throw new Error(`Calendar not found: ${calendarId}\n\nYou must subscribe to the calendar.`);
        }
        return calendar;    
    }

    /**
     * Create a calendar event
     * Throws error on failure - caller must handle and show error dialog to user
     * 
     * @param {string} calendarId - Calendar ID
     * @param {string} title - Event title
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @param {string} location - Event location
     * @param {string} description - Event description
     * @returns {string} eventId
     * @throws Will throw an error if the calendar cannot be found or the event creation failed.
     */
    static createEvent(calendarId, title, startTime, endTime, location, description) {
        const calendar = GoogleCalendarManager.getCalendar(calendarId);
        const event = calendar.createEvent(title, startTime, endTime, {
            description: description,
            location: location
        });

        const eventId = event.getId();
        console.log("GoogleCalendarEvent created:", eventId);
        return eventId;
    }
    
    /**
     * Delete a calendar event
     * Throws error on failure - caller must handle and show error dialog to user
     * 
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Event ID
     * @returns {void} 
     * @throws Will throw an error if the calendar cannot be found
     */
    static deleteEvent(calendarId, eventId) {
        const calendar = GoogleCalendarManager.getCalendar(calendarId);
        const event = calendar.getEventById(eventId);
        if (event) {
            event.deleteEvent();
            console.log(`GoogleCalendarManager: Deleted event ${eventId}`);
        }
    }
    
    /**
     * Update a calendar event
     * Throws error on failure - caller must handle and show error dialog to user
     * 
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Event ID
     * @param {string} title - Event title
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @param {string} location - Event location
     * @param {string} description - Event description
     * @return {void}
     * @throws Will throw an error if neither the calendar nor the event can be found
     */
    static updateEvent(calendarId, eventId, title, startTime, endTime, location, description) {
        const calendar = GoogleCalendarManager.getCalendar(calendarId);
        const event = calendar.getEventById(eventId);
        if (event) {
            event.setTitle(title)
            .setTime(startTime, endTime)
            .setLocation(location)
            .setDescription(description);
            console.log(`GoogleCalendarManager: Updated event ${eventId}`);
        } else {
            throw new Error(`Event not found: ${eventId} in calendar ${calendarId}`);
        }
    }
}

return GoogleCalendarManager;
})();

if (typeof module !== 'undefined') {
    module.exports = GoogleCalendarManager;
}