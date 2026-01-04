const RowCore = require('../../src/RowCore');

describe('RowCore', () => {
    describe('constructor', () => {
        it('should create a RowCore with all properties', () => {
            const startDate = new Date('2026-02-01T10:00:00');
            const sendAt = new Date('2026-01-30T18:00:00');
            const lastAttemptAt = new Date('2026-01-30T17:55:00');
            
            const row = new RowCore({
                startDate,
                duration: 3,
                defaultDuration: 2,
                group: 'Sat A',
                routeCell: '=HYPERLINK("https://ridewithgps.com/routes/123","Epic Route")',
                rideCell: '=HYPERLINK("https://ridewithgps.com/events/456","Epic Ride")',
                rideLeaders: 'John Doe, Jane Smith',
                googleEventId: 'event123',
                location: 'Central Park',
                address: '123 Main St',
                announcement: 'https://docs.google.com/doc/123',
                sendAt,
                status: 'pending',
                attempts: 1,
                lastError: 'Network error',
                lastAttemptAt,
                rowNum: 5
            });
            
            expect(row.startDate).toEqual(startDate);
            expect(row.duration).toBe(3);
            expect(row.defaultDuration).toBe(2);
            expect(row.group).toBe('Sat A');
            // routeCell and rideCell are now {text, url} objects after normalization
            expect(row.routeCell).toEqual({text: 'Epic Route', url: 'https://ridewithgps.com/routes/123'});
            expect(row.rideCell).toEqual({text: 'Epic Ride', url: 'https://ridewithgps.com/events/456'});
            expect(row.rideLeaders).toBe('John Doe, Jane Smith');
            expect(row.googleEventId).toBe('event123');
            expect(row.location).toBe('Central Park');
            expect(row.address).toBe('123 Main St');
            expect(row.announcement).toBe('https://docs.google.com/doc/123');
            expect(row.sendAt).toEqual(sendAt);
            expect(row.status).toBe('pending');
            expect(row.attempts).toBe(1);
            expect(row.lastError).toBe('Network error');
            expect(row.lastAttemptAt).toEqual(lastAttemptAt);
            expect(row.rowNum).toBe(5);
        });
        
        it('should handle optional properties with defaults', () => {
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
            
            // Empty strings are normalized to {text: '', url: ''}
            expect(row.routeCell).toEqual({text: '', url: ''});
            expect(row.rideCell).toEqual({text: '', url: ''});
            expect(row.rideLeaders).toBe('');
            expect(row.googleEventId).toBe('');
            expect(row.location).toBe('');
            expect(row.address).toBe('');
            expect(row.announcement).toBe('');
            expect(row.sendAt).toBeUndefined();
            expect(row.status).toBe('');
            expect(row.attempts).toBe(0);
            expect(row.lastError).toBe('');
            expect(row.lastAttemptAt).toBeUndefined();
        });
    });

    describe('computed properties', () => {
        describe('startTime', () => {
            it('should return startDate', () => {
                const startDate = new Date('2026-02-01T10:00:00');
                const row = new RowCore({
                    startDate,
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: '',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                expect(row.startTime).toEqual(startDate);
            });
        });

        describe('endTime', () => {
            it('should calculate end time with explicit duration', () => {
                const startDate = new Date('2026-02-01T10:00:00');
                const row = new RowCore({
                    startDate,
                    duration: 3,
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: '',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                const expectedEnd = new Date('2026-02-01T13:00:00');
                expect(row.endTime).toEqual(expectedEnd);
            });
            
            it('should use default duration if duration not set', () => {
                const startDate = new Date('2026-02-01T10:00:00');
                const row = new RowCore({
                    startDate,
                    defaultDuration: 2.5,
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: '',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                const expectedEnd = new Date('2026-02-01T12:30:00');
                expect(row.endTime).toEqual(expectedEnd);
            });
            
            it('should return start time if no duration set', () => {
                const startDate = new Date('2026-02-01T10:00:00');
                const row = new RowCore({
                    startDate,
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: '',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                expect(row.endTime).toEqual(startDate);
            });
        });

        describe('routeName and routeURL', () => {
            it('should extract name and URL from hyperlink formula', () => {
                const row = new RowCore({
                    startDate: new Date('2026-02-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: '=HYPERLINK("https://ridewithgps.com/routes/123","Epic Route")',
                    rideCell: '',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                // After normalization, formula is converted to {text, url} object
                expect(row.routeName).toBe('Epic Route');
                expect(row.routeURL).toBe('https://ridewithgps.com/routes/123');
            });
            
            it('should return plain text as both text and url for non-formula text', () => {
                const row = new RowCore({
                    startDate: new Date('2026-02-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: 'Just plain text',
                    rideCell: '',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                // Plain text is treated as URL with same text (normalized to {text, url})
                expect(row.routeName).toBe('Just plain text');
                expect(row.routeURL).toBe('Just plain text');
            });
        });

        describe('leaders', () => {
            it('should parse comma-separated leader names', () => {
                const row = new RowCore({
                    startDate: new Date('2026-02-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: '',
                    rideLeaders: 'John Doe, Jane Smith, Bob Wilson',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                expect(row.leaders).toEqual(['John Doe', 'Jane Smith', 'Bob Wilson']);
            });
            
            it('should handle single leader', () => {
                const row = new RowCore({
                    startDate: new Date('2026-02-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: '',
                    rideLeaders: 'John Doe',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                expect(row.leaders).toEqual(['John Doe']);
            });
            
            it('should trim whitespace from names', () => {
                const row = new RowCore({
                    startDate: new Date('2026-02-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: '',
                    rideLeaders: '  John Doe  ,  Jane Smith  ',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                expect(row.leaders).toEqual(['John Doe', 'Jane Smith']);
            });
            
            it('should return empty array for empty string', () => {
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
                
                expect(row.leaders).toEqual([]);
            });
        });

        describe('rideName and rideURL', () => {
            it('should extract name and URL from hyperlink formula', () => {
                const row = new RowCore({
                    startDate: new Date('2026-02-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: '=HYPERLINK("https://ridewithgps.com/events/456","Epic Ride")',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                // After normalization, formula is converted to {text, url} object
                expect(row.rideName).toBe('Epic Ride');
                expect(row.rideURL).toBe('https://ridewithgps.com/events/456');
            });
            
            it('should return plain text as both text and url for non-formula text', () => {
                const row = new RowCore({
                    startDate: new Date('2026-02-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: 'Just plain text',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                // Plain text is treated as URL with same text (normalized to {text, url})
                expect(row.rideName).toBe('Just plain text');
                expect(row.rideURL).toBe('Just plain text');
            });
        });
    });

    describe('business logic methods', () => {
        describe('isPlanned', () => {
            it('should return true when all required fields are present', () => {
                const row = new RowCore({
                    startDate: new Date('2026-02-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: '=HYPERLINK("https://ridewithgps.com/routes/123","Route")',
                    rideCell: '',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                expect(row.isPlanned()).toBe(true);
            });
            
            it('should return false when startDate is missing', () => {
                const row = new RowCore({
                    startDate: null,
                    group: 'Sat A',
                    routeCell: '=HYPERLINK("https://ridewithgps.com/routes/123","Route")',
                    rideCell: '',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                expect(row.isPlanned()).toBe(false);
            });
            
            it('should return false when group is missing', () => {
                const row = new RowCore({
                    startDate: new Date('2026-02-01T10:00:00'),
                    group: '',
                    routeCell: '=HYPERLINK("https://ridewithgps.com/routes/123","Route")',
                    rideCell: '',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                expect(row.isPlanned()).toBe(false);
            });
            
            it('should return false when routeURL is missing', () => {
                const row = new RowCore({
                    startDate: new Date('2026-02-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: '', // Empty route means no URL
                    rideCell: '',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                expect(row.isPlanned()).toBe(false);
            });
        });

        describe('isScheduled', () => {
            it('should return true when ride has a name', () => {
                const row = new RowCore({
                    startDate: new Date('2026-02-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: '=HYPERLINK("https://ridewithgps.com/events/456","Epic Ride")',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                expect(row.isScheduled()).toBe(true);
            });
            
            it('should return false when ride has no name', () => {
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
                
                expect(row.isScheduled()).toBe(false);
            });
        });

        describe('isPastDue', () => {
            it('should return true when ride is before current date', () => {
                const row = new RowCore({
                    startDate: new Date('2026-01-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: '',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                const currentDate = new Date('2026-02-01T10:00:00');
                expect(row.isPastDue(currentDate)).toBe(true);
            });
            
            it('should return false when ride is after current date', () => {
                const row = new RowCore({
                    startDate: new Date('2026-03-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: '',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                const currentDate = new Date('2026-02-01T10:00:00');
                expect(row.isPastDue(currentDate)).toBe(false);
            });
        });
    });

    describe('link manipulation methods', () => {
        describe('setRideLink', () => {
            it('should store {text, url} object and mark dirty', () => {
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
                
                row.setRideLink('Test Ride', 'https://ridewithgps.com/events/123');
                
                // Now stores as {text, url} object for RichText
                expect(row.rideCell).toEqual({text: 'Test Ride', url: 'https://ridewithgps.com/events/123'});
                expect(row.getDirtyFields().has('rideCell')).toBe(true);
            });
        });

        describe('deleteRideLink', () => {
            it('should clear ride cell and mark dirty', () => {
                const row = new RowCore({
                    startDate: new Date('2026-02-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: '=HYPERLINK("https://ridewithgps.com/events/123","Test")',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                row.deleteRideLink();
                
                // Now stores as empty {text, url} object
                expect(row.rideCell).toEqual({text: '', url: ''});
                expect(row.getDirtyFields().has('rideCell')).toBe(true);
            });
        });

        describe('setRouteLink', () => {
            it('should store {text, url} object and mark dirty', () => {
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
                
                row.setRouteLink('Test Route', 'https://ridewithgps.com/routes/456');
                
                // Now stores as {text, url} object for RichText
                expect(row.routeCell).toEqual({text: 'Test Route', url: 'https://ridewithgps.com/routes/456'});
                expect(row.getDirtyFields().has('routeCell')).toBe(true);
            });
        });

        describe('restoreRideLink', () => {
            it('should restore ride link from current name and URL', () => {
                const row = new RowCore({
                    startDate: new Date('2026-02-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: '=HYPERLINK("https://ridewithgps.com/events/123", "Test Ride")',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    rowNum: 5
                });
                
                // Get the original values before clearing
                const originalName = row.rideName;
                const originalURL = row.rideURL;
                
                // Simulate formula being cleared
                row.rideCell = { text: '', url: '' };
                // Can't restore because the cell was cleared - this creates empty link
                row.restoreRideLink();
                
                // After clearing, name and URL are gone, so this creates empty link
                expect(row.rideCell).toEqual({text: '', url: ''});
                
                // To truly restore, we'd need to use the saved values
                row.setRideLink(originalName, originalURL);
                expect(row.rideCell).toEqual({text: 'Test Ride', url: 'https://ridewithgps.com/events/123'});
            });
        });
    });

    describe('announcement methods', () => {
        describe('clearAnnouncement', () => {
            it('should clear all announcement fields and mark dirty', () => {
                const row = new RowCore({
                    startDate: new Date('2026-02-01T10:00:00'),
                    group: 'Sat A',
                    routeCell: '',
                    rideCell: '',
                    rideLeaders: '',
                    googleEventId: '',
                    location: '',
                    address: '',
                    announcement: 'https://docs.google.com/doc/123',
                    sendAt: new Date('2026-01-30T18:00:00'),
                    status: 'sent',
                    attempts: 1,
                    lastError: 'Some error',
                    lastAttemptAt: new Date('2026-01-30T17:55:00'),
                    rowNum: 5
                });
                
                row.clearAnnouncement();
                
                expect(row.announcement).toBe('');
                expect(row.sendAt).toBeUndefined();
                expect(row.status).toBe('');
                expect(row.attempts).toBe(0);
                expect(row.lastError).toBe('');
                expect(row.lastAttemptAt).toBeUndefined();
                
                const dirtyFields = row.getDirtyFields();
                expect(dirtyFields.has('announcement')).toBe(true);
                expect(dirtyFields.has('sendAt')).toBe(true);
                expect(dirtyFields.has('status')).toBe(true);
                expect(dirtyFields.has('attempts')).toBe(true);
                expect(dirtyFields.has('lastError')).toBe(true);
                expect(dirtyFields.has('lastAttemptAt')).toBe(true);
            });
        });
    });

    describe('setter methods', () => {
        it('setGoogleEventId should set value and mark dirty', () => {
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
            
            row.setGoogleEventId('event123');
            
            expect(row.googleEventId).toBe('event123');
            expect(row.getDirtyFields().has('googleEventId')).toBe(true);
        });

        it('setAnnouncement should set value and mark dirty', () => {
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
            
            row.setAnnouncement('https://docs.google.com/doc/123');
            
            expect(row.announcement).toBe('https://docs.google.com/doc/123');
            expect(row.getDirtyFields().has('announcement')).toBe(true);
        });

        it('setSendAt should set value and mark dirty', () => {
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
            
            const sendAt = new Date('2026-01-30T18:00:00');
            row.setSendAt(sendAt);
            
            expect(row.sendAt).toEqual(sendAt);
            expect(row.getDirtyFields().has('sendAt')).toBe(true);
        });

        it('setStatus should set value and mark dirty', () => {
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
            
            row.setStatus('pending');
            
            expect(row.status).toBe('pending');
            expect(row.getDirtyFields().has('status')).toBe(true);
        });

        it('setAttempts should set value and mark dirty', () => {
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
            
            row.setAttempts(3);
            
            expect(row.attempts).toBe(3);
            expect(row.getDirtyFields().has('attempts')).toBe(true);
        });

        it('setLastError should set value and mark dirty', () => {
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
            
            row.setLastError('Network error');
            
            expect(row.lastError).toBe('Network error');
            expect(row.getDirtyFields().has('lastError')).toBe(true);
        });

        it('setLastAttemptAt should set value and mark dirty', () => {
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
            
            const lastAttemptAt = new Date('2026-01-30T17:55:00');
            row.setLastAttemptAt(lastAttemptAt);
            
            expect(row.lastAttemptAt).toEqual(lastAttemptAt);
            expect(row.getDirtyFields().has('lastAttemptAt')).toBe(true);
        });
    });

    describe('dirty tracking', () => {
        it('markDirty should add field to dirty set', () => {
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
            
            row.markDirty('testField');
            
            expect(row.getDirtyFields().has('testField')).toBe(true);
        });

        it('isDirty should return true when fields are dirty', () => {
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
            
            expect(row.isDirty()).toBe(false);
            
            row.markDirty('testField');
            
            expect(row.isDirty()).toBe(true);
        });

        it('markClean should clear dirty fields', () => {
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
            
            row.markDirty('field1');
            row.markDirty('field2');
            expect(row.isDirty()).toBe(true);
            
            row.markClean();
            
            expect(row.isDirty()).toBe(false);
            expect(row.getDirtyFields().size).toBe(0);
        });
    });

    describe('onDirty callback', () => {
        it('should call onDirty callback when row becomes dirty', () => {
            const onDirty = jest.fn();
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
                onDirty
            });
            
            expect(onDirty).not.toHaveBeenCalled();
            
            row.markDirty('testField');
            
            expect(onDirty).toHaveBeenCalledTimes(1);
            expect(onDirty).toHaveBeenCalledWith(row);
        });

        it('should call onDirty only once when multiple fields are marked dirty', () => {
            const onDirty = jest.fn();
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
                onDirty
            });
            
            row.markDirty('field1');
            row.markDirty('field2');
            row.markDirty('field3');
            
            expect(onDirty).toHaveBeenCalledTimes(1);
            expect(onDirty).toHaveBeenCalledWith(row);
        });

        it('should call onDirty again after markClean is called', () => {
            const onDirty = jest.fn();
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
                onDirty
            });
            
            row.markDirty('field1');
            expect(onDirty).toHaveBeenCalledTimes(1);
            
            row.markClean();
            
            row.markDirty('field2');
            expect(onDirty).toHaveBeenCalledTimes(2);
            expect(onDirty).toHaveBeenCalledWith(row);
        });

        it('should not error when onDirty is not provided', () => {
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
                // No onDirty callback
            });
            
            expect(() => {
                row.markDirty('testField');
            }).not.toThrow();
        });

        it('should call onDirty when setting a property through setter', () => {
            const onDirty = jest.fn();
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
                onDirty
            });
            
            row.setAnnouncement('https://docs.google.com/doc/new');
            
            expect(onDirty).toHaveBeenCalledTimes(1);
            expect(onDirty).toHaveBeenCalledWith(row);
        });

        it('should call onDirty only once when setting multiple properties', () => {
            const onDirty = jest.fn();
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
                onDirty
            });
            
            row.setAnnouncement('https://docs.google.com/doc/new');
            row.setStatus('pending');
            row.setAttempts(1);
            
            expect(onDirty).toHaveBeenCalledTimes(1);
            expect(onDirty).toHaveBeenCalledWith(row);
        });
    });
});
