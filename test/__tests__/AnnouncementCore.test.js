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
});
