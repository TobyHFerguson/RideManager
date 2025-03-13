class GoogleCalendarManager {
    static createEvent(calendarId, title, startTime, endTime, description) {
        const calendar = CalendarApp.getCalendarById(calendarId);
        if (!calendar) {
            console.error('Calendar not found.');
            return;
        }

        const event = calendar.createEvent(title, startTime, endTime, {
            description: description
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
        if (event) event.deleteEvent();
    } 
    static updateEvent(calendarId, eventId, title, startTime, endTime, description) {
        const calendar = CalendarApp.getCalendarById(calendarId);
        if (!calendar) {
            console.error('Calendar not found.');
            return;
        }
        const event = calendar.getEventById(eventId);
        if (event) {
            event.setTitle(title);
            event.setTime(startTime, endTime);
            event.setDescription(description);
        }
    }     
}