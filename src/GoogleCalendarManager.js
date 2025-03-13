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

        console.log("Test event created:", event.getId());
        const eventUrl = `https://www.google.com/calendar/event?eid=${event.getId()}`;
        console.log("Event URL:", eventUrl);
    }
}