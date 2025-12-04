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
     * Create a calendar event with immediate retry and background fallback
     * @param {string} calendarId - Calendar ID
     * @param {string} title - Event title
     * @param {Date} startTime - Start time
     * @param {Date} endTime - End time
     * @param {string} location - Event location
     * @param {string} description - Event description
     * @param {string} rideUrl - Ride URL (stable identifier for background retry)
     * @param {number} rowNum - Row number for retry queue identification
     * @returns {Object} { success: boolean, eventId?: string, queued?: boolean }
     */
    static createEvent(calendarId, title, startTime, endTime, location, description, rideUrl = null, rowNum = null) {
        const calendar = GoogleCalendarManager.getCalendarWithRetry(calendarId);
        if (!calendar) {
            console.error('GoogleCalendarManager.createEvent() - Calendar not found after retries. ', calendarId);
            
            // Queue for background retry if rowNum provided
            if (rowNum !== null) {
                return GoogleCalendarManager._queueForRetry({
                    type: 'create',
                    calendarId,
                    rowNum,
                    params: {
                        title,
                        startTime: startTime.getTime(),
                        endTime: endTime.getTime(),
                        location,
                        description
                    }
                });
            }
            
            return { success: false, error: 'Calendar not found' };
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
            console.error('GoogleCalendarManager.createEvent() - Error creating event:', error);
            
            // Queue for background retry if rideUrl provided
            if (rideUrl !== null) {
                return GoogleCalendarManager._queueForRetry({
                    type: 'create',
                    calendarId,
                    rideUrl,
                    rideTitle: title,
                    rowNum,
                    params: {
                        title,
                        startTime: startTime.getTime(),
                        endTime: endTime.getTime(),
                        location,
                        description
                    }
                });
            }
            
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Queue a failed operation for background retry
     * @private
     */
    static _queueForRetry(operation) {
        try {
            const retryQueue = new RetryQueue();
            const userEmail = Session.getActiveUser().getEmail();
            const queueId = retryQueue.enqueue({
                ...operation,
                userEmail
            });
            
            console.log(`GoogleCalendarManager: Operation queued for background retry (ID: ${queueId})`);
            return { 
                success: false, 
                queued: true, 
                queueId,
                message: 'Operation queued for background retry'
            };
        } catch (error) {
            console.error('GoogleCalendarManager: Failed to queue operation for retry:', error);
            return { 
                success: false, 
                queued: false,
                error: `Failed to queue for retry: ${error.message}` 
            };
        }
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