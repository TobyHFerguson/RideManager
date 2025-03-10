// CalendarApp Class documentation: https://developers.google.com/apps-script/reference/calendar/calendar-app

function createTestEvent() {
    const calendarID = "toby.h.ferguson@gmail.com"
    createTestEvent_(calendarID)
}

function createTestEvent_(calendarId) {
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
        console.error("Calendar not found with ID:", calendarId);
        return;
    }

    const eventTitle = "Test Event";
    const eventDescription = "This is a test event created by Apps Script.";
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

    const event = calendar.createEvent(eventTitle, startTime, endTime, {
        description: eventDescription
    });

    console.log("Test event created:", event.getId());
    const eventUrl = `https://www.google.com/calendar/event?eid=${event.getId()}`;
    console.log("Event URL:", eventUrl);
}
