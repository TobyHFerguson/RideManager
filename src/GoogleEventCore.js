// @ts-check
/**
 * GoogleEventCore - Pure JavaScript logic for Google Calendar event links
 * 
 * This module contains pure functions for building Google Calendar embed URLs
 * that link to specific events in agenda view. These URLs are used to create
 * RichText hyperlinks in the GoogleEventId spreadsheet column.
 * 
 * Pattern: Pure logic with 100% test coverage, no GAS dependencies.
 */

var GoogleEventCore = (function() {

class GoogleEventCore {
    /**
     * Build a Google Calendar embed URL for a specific date
     * 
     * @param {string} calendarId - The calendar ID (e.g., 'example@group.calendar.google.com')
     * @param {Date} rideDate - The date of the ride
     * @returns {string} Google Calendar embed URL in agenda mode
     */
    static buildCalendarUrl(calendarId, rideDate) {
        // Format date as YYYYMMDD
        const year = rideDate.getFullYear();
        const month = String(rideDate.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-based
        const day = String(rideDate.getDate()).padStart(2, '0');
        const dateStr = `${year}${month}${day}`;
        
        // Build URL with query parameters (manual encoding for GAS compatibility)
        // URLSearchParams not available in Google Apps Script
        const params = [
            `src=${encodeURIComponent(calendarId)}`,
            'mode=AGENDA',
            `ctz=${encodeURIComponent('America/Los_Angeles')}`,
            `dates=${dateStr}%2F${dateStr}` // Manual encoding of / as %2F for consistency
        ];
        
        return `https://calendar.google.com/calendar/embed?${params.join('&')}`;
    }

    /**
     * Build a RichText link object for a Google Event ID
     * 
     * Creates a link where the display text is the event ID and the URL
     * points to the calendar in agenda view for the ride date.
     * 
     * @param {string} eventId - Google Calendar event ID (display text)
     * @param {string} calendarId - The calendar ID
     * @param {Date} rideDate - The date of the ride
     * @returns {{text: string, url: string}} RichText link object
     */
    static buildRichTextLink(eventId, calendarId, rideDate) {
        return {
            text: eventId,
            url: GoogleEventCore.buildCalendarUrl(calendarId, rideDate)
        };
    }
}

return GoogleEventCore;
})();

// Export for Node.js/Jest
if (typeof module !== 'undefined') {
    module.exports = GoogleEventCore;
}
