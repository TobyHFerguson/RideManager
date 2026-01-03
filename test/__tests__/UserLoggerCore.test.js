const UserLoggerCore = require('../../src/UserLoggerCore');

describe('UserLoggerCore', () => {
    describe('formatLogEntry', () => {
        it('should format log entry correctly with all fields', () => {
            const timestamp = new Date('2026-01-01T12:00:00');
            const entry = UserLoggerCore.formatLogEntry(
                'test_action',
                'test details',
                { key: 'value', number: 42 },
                'user@example.com',
                timestamp
            );
            
            expect(entry.timestamp).toEqual(timestamp);
            expect(entry.user).toBe('user@example.com');
            expect(entry.action).toBe('test_action');
            expect(entry.details).toBe('test details');
            expect(entry.additionalData).toBe('{"key":"value","number":42}');
        });
        
        
        it('should handle empty details', () => {
            const entry = UserLoggerCore.formatLogEntry(
                'test_action',
                '',
                {},
                'user@example.com',
                true,
                new Date()
            );
            
            expect(entry.details).toBe('');
        });
        
        it('should handle empty additional data', () => {
            const entry = UserLoggerCore.formatLogEntry(
                'test_action',
                'details',
                {},
                'user@example.com',
                true,
                new Date()
            );
            
            expect(entry.additionalData).toBe('{}');
        });
        
        it('should stringify complex additional data', () => {
            const complexData = {
                nested: {
                    array: [1, 2, 3],
                    string: 'test',
                    boolean: true
                },
                url: 'https://example.com/ride/123'
            };
            
            const entry = UserLoggerCore.formatLogEntry(
                'test_action',
                'details',
                complexData,
                'user@example.com',
                new Date()
            );
            
            expect(entry.additionalData).toBe(JSON.stringify(complexData));
            // Verify it can be parsed back
            expect(JSON.parse(entry.additionalData)).toEqual(complexData);
        });
        
        it('should handle different timestamp formats', () => {
            const timestamp1 = new Date('2026-01-01T00:00:00');
            const timestamp2 = new Date('2026-12-31T23:59:59');
            
            const entry1 = UserLoggerCore.formatLogEntry(
                'action', '', {}, 'user', timestamp1
            );
            const entry2 = UserLoggerCore.formatLogEntry(
                'action', '', {}, 'user', timestamp2
            );
            
            expect(entry1.timestamp).toEqual(timestamp1);
            expect(entry2.timestamp).toEqual(timestamp2);
        });
    });
    
    describe('toSpreadsheetRow', () => {
        it('should convert entry to array in correct order', () => {
            const timestamp = new Date('2026-01-01T12:00:00');
            const entry = {
                timestamp,
                user: 'user@example.com',
                action: 'test_action',
                details: 'test details',
                additionalData: '{"key":"value"}'
            };
            
            const row = UserLoggerCore.toSpreadsheetRow(entry);
            
            expect(row).toEqual([
                timestamp,
                'user@example.com',
                'test_action',
                'test details',
                '{"key":"value"}'
            ]);
        });
        
        
        it('should preserve all six columns', () => {
            const entry = {
                timestamp: new Date(),
                user: 'user',
                action: 'action',
                details: 'details',
                additionalData: '{}'
            };
            
            const row = UserLoggerCore.toSpreadsheetRow(entry);
            
            expect(row).toHaveLength(5);
        });
        
        it('should handle empty strings', () => {
            const entry = {
                timestamp: new Date(),
                user: '',
                action: '',
                details: '',
                additionalData: ''
            };
            
            const row = UserLoggerCore.toSpreadsheetRow(entry);
            
            expect(row[1]).toBe('');
            expect(row[2]).toBe('');
            expect(row[3]).toBe('');
        });
    });
    
    describe('getHeaderRow', () => {
        it('should return correct headers', () => {
            const headers = UserLoggerCore.getHeaderRow();
            
            expect(headers).toEqual([
                'Timestamp',
                'User',
                'Action',
                'Details',
                'Additional Data'
            ]);
        });
        
        it('should return exactly 5 headers', () => {
            const headers = UserLoggerCore.getHeaderRow();
            expect(headers).toHaveLength(5);
        });
        
        it('should return consistent headers on multiple calls', () => {
            const headers1 = UserLoggerCore.getHeaderRow();
            const headers2 = UserLoggerCore.getHeaderRow();
            
            expect(headers1).toEqual(headers2);
        });
    });
    
    describe('integration: formatLogEntry + toSpreadsheetRow', () => {
        it('should work together for complete workflow', () => {
            // Simulate complete logging workflow
            const timestamp = new Date('2026-01-01T12:00:00');
            const action = 'Schedule Ride';
            const details = 'Row 42';
            const additionalData = { rideUrl: 'https://ridewithgps.com/events/123' };
            const user = 'scheduler@example.com';
            
            // Format entry
            const entry = UserLoggerCore.formatLogEntry(
                action,
                details,
                additionalData,
                user,
                timestamp
            );
            
            // Convert to row
            const row = UserLoggerCore.toSpreadsheetRow(entry);
            
            // Verify complete row
            expect(row).toEqual([
                timestamp,
                'scheduler@example.com',
                'Schedule Ride',
                'Row 42',
                '{"rideUrl":"https://ridewithgps.com/events/123"}'
            ]);
        });
        

    });
});
