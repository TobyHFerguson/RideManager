/**
 * calendars - Calendar testing utilities
 * 
 * Type definitions for calendar event creation test functions.
 */

/**
 * Create a test event in default calendar
 * Creates event in toby.h.ferguson@gmail.com calendar
 */
declare function createTestEvent(): void;

/**
 * Create a test event in specified calendar
 * @private
 * @param calendarId - Google Calendar ID
 * 
 * @example
 * ```javascript
 * createTestEvent_('toby.h.ferguson@gmail.com');
 * ```
 */
declare function createTestEvent_(calendarId: string): void;

export { createTestEvent, createTestEvent_ };
