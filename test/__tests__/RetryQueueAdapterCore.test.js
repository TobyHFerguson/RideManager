const RetryQueueAdapterCore = require('../../src/RetryQueueAdapterCore');

describe('RetryQueueAdapterCore', () => {
    const baseTime = 1000000000000;
    const baseItem = {
        id: 'test-uuid-123',
        type: 'create',
        calendarId: 'cal-123@group.calendar.google.com',
        rideUrl: 'https://ridewithgps.com/events/12345',
        rideTitle: 'Morning Ride',
        rowNum: 42,
        userEmail: 'user@example.com',
        enqueuedAt: baseTime,
        nextRetryAt: baseTime + (5 * 60 * 1000),
        attemptCount: 0,
        lastError: null,
        params: {
            title: 'Morning Ride',
            startTime: baseTime + (24 * 60 * 60 * 1000),
            endTime: baseTime + (24 * 60 * 60 * 1000) + (2 * 60 * 60 * 1000),
            location: 'Start Location',
            description: 'Ride description'
        }
    };

    describe('Module exports', () => {
        it('should export RetryQueueAdapterCore class', () => {
            expect(RetryQueueAdapterCore).toBeDefined();
            expect(typeof RetryQueueAdapterCore).toBe('function');
        });
    });

    describe('getColumnNames', () => {
        it('should return correct column names in order', () => {
            const columns = RetryQueueAdapterCore.getColumnNames();
            
            expect(columns).toEqual([
                'QueueID',
                'Status',
                'Type',
                'RideName',
                'RideURL',
                'RowNum',
                'CalendarID',
                'EnqueuedAt',
                'NextRetryAt',
                'AttemptCount',
                'LastError',
                'UserEmail',
                'Params'
            ]);
        });
    });

    describe('itemToRow', () => {
        it('should convert queue item to row object', () => {
            const row = RetryQueueAdapterCore.itemToRow(baseItem);
            
            expect(row['QueueID']).toBe('test-uuid-123');
            expect(row['Type']).toBe('create');
            expect(row['CalendarID']).toBe('cal-123@group.calendar.google.com');
            expect(row['RideURL']).toBe('https://ridewithgps.com/events/12345');
            expect(row['RideName']).toBe('Morning Ride');
            expect(row['RowNum']).toBe(42);
            expect(row['UserEmail']).toBe('user@example.com');
            expect(row['EnqueuedAt']).toBe(new Date(baseTime).toISOString());
            expect(row['NextRetryAt']).toBe(new Date(baseTime + (5 * 60 * 1000)).toISOString());
            expect(row['AttemptCount']).toBe(0);
            expect(row['LastError']).toBe('');
            expect(row['Status']).toBe('pending');
            expect(row['Params']).toBe(JSON.stringify(baseItem.params));
        });

        it('should handle pending status (attemptCount = 0)', () => {
            const item = { ...baseItem, attemptCount: 0 };
            const row = RetryQueueAdapterCore.itemToRow(item);
            expect(row['Status']).toBe('pending');
        });

        it('should handle retrying status (attemptCount > 0, has nextRetryAt)', () => {
            const item = { 
                ...baseItem, 
                attemptCount: 3, 
                nextRetryAt: baseTime + 10000,
                lastError: 'Calendar not found'
            };
            const row = RetryQueueAdapterCore.itemToRow(item);
            expect(row['Status']).toBe('retrying');
            expect(row['LastError']).toBe('Calendar not found');
        });

        it('should handle failed status (attemptCount > 0, no nextRetryAt)', () => {
            const item = { 
                ...baseItem, 
                attemptCount: 50, 
                nextRetryAt: undefined,
                lastError: 'Max retries exceeded'
            };
            const row = RetryQueueAdapterCore.itemToRow(item);
            expect(row['Status']).toBe('failed');
        });

        it('should handle missing optional fields', () => {
            const item = {
                id: 'test-id',
                type: 'create',
                calendarId: 'cal-123',
                rideUrl: 'https://example.com',
                enqueuedAt: baseTime,
                nextRetryAt: baseTime + 1000,
                attemptCount: 0
            };
            const row = RetryQueueAdapterCore.itemToRow(item);
            
            expect(row['RideName']).toBe('');
            expect(row['RowNum']).toBe('');
            expect(row['UserEmail']).toBe('');
            expect(row['LastError']).toBe('');
            expect(row['Params']).toBe('');
        });

        it('should handle zero rowNum correctly', () => {
            const item = { ...baseItem, rowNum: 0 };
            const row = RetryQueueAdapterCore.itemToRow(item);
            expect(row['RowNum']).toBe(0);
        });
    });

    describe('rowToItem', () => {
        it('should convert row object to queue item', () => {
            const row = {
                'QueueID': 'test-uuid-123',
                'Type': 'update',
                'CalendarID': 'cal-456@group.calendar.google.com',
                'RideURL': 'https://ridewithgps.com/events/67890',
                'RideName': 'Evening Ride',
                'RowNum': 24,
                'UserEmail': 'admin@example.com',
                'EnqueuedAt': new Date(baseTime).toISOString(),
                'NextRetryAt': new Date(baseTime + 10000).toISOString(),
                'AttemptCount': 5,
                'LastError': 'Network timeout',
                'Status': 'retrying',
                'Params': JSON.stringify({ eventId: 'evt-123' })
            };
            
            const item = RetryQueueAdapterCore.rowToItem(row);
            
            expect(item.id).toBe('test-uuid-123');
            expect(item.type).toBe('update');
            expect(item.calendarId).toBe('cal-456@group.calendar.google.com');
            expect(item.rideUrl).toBe('https://ridewithgps.com/events/67890');
            expect(item.rideTitle).toBe('Evening Ride');
            expect(item.rowNum).toBe(24);
            expect(item.userEmail).toBe('admin@example.com');
            expect(item.enqueuedAt).toBe(baseTime);
            expect(item.nextRetryAt).toBe(baseTime + 10000);
            expect(item.attemptCount).toBe(5);
            expect(item.lastError).toBe('Network timeout');
            expect(item.params).toEqual({ eventId: 'evt-123' });
        });

        it('should handle empty/missing fields', () => {
            const row = {
                'QueueID': '',
                'Type': '',
                'CalendarID': '',
                'RideURL': '',
                'RideName': '',
                'RowNum': '',
                'UserEmail': '',
                'EnqueuedAt': '',
                'NextRetryAt': '',
                'AttemptCount': '',
                'LastError': '',
                'Status': 'pending',
                'Params': ''
            };
            
            const item = RetryQueueAdapterCore.rowToItem(row);
            
            expect(item.id).toBe('');
            expect(item.type).toBe('');
            expect(item.enqueuedAt).toBe(0);
            expect(item.attemptCount).toBe(0);
            expect(item.lastError).toBe('');
            expect(item.params).toEqual({});
        });

        it('should parse Attempt Count as integer', () => {
            const row = {
                'QueueID': 'test',
                'Type': 'create',
                'CalendarID': 'cal',
                'RideURL': 'url',
                'AttemptCount': '15',
                'EnqueuedAt': new Date(baseTime).toISOString(),
                'NextRetryAt': new Date(baseTime).toISOString(),
                'Params': '{}'
            };
            
            const item = RetryQueueAdapterCore.rowToItem(row);
            expect(item.attemptCount).toBe(15);
            expect(typeof item.attemptCount).toBe('number');
        });

        it('should handle invalid JSON in Params', () => {
            const row = {
                'QueueID': 'test',
                'Type': 'create',
                'CalendarID': 'cal',
                'RideURL': 'url',
                'AttemptCount': '0',
                'EnqueuedAt': new Date(baseTime).toISOString(),
                'NextRetryAt': new Date(baseTime).toISOString(),
                'Params': 'invalid json'
            };
            
            expect(() => {
                RetryQueueAdapterCore.rowToItem(row);
            }).toThrow();
        });
    });

    describe('round-trip conversion', () => {
        it('should preserve data through itemToRow -> rowToItem', () => {
            const original = { ...baseItem };
            const row = RetryQueueAdapterCore.itemToRow(original);
            const restored = RetryQueueAdapterCore.rowToItem(row);
            
            // Compare all fields (status not included in item)
            expect(restored.id).toBe(original.id);
            expect(restored.type).toBe(original.type);
            expect(restored.calendarId).toBe(original.calendarId);
            expect(restored.rideUrl).toBe(original.rideUrl);
            expect(restored.rideTitle).toBe(original.rideTitle);
            expect(restored.rowNum).toBe(original.rowNum);
            expect(restored.userEmail).toBe(original.userEmail);
            expect(restored.enqueuedAt).toBe(original.enqueuedAt);
            expect(restored.nextRetryAt).toBe(original.nextRetryAt);
            expect(restored.attemptCount).toBe(original.attemptCount);
            expect(restored.params).toEqual(original.params);
        });
    });

    describe('itemsToRows', () => {
        it('should convert array of items to rows', () => {
            const items = [
                { ...baseItem, id: 'item-1' },
                { ...baseItem, id: 'item-2' },
                { ...baseItem, id: 'item-3' }
            ];
            
            const rows = RetryQueueAdapterCore.itemsToRows(items);
            
            expect(rows).toHaveLength(3);
            expect(rows[0]['QueueID']).toBe('item-1');
            expect(rows[1]['QueueID']).toBe('item-2');
            expect(rows[2]['QueueID']).toBe('item-3');
        });

        it('should handle empty array', () => {
            const rows = RetryQueueAdapterCore.itemsToRows([]);
            expect(rows).toEqual([]);
        });
    });

    describe('rowsToItems', () => {
        it('should convert array of rows to items', () => {
            const rows = [
                RetryQueueAdapterCore.itemToRow({ ...baseItem, id: 'row-1' }),
                RetryQueueAdapterCore.itemToRow({ ...baseItem, id: 'row-2' })
            ];
            
            const items = RetryQueueAdapterCore.rowsToItems(rows);
            
            expect(items).toHaveLength(2);
            expect(items[0].id).toBe('row-1');
            expect(items[1].id).toBe('row-2');
        });

        it('should handle empty array', () => {
            const items = RetryQueueAdapterCore.rowsToItems([]);
            expect(items).toEqual([]);
        });
    });

    describe('findIndexById', () => {
        it('should find index of row by ID', () => {
            const rows = [
                { 'QueueID': 'id-1' },
                { 'QueueID': 'id-2' },
                { 'QueueID': 'id-3' }
            ];
            
            expect(RetryQueueAdapterCore.findIndexById(rows, 'id-1')).toBe(0);
            expect(RetryQueueAdapterCore.findIndexById(rows, 'id-2')).toBe(1);
            expect(RetryQueueAdapterCore.findIndexById(rows, 'id-3')).toBe(2);
        });

        it('should return -1 if ID not found', () => {
            const rows = [{ 'QueueID': 'id-1' }];
            expect(RetryQueueAdapterCore.findIndexById(rows, 'nonexistent')).toBe(-1);
        });

        it('should handle empty array', () => {
            expect(RetryQueueAdapterCore.findIndexById([], 'id-1')).toBe(-1);
        });
    });

    describe('updateRow', () => {
        it('should update existing row', () => {
            const rows = [
                RetryQueueAdapterCore.itemToRow({ ...baseItem, id: 'id-1' }),
                RetryQueueAdapterCore.itemToRow({ ...baseItem, id: 'id-2' }),
                RetryQueueAdapterCore.itemToRow({ ...baseItem, id: 'id-3' })
            ];
            
            const updatedItem = { 
                ...baseItem, 
                id: 'id-2', 
                attemptCount: 10,
                lastError: 'New error'
            };
            
            const newRows = RetryQueueAdapterCore.updateRow(rows, updatedItem);
            
            expect(newRows).toHaveLength(3);
            expect(newRows[1]['QueueID']).toBe('id-2');
            expect(newRows[1]['AttemptCount']).toBe(10);
            expect(newRows[1]['LastError']).toBe('New error');
        });

        it('should not mutate original array', () => {
            const rows = [
                RetryQueueAdapterCore.itemToRow({ ...baseItem, id: 'id-1' })
            ];
            const updatedItem = { ...baseItem, id: 'id-1', attemptCount: 99 };
            
            RetryQueueAdapterCore.updateRow(rows, updatedItem);
            
            expect(rows[0]['AttemptCount']).toBe(0); // Original unchanged
        });

        it('should return original array if ID not found', () => {
            const rows = [
                RetryQueueAdapterCore.itemToRow({ ...baseItem, id: 'id-1' })
            ];
            const updatedItem = { ...baseItem, id: 'nonexistent' };
            
            const newRows = RetryQueueAdapterCore.updateRow(rows, updatedItem);
            
            expect(newRows).toBe(rows); // Same reference
        });
    });

    describe('removeRow', () => {
        it('should remove row by ID', () => {
            const rows = [
                { 'QueueID': 'id-1' },
                { 'QueueID': 'id-2' },
                { 'QueueID': 'id-3' }
            ];
            
            const newRows = RetryQueueAdapterCore.removeRow(rows, 'id-2');
            
            expect(newRows).toHaveLength(2);
            expect(newRows[0]['QueueID']).toBe('id-1');
            expect(newRows[1]['QueueID']).toBe('id-3');
        });

        it('should not mutate original array', () => {
            const rows = [{ 'QueueID': 'id-1' }, { 'QueueID': 'id-2' }];
            
            RetryQueueAdapterCore.removeRow(rows, 'id-1');
            
            expect(rows).toHaveLength(2); // Original unchanged
        });

        it('should return same-length array if ID not found', () => {
            const rows = [{ 'QueueID': 'id-1' }];
            const newRows = RetryQueueAdapterCore.removeRow(rows, 'nonexistent');
            expect(newRows).toHaveLength(1);
        });
    });

    describe('addRow', () => {
        it('should add new row to array', () => {
            const rows = [
                RetryQueueAdapterCore.itemToRow({ ...baseItem, id: 'id-1' })
            ];
            const newItem = { ...baseItem, id: 'id-2' };
            
            const newRows = RetryQueueAdapterCore.addRow(rows, newItem);
            
            expect(newRows).toHaveLength(2);
            expect(newRows[0]['QueueID']).toBe('id-1');
            expect(newRows[1]['QueueID']).toBe('id-2');
        });

        it('should not mutate original array', () => {
            const rows = [
                RetryQueueAdapterCore.itemToRow({ ...baseItem, id: 'id-1' })
            ];
            const newItem = { ...baseItem, id: 'id-2' };
            
            RetryQueueAdapterCore.addRow(rows, newItem);
            
            expect(rows).toHaveLength(1); // Original unchanged
        });

        it('should handle empty array', () => {
            const newItem = { ...baseItem };
            const newRows = RetryQueueAdapterCore.addRow([], newItem);
            
            expect(newRows).toHaveLength(1);
            expect(newRows[0]['QueueID']).toBe(baseItem.id);
        });
    });

    describe('validateRow', () => {
        it('should validate correct row', () => {
            const row = RetryQueueAdapterCore.itemToRow(baseItem);
            const result = RetryQueueAdapterCore.validateRow(row);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        it('should detect missing ID', () => {
            const row = RetryQueueAdapterCore.itemToRow(baseItem);
            row['QueueID'] = '';
            
            const result = RetryQueueAdapterCore.validateRow(row);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('QueueID is required');
        });

        it('should detect invalid Type', () => {
            const row = RetryQueueAdapterCore.itemToRow(baseItem);
            row['Type'] = 'invalid';
            
            const result = RetryQueueAdapterCore.validateRow(row);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Type must be create, update, or delete');
        });

        it('should detect missing Calendar ID', () => {
            const row = RetryQueueAdapterCore.itemToRow(baseItem);
            row['CalendarID'] = '';
            
            const result = RetryQueueAdapterCore.validateRow(row);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('CalendarID is required');
        });

        it('should detect missing Ride URL', () => {
            const row = RetryQueueAdapterCore.itemToRow(baseItem);
            row['RideURL'] = '';
            
            const result = RetryQueueAdapterCore.validateRow(row);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('RideURL is required');
        });

        it('should accumulate multiple errors', () => {
            const row = {
                'QueueID': '',
                'Type': 'invalid',
                'CalendarID': '',
                'RideURL': ''
            };
            
            const result = RetryQueueAdapterCore.validateRow(row);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toHaveLength(4);
        });
    });

    describe('sortByNextRetry', () => {
        it('should sort rows by next retry time', () => {
            const rows = [
                { 'QueueID': 'id-1', 'NextRetryAt': new Date(baseTime + 10000).toISOString() },
                { 'QueueID': 'id-2', 'NextRetryAt': new Date(baseTime + 5000).toISOString() },
                { 'QueueID': 'id-3', 'NextRetryAt': new Date(baseTime + 15000).toISOString() }
            ];
            
            const sorted = RetryQueueAdapterCore.sortByNextRetry(rows);
            
            expect(sorted[0]['QueueID']).toBe('id-2'); // Earliest
            expect(sorted[1]['QueueID']).toBe('id-1');
            expect(sorted[2]['QueueID']).toBe('id-3'); // Latest
        });

        it('should not mutate original array', () => {
            const rows = [
                { 'QueueID': 'id-1', 'NextRetryAt': new Date(baseTime + 10000).toISOString() },
                { 'QueueID': 'id-2', 'NextRetryAt': new Date(baseTime + 5000).toISOString() }
            ];
            
            RetryQueueAdapterCore.sortByNextRetry(rows);
            
            expect(rows[0]['QueueID']).toBe('id-1'); // Original order unchanged
        });
    });

    describe('filterByStatus', () => {
        it('should filter rows by status', () => {
            const rows = [
                RetryQueueAdapterCore.itemToRow({ ...baseItem, id: 'id-1', attemptCount: 0 }),
                RetryQueueAdapterCore.itemToRow({ ...baseItem, id: 'id-2', attemptCount: 3, nextRetryAt: baseTime }),
                RetryQueueAdapterCore.itemToRow({ ...baseItem, id: 'id-3', attemptCount: 0 })
            ];
            
            const pending = RetryQueueAdapterCore.filterByStatus(rows, 'pending');
            expect(pending).toHaveLength(2);
            expect(pending[0]['QueueID']).toBe('id-1');
            expect(pending[1]['QueueID']).toBe('id-3');
            
            const retrying = RetryQueueAdapterCore.filterByStatus(rows, 'retrying');
            expect(retrying).toHaveLength(1);
            expect(retrying[0]['QueueID']).toBe('id-2');
        });

        it('should return empty array if no matches', () => {
            const rows = [
                RetryQueueAdapterCore.itemToRow({ ...baseItem, attemptCount: 0 })
            ];
            
            const failed = RetryQueueAdapterCore.filterByStatus(rows, 'failed');
            expect(failed).toEqual([]);
        });
    });

    describe('getStatistics', () => {
        it('should calculate correct statistics', () => {
            const rows = [
                RetryQueueAdapterCore.itemToRow({ ...baseItem, type: 'create', attemptCount: 0 }),
                RetryQueueAdapterCore.itemToRow({ ...baseItem, type: 'create', attemptCount: 3, nextRetryAt: baseTime }),
                RetryQueueAdapterCore.itemToRow({ ...baseItem, type: 'update', attemptCount: 50, nextRetryAt: undefined }),
                RetryQueueAdapterCore.itemToRow({ ...baseItem, type: 'delete', attemptCount: 0 })
            ];
            
            const stats = RetryQueueAdapterCore.getStatistics(rows);
            
            expect(stats.total).toBe(4);
            expect(stats.pending).toBe(2);
            expect(stats.retrying).toBe(1);
            expect(stats.failed).toBe(1);
            expect(stats.byType.create).toBe(2);
            expect(stats.byType.update).toBe(1);
            expect(stats.byType.delete).toBe(1);
        });

        it('should handle empty array', () => {
            const stats = RetryQueueAdapterCore.getStatistics([]);
            
            expect(stats.total).toBe(0);
            expect(stats.pending).toBe(0);
            expect(stats.retrying).toBe(0);
            expect(stats.failed).toBe(0);
            expect(stats.byType.create).toBe(0);
            expect(stats.byType.update).toBe(0);
            expect(stats.byType.delete).toBe(0);
        });
    });
});
