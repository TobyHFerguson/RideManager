class GoogleCalendarManager {
    static createEvent(calendarId, title, startTime, endTime, location, description) {
        const calendar = CalendarApp.getCalendarById(calendarId);
        if (!calendar) {
            console.error('Calendar not found.');
            return;
        }

        const event = calendar.createEvent(title, startTime, endTime, {
            description: description,
            location: location
        });

        console.log("GoogleCalendarEvent created:", event.getId());
        return event.getId();
    }
    static deleteEvent(calendarId, eventId) {
        const calendar = CalendarApp.getCalendarById(calendarId);
        if (!calendar) {
            console.error('Calendar not found.');
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
        const calendar = CalendarApp.getCalendarById(calendarId);
        if (!calendar) {
            console.error('Calendar not found.');
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