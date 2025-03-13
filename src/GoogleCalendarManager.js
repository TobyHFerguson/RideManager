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

        console.log("GoogleCalendarEvent created:", event);
       
    }
}