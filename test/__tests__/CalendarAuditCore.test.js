const CalendarAuditCore = require('../../src/CalendarAuditCore');
const fs = require('fs');
const vm = require('vm');

describe('CalendarAuditCore', () => {
    it('exposes the class as a GAS global without CommonJS module', () => {
        const context = {};
        const source = fs.readFileSync(require.resolve('../../src/CalendarAuditCore'), 'utf8');

        vm.runInNewContext(source, context);

        expect(context.CalendarAuditCore.getUpcomingScheduledRows([], new Date('2026-10-17'))).toEqual([]);
    });

    describe('getUpcomingScheduledRows', () => {
        it('includes scheduled rides from today onward and excludes past or unscheduled rows', () => {
            const today = new Date('2026-10-17T12:00:00');
            const rows = [
                { startDateTime: new Date('2026-10-17T08:00:00'), rideURL: 'event-today' },
                { startDateTime: new Date('2026-10-18T08:00:00'), rideURL: 'event-future' },
                { startDateTime: new Date('2026-10-16T08:00:00'), rideURL: 'event-past' },
                { startDateTime: new Date('2026-10-18T08:00:00'), rideURL: '' }
            ];

            expect(CalendarAuditCore.getUpcomingScheduledRows(rows, today)).toEqual(rows.slice(0, 2));
        });

        it('includes scheduled rows with a missing or invalid spreadsheet date', () => {
            const rows = [
                { startDateTime: null, rideURL: 'event-no-date', googleEventId: 'id-no-date' },
                { startDateTime: new Date('invalid'), rideURL: '', googleEventId: 'id-invalid-date' }
            ];

            expect(CalendarAuditCore.getUpcomingScheduledRows(rows, new Date('2026-10-17'))).toEqual(rows);
        });

        it('returns an empty list when there are no rows', () => {
            expect(CalendarAuditCore.getUpcomingScheduledRows([], new Date())).toEqual([]);
        });

        it('rejects non-array rows', () => {
            expect(() => CalendarAuditCore.getUpcomingScheduledRows(null, new Date()))
                .toThrow('Rows must be an array');
        });

        it('rejects an invalid current date', () => {
            expect(() => CalendarAuditCore.getUpcomingScheduledRows([], new Date('invalid')))
                .toThrow('Current date is invalid');
        });
    });

    describe('inspectEvent', () => {
        const row = {
            googleEventId: 'calendar-event-1',
            googleEventIdCell: { text: 'calendar-event-1', url: 'expected-calendar-url' },
            startDateTime: new Date('2026-10-17T08:00:00'),
            rideName: 'Sat A (10/17 08:00) Coastal Loop',
            rideURL: 'https://ridewithgps.com/events/123'
        };

        it('flags a scheduled row with no GoogleEventId', () => {
            expect(CalendarAuditCore.inspectEvent({ ...row, googleEventId: '' }, null, 'expected-calendar-url'))
                .toEqual(['missing_event_id']);
        });

        it('flags an event that cannot be found in its configured calendar', () => {
            expect(CalendarAuditCore.inspectEvent(row, null, 'expected-calendar-url'))
                .toEqual(['event_not_found']);
        });

        it('flags a missing spreadsheet date while still auditing the event', () => {
            const rowWithoutDate = { ...row, startDateTime: null };
            const event = {
                title: row.rideName,
                description: `<a href="${row.rideURL}">${row.rideName}</a>`
            };

            expect(CalendarAuditCore.inspectEvent(rowWithoutDate, event, '')).toEqual(['missing_datetime']);
        });

        it('flags blank title and description and a malformed hyperlink URL', () => {
            const event = { title: '  ', description: '' };

            expect(CalendarAuditCore.inspectEvent(row, event, 'other-calendar-url'))
                .toEqual(['blank_title', 'blank_description', 'malformed_event_url']);
        });

        it('flags title mismatch and description missing the ride link', () => {
            const event = { title: 'Wrong title', description: 'Some description' };

            expect(CalendarAuditCore.inspectEvent(row, event, 'expected-calendar-url'))
                .toEqual(['title_mismatch', 'description_missing_ride_url']);
        });

        it('returns no issues for a complete matching event', () => {
            const event = {
                title: row.rideName,
                description: `<a href="${row.rideURL}">${row.rideName}</a>`
            };

            expect(CalendarAuditCore.inspectEvent(row, event, 'expected-calendar-url')).toEqual([]);
        });

        it('treats non-string event fields as empty and skips URL checks without an expected URL', () => {
            expect(CalendarAuditCore.inspectEvent(row, { title: 123, description: null }, ''))
                .toEqual(['blank_title', 'blank_description']);
        });
    });

    describe('formatFindingsEmail', () => {
        it('uses the requested action-required subject and includes event diagnostics', () => {
            const finding = {
                rowNum: 12,
                group: 'Sat A',
                rideDate: new Date('2026-10-18T08:00:00'),
                rideName: 'Coastal Loop',
                rideURL: 'https://ridewithgps.com/events/123',
                googleEventId: 'calendar-event-1',
                calendarId: 'saturday@group.calendar.google.com',
                issues: ['blank_title', 'blank_description']
            };

            const result = CalendarAuditCore.formatFindingsEmail([finding]);

            expect(result.subject).toMatch(/^ACTION REQUIRED - Error detected/);
            expect(result.body).toContain('Row: 12');
            expect(result.body).toContain('Group: Sat A');
            expect(result.body).toContain('Calendar event ID: calendar-event-1');
            expect(result.body).toContain('Issues: blank_title, blank_description');
            expect(result.body).toContain('https://ridewithgps.com/events/123');
        });

        it('rejects non-array findings', () => {
            expect(() => CalendarAuditCore.formatFindingsEmail(null))
                .toThrow('Calendar audit findings must be an array');
        });

        it('uses fallback labels when finding metadata is absent', () => {
            const result = CalendarAuditCore.formatFindingsEmail([{
                rowNum: 2,
                group: '',
                rideDate: '2026-10-18',
                rideName: '',
                rideURL: '',
                googleEventId: '',
                calendarId: '',
                issues: ['missing_event_id']
            }]);

            expect(result.body).toContain('Group: (unknown)');
            expect(result.body).toContain('Ride: (unnamed)');
            expect(result.body).toContain('Calendar ID: (missing)');
            expect(result.body).toContain('Calendar event ID: (missing)');
            expect(result.body).toContain('Ride URL: (missing)');
            expect(result.body).toContain('Ride date:');
        });

        it('labels a missing spreadsheet date explicitly', () => {
            const result = CalendarAuditCore.formatFindingsEmail([{
                rowNum: 2,
                group: 'B',
                rideDate: null,
                rideName: 'Ride',
                rideURL: 'ride-url',
                googleEventId: 'event-id',
                calendarId: 'calendar-id',
                issues: ['missing_datetime']
            }]);

            expect(result.body).toContain('Ride date: (missing or invalid spreadsheet date)');
        });
    });
});
