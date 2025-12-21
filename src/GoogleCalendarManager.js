// @ts-check
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
     * @returns {Object} { success: boolean, eventId?: string, error?: string }
     */
    static createEvent(calendarId, title, startTime, endTime, location, description) {
        const calendar = GoogleCalendarManager.getCalendarWithRetry(calendarId);
        if (!calendar) {
            const error = `Calendar not found: ${calendarId}`;
            console.error('GoogleCalendarManager.createEvent() - ' + error);
            return { success: false, error };
        }
        
        console.log('Calendar found: ', calendar.getName());
        console.log(`Creating event: ${title}, ${startTime} - ${endTime}, location: ${location}`);
        
        try {
            const event = calendar.createEvent(title, startTime, endTime, {
                description: description,
                location: location
            });

            const eventId = event.getId();
            console.log("GoogleCalendarEvent created:", eventId);
            return { success: true, eventId };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error('GoogleCalendarManager.createEvent() - Error creating event:', err);
            return { success: false, error: err.message };
        }
    }
    
    /**
     * Delete a calendar event
     * Throws error on failure - caller must handle and show error dialog to user
     * 
     * @param {string} calendarId - Calendar ID
     * @param {string} eventId - Event ID
     * @returns {Object} { success: boolean, error?: string }
     */
    static deleteEvent(calendarId, eventId) {
        const calendar = GoogleCalendarManager.getCalendarWithRetry(calendarId);
        if (!calendar) {
            const error = `Calendar not found: ${calendarId}`;
            console.error(`GoogleCalendarManager.deleteEvent(${calendarId}, ${eventId}): ${error}`);
            return { success: false, error };
        }
        
        try {
            const event = calendar.getEventById(eventId);
            if (event) {
                event.deleteEvent();
                console.log(`GoogleCalendarManager: Deleted event ${eventId}`);
                return { success: true };
            } else {
                console.warn(`GoogleCalendarManager: Event ${eventId} not found`);
                return { success: true }; // Already deleted
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            // Ignore "already deleted" errors
            if (err.message.includes('The calendar event does not exist, or it has already been deleted.')) {
                console.log(`GoogleCalendarManager: Event ${eventId} already deleted`);
                return { success: true };
            }
            console.error(`GoogleCalendarManager.deleteEvent() error:`, err);
            return { success: false, error: err.message };
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
     * @returns {Object} { success: boolean, error?: string }
     */
    static updateEvent(calendarId, eventId, title, startTime, endTime, location, description) {
        const calendar = GoogleCalendarManager.getCalendarWithRetry(calendarId);
        if (!calendar) {
            const error = `Calendar not found: ${calendarId}`;
            console.error('GoogleCalendarManager.updateEvent() - ' + error);
            return { success: false, error };
        }
        
        try {
            const event = calendar.getEventById(eventId);
            if (event) {
                event.setTitle(title);
                event.setTime(startTime, endTime);
                event.setLocation(location);
                event.setDescription(description);
                console.log(`GoogleCalendarManager: Updated event ${eventId}`);
                return { success: true };
            } else {
                const error = `Event not found: ${eventId}`;
                console.error('GoogleCalendarManager.updateEvent() - ' + error);
                return { success: false, error };
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error('GoogleCalendarManager.updateEvent() error:', err);
            return { success: false, error: err.message };
        }
    }
}