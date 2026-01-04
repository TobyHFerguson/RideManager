const RowCore = require('../../src/RowCore');

// Mock ScheduleAdapter functionality since it depends on GAS APIs
// We'll test the integration logic by mocking GAS dependencies

describe('ScheduleAdapter Integration with RowCore', () => {
    describe('Dirty Tracking Integration', () => {
        it('should automatically track dirty rows via onDirty callback', () => {
            // Simulate what ScheduleAdapter does when creating a RowCore
            const dirtyRows = new Set();
            
            const row = new RowCore({
                startDate: new Date('2026-02-01T10:00:00'),
                group: 'Sat A',
                routeCell: '=HYPERLINK("https://ridewithgps.com/routes/123","Epic Route")',
                rideCell: '',
                rideLeaders: 'John Doe',
                googleEventId: '',
                location: 'Central Park',
                address: '123 Main St',
                rowNum: 5,
                onDirty: (dirtyRow) => {
                    dirtyRows.add(dirtyRow);
                }
            });
            
            expect(dirtyRows.size).toBe(0);
            
            // Modify row - should trigger onDirty callback
            row.setGoogleEventId('event123');
            
            expect(dirtyRows.size).toBe(1);
            expect(dirtyRows.has(row)).toBe(true);
        });
        
        it('should only add row to dirtyRows once (not on every field change)', () => {
            const dirtyRows = new Set();
            
            const row = new RowCore({
                startDate: new Date('2026-02-01T10:00:00'),
                group: 'Sat A',
                routeCell: '',
                rideCell: '',
                rideLeaders: '',
                googleEventId: '',
                location: '',
                address: '',
                rowNum: 5,
                onDirty: (dirtyRow) => {
                    dirtyRows.add(dirtyRow);
                }
            });
            
            // Make multiple changes
            row.setGoogleEventId('event123');
            row.setRideLink('Test Ride', 'https://ridewithgps.com/events/456');
            row.setAnnouncement('https://docs.google.com/doc/789');
            
            // Should still only be in the set once
            expect(dirtyRows.size).toBe(1);
            expect(dirtyRows.has(row)).toBe(true);
            
            // All three fields should be marked dirty
            expect(row.getDirtyFields().has('googleEventId')).toBe(true);
            expect(row.getDirtyFields().has('rideCell')).toBe(true);
            expect(row.getDirtyFields().has('announcement')).toBe(true);
        });
        
        it('should track dirty fields correctly for save operation', () => {
            const dirtyRows = new Set();
            
            const row = new RowCore({
                startDate: new Date('2026-02-01T10:00:00'),
                group: 'Sat A',
                routeCell: '=HYPERLINK("https://ridewithgps.com/routes/123","Epic Route")',
                rideCell: '',
                rideLeaders: 'John Doe',
                googleEventId: '',
                location: 'Central Park',
                address: '123 Main St',
                rowNum: 5,
                onDirty: (dirtyRow) => {
                    dirtyRows.add(dirtyRow);
                }
            });
            
            // Simulate what adapter.save() would do:
            // 1. Check if row is dirty
            expect(row.isDirty()).toBe(false);
            
            // 2. Modify some fields
            row.setGoogleEventId('event123');
            row.setStatus('pending');
            
            // 3. Row should be dirty and tracked
            expect(row.isDirty()).toBe(true);
            expect(dirtyRows.has(row)).toBe(true);
            
            // 4. Get dirty fields for writing
            const dirtyFields = row.getDirtyFields();
            expect(dirtyFields.size).toBe(2);
            expect(dirtyFields.has('googleEventId')).toBe(true);
            expect(dirtyFields.has('status')).toBe(true);
            
            // 5. After writing, mark clean
            row.markClean();
            expect(row.isDirty()).toBe(false);
            expect(row.getDirtyFields().size).toBe(0);
        });
        
        it('should collect dirty cells from multiple rows', () => {
            const dirtyRows = new Set();
            
            const onDirty = (dirtyRow) => {
                dirtyRows.add(dirtyRow);
            };
            
            const row1 = new RowCore({
                startDate: new Date('2026-02-01T10:00:00'),
                group: 'Sat A',
                routeCell: '',
                rideCell: '',
                rideLeaders: '',
                googleEventId: '',
                location: '',
                address: '',
                rowNum: 5,
                onDirty
            });
            
            const row2 = new RowCore({
                startDate: new Date('2026-02-08T10:00:00'),
                group: 'Sat B',
                routeCell: '',
                rideCell: '',
                rideLeaders: '',
                googleEventId: '',
                location: '',
                address: '',
                rowNum: 6,
                onDirty
            });
            
            const row3 = new RowCore({
                startDate: new Date('2026-02-15T10:00:00'),
                group: 'Sun A',
                routeCell: '',
                rideCell: '',
                rideLeaders: '',
                googleEventId: '',
                location: '',
                address: '',
                rowNum: 7,
                onDirty
            });
            
            // Modify some rows
            row1.setGoogleEventId('event1');
            row2.setGoogleEventId('event2');
            // row3 is not modified
            
            // Simulate adapter.save() - collect all dirty cells
            const dirtyCells = [];
            dirtyRows.forEach(row => {
                row.getDirtyFields().forEach(fieldName => {
                    dirtyCells.push({
                        rowNum: row.rowNum,
                        fieldName: fieldName,
                        value: row[fieldName]
                    });
                });
            });
            
            expect(dirtyCells.length).toBe(2); // Only 2 rows were modified
            expect(dirtyCells).toEqual([
                { rowNum: 5, fieldName: 'googleEventId', value: 'event1' },
                { rowNum: 6, fieldName: 'googleEventId', value: 'event2' }
            ]);
        });
    });
    
    describe('Column Mapping Logic', () => {
        it('should map spreadsheet columns to domain properties', () => {
            // Simulate the columnMap from ScheduleAdapter constructor
            const columnMap = {
                'Start Date/Time': 'startDate',
                'Duration': 'duration',
                'Group': 'group',
                'Route': 'routeCell',
                'Ride': 'rideCell',
                'Ride Leaders': 'rideLeaders',
                'Google Event ID': 'googleEventId',
                'Location': 'location',
                'Address': 'address',
                'Announcement': 'announcement',
                'SendAt': 'sendAt',
                'Status': 'status',
                'Attempts': 'attempts',
                'LastError': 'lastError',
                'LastAttemptAt': 'lastAttemptAt'
            };
            
            // Simulate reverse map (domain → spreadsheet)
            const domainToColumn = Object.fromEntries(
                Object.entries(columnMap).map(([col, prop]) => [prop, col])
            );
            
            // Test mapping works both ways
            expect(columnMap['Start Date/Time']).toBe('startDate');
            expect(domainToColumn['startDate']).toBe('Start Date/Time');
            
            expect(columnMap['Route']).toBe('routeCell');
            expect(domainToColumn['routeCell']).toBe('Route');
            
            expect(columnMap['Announcement']).toBe('announcement');
            expect(domainToColumn['announcement']).toBe('Announcement');
        });
        
        it('should transform spreadsheet data to domain data', () => {
            const columnMap = {
                'Start Date/Time': 'startDate',
                'Group': 'group',
                'Route': 'routeCell',
                'Ride': 'rideCell',
                'Ride Leaders': 'rideLeaders',
                'Google Event ID': 'googleEventId',
                'Location': 'location',
                'Address': 'address'
            };
            
            // Simulate data from Fiddler (spreadsheet column names)
            const spreadsheetData = {
                'Start Date/Time': new Date('2026-02-01T10:00:00'),
                'Group': 'Sat A',
                'Route': '=HYPERLINK("https://ridewithgps.com/routes/123","Epic Route")',
                'Ride': '=HYPERLINK("https://ridewithgps.com/events/456","Epic Ride")',
                'Ride Leaders': 'John Doe',
                'Google Event ID': 'event123',
                'Location': 'Central Park',
                'Address': '123 Main St'
            };
            
            // Transform to domain data (what ScheduleAdapter._createRowCore does)
            const domainData = {};
            for (const [columnName, domainProp] of Object.entries(columnMap)) {
                domainData[domainProp] = spreadsheetData[columnName];
            }
            
            // Verify transformation
            expect(domainData.startDate).toEqual(new Date('2026-02-01T10:00:00'));
            expect(domainData.group).toBe('Sat A');
            expect(domainData.routeCell).toBe('=HYPERLINK("https://ridewithgps.com/routes/123","Epic Route")');
            expect(domainData.rideCell).toBe('=HYPERLINK("https://ridewithgps.com/events/456","Epic Ride")');
            expect(domainData.rideLeaders).toBe('John Doe');
            expect(domainData.googleEventId).toBe('event123');
            
            // Can create RowCore with transformed data
            const row = new RowCore({
                ...domainData,
                rowNum: 5
            });
            
            expect(row.group).toBe('Sat A');
            expect(row.routeName).toBe('Epic Route');
            expect(row.rideName).toBe('Epic Ride');
        });
        
        it('should transform domain data back to spreadsheet columns', () => {
            const domainToColumn = {
                'startDate': 'Start Date/Time',
                'googleEventId': 'Google Event ID',
                'announcement': 'Announcement',
                'status': 'Status'
            };
            
            const dirtyRows = new Set();
            const row = new RowCore({
                startDate: new Date('2026-02-01T10:00:00'),
                group: 'Sat A',
                routeCell: '',
                rideCell: '',
                rideLeaders: '',
                googleEventId: '',
                location: '',
                address: '',
                rowNum: 5,
                onDirty: (dirtyRow) => {
                    dirtyRows.add(dirtyRow);
                }
            });
            
            // Modify fields
            row.setGoogleEventId('event123');
            row.setAnnouncement('https://docs.google.com/doc/789');
            row.setStatus('pending');
            
            // Simulate what adapter.save() does - map dirty fields back to columns
            const cellWrites = [];
            row.getDirtyFields().forEach(domainProp => {
                const columnName = domainToColumn[domainProp];
                if (columnName) {
                    cellWrites.push({
                        rowNum: row.rowNum,
                        columnName: columnName,
                        value: row[domainProp]
                    });
                }
            });
            
            expect(cellWrites).toEqual([
                { rowNum: 5, columnName: 'Google Event ID', value: 'event123' },
                { rowNum: 5, columnName: 'Announcement', value: 'https://docs.google.com/doc/789' },
                { rowNum: 5, columnName: 'Status', value: 'pending' }
            ]);
        });
    });
    
    describe('Formula Handling', () => {
        it('should store RichText link data when writing back', () => {
            const row = new RowCore({
                startDate: new Date('2026-02-01T10:00:00'),
                group: 'Sat A',
                routeCell: '',
                rideCell: '',
                rideLeaders: '',
                googleEventId: '',
                location: '',
                address: '',
                rowNum: 5
            });
            
            // Set a ride link (now creates {text, url} object for RichText)
            row.setRideLink('Epic Ride', 'https://ridewithgps.com/events/456');
            
            // The rideCell should contain {text, url} object
            expect(row.rideCell).toEqual({text: 'Epic Ride', url: 'https://ridewithgps.com/events/456'});
            
            // When writing back, adapter.save() should detect object and create RichText
            const isRichTextData = row.rideCell && typeof row.rideCell === 'object' && 'text' in row.rideCell && 'url' in row.rideCell;
            expect(isRichTextData).toBe(true);
        });
        
        it('should handle non-formula values correctly', () => {
            const row = new RowCore({
                startDate: new Date('2026-02-01T10:00:00'),
                group: 'Sat A',
                routeCell: '',
                rideCell: '',
                rideLeaders: '',
                googleEventId: '',
                location: '',
                address: '',
                rowNum: 5
            });
            
            // Set a non-formula value
            row.setGoogleEventId('event123');
            
            // Should not be a formula
            expect(row.googleEventId.startsWith('=')).toBe(false);
        });
    });
});
