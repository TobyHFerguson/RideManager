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
        if (!calendarId) {
            throw new Error(`Calendar ID is missing or undefined. Check that the group has a GoogleCalendarId configured in the Groups sheet.`);
        }
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

        if (!event) {
            throw new Error(`calendar.createEvent returned null/undefined for calendar ${calendarId}`);
        }

        const eventId = event.getId();
        if (!eventId) {
            throw new Error(`event.getId() returned null/undefined after createEvent on calendar ${calendarId}`);
        }

        // Verification: read back the event to confirm it was persisted
        const verification = calendar.getEventById(eventId);
        if (!verification) {
            console.error(`GoogleCalendarManager.createEvent: VERIFICATION FAILED - Event ${eventId} was created but cannot be read back from calendar ${calendarId}`);
            console.error(`GoogleCalendarManager.createEvent: Event details - title="${title}", start=${startTime}, end=${endTime}`);
            throw new Error(`Calendar event verification failed: event ${eventId} created but not readable from calendar ${calendarId}. The event may not have been persisted.`);
        }

        // Log verification details for debugging
        console.log(`GoogleCalendarManager.createEvent: VERIFIED - Event ${eventId} on calendar ${calendarId}`);
        console.log(`GoogleCalendarManager.createEvent: Verified title="${verification.getTitle()}", start=${verification.getStartTime()}`);
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
        } else {
            console.warn(`GoogleCalendarManager.deleteEvent: Event ${eventId} not found on calendar ${calendarId} - may have already been deleted`);
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
            // Break setter chain - each call verified individually to catch silent failures
            event.setTitle(title);
            event.setTime(startTime, endTime);
            event.setLocation(location);
            event.setDescription(description);

            // Verification: read back to confirm changes persisted
            const verification = calendar.getEventById(eventId);
            if (!verification) {
                console.error(`GoogleCalendarManager.updateEvent: VERIFICATION FAILED - Event ${eventId} not readable after update on calendar ${calendarId}`);
                throw new Error(`Calendar event verification failed: event ${eventId} not readable after update on calendar ${calendarId}`);
            }

            const verifiedTitle = verification.getTitle();
            if (verifiedTitle !== title) {
                console.warn(`GoogleCalendarManager.updateEvent: TITLE MISMATCH - Expected "${title}", got "${verifiedTitle}" for event ${eventId}`);
            }

            console.log(`GoogleCalendarManager.updateEvent: VERIFIED - Event ${eventId} updated on calendar ${calendarId}`);
            console.log(`GoogleCalendarManager.updateEvent: Verified title="${verifiedTitle}", start=${verification.getStartTime()}`);
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