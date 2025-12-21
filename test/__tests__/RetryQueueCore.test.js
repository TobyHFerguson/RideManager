const RetryQueueCore = require('../../src/RetryQueueCore');

describe('RetryQueueCore', () => {
    const mockGenerateId = () => 'test-uuid-123';
    const baseTime = 1000000000000; // Fixed timestamp for testing
    const mockGetCurrentTime = () => baseTime;

    describe('Module exports', () => {
        it('should export RetryQueueCore class', () => {
            expect(RetryQueueCore).toBeDefined();
            expect(typeof RetryQueueCore).toBe('function');
        });
    });

    describe('createQueueItem', () => {
        it('should create a queue item with all required fields', () => {
            const operation = {
                type: 'create',
                calendarId: 'cal-123',
                rideUrl: 'https://ridewithgps.com/events/123',
                rideTitle: 'Test Ride',
                rowNum: 42,
                params: { title: 'Test Ride' },
                userEmail: 'user@example.com'
            };

            const item = RetryQueueCore.createQueueItem(
                operation,
                mockGenerateId,
                mockGetCurrentTime
            );

            expect(item).toEqual({
                id: 'test-uuid-123',
                type: 'create',
                calendarId: 'cal-123',
                rideUrl: 'https://ridewithgps.com/events/123',
                rideTitle: 'Test Ride',
                rowNum: 42,
                params: { title: 'Test Ride' },
                userEmail: 'user@example.com',
                enqueuedAt: baseTime,
                nextRetryAt: baseTime + (5 * 60 * 1000), // 5 minutes later
                attemptCount: 0,
                lastError: null
            });
        });

        it('should set first retry to 5 minutes from now', () => {
            const operation = { type: 'create', rideUrl: 'test' };
            const item = RetryQueueCore.createQueueItem(
                operation,
                mockGenerateId,
                mockGetCurrentTime
            );

            expect(item.nextRetryAt - item.enqueuedAt).toBe(5 * 60 * 1000);
        });
    });

    describe('calculateNextRetry', () => {
        it('should return 5 minutes for first hour retries', () => {
            const enqueuedAt = baseTime;
            const currentTime = baseTime + (30 * 60 * 1000); // 30 minutes later
            const attemptCount = 3;

            const nextRetry = RetryQueueCore.calculateNextRetry(
                attemptCount,
                enqueuedAt,
                currentTime
            );

            expect(nextRetry).toBe(currentTime + (5 * 60 * 1000));
        });

        it('should return 1 hour for retries after first hour', () => {
            const enqueuedAt = baseTime;
            const currentTime = baseTime + (2 * 60 * 60 * 1000); // 2 hours later
            const attemptCount = 15;

            const nextRetry = RetryQueueCore.calculateNextRetry(
                attemptCount,
                enqueuedAt,
                currentTime
            );

            expect(nextRetry).toBe(currentTime + (60 * 60 * 1000));
        });

        it('should return null after 48 hours', () => {
            const enqueuedAt = baseTime;
            const currentTime = baseTime + (48 * 60 * 60 * 1000); // 48 hours later
            const attemptCount = 50;

            const nextRetry = RetryQueueCore.calculateNextRetry(
                attemptCount,
                enqueuedAt,
                currentTime
            );

            expect(nextRetry).toBeNull();
        });

        it('should return null after more than 48 hours', () => {
            const enqueuedAt = baseTime;
            const currentTime = baseTime + (50 * 60 * 60 * 1000); // 50 hours later
            const attemptCount = 60;

            const nextRetry = RetryQueueCore.calculateNextRetry(
                attemptCount,
                enqueuedAt,
                currentTime
            );

            expect(nextRetry).toBeNull();
        });

        it('should handle boundary at exactly 1 hour', () => {
            const enqueuedAt = baseTime;
            const currentTime = baseTime + (60 * 60 * 1000); // Exactly 1 hour

            const nextRetry = RetryQueueCore.calculateNextRetry(
                1,
                enqueuedAt,
                currentTime
            );

            expect(nextRetry).toBe(currentTime + (60 * 60 * 1000)); // Should use hourly
        });
    });

    describe('getDueItems', () => {
        it('should return items due for retry', () => {
            const queue = [
                { id: '1', nextRetryAt: baseTime - 1000 }, // Past due
                { id: '2', nextRetryAt: baseTime }, // Due now
                { id: '3', nextRetryAt: baseTime + 1000 }, // Future
                { id: '4', nextRetryAt: baseTime - 5000 } // Past due
            ];

            const dueItems = RetryQueueCore.getDueItems(queue, baseTime);

            expect(dueItems).toHaveLength(3);
            expect(dueItems.map(i => i.id)).toEqual(['1', '2', '4']);
        });

        it('should return empty array if no items are due', () => {
            const queue = [
                { id: '1', nextRetryAt: baseTime + 1000 },
                { id: '2', nextRetryAt: baseTime + 5000 }
            ];

            const dueItems = RetryQueueCore.getDueItems(queue, baseTime);

            expect(dueItems).toEqual([]);
        });

        it('should handle empty queue', () => {
            const dueItems = RetryQueueCore.getDueItems([], baseTime);
            expect(dueItems).toEqual([]);
        });
    });

    describe('updateAfterFailure', () => {
        it('should increment attempt count and set error', () => {
            const item = {
                id: '1',
                attemptCount: 2,
                enqueuedAt: baseTime,
                lastError: null
            };

            const result = RetryQueueCore.updateAfterFailure(
                item,
                'Calendar not found',
                baseTime + (10 * 60 * 1000) // 10 minutes later
            );

            expect(result.updatedItem.attemptCount).toBe(3);
            expect(result.updatedItem.lastError).toBe('Calendar not found');
        });

        it('should schedule next retry within first hour', () => {
            const item = {
                id: '1',
                attemptCount: 2,
                enqueuedAt: baseTime,
                lastError: null
            };
            const currentTime = baseTime + (30 * 60 * 1000);

            const result = RetryQueueCore.updateAfterFailure(
                item,
                'Error',
                currentTime
            );

            expect(result.shouldRetry).toBe(true);
            expect(result.updatedItem.nextRetryAt).toBe(currentTime + (5 * 60 * 1000));
        });

        it('should schedule next retry after first hour', () => {
            const item = {
                id: '1',
                attemptCount: 15,
                enqueuedAt: baseTime,
                lastError: null
            };
            const currentTime = baseTime + (2 * 60 * 60 * 1000);

            const result = RetryQueueCore.updateAfterFailure(
                item,
                'Error',
                currentTime
            );

            expect(result.shouldRetry).toBe(true);
            expect(result.updatedItem.nextRetryAt).toBe(currentTime + (60 * 60 * 1000));
        });

        it('should stop retrying after 48 hours', () => {
            const item = {
                id: '1',
                attemptCount: 50,
                enqueuedAt: baseTime,
                lastError: null
            };
            const currentTime = baseTime + (48 * 60 * 60 * 1000);

            const result = RetryQueueCore.updateAfterFailure(
                item,
                'Error',
                currentTime
            );

            expect(result.shouldRetry).toBe(false);
            expect(result.updatedItem.nextRetryAt).toBeUndefined();
        });
    });

    describe('removeItem', () => {
        it('should remove item by ID', () => {
            const queue = [
                { id: '1', data: 'a' },
                { id: '2', data: 'b' },
                { id: '3', data: 'c' }
            ];

            const newQueue = RetryQueueCore.removeItem(queue, '2');

            expect(newQueue).toHaveLength(2);
            expect(newQueue.map(i => i.id)).toEqual(['1', '3']);
        });

        it('should return same queue if ID not found', () => {
            const queue = [
                { id: '1', data: 'a' },
                { id: '2', data: 'b' }
            ];

            const newQueue = RetryQueueCore.removeItem(queue, 'nonexistent');

            expect(newQueue).toHaveLength(2);
            expect(newQueue).toEqual(queue);
        });

        it('should handle empty queue', () => {
            const newQueue = RetryQueueCore.removeItem([], '1');
            expect(newQueue).toEqual([]);
        });

        it('should not mutate original queue', () => {
            const queue = [{ id: '1', data: 'a' }, { id: '2', data: 'b' }];
            const originalLength = queue.length;

            RetryQueueCore.removeItem(queue, '1');

            expect(queue).toHaveLength(originalLength);
        });
    });

    describe('updateItem', () => {
        it('should update item by ID', () => {
            const queue = [
                { id: '1', data: 'a', count: 1 },
                { id: '2', data: 'b', count: 2 },
                { id: '3', data: 'c', count: 3 }
            ];

            const updatedItem = { id: '2', data: 'updated', count: 99 };
            const newQueue = RetryQueueCore.updateItem(queue, updatedItem);

            expect(newQueue[1]).toEqual(updatedItem);
            expect(newQueue[0]).toEqual({ id: '1', data: 'a', count: 1 });
            expect(newQueue[2]).toEqual({ id: '3', data: 'c', count: 3 });
        });

        it('should return same queue if ID not found', () => {
            const queue = [
                { id: '1', data: 'a' },
                { id: '2', data: 'b' }
            ];

            const updatedItem = { id: 'nonexistent', data: 'updated' };
            const newQueue = RetryQueueCore.updateItem(queue, updatedItem);

            expect(newQueue).toEqual(queue);
        });

        it('should not mutate original queue', () => {
            const queue = [{ id: '1', data: 'original' }];
            const updatedItem = { id: '1', data: 'updated' };

            RetryQueueCore.updateItem(queue, updatedItem);

            expect(queue[0].data).toBe('original');
        });
    });

    describe('getStatistics', () => {
        it('should calculate correct statistics', () => {
            const queue = [
                { id: '1', nextRetryAt: baseTime - 1000, enqueuedAt: baseTime - (30 * 60 * 1000) }, // < 1h, due
                { id: '2', nextRetryAt: baseTime + 1000, enqueuedAt: baseTime - (5 * 60 * 60 * 1000) }, // < 24h
                { id: '3', nextRetryAt: baseTime, enqueuedAt: baseTime - (30 * 60 * 60 * 1000) }, // > 24h, due
                { id: '4', nextRetryAt: baseTime + 5000, enqueuedAt: baseTime - (10 * 60 * 1000) } // < 1h
            ];

            const stats = RetryQueueCore.getStatistics(queue, baseTime);

            expect(stats.totalItems).toBe(4);
            expect(stats.dueNow).toBe(2); // items 1 and 3
            expect(stats.byAge.lessThan1Hour).toBe(2); // items 1 and 4
            expect(stats.byAge.lessThan24Hours).toBe(3); // items 1, 2, and 4
            expect(stats.byAge.moreThan24Hours).toBe(1); // item 3
        });

        it('should handle empty queue', () => {
            const stats = RetryQueueCore.getStatistics([], baseTime);

            expect(stats.totalItems).toBe(0);
            expect(stats.dueNow).toBe(0);
            expect(stats.byAge.lessThan1Hour).toBe(0);
            expect(stats.byAge.lessThan24Hours).toBe(0);
            expect(stats.byAge.moreThan24Hours).toBe(0);
        });
    });

    describe('formatItems', () => {
        it('should format items for display', () => {
            const queue = [
                {
                    id: 'uuid-1',
                    rideUrl: 'https://ridewithgps.com/events/123',
                    rideTitle: 'Morning Ride',
                    rowNum: 42,
                    userEmail: 'user@example.com',
                    attemptCount: 3,
                    enqueuedAt: baseTime - (15 * 60 * 1000), // 15 minutes ago
                    nextRetryAt: baseTime + (5 * 60 * 1000)
                }
            ];

            const formatted = RetryQueueCore.formatItems(queue, baseTime);

            expect(formatted).toHaveLength(1);
            expect(formatted[0]).toEqual({
                id: 'uuid-1',
                rideUrl: 'https://ridewithgps.com/events/123',
                rideTitle: 'Morning Ride',
                rowNum: 42,
                userEmail: 'user@example.com',
                attemptCount: 3,
                enqueuedAt: new Date(baseTime - (15 * 60 * 1000)),
                nextRetryAt: new Date(baseTime + (5 * 60 * 1000)),
                ageMinutes: 15
            });
        });

        it('should handle empty queue', () => {
            const formatted = RetryQueueCore.formatItems([], baseTime);
            expect(formatted).toEqual([]);
        });

        it('should calculate age minutes correctly', () => {
            const queue = [
                { id: '1', rideUrl: 'test', attemptCount: 0, enqueuedAt: baseTime - (127 * 60 * 1000), nextRetryAt: baseTime }
            ];

            const formatted = RetryQueueCore.formatItems(queue, baseTime);

            expect(formatted[0].ageMinutes).toBe(127);
        });

        it('should handle missing rideTitle and rowNum with defaults', () => {
            const queue = [
                {
                    id: 'uuid-1',
                    rideUrl: 'https://ridewithgps.com/events/123',
                    userEmail: 'user@example.com',
                    attemptCount: 0,
                    enqueuedAt: baseTime,
                    nextRetryAt: baseTime + (5 * 60 * 1000)
                    // No rideTitle or rowNum
                }
            ];

            const formatted = RetryQueueCore.formatItems(queue, baseTime);

            expect(formatted[0].rideTitle).toBe('Unknown');
            expect(formatted[0].rowNum).toBe('Unknown');
        });
    });
});
