const RideManagerCore = require('../../src/RideManagerCore');

describe('RideManagerCore', () => {
    describe('extractEventID', () => {
        it('should extract event ID from event URL', () => {
            const url = 'https://ridewithgps.com/events/12345-epic-ride';
            expect(RideManagerCore.extractEventID(url)).toBe('12345');
        });

        it('should extract event ID from URL without hyphen', () => {
            const url = 'https://ridewithgps.com/events/67890';
            expect(RideManagerCore.extractEventID(url)).toBe('67890');
        });

        it('should handle URLs with multiple hyphens', () => {
            const url = 'https://ridewithgps.com/events/111-some-long-ride-name-here';
            expect(RideManagerCore.extractEventID(url)).toBe('111');
        });
    });

    describe('extractLatLong', () => {
        it('should extract lat/long from route', () => {
            const route = {
                first_lat: 37.3861,
                first_lng: -122.0839
            };
            expect(RideManagerCore.extractLatLong(route)).toBe('37.3861,-122.0839');
        });

        it('should return empty string for null route', () => {
            expect(RideManagerCore.extractLatLong(null)).toBe('');
        });

        it('should return empty string for undefined route', () => {
            expect(RideManagerCore.extractLatLong(undefined)).toBe('');
        });

        it('should handle zero coordinates', () => {
            const route = {
                first_lat: 0,
                first_lng: 0
            };
            expect(RideManagerCore.extractLatLong(route)).toBe('0,0');
        });
    });

    describe('prepareRouteImport', () => {
        const mockAddDays = (date, days) => {
            const result = new Date(date);
            result.setDate(result.getDate() + days);
            return result;
        };

        const mockFormatDate = (date) => {
            const d = new Date(date);
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const year = d.getFullYear();
            return `${month}${day}${year}`;
        };

        const globals = {
            EXPIRY_DELAY: 30,
            FOREIGN_PREFIX: 'Foreign: '
        };

        it('should prepare route config with all fields', () => {
            const rowData = {
                routeURL: 'https://ridewithgps.com/routes/123',
                routeName: 'Epic Ride',
                startDate: new Date('2026-01-15'),
                group: 'Sat A'
            };

            const result = RideManagerCore.prepareRouteImport(
                rowData,
                globals,
                mockAddDays,
                mockFormatDate
            );

            expect(result.url).toBe('https://ridewithgps.com/routes/123');
            expect(result.name).toBe('Epic Ride');
            expect(result.expiry).toBe('02132026'); // 30 days after 01/15/2026 = 02/14 - 1 day DST = 02/13
            expect(result.tags).toEqual(['Sat A']);
        });

        it('should omit name when routeName equals routeURL', () => {
            const rowData = {
                routeURL: 'https://ridewithgps.com/routes/123',
                routeName: 'https://ridewithgps.com/routes/123',
                startDate: new Date('2026-01-15'),
                group: 'Sat B'
            };

            const result = RideManagerCore.prepareRouteImport(
                rowData,
                globals,
                mockAddDays,
                mockFormatDate
            );

            expect(result.name).toBeUndefined();
        });

        it('should remove foreign prefix from name', () => {
            const rowData = {
                routeURL: 'https://ridewithgps.com/routes/456',
                routeName: 'Foreign: Great Ride',
                startDate: new Date('2026-01-15'),
                group: 'Sun A'
            };

            const result = RideManagerCore.prepareRouteImport(
                rowData,
                globals,
                mockAddDays,
                mockFormatDate
            );

            expect(result.name).toBe('Great Ride');
        });

        it('should use routeName as URL when routeURL is empty', () => {
            const rowData = {
                routeURL: '',
                routeName: 'https://ridewithgps.com/routes/789',
                startDate: new Date('2026-01-15'),
                group: 'Wed'
            };

            const result = RideManagerCore.prepareRouteImport(
                rowData,
                globals,
                mockAddDays,
                mockFormatDate
            );

            expect(result.url).toBe('https://ridewithgps.com/routes/789');
        });

        it('should default to current date when startDate missing', () => {
            const now = new Date();
            const rowData = {
                routeURL: 'https://ridewithgps.com/routes/999',
                routeName: 'Test Ride',
                group: 'Sat A'
            };

            const result = RideManagerCore.prepareRouteImport(
                rowData,
                globals,
                mockAddDays,
                mockFormatDate
            );

            // Verify expiry is roughly 30 days from now
            const expectedDate = mockAddDays(now, 30);
            const expected = mockFormatDate(expectedDate);
            expect(result.expiry).toBe(expected);
        });

        it('should handle string startDate', () => {
            const rowData = {
                routeURL: 'https://ridewithgps.com/routes/111',
                routeName: 'String Date Ride',
                startDate: '2026-03-01',
                group: 'Sat B'
            };

            const result = RideManagerCore.prepareRouteImport(
                rowData,
                globals,
                mockAddDays,
                mockFormatDate
            );

            expect(result.expiry).toBe('03302026'); // 30 days after 03/01/2026 = 03/31 - 1 day DST = 03/30
        });
    });

    describe('isManagedEventName', () => {
        const groupNames = ['Sat A', 'Sat B', 'Sun A', 'Wed'];

        it('should return true for event with group name', () => {
            expect(RideManagerCore.isManagedEventName('Sat A (1/15 10:00) [3] Epic Ride', groupNames)).toBe(true);
        });

        it('should return true for any matching group', () => {
            expect(RideManagerCore.isManagedEventName('Sun A Ride', groupNames)).toBe(true);
            expect(RideManagerCore.isManagedEventName('Wed Morning Ride', groupNames)).toBe(true);
        });

        it('should return false for unmanaged event', () => {
            expect(RideManagerCore.isManagedEventName('Random Club Event', groupNames)).toBe(false);
        });

        it('should return false for empty event name', () => {
            expect(RideManagerCore.isManagedEventName('', groupNames)).toBe(false);
        });

        it('should return false with empty group names', () => {
            expect(RideManagerCore.isManagedEventName('Some Event', [])).toBe(false);
        });
    });

    describe('extractGroupName', () => {
        const groupNames = ['Sat A', 'Sat B', 'Sun A', 'Wed'];

        it('should extract group name from event name', () => {
            expect(RideManagerCore.extractGroupName('Sat A (1/15 10:00) [3] Epic Ride', groupNames)).toBe('Sat A');
        });

        it('should extract first matching group name', () => {
            expect(RideManagerCore.extractGroupName('Sun A Morning Ride', groupNames)).toBe('Sun A');
        });

        it('should return null for unmanaged event', () => {
            expect(RideManagerCore.extractGroupName('Random Club Event', groupNames)).toBeNull();
        });

        it('should return null for empty event name', () => {
            expect(RideManagerCore.extractGroupName('', groupNames)).toBeNull();
        });
    });

    describe('validateEventNameFormat', () => {
        it('should not throw for valid event name', () => {
            expect(() => {
                RideManagerCore.validateEventNameFormat('Sat A (1/15 10:00) [3] Epic Ride', 5, 'Original Name', 'RWGPS');
            }).not.toThrow();
        });

        it('should throw when event name ends with square bracket', () => {
            expect(() => {
                RideManagerCore.validateEventNameFormat('Sat A (1/15 10:00) [3]', 10, 'Original', 'newEvent');
            }).toThrow(/row 10.*ends with a square bracket/);
        });

        it('should throw with correct error message', () => {
            expect(() => {
                RideManagerCore.validateEventNameFormat('Bad Name]', 42, 'Good Name', 'RWGPS');
            }).toThrow(/row 42.*Bad Name\].*Original name: Good Name/);
        });

        it('should trim whitespace before checking', () => {
            expect(() => {
                RideManagerCore.validateEventNameFormat('Event Name]  ', 15, 'Orig', 'test');
            }).toThrow(/ends with a square bracket/);
        });
    });

    describe('prepareCalendarEventData', () => {
        it('should prepare calendar event with all fields', () => {
            const rideEvent = {
                name: 'Epic Ride',
                start_time: '2026-01-15T10:00:00'
            };
            const rowData = {
                endTime: new Date('2026-01-15T13:00:00')
            };

            const result = RideManagerCore.prepareCalendarEventData(rideEvent, rowData);

            expect(result.name).toBe('Epic Ride');
            expect(result.start).toEqual(new Date('2026-01-15T10:00:00'));
            expect(result.end).toEqual(new Date('2026-01-15T13:00:00'));
        });

        it('should handle Date object for start_time', () => {
            const startDate = new Date('2026-02-01T09:00:00');
            const rideEvent = {
                name: 'Morning Ride',
                start_time: startDate
            };
            const rowData = {
                endTime: new Date('2026-02-01T12:00:00')
            };

            const result = RideManagerCore.prepareCalendarEventData(rideEvent, rowData);

            expect(result.start).toEqual(startDate);
        });

        it('should default to empty string for missing name', () => {
            const rideEvent = {
                start_time: '2026-01-15T10:00:00'
            };
            const rowData = {
                endTime: new Date('2026-01-15T13:00:00')
            };

            const result = RideManagerCore.prepareCalendarEventData(rideEvent, rowData);

            expect(result.name).toBe('');
        });

        it('should default to current date for missing start_time', () => {
            const before = new Date();
            const rideEvent = {
                name: 'Test Ride'
            };
            const rowData = {
                endTime: new Date('2026-01-15T13:00:00')
            };

            const result = RideManagerCore.prepareCalendarEventData(rideEvent, rowData);
            const after = new Date();

            expect(result.start.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(result.start.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should default to current date for missing endTime', () => {
            const before = new Date();
            const rideEvent = {
                name: 'Test Ride',
                start_time: '2026-01-15T10:00:00'
            };
            const rowData = {};

            const result = RideManagerCore.prepareCalendarEventData(rideEvent, rowData);
            const after = new Date();

            expect(result.end.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(result.end.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        it('should handle string endTime', () => {
            const rideEvent = {
                name: 'Test Ride',
                start_time: '2026-01-15T10:00:00'
            };
            const rowData = {
                endTime: '2026-01-15T13:00:00'
            };

            const result = RideManagerCore.prepareCalendarEventData(rideEvent, rowData);

            expect(result.end).toEqual(new Date('2026-01-15T13:00:00'));
        });
    });
});
