// @ts-check
const GoogleEventCore = require('../../src/GoogleEventCore');

describe('GoogleEventCore', () => {
    describe('buildCalendarUrl', () => {
        it('should build calendar embed URL with all parameters', () => {
            const calendarId = 'example@group.calendar.google.com';
            const rideDate = new Date('2025-12-07T10:00:00');
            
            const url = GoogleEventCore.buildCalendarUrl(calendarId, rideDate);
            
            expect(url).toBe('https://calendar.google.com/calendar/embed?src=example%40group.calendar.google.com&mode=AGENDA&ctz=America%2FLos_Angeles&dates=20251207%2F20251207');
        });

        it('should URL encode calendar ID with special characters', () => {
            const calendarId = 'test+user@gmail.com';
            const rideDate = new Date('2025-01-15T10:00:00');
            
            const url = GoogleEventCore.buildCalendarUrl(calendarId, rideDate);
            
            expect(url).toContain('src=test%2Buser%40gmail.com');
        });

        it('should format single-digit month correctly (zero-padded)', () => {
            const calendarId = 'test@calendar.google.com';
            const rideDate = new Date('2025-03-05T10:00:00');
            
            const url = GoogleEventCore.buildCalendarUrl(calendarId, rideDate);
            
            expect(url).toContain('dates=20250305%2F20250305');
        });

        it('should format single-digit day correctly (zero-padded)', () => {
            const calendarId = 'test@calendar.google.com';
            const rideDate = new Date('2025-11-03T10:00:00');
            
            const url = GoogleEventCore.buildCalendarUrl(calendarId, rideDate);
            
            expect(url).toContain('dates=20251103%2F20251103');
        });

        it('should use same date for start and end (single day view)', () => {
            const calendarId = 'test@calendar.google.com';
            const rideDate = new Date('2025-06-15T10:00:00');
            
            const url = GoogleEventCore.buildCalendarUrl(calendarId, rideDate);
            
            expect(url).toContain('dates=20250615%2F20250615');
        });

        it('should always use America/Los_Angeles timezone', () => {
            const calendarId = 'test@calendar.google.com';
            const rideDate = new Date('2025-12-07T10:00:00');
            
            const url = GoogleEventCore.buildCalendarUrl(calendarId, rideDate);
            
            expect(url).toContain('ctz=America%2FLos_Angeles');
        });

        it('should always use AGENDA mode', () => {
            const calendarId = 'test@calendar.google.com';
            const rideDate = new Date('2025-12-07T10:00:00');
            
            const url = GoogleEventCore.buildCalendarUrl(calendarId, rideDate);
            
            expect(url).toContain('mode=AGENDA');
        });

        it('should handle Date at year boundary', () => {
            const calendarId = 'test@calendar.google.com';
            const rideDate = new Date('2025-12-31T23:59:59');
            
            const url = GoogleEventCore.buildCalendarUrl(calendarId, rideDate);
            
            expect(url).toContain('dates=20251231%2F20251231');
        });

        it('should handle Date at start of year', () => {
            const calendarId = 'test@calendar.google.com';
            const rideDate = new Date('2025-01-01T00:00:00');
            
            const url = GoogleEventCore.buildCalendarUrl(calendarId, rideDate);
            
            expect(url).toContain('dates=20250101%2F20250101');
        });
    });

    describe('buildRichTextLink', () => {
        it('should build RichText link object with text and url', () => {
            const eventId = 'abc123xyz';
            const calendarId = 'test@calendar.google.com';
            const rideDate = new Date('2025-12-07T10:00:00');
            
            const link = GoogleEventCore.buildRichTextLink(eventId, calendarId, rideDate);
            
            expect(link).toEqual({
                text: 'abc123xyz',
                url: 'https://calendar.google.com/calendar/embed?src=test%40calendar.google.com&mode=AGENDA&ctz=America%2FLos_Angeles&dates=20251207%2F20251207'
            });
        });

        it('should use eventId as display text', () => {
            const eventId = 'short-id';
            const calendarId = 'test@calendar.google.com';
            const rideDate = new Date('2025-12-07T10:00:00');
            
            const link = GoogleEventCore.buildRichTextLink(eventId, calendarId, rideDate);
            
            expect(link.text).toBe('short-id');
        });

        it('should build valid calendar URL in link', () => {
            const eventId = 'test-event';
            const calendarId = 'calendar@example.com';
            const rideDate = new Date('2025-06-15T10:00:00');
            
            const link = GoogleEventCore.buildRichTextLink(eventId, calendarId, rideDate);
            
            expect(link.url).toContain('calendar.google.com');
            expect(link.url).toContain('src=calendar%40example.com');
            expect(link.url).toContain('dates=20250615%2F20250615');
        });
    });
});
