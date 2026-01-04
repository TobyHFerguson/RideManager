/**
 * GoogleEventCore - Pure JavaScript logic for Google Calendar event links
 * 
 * Type definitions for building Google Calendar embed URLs and RichText links
 */

/**
 * Build a Google Calendar embed URL for a specific date
 * 
 * @param calendarId - The calendar ID (e.g., 'example@group.calendar.google.com')
 * @param rideDate - The date of the ride
 * @returns Google Calendar embed URL in agenda mode
 */
export function buildCalendarUrl(calendarId: string, rideDate: Date): string;

/**
 * Build a RichText link object for a Google Event ID
 * 
 * Creates a link where the display text is the event ID and the URL
 * points to the calendar in agenda view for the ride date.
 * 
 * @param eventId - Google Calendar event ID (display text)
 * @param calendarId - The calendar ID
 * @param rideDate - The date of the ride
 * @returns RichText link object with text and url properties
 */
export function buildRichTextLink(
    eventId: string, 
    calendarId: string, 
    rideDate: Date
): { text: string; url: string };
