class GoogleCalendarManager {
    /**
     * Gets a calendar by ID with retry logic to handle temporary unavailability
     * @param {string} calendarId - The calendar ID
     * @param {number} maxRetries - Maximum number of retries (default: 3)
     * @param {number} delayMs - Delay between retries in milliseconds (default: 1000)
     * @returns {GoogleAppsScript.Calendar.Calendar|null} The calendar or null if not found
     */
    static getCalendarWithRetry(calendarId, maxRetries = 3, delayMs = 1000) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const calendar = CalendarApp.getCalendarById(calendarId);
                if (calendar) {
                    return calendar;
                }
                
                if (attempt < maxRetries) {
                    console.log(`Calendar ${calendarId} not found, attempt ${attempt + 1}/${maxRetries + 1}, retrying in ${delayMs}ms...`);
                    Utilities.sleep(delayMs);
                    // Exponential backoff: increase delay for next attempt
                    delayMs *= 1.5;
                }
            } catch (error) {
                console.error(`Error getting calendar ${calendarId} on attempt ${attempt + 1}:`, error);
                if (attempt < maxRetries) {
                    Utilities.sleep(delayMs);
                    delayMs *= 1.5;
                } else {
                    throw error;
                }
            }
        }
        return null;
    }

    static createEvent(calendarId, title, startTime, endTime, location, description) {
        const calendar = GoogleCalendarManager.getCalendarWithRetry(calendarId);
        if (!calendar) {
            console.error('GoogleCalendarManager.createEvent() - Calendar not found after retries. ', calendarId);
            return;
        }
        console.log('Calendar found: ', calendar.getName());
        console.log(`Creating event: ${title}, ${startTime} - ${endTime}, location: ${location}`);
        const event = calendar.createEvent(title, startTime, endTime, {
            description: description,
            location: location
        });

        console.log("GoogleCalendarEvent created:", event.getId());
        return event.getId();
    }
    
    static deleteEvent(calendarId, eventId) {
        const calendar = GoogleCalendarManager.getCalendarWithRetry(calendarId);
        if (!calendar) {
            console.error(`GoogleCalendarManager.deleteEvent(${calendarId}, ${eventId}): No Calendar for the given ID found for user ${Session.getActiveUser()}.`);
            return;
        }
        const event = calendar.getEventById(eventId);
        try {
            if (event) event.deleteEvent();

        } catch (error) {
            if (!error.message.includes('The calendar event does not exist, or it has already been deleted.')) {
                throw error
            }
        }
    }
    
    static updateEvent(calendarId, eventId, title, startTime, endTime, location, description) {
        const calendar = GoogleCalendarManager.getCalendarWithRetry(calendarId);
        if (!calendar) {
            console.error('GoogleCalendarManager.updateEvent() - Calendar not found after retries. ', calendarId);
            return;
        }
        const event = calendar.getEventById(eventId);
        if (event) {
            event.setTitle(title);
            event.setTime(startTime, endTime);
            event.setLocation(location);
            event.setDescription(description);
        }
    }
}