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
                true,
                timestamp
            );
            
            expect(entry.timestamp).toEqual(timestamp);
            expect(entry.user).toBe('user@example.com');
            expect(entry.action).toBe('test_action');
            expect(entry.details).toBe('test details');
            expect(entry.dtrtStatus).toBe('Enabled');
            expect(entry.additionalData).toBe('{"key":"value","number":42}');
        });
        
        it('should handle disabled DTRT status', () => {
            const timestamp = new Date('2026-01-01T12:00:00');
            const entry = UserLoggerCore.formatLogEntry(
                'action',
                '',
                {},
                'user@example.com',
                false,
                timestamp
            );
            
            expect(entry.dtrtStatus).toBe('Disabled');
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
                true,
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
                'action', '', {}, 'user', true, timestamp1
            );
            const entry2 = UserLoggerCore.formatLogEntry(
                'action', '', {}, 'user', true, timestamp2
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
                dtrtStatus: 'Enabled',
                additionalData: '{"key":"value"}'
            };
            
            const row = UserLoggerCore.toSpreadsheetRow(entry);
            
            expect(row).toEqual([
                timestamp,
                'user@example.com',
                'test_action',
                'test details',
                'Enabled',
                '{"key":"value"}'
            ]);
        });
        
        it('should handle disabled DTRT status', () => {
            const entry = {
                timestamp: new Date(),
                user: 'user@example.com',
                action: 'action',
                details: 'details',
                dtrtStatus: 'Disabled',
                additionalData: '{}'
            };
            
            const row = UserLoggerCore.toSpreadsheetRow(entry);
            
            expect(row[4]).toBe('Disabled');
        });
        
        it('should preserve all six columns', () => {
            const entry = {
                timestamp: new Date(),
                user: 'user',
                action: 'action',
                details: 'details',
                dtrtStatus: 'Enabled',
                additionalData: '{}'
            };
            
            const row = UserLoggerCore.toSpreadsheetRow(entry);
            
            expect(row).toHaveLength(6);
        });
        
        it('should handle empty strings', () => {
            const entry = {
                timestamp: new Date(),
                user: '',
                action: '',
                details: '',
                dtrtStatus: 'Enabled',
                additionalData: ''
            };
            
            const row = UserLoggerCore.toSpreadsheetRow(entry);
            
            expect(row[1]).toBe('');
            expect(row[2]).toBe('');
            expect(row[3]).toBe('');
            expect(row[5]).toBe('');
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
                'DTRT Status',
                'Additional Data'
            ]);
        });
        
        it('should return exactly 6 headers', () => {
            const headers = UserLoggerCore.getHeaderRow();
            expect(headers).toHaveLength(6);
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
            const dtrtEnabled = true;
            
            // Format entry
            const entry = UserLoggerCore.formatLogEntry(
                action,
                details,
                additionalData,
                user,
                dtrtEnabled,
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
                'Enabled',
                '{"rideUrl":"https://ridewithgps.com/events/123"}'
            ]);
        });
        
        it('should handle workflow with disabled DTRT', () => {
            const entry = UserLoggerCore.formatLogEntry(
                'Update Ride',
                'Modified route',
                { oldRoute: 'A', newRoute: 'B' },
                'user@example.com',
                false,
                new Date()
            );
            
            const row = UserLoggerCore.toSpreadsheetRow(entry);
            
            expect(row[4]).toBe('Disabled');
        });
    });
});
