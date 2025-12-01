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

        it('should return 5 minutes for first retry', () => {
            const nextRetry = AnnouncementCore.calculateNextRetry(0, now, now);
            expect(nextRetry).toBe(now + 5 * 60 * 1000);
        });

        it('should return 15 minutes for second retry', () => {
            const nextRetry = AnnouncementCore.calculateNextRetry(1, now, now);
            expect(nextRetry).toBe(now + 15 * 60 * 1000);
        });

        it('should return 30 minutes for third retry', () => {
            const nextRetry = AnnouncementCore.calculateNextRetry(2, now, now);
            expect(nextRetry).toBe(now + 30 * 60 * 1000);
        });

        it('should return 1 hour for fourth retry', () => {
            const nextRetry = AnnouncementCore.calculateNextRetry(3, now, now);
            expect(nextRetry).toBe(now + 60 * 60 * 1000);
        });

        it('should return 2 hours for fifth retry', () => {
            const nextRetry = AnnouncementCore.calculateNextRetry(4, now, now);
            expect(nextRetry).toBe(now + 2 * 60 * 60 * 1000);
        });

        it('should return 4 hours for sixth retry', () => {
            const nextRetry = AnnouncementCore.calculateNextRetry(5, now, now);
            expect(nextRetry).toBe(now + 4 * 60 * 60 * 1000);
        });

        it('should return 8 hours for seventh and beyond retries', () => {
            expect(AnnouncementCore.calculateNextRetry(6, now, now)).toBe(now + 8 * 60 * 60 * 1000);
            expect(AnnouncementCore.calculateNextRetry(10, now, now)).toBe(now + 8 * 60 * 60 * 1000);
        });

        it('should return null after 24 hours', () => {
            const twentyFourHoursLater = now + 24 * 60 * 60 * 1000;
            const nextRetry = AnnouncementCore.calculateNextRetry(0, now, twentyFourHoursLater);
            expect(nextRetry).toBeNull();
        });

        it('should return null for items older than 24 hours', () => {
            const moreThan24Hours = now + 25 * 60 * 60 * 1000;
            const nextRetry = AnnouncementCore.calculateNextRetry(0, now, moreThan24Hours);
            expect(nextRetry).toBeNull();
        });
    });

    describe('getDueItems', () => {
        const now = new Date('2025-12-05T18:00:00').getTime();
        
        it('should return items due to send', () => {
            const queue = [
                { id: '1', status: 'pending', sendTime: now - 1000 }, // Past due
                { id: '2', status: 'pending', sendTime: now + 30 * 60 * 1000 }, // Due within hour
                { id: '3', status: 'pending', sendTime: now + 2 * 60 * 60 * 1000 } // Not due yet
            ];

            const { dueToSend } = AnnouncementCore.getDueItems(queue, now);
            expect(dueToSend).toHaveLength(2);
            expect(dueToSend.map(i => i.id)).toEqual(['1', '2']);
        });

        it('should return items due for 24-hour reminder', () => {
            const queue = [
                { id: '1', status: 'pending', sendTime: now + 24 * 60 * 60 * 1000, reminderSent: false }, // Exactly 24h
                { id: '2', status: 'pending', sendTime: now + 23.5 * 60 * 60 * 1000, reminderSent: false }, // Within window
                { id: '3', status: 'pending', sendTime: now + 24 * 60 * 60 * 1000, reminderSent: true }, // Already sent
                { id: '4', status: 'pending', sendTime: now + 48 * 60 * 60 * 1000, reminderSent: false } // Too far out
            ];

            const { dueForReminder } = AnnouncementCore.getDueItems(queue, now);
            expect(dueForReminder).toHaveLength(2);
            expect(dueForReminder.map(i => i.id)).toEqual(['1', '2']);
        });

        it('should return failed items ready for retry', () => {
            const queue = [
                { id: '1', status: 'failed', nextRetry: now - 1000 }, // Ready
                { id: '2', status: 'failed', nextRetry: now + 1000 }, // Not ready
                { id: '3', status: 'abandoned' } // No retry
            ];

            const { dueToSend } = AnnouncementCore.getDueItems(queue, now);
            expect(dueToSend).toHaveLength(1);
            expect(dueToSend[0].id).toBe('1');
        });

        it('should handle empty queue', () => {
            const { dueToSend, dueForReminder } = AnnouncementCore.getDueItems([], now);
            expect(dueToSend).toHaveLength(0);
            expect(dueForReminder).toHaveLength(0);
        });
    });

    describe('updateAfterFailure', () => {
        const now = 1700000000000;

        it('should increment attempt count and set error', () => {
            const item = {
                id: '1',
                status: 'pending',
                attemptCount: 0,
                createdAt: now
            };

            const updated = AnnouncementCore.updateAfterFailure(item, 'Network error', now);
            
            expect(updated.status).toBe('failed');
            expect(updated.attemptCount).toBe(1);
            expect(updated.lastError).toBe('Network error');
            expect(updated.nextRetry).toBe(now + 15 * 60 * 1000); // attemptCount becomes 1, so second retry interval
            expect(updated.lastAttemptAt).toBe(now);
        });

        it('should mark as abandoned after 24 hours', () => {
            const createdAt = now - 24 * 60 * 60 * 1000;
            const item = {
                id: '1',
                status: 'failed',
                attemptCount: 5,
                createdAt: createdAt
            };

            const updated = AnnouncementCore.updateAfterFailure(item, 'Still failing', now);
            
            expect(updated.status).toBe('abandoned');
            expect(updated.nextRetry).toBeNull();
        });
    });

    describe('markAsSent', () => {
        it('should mark item as sent', () => {
            const now = 1700000000000;
            const item = { id: '1', status: 'pending' };
            
            const updated = AnnouncementCore.markAsSent(item, now);
            
            expect(updated.status).toBe('sent');
            expect(updated.sentAt).toBe(now);
        });
    });

    describe('markReminderSent', () => {
        it('should mark reminder as sent', () => {
            const now = 1700000000000;
            const item = { id: '1', reminderSent: false };
            
            const updated = AnnouncementCore.markReminderSent(item, now);
            
            expect(updated.reminderSent).toBe(true);
            expect(updated.reminderSentAt).toBe(now);
        });
    });

    describe('removeItem', () => {
        it('should remove item by ID', () => {
            const queue = [
                { id: '1', name: 'First' },
                { id: '2', name: 'Second' },
                { id: '3', name: 'Third' }
            ];

            const updated = AnnouncementCore.removeItem(queue, '2');
            
            expect(updated).toHaveLength(2);
            expect(updated.map(i => i.id)).toEqual(['1', '3']);
        });

        it('should return same queue if ID not found', () => {
            const queue = [{ id: '1' }, { id: '2' }];
            const updated = AnnouncementCore.removeItem(queue, '999');
            
            expect(updated).toHaveLength(2);
        });

        it('should handle empty queue', () => {
            const updated = AnnouncementCore.removeItem([], '1');
            expect(updated).toHaveLength(0);
        });

        it('should not mutate original queue', () => {
            const queue = [{ id: '1' }, { id: '2' }];
            const original = [...queue];
            
            AnnouncementCore.removeItem(queue, '1');
            
            expect(queue).toEqual(original);
        });
    });

    describe('updateItem', () => {
        it('should update item by ID', () => {
            const queue = [
                { id: '1', status: 'pending', count: 0 },
                { id: '2', status: 'pending', count: 0 }
            ];

            const updated = AnnouncementCore.updateItem(queue, '1', { status: 'sent', count: 5 });
            
            expect(updated[0].status).toBe('sent');
            expect(updated[0].count).toBe(5);
            expect(updated[1].status).toBe('pending'); // Other items unchanged
        });

        it('should return same queue if ID not found', () => {
            const queue = [{ id: '1', status: 'pending' }];
            const updated = AnnouncementCore.updateItem(queue, '999', { status: 'sent' });
            
            expect(updated[0].status).toBe('pending');
        });

        it('should not mutate original queue', () => {
            const queue = [{ id: '1', status: 'pending' }];
            const original = JSON.parse(JSON.stringify(queue));
            
            AnnouncementCore.updateItem(queue, '1', { status: 'sent' });
            
            expect(queue).toEqual(original);
        });
    });

    describe('getStatistics', () => {
        it('should calculate correct statistics', () => {
            const queue = [
                { id: '1', status: 'pending' },
                { id: '2', status: 'pending' },
                { id: '3', status: 'sent' },
                { id: '4', status: 'failed' },
                { id: '5', status: 'abandoned' }
            ];

            const stats = AnnouncementCore.getStatistics(queue);
            
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

    describe('formatItems', () => {
        const now = new Date('2025-12-05T18:00:00').getTime();

        it('should format items for display', () => {
            const queue = [
                {
                    id: '1',
                    rideName: 'Sat A (12/7 10:00) [3] Route',
                    rowNum: 42,
                    sendTime: new Date('2025-12-05T18:00:00').getTime(),
                    status: 'pending',
                    rsEmail: 'test@example.com',
                    documentId: 'doc-123',
                    createdAt: now - 2 * 60 * 60 * 1000,
                    attemptCount: 0,
                    lastError: null
                }
            ];

            const formatted = AnnouncementCore.formatItems(queue, now);
            
            expect(formatted).toHaveLength(1);
            expect(formatted[0].id).toBe('1');
            expect(formatted[0].rideName).toBe('Sat A (12/7 10:00) [3] Route');
            expect(formatted[0].rowNum).toBe(42);
            expect(formatted[0].status).toBe('pending');
            expect(formatted[0].ageHours).toBe(2);
            expect(formatted[0].attemptCount).toBe(0);
        });

        it('should handle missing rideName and rowNum', () => {
            const queue = [
                {
                    id: '1',
                    sendTime: now,
                    status: 'pending',
                    rsEmail: 'test@example.com',
                    documentId: 'doc-123',
                    createdAt: now,
                    attemptCount: 0
                }
            ];

            const formatted = AnnouncementCore.formatItems(queue, now);
            
            expect(formatted[0].rideName).toBe('Unknown Ride');
            expect(formatted[0].rowNum).toBe('?');
        });

        it('should handle empty queue', () => {
            const formatted = AnnouncementCore.formatItems([], now);
            expect(formatted).toHaveLength(0);
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
            expect(enriched.RideLink).toBe('Great Ride (https://ridewithgps.com/events/123)');
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
            
            expect(result.expandedText).toBe('Ride: Saturday Ride (https://ridewithgps.com/events/123) on Saturday, December 7, 2024 at 10:00 AM at Seascape Park');
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
