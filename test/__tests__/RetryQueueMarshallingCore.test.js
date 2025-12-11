const RetryQueueMarshallingCore = require('../../src/RetryQueueMarshallingCore');

describe('RetryQueueMarshallingCore', () => {
    describe('itemToRow', () => {
        it('should convert a complete queue item to row array', () => {
            const enqueuedAtTimestamp = 1702300000000;
            const nextRetryAtTimestamp = 1702400000000;
            const item = {
                id: 'test-id-123',
                operation: 'createEvent',
                params: { calendarId: 'cal-123', eventData: { title: 'Test' } },
                rideUrl: 'https://ridewithgps.com/events/12345',
                enqueuedAt: enqueuedAtTimestamp,
                attemptCount: 2,
                nextRetryAt: nextRetryAtTimestamp
            };

            const row = RetryQueueMarshallingCore.itemToRow(item);

            expect(row[0]).toBe('test-id-123');
            expect(row[1]).toBe('createEvent');
            expect(row[2]).toBe('{"calendarId":"cal-123","eventData":{"title":"Test"}}');
            expect(row[3]).toBe('https://ridewithgps.com/events/12345');
            expect(row[4]).toBe(new Date(enqueuedAtTimestamp).toISOString());
            expect(row[5]).toBe(2);
            expect(row[6]).toBe(new Date(nextRetryAtTimestamp).toISOString());
        });

        it('should handle missing optional fields with defaults', () => {
            const item = {
                id: 'minimal-id'
            };

            const row = RetryQueueMarshallingCore.itemToRow(item);

            expect(row).toEqual([
                'minimal-id',
                '',
                '',
                '',
                '',
                0,
                ''
            ]);
        });

        it('should handle empty params object', () => {
            const item = {
                id: 'test-id',
                params: {}
            };

            const row = RetryQueueMarshallingCore.itemToRow(item);

            expect(row[2]).toBe('{}');
        });

        it('should handle null nextRetryAt', () => {
            const item = {
                id: 'test-id',
                nextRetryAt: null
            };

            const row = RetryQueueMarshallingCore.itemToRow(item);

            expect(row[6]).toBe('');
        });

        it('should handle attemptCount of 0', () => {
            const item = {
                id: 'test-id',
                attemptCount: 0
            };

            const row = RetryQueueMarshallingCore.itemToRow(item);

            expect(row[5]).toBe(0);
        });
    });

    describe('rowToItem', () => {
        it('should convert a complete row array to queue item', () => {
            const row = [
                'test-id-456',
                'updateEvent',
                '{"calendarId":"cal-456","updates":{"title":"Updated"}}',
                'https://ridewithgps.com/events/67890',
                '2023-12-11T14:13:20.000Z',
                3,
                '2023-12-12T18:00:00.000Z'
            ];

            const item = RetryQueueMarshallingCore.rowToItem(row);

            expect(item).toEqual({
                id: 'test-id-456',
                operation: 'updateEvent',
                params: { calendarId: 'cal-456', updates: { title: 'Updated' } },
                rideUrl: 'https://ridewithgps.com/events/67890',
                enqueuedAt: new Date('2023-12-11T14:13:20.000Z').getTime(),
                attemptCount: 3,
                nextRetryAt: new Date('2023-12-12T18:00:00.000Z').getTime()
            });
        });

        it('should handle empty values with defaults', () => {
            const row = ['', '', '', '', '', '', ''];

            const item = RetryQueueMarshallingCore.rowToItem(row);

            expect(item).toEqual({
                id: '',
                operation: '',
                params: {},
                rideUrl: '',
                enqueuedAt: 0,
                attemptCount: 0,
                nextRetryAt: null
            });
        });

        it('should handle missing array elements', () => {
            const row = ['only-id'];

            const item = RetryQueueMarshallingCore.rowToItem(row);

            expect(item.id).toBe('only-id');
            expect(item.operation).toBe('');
            expect(item.params).toEqual({});
            expect(item.attemptCount).toBe(0);
        });

        it('should parse JSON params correctly', () => {
            const row = ['id', 'op', '{"nested":{"data":true}}', '', '', 0, ''];

            const item = RetryQueueMarshallingCore.rowToItem(row);

            expect(item.params).toEqual({ nested: { data: true } });
        });

        it('should handle invalid JSON params gracefully', () => {
            const row = ['id', 'op', '', '', '', 0, ''];

            const item = RetryQueueMarshallingCore.rowToItem(row);

            expect(item.params).toEqual({});
        });

        it('should convert ISO strings to timestamps', () => {
            const enqueuedAtStr = '2023-12-11T14:13:20.000Z';
            const nextRetryAtStr = '2023-12-12T18:00:00.000Z';
            const row = ['id', 'op', '{}', '', enqueuedAtStr, 0, nextRetryAtStr];

            const item = RetryQueueMarshallingCore.rowToItem(row);

            expect(item.enqueuedAt).toBe(new Date(enqueuedAtStr).getTime());
            expect(item.nextRetryAt).toBe(new Date(nextRetryAtStr).getTime());
        });
    });

    describe('itemsToRows', () => {
        it('should convert array of items to 2D array', () => {
            const items = [
                { id: 'id1', operation: 'op1', params: {}, rideUrl: 'url1', enqueuedAt: 1000, attemptCount: 0, nextRetryAt: null },
                { id: 'id2', operation: 'op2', params: {}, rideUrl: 'url2', enqueuedAt: 2000, attemptCount: 1, nextRetryAt: 3000 }
            ];

            const rows = RetryQueueMarshallingCore.itemsToRows(items);

            expect(rows).toHaveLength(2);
            expect(rows[0][0]).toBe('id1');
            expect(rows[1][0]).toBe('id2');
        });

        it('should handle empty array', () => {
            const rows = RetryQueueMarshallingCore.itemsToRows([]);

            expect(rows).toEqual([]);
        });
    });

    describe('rowsToItems', () => {
        it('should convert 2D array to array of items', () => {
            const rows = [
                ['id1', 'op1', '{}', 'url1', '2023-01-01T00:00:00.000Z', 0, ''],
                ['id2', 'op2', '{}', 'url2', '2023-01-02T00:00:00.000Z', 1, '2023-01-03T00:00:00.000Z']
            ];

            const items = RetryQueueMarshallingCore.rowsToItems(rows);

            expect(items).toHaveLength(2);
            expect(items[0].id).toBe('id1');
            expect(items[1].id).toBe('id2');
        });

        it('should handle empty 2D array', () => {
            const items = RetryQueueMarshallingCore.rowsToItems([]);

            expect(items).toEqual([]);
        });
    });

    describe('round-trip conversion', () => {
        it('should maintain data integrity through item -> row -> item conversion', () => {
            const originalItem = {
                id: 'round-trip-id',
                operation: 'deleteEvent',
                params: { calendarId: 'test-cal', eventId: 'event-123' },
                rideUrl: 'https://ridewithgps.com/events/99999',
                enqueuedAt: 1702500000000,
                attemptCount: 5,
                nextRetryAt: 1702600000000
            };

            const row = RetryQueueMarshallingCore.itemToRow(originalItem);
            const convertedItem = RetryQueueMarshallingCore.rowToItem(row);

            expect(convertedItem).toEqual(originalItem);
        });

        it('should maintain data integrity through rows -> items -> rows conversion', () => {
            const originalRows = [
                ['id1', 'op1', '{"key":"value"}', 'url1', '2023-12-11T14:13:20.000Z', 2, '2023-12-12T18:00:00.000Z'],
                ['id2', 'op2', '{}', 'url2', '2023-12-11T15:00:00.000Z', 0, '']
            ];

            const items = RetryQueueMarshallingCore.rowsToItems(originalRows);
            const convertedRows = RetryQueueMarshallingCore.itemsToRows(items);

            expect(convertedRows).toEqual(originalRows);
        });
    });

    describe('getColumnNames', () => {
        it('should return correct column names in order', () => {
            const names = RetryQueueMarshallingCore.getColumnNames();

            expect(names).toEqual([
                'QueueID',
                'Operation',
                'Params',
                'RideURL',
                'EnqueuedAt',
                'AttemptCount',
                'NextRetryAt'
            ]);
        });

        it('should return array with 7 columns', () => {
            const names = RetryQueueMarshallingCore.getColumnNames();

            expect(names).toHaveLength(7);
        });
    });

    describe('getColumnCount', () => {
        it('should return 7', () => {
            expect(RetryQueueMarshallingCore.getColumnCount()).toBe(7);
        });

        it('should match column names length', () => {
            const names = RetryQueueMarshallingCore.getColumnNames();
            const count = RetryQueueMarshallingCore.getColumnCount();

            expect(count).toBe(names.length);
        });
    });
});
