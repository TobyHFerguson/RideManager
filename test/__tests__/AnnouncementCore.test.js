const AnnouncementCore = require('../../src/AnnouncementCore');

describe('AnnouncementCore', () => {
    describe('calculateSendTime', () => {
        it('should calculate send time as 6 PM, 2 days before ride', () => {
            const rideDate = new Date('2025-12-07T18:00:00Z'); // Sunday ride at 10 AM Pacific (6 PM UTC)
            const sendTime = AnnouncementCore.calculateSendTime(rideDate);
            
            expect(sendTime.getDate()).toBe(5); // Friday
            expect(sendTime.getHours()).toBe(18); // 6 PM
            expect(sendTime.getMinutes()).toBe(0);
        });

        it('should handle string date input', () => {
            const rideDate = '2025-12-07T18:00:00Z';
            const sendTime = AnnouncementCore.calculateSendTime(rideDate);
            
            expect(sendTime.getDate()).toBe(5);
            expect(sendTime.getHours()).toBe(18);
        });
    });

    describe('createQueueItem', () => {
        const mockGenerateId = () => 'test-id-123';
        const mockGetCurrentTime = () => 1700000000000;

        it('should create queue item with all required fields', () => {
            const item = AnnouncementCore.createQueueItem(
                'https://ridewithgps.com/events/123',
                'doc-id-456',
                new Date('2025-12-05T18:00:00'),
                'scheduler@example.com',
                42,
                'Sat A (12/7 10:00) [3] Route Name',
                mockGenerateId,
                mockGetCurrentTime
            );

            expect(item.id).toBe('test-id-123');
            expect(item.rideURL).toBe('https://ridewithgps.com/events/123');
            expect(item.documentId).toBe('doc-id-456');
            expect(item.sendTime).toBe(new Date('2025-12-05T18:00:00').getTime());
            expect(item.rsEmail).toBe('scheduler@example.com');
            expect(item.rowNum).toBe(42);
            expect(item.rideName).toBe('Sat A (12/7 10:00) [3] Route Name');
            expect(item.status).toBe('pending');
            expect(item.createdAt).toBe(1700000000000);
            expect(item.attemptCount).toBe(0);
            expect(item.lastError).toBeNull();
            expect(item.reminderSent).toBe(false);
        });
    });

    describe('calculateNextRetry', () => {
        const now = 1700000000000;
        const sendTime = now; // Send time same as current for simplicity

        it('should return 5 minutes for first retry', () => {
            const nextRetry = AnnouncementCore.calculateNextRetry(0, sendTime, now);
            expect(nextRetry).toBe(now + 5 * 60 * 1000);
        });

        it('should return 15 minutes for second retry', () => {
            const nextRetry = AnnouncementCore.calculateNextRetry(1, sendTime, now);
            expect(nextRetry).toBe(now + 15 * 60 * 1000);
        });

        it('should return 30 minutes for third retry', () => {
            const nextRetry = AnnouncementCore.calculateNextRetry(2, sendTime, now);
            expect(nextRetry).toBe(now + 30 * 60 * 1000);
        });

        it('should return 1 hour for fourth retry', () => {
            const nextRetry = AnnouncementCore.calculateNextRetry(3, sendTime, now);
            expect(nextRetry).toBe(now + 60 * 60 * 1000);
        });

        it('should return 2 hours for fifth retry', () => {
            const nextRetry = AnnouncementCore.calculateNextRetry(4, sendTime, now);
            expect(nextRetry).toBe(now + 2 * 60 * 60 * 1000);
        });

        it('should return 4 hours for sixth retry', () => {
            const nextRetry = AnnouncementCore.calculateNextRetry(5, sendTime, now);
            expect(nextRetry).toBe(now + 4 * 60 * 60 * 1000);
        });

        it('should return 8 hours for seventh and beyond retries', () => {
            expect(AnnouncementCore.calculateNextRetry(6, sendTime, now)).toBe(now + 8 * 60 * 60 * 1000);
            expect(AnnouncementCore.calculateNextRetry(10, sendTime, now)).toBe(now + 8 * 60 * 60 * 1000);
        });

        it('should return null after 24 hours from send time', () => {
            const twentyFourHoursAfterSend = sendTime + 24 * 60 * 60 * 1000;
            const nextRetry = AnnouncementCore.calculateNextRetry(0, sendTime, twentyFourHoursAfterSend);
            expect(nextRetry).toBeNull();
        });

        it('should return null for items more than 24 hours past send time', () => {
            const moreThan24HoursAfterSend = sendTime + 25 * 60 * 60 * 1000;
            const nextRetry = AnnouncementCore.calculateNextRetry(0, sendTime, moreThan24HoursAfterSend);
            expect(nextRetry).toBeNull();
        });

        it('should still retry within 24 hour window from send time', () => {
            const twentyThreeHoursAfterSend = sendTime + 23 * 60 * 60 * 1000;
            const nextRetry = AnnouncementCore.calculateNextRetry(0, sendTime, twentyThreeHoursAfterSend);
            expect(nextRetry).not.toBeNull();
            expect(nextRetry).toBe(twentyThreeHoursAfterSend + 5 * 60 * 1000);
        });
    });

    describe('getDueItems', () => {
        const now = new Date('2025-12-05T18:00:00').getTime();
        
        // Mock Row objects
        const createMockRow = (announcement, sendAt, status = 'pending', attempts = 0, lastAttemptAt = undefined) => ({
            Announcement: announcement,
            SendAt: sendAt ? new Date(sendAt) : undefined,
            Status: status,
            Attempts: attempts,
            LastAttemptAt: lastAttemptAt ? new Date(lastAttemptAt) : undefined,
            RideName: 'Test Ride',
            rowNum: 1
        });

        it('should return rows due to send (pending status)', () => {
            const rows = [
                createMockRow('http://doc1', now + 30 * 60 * 1000), // Due within hour
                createMockRow('http://doc2', now + 2 * 60 * 60 * 1000), // Not due yet
                createMockRow('http://doc3', now - 1000), // Past due (within window)
            ];

            const { dueToSend } = AnnouncementCore.getDueItems(rows, now);
            expect(dueToSend).toHaveLength(2);
            expect(dueToSend[0].Announcement).toBe('http://doc1');
            expect(dueToSend[1].Announcement).toBe('http://doc3');
        });

        it('should return rows due for 24-hour reminder', () => {
            const rows = [
                createMockRow('http://doc1', now + 24 * 60 * 60 * 1000), // Exactly 24h
                createMockRow('http://doc2', now + 23.5 * 60 * 60 * 1000), // Within window
                createMockRow('http://doc3', now + 48 * 60 * 60 * 1000), // Too far out
                createMockRow('http://doc4', now + 1 * 60 * 60 * 1000), // Too soon
            ];

            const { dueForReminder } = AnnouncementCore.getDueItems(rows, now);
            expect(dueForReminder).toHaveLength(2);
            expect(dueForReminder[0].Announcement).toBe('http://doc1');
            expect(dueForReminder[1].Announcement).toBe('http://doc2');
        });

        it('should return failed rows ready for retry', () => {
            // For retry logic: lastAttemptAt + interval must be <= now
            // First attempt (0): wait 5 minutes after last attempt
            // Second attempt (1): wait 15 minutes after last attempt
            const rows = [
                createMockRow('http://doc1', now - 10 * 60 * 1000, 'failed', 0, now - 6 * 60 * 1000), // Last attempt 6min ago, due for retry
                createMockRow('http://doc2', now - 20 * 60 * 1000, 'failed', 1, now - 16 * 60 * 1000), // Last attempt 16min ago, due for retry
                createMockRow('http://doc3', now - 5 * 60 * 1000, 'failed', 0, now - 2 * 60 * 1000), // Last attempt 2min ago, not ready (needs 5min)
                createMockRow('http://doc4', now - 25 * 60 * 60 * 1000, 'failed', 5, now - 25 * 60 * 60 * 1000), // Too old (>24h from sendTime)
            ];

            const { dueToSend } = AnnouncementCore.getDueItems(rows, now);
            // First two should be ready for retry
            expect(dueToSend.length).toBeGreaterThanOrEqual(2);
            const docUrls = dueToSend.map(r => r.Announcement);
            expect(docUrls).toContain('http://doc1');
            expect(docUrls).toContain('http://doc2');
        });

        it('should skip rows without announcement data', () => {
            const rows = [
                createMockRow('', now + 1000), // No URL
                createMockRow('http://doc1', null), // No SendAt
                createMockRow('', null), // Neither
                createMockRow('http://doc2', now + 1000), // Valid
            ];

            const { dueToSend, dueForReminder } = AnnouncementCore.getDueItems(rows, now);
            expect(dueToSend).toHaveLength(1);
            expect(dueToSend[0].Announcement).toBe('http://doc2');
        });

        it('should handle empty rows array', () => {
            const { dueToSend, dueForReminder } = AnnouncementCore.getDueItems([], now);
            expect(dueToSend).toHaveLength(0);
            expect(dueForReminder).toHaveLength(0);
        });

        it('should ignore abandoned status', () => {
            const rows = [
                createMockRow('http://doc1', now + 1000, 'abandoned', 10),
                createMockRow('http://doc2', now + 1000, 'sent', 0),
            ];

            const { dueToSend } = AnnouncementCore.getDueItems(rows, now);
            expect(dueToSend).toHaveLength(0);
        });
    });

    describe('calculateFailureUpdate', () => {
        const now = 1700000000000;
        const sendTime = now - 1000; // Just failed

        it('should increment attempts and set error for first failure', () => {
            const update = AnnouncementCore.calculateFailureUpdate(0, sendTime, 'Network error', now);
            
            expect(update.status).toBe('failed');
            expect(update.attempts).toBe(1);
            expect(update.lastError).toBe('Network error');
        });

        it('should continue with failed status within 24h window', () => {
            const update = AnnouncementCore.calculateFailureUpdate(3, sendTime, 'Still failing', now);
            
            expect(update.status).toBe('failed');
            expect(update.attempts).toBe(4);
        });

        it('should mark as abandoned after 24 hours from send time', () => {
            const oldSendTime = now - 24 * 60 * 60 * 1000 - 1000; // Just over 24h ago
            const update = AnnouncementCore.calculateFailureUpdate(5, oldSendTime, 'Timeout', now);
            
            expect(update.status).toBe('abandoned');
            expect(update.attempts).toBe(6);
            expect(update.lastError).toBe('Timeout');
        });

        it('should preserve error message', () => {
            const update = AnnouncementCore.calculateFailureUpdate(1, sendTime, 'Custom error message', now);
            expect(update.lastError).toBe('Custom error message');
        });
    });

    describe('getStatistics', () => {
        const createMockRow = (announcement, status = 'pending') => ({
            Announcement: announcement,
            Status: status
        });

        it('should calculate correct statistics from rows', () => {
            const rows = [
                createMockRow('http://doc1', 'pending'),
                createMockRow('http://doc2', 'pending'),
                createMockRow('http://doc3', 'sent'),
                createMockRow('http://doc4', 'failed'),
                createMockRow('http://doc5', 'abandoned'),
                createMockRow(''), // No announcement - should not count
            ];

            const stats = AnnouncementCore.getStatistics(rows);
            
            expect(stats.total).toBe(5);
            expect(stats.pending).toBe(2);
            expect(stats.sent).toBe(1);
            expect(stats.failed).toBe(1);
            expect(stats.abandoned).toBe(1);
        });

        it('should handle empty queue', () => {
            const stats = AnnouncementCore.getStatistics([]);
            
            expect(stats.total).toBe(0);
            expect(stats.pending).toBe(0);
        });
    });

    describe('enrichRowData', () => {
        it('should create DateTime, Date, Day, Time from Date field', () => {
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z'), // Saturday 10:00 AM Pacific (18:00 UTC)
                RideURL: 'https://ridewithgps.com/events/123',
                RideName: 'Great Ride',
                RideLeader: 'John Doe'
            };

            const enriched = AnnouncementCore.enrichRowData(rowData);

            expect(enriched.DateTime).toBe('Saturday, December 7, 2024 at 10:00 AM');
            expect(enriched.Date).toBe('December 7, 2024');
            expect(enriched.Day).toBe('Saturday');
            expect(enriched.Time).toBe('10:00 AM');
            expect(enriched.RideLink).toBe('<a href="https://ridewithgps.com/events/123">Great Ride</a>');
            expect(enriched.RideLeader).toBe('John Doe');
        });

        it('should handle missing RideURL', () => {
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z'),
                RideName: 'Great Ride',
                RideLeader: 'Jane Smith'
            };

            const enriched = AnnouncementCore.enrichRowData(rowData);

            expect(enriched.RideLink).toBe('Great Ride');
            expect(enriched.RideLeader).toBe('Jane Smith');
        });

        it('should handle missing RideName', () => {
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z'),
                RideURL: 'https://ridewithgps.com/events/123'
            };

            const enriched = AnnouncementCore.enrichRowData(rowData);

            expect(enriched.RideLink).toBe('https://ridewithgps.com/events/123');
        });

        it('should preserve original rowData fields', () => {
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z'),
                Location: 'Seascape Park',
                Address: '123 Main St',
                Group: 'Sat A',
                RouteName: 'Coastal Loop',
                RideLeaders: 'John Doe, Jane Smith'
            };

            const enriched = AnnouncementCore.enrichRowData(rowData);

            expect(enriched.Location).toBe('Seascape Park');
            expect(enriched.Address).toBe('123 Main St');
            expect(enriched.Group).toBe('Sat A');
            expect(enriched.RouteName).toBe('Coastal Loop');
            expect(enriched.RideLeader).toBe('John Doe, Jane Smith');
        });

        it('should add route metrics when route provided', () => {
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z')
            };
            const route = {
                distance: 72420.5,        // meters (45 miles)
                elevation_gain: 762.0,    // meters (2500 feet)
                first_lat: 37.7749,
                first_lng: -122.4194
            };

            const enriched = AnnouncementCore.enrichRowData(rowData, route);

            expect(enriched.Length).toBe(45);         // 72420.5 * 0.000621371 = 45.0
            expect(enriched.Gain).toBe(2500);         // 762.0 * 3.28084 = 2500.0
            expect(enriched.FPM).toBe(56);            // 2500 / 45 = 55.56, rounded to 56
            expect(enriched.Lat).toBe(37.7749);
            expect(enriched.Long).toBe(-122.4194);
        });

        it('should generate startPin with Apple and Google Maps links', () => {
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z')
            };
            const route = {
                distance: 72420.5,
                elevation_gain: 762.0,
                first_lat: 37.7749,
                first_lng: -122.4194
            };

            const enriched = AnnouncementCore.enrichRowData(rowData, route);

            expect(enriched.StartPin).toContain('<a href="https://maps.apple.com/?ll=37.7749,-122.4194&q=Ride%20Start">Apple Maps</a>');
            expect(enriched.StartPin).toContain('<a href="https://www.google.com/maps/search/?api=1&query=37.7749,-122.4194">Google Maps</a>');
            expect(enriched.StartPin).toContain('> / <');
        });

        it('should round route metrics correctly', () => {
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z')
            };
            const route = {
                distance: 80467.2,        // 50 miles
                elevation_gain: 1524.0,   // 5000 feet
                first_lat: 36.1234,
                first_lng: -121.5678
            };

            const enriched = AnnouncementCore.enrichRowData(rowData, route);

            expect(enriched.Length).toBe(50);
            expect(enriched.Gain).toBe(5000);
            expect(enriched.FPM).toBe(100);          // 5000 / 50 = 100
        });

        it('should handle route with zero distance', () => {
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z')
            };
            const route = {
                distance: 0,
                elevation_gain: 100,
                first_lat: 37.0,
                first_lng: -122.0
            };

            const enriched = AnnouncementCore.enrichRowData(rowData, route);

            expect(enriched.Length).toBe(0);
            expect(enriched.FPM).toBeUndefined();      // Won't calculate when length = 0
        });

        it('should handle route with missing fields', () => {
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z')
            };
            const route = {
                distance: 50000,
                // elevation_gain missing
                first_lat: 37.0
                // first_lng missing
            };

            const enriched = AnnouncementCore.enrichRowData(rowData, route);

            expect(enriched.Length).toBe(31);         // 50000 * 0.000621371
            expect(enriched.Gain).toBeUndefined();    // elevation_gain undefined
            expect(enriched.FPM).toBeUndefined();     // gain undefined, so fpm undefined
            expect(enriched.Lat).toBe(37.0);
            expect(enriched.Long).toBeUndefined();    // first_lng undefined
            expect(enriched.StartPin).toBeUndefined(); // Can't create without both lat/long
        });

        it('should handle null route parameter', () => {
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z'),
                RideName: 'Test Ride'
            };

            const enriched = AnnouncementCore.enrichRowData(rowData, null);

            expect(enriched.RideName).toBe('Test Ride');
            expect(enriched.Length).toBeUndefined();
            expect(enriched.Gain).toBeUndefined();
            expect(enriched.FPM).toBeUndefined();
            expect(enriched.Lat).toBeUndefined();
            expect(enriched.Long).toBeUndefined();
            expect(enriched.StartPin).toBeUndefined();
        });

        it('should handle omitted route parameter', () => {
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z'),
                Location: 'Test Location'
            };

            const enriched = AnnouncementCore.enrichRowData(rowData);

            expect(enriched.Location).toBe('Test Location');
            expect(enriched.Length).toBeUndefined();
            expect(enriched.Gain).toBeUndefined();
            expect(enriched.FPM).toBeUndefined();
            expect(enriched.Lat).toBeUndefined();
            expect(enriched.Long).toBeUndefined();
            expect(enriched.StartPin).toBeUndefined();
        });

        it('should preserve route fields when both rowData and route provided', () => {
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z'),
                RideName: 'Test Ride',
                Location: 'Test Location'
            };
            const route = {
                distance: 80467.2,
                elevation_gain: 1524.0,
                first_lat: 36.5,
                first_lng: -121.5
            };

            const enriched = AnnouncementCore.enrichRowData(rowData, route);

            // Original fields preserved
            expect(enriched.RideName).toBe('Test Ride');
            expect(enriched.Location).toBe('Test Location');
            
            // Route fields added
            expect(enriched.Length).toBe(50);
            expect(enriched.Gain).toBe(5000);
            expect(enriched.FPM).toBe(100);
            expect(enriched.Lat).toBe(36.5);
            expect(enriched.Long).toBe(-121.5);
            expect(enriched.StartPin).toBeDefined();
        });
    });

    describe('expandTemplate', () => {
        it('should expand all fields including enriched fields', () => {
            const template = 'Ride: {RideLink} on {DateTime} at {Location}';
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z'), // Saturday 10:00 AM Pacific
                RideURL: 'https://ridewithgps.com/events/123',
                RideName: 'Saturday Ride',
                Location: 'Seascape Park'
            };

            const result = AnnouncementCore.expandTemplate(template, rowData);
            
            expect(result.expandedText).toBe('Ride: <a href="https://ridewithgps.com/events/123">Saturday Ride</a> on Saturday, December 7, 2024 at 10:00 AM at Seascape Park');
            expect(result.missingFields).toHaveLength(0);
        });

        it('should expand date/time fields separately', () => {
            const template = '{Day}, {Date} at {Time}';
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z')
            };

            const result = AnnouncementCore.expandTemplate(template, rowData);
            
            expect(result.expandedText).toBe('Saturday, December 7, 2024 at 10:00 AM');
            expect(result.missingFields).toHaveLength(0);
        });

        it('should preserve {FieldName} for missing fields', () => {
            const template = 'Ride: {RideName} at {Location}';
            const rowData = {
                RideName: 'Saturday Ride'
                // Location is missing
            };

            const result = AnnouncementCore.expandTemplate(template, rowData);
            
            expect(result.expandedText).toBe('Ride: Saturday Ride at {Location}');
            expect(result.missingFields).toEqual(['Location']);
        });

        it('should preserve {FieldName} for null fields', () => {
            const template = '{Field1} and {Field2}';
            const rowData = {
                Field1: null,
                Field2: 'value'
            };

            const result = AnnouncementCore.expandTemplate(template, rowData);
            
            expect(result.expandedText).toBe('{Field1} and value');
            expect(result.missingFields).toEqual(['Field1']);
        });

        it('should preserve {FieldName} for empty string fields', () => {
            const template = '{Field1} {Field2}';
            const rowData = {
                Field1: '',
                Field2: 'value'
            };

            const result = AnnouncementCore.expandTemplate(template, rowData);
            
            expect(result.expandedText).toBe('{Field1} value');
            expect(result.missingFields).toEqual(['Field1']);
        });

        it('should handle template with no placeholders', () => {
            const template = 'No placeholders here';
            const rowData = {};

            const result = AnnouncementCore.expandTemplate(template, rowData);
            
            expect(result.expandedText).toBe('No placeholders here');
            expect(result.missingFields).toHaveLength(0);
        });

        it('should expand route-based fields when route provided', () => {
            const template = 'Distance: {Length} miles, Elevation: {Gain} feet, Difficulty: {FPM} fpm';
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z')
            };
            const route = {
                distance: 72420.5,        // 45 miles
                elevation_gain: 762.0,    // 2500 feet
                first_lat: 37.7749,
                first_lng: -122.4194
            };

            const result = AnnouncementCore.expandTemplate(template, rowData, route);
            
            expect(result.expandedText).toBe('Distance: 45 miles, Elevation: 2500 feet, Difficulty: 56 fpm');
            expect(result.missingFields).toHaveLength(0);
        });

        it('should expand lat/long fields when route provided', () => {
            const template = 'Start: {Lat}, {Long}';
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z')
            };
            const route = {
                distance: 50000,
                elevation_gain: 500,
                first_lat: 36.1234,
                first_lng: -121.5678
            };

            const result = AnnouncementCore.expandTemplate(template, rowData, route);
            
            expect(result.expandedText).toBe('Start: 36.1234, -121.5678');
            expect(result.missingFields).toHaveLength(0);
        });

        it('should expand startPin field with map links', () => {
            const template = 'Map: {StartPin}';
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z')
            };
            const route = {
                distance: 50000,
                elevation_gain: 500,
                first_lat: 37.5,
                first_lng: -122.5
            };

            const result = AnnouncementCore.expandTemplate(template, rowData, route);
            
            expect(result.expandedText).toContain('Map: <a href="https://maps.apple.com/?ll=37.5,-122.5');
            expect(result.expandedText).toContain('>Apple Maps</a>');
            expect(result.expandedText).toContain('<a href="https://www.google.com/maps/search/?api=1&query=37.5,-122.5');
            expect(result.expandedText).toContain('>Google Maps</a>');
            expect(result.missingFields).toHaveLength(0);
        });

        it('should mark route fields as missing when route not provided', () => {
            const template = 'Distance: {Length}, Elevation: {Gain}';
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z')
            };

            const result = AnnouncementCore.expandTemplate(template, rowData);
            
            expect(result.expandedText).toBe('Distance: {Length}, Elevation: {Gain}');
            expect(result.missingFields).toEqual(['Length', 'Gain']);
        });

        it('should expand mix of standard and route fields', () => {
            const template = '{RideName} - {Length} miles with {Gain} feet on {Day}';
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z'),
                RideName: 'Saturday Ride'
            };
            const route = {
                distance: 80467.2,        // 50 miles
                elevation_gain: 1524.0,   // 5000 feet
                first_lat: 36.0,
                first_lng: -121.0
            };

            const result = AnnouncementCore.expandTemplate(template, rowData, route);
            
            expect(result.expandedText).toBe('Saturday Ride - 50 miles with 5000 feet on Saturday');
            expect(result.missingFields).toHaveLength(0);
        });

        it('should handle route with null parameter', () => {
            const template = '{Length} miles';
            const rowData = {
                Date: new Date('2024-12-07T18:00:00Z')
            };

            const result = AnnouncementCore.expandTemplate(template, rowData, null);
            
            expect(result.expandedText).toBe('{Length} miles');
            expect(result.missingFields).toEqual(['Length']);
        });
    });

    describe('extractSubject', () => {
        it('should extract subject from template', () => {
            const template = 'Subject: Ride Announcement\n\nThis is the body';
            
            const result = AnnouncementCore.extractSubject(template);
            
            expect(result.subject).toBe('Ride Announcement');
            expect(result.body).toBe('This is the body');
        });

        it('should handle subject with extra whitespace', () => {
            const template = 'Subject:   Spaced Out Subject   \nBody text';
            
            const result = AnnouncementCore.extractSubject(template);
            
            expect(result.subject).toBe('Spaced Out Subject');
        });

        it('should return null subject if not found', () => {
            const template = 'No subject line here\nJust body text';
            
            const result = AnnouncementCore.extractSubject(template);
            
            expect(result.subject).toBeNull();
            expect(result.body).toBe('No subject line here\nJust body text');
        });

        it('should handle template with only subject', () => {
            const template = 'Subject: Only Subject';
            
            const result = AnnouncementCore.extractSubject(template);
            
            expect(result.subject).toBe('Only Subject');
            expect(result.body).toBe('');
        });
    });

    describe('calculateAnnouncementDocName', () => {
        it('should format document name with RA- prefix', () => {
            const result = AnnouncementCore.calculateAnnouncementDocName('Sat A (12/7 10:00) [3] Route Name');
            
            expect(result).toBe('RA-Sat A (12/7 10:00) [3] Route Name');
        });

        it('should handle empty ride name', () => {
            const result = AnnouncementCore.calculateAnnouncementDocName('');
            
            expect(result).toBe('RA-');
        });

        it('should handle ride name with special characters', () => {
            const result = AnnouncementCore.calculateAnnouncementDocName('Ride & Tour: "Special" Event');
            
            expect(result).toBe('RA-Ride & Tour: "Special" Event');
        });
    });

    describe('calculateAnnouncementUpdates', () => {
        it('should always update sendAt and detect document rename when name unchanged', () => {
            const currentAnnouncement = {
                documentName: 'RA-Sat A (12/7 10:00) [3] Route Name'
            };
            const newRideData = {
                rideName: 'Sat A (12/7 10:00) [3] Route Name',
                rideDate: new Date('2025-12-07T18:00:00Z')
            };

            const updates = AnnouncementCore.calculateAnnouncementUpdates(currentAnnouncement, newRideData);

            expect(updates.needsDocumentRename).toBe(false);
            expect(updates.newDocumentName).toBeNull();
            expect(updates.needsSendAtUpdate).toBe(true);
            expect(updates.calculatedSendAt).toEqual(new Date('2025-12-05T18:00:00Z')); // Friday 6 PM, 2 days before
        });

        it('should detect document rename needed when ride name changes', () => {
            const currentAnnouncement = {
                documentName: 'RA-Old Ride Name'
            };
            const newRideData = {
                rideName: 'New Ride Name',
                rideDate: new Date('2025-12-07T18:00:00Z')
            };

            const updates = AnnouncementCore.calculateAnnouncementUpdates(currentAnnouncement, newRideData);

            expect(updates.needsDocumentRename).toBe(true);
            expect(updates.newDocumentName).toBe('RA-New Ride Name');
            expect(updates.needsSendAtUpdate).toBe(true);
        });

        it('should calculate sendAt correctly when ride date changes', () => {
            const currentAnnouncement = {
                documentName: 'RA-Sat A (12/7 10:00) [3] Route Name'
            };
            const newRideData = {
                rideName: 'Sat A (12/7 10:00) [3] Route Name',
                rideDate: new Date('2025-12-14T18:00:00Z') // Next Sunday
            };

            const updates = AnnouncementCore.calculateAnnouncementUpdates(currentAnnouncement, newRideData);

            expect(updates.needsSendAtUpdate).toBe(true);
            expect(updates.calculatedSendAt).toEqual(new Date('2025-12-12T18:00:00Z')); // Friday before new date
        });

        it('should handle both name and date changes', () => {
            const currentAnnouncement = {
                documentName: 'RA-Old Ride Name'
            };
            const newRideData = {
                rideName: 'New Ride Name',
                rideDate: new Date('2025-12-14T18:00:00Z')
            };

            const updates = AnnouncementCore.calculateAnnouncementUpdates(currentAnnouncement, newRideData);

            expect(updates.needsDocumentRename).toBe(true);
            expect(updates.newDocumentName).toBe('RA-New Ride Name');
            expect(updates.needsSendAtUpdate).toBe(true);
            expect(updates.calculatedSendAt).toEqual(new Date('2025-12-12T18:00:00Z'));
        });

        it('should handle edge case of ride date moved earlier', () => {
            const currentAnnouncement = {
                documentName: 'RA-Sat A (12/14 10:00) [3] Route Name'
            };
            const newRideData = {
                rideName: 'Sat A (12/14 10:00) [3] Route Name',
                rideDate: new Date('2025-12-07T18:00:00Z') // Moved earlier to 12/7
            };

            const updates = AnnouncementCore.calculateAnnouncementUpdates(currentAnnouncement, newRideData);

            expect(updates.needsSendAtUpdate).toBe(true);
            expect(updates.calculatedSendAt).toEqual(new Date('2025-12-05T18:00:00Z')); // Friday before 12/7
        });
    });
});
