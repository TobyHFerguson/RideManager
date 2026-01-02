const ValidationCore = require('../../src/ValidationCore');

describe('ValidationCore', () => {
    // Mock helpers
    const mockConvertDate = (date) => {
        if (!date) return new Date('Invalid Date');
        return new Date(date);
    };

    const mockManagedEventName = (rideName, groupNames) => {
        // Simple implementation: check if rideName contains a group name
        return groupNames.some(group => rideName.includes(group));
    };

    const mockGetRoute = (routeURL) => {
        if (routeURL === 'https://ridewithgps.com/routes/club-route') {
            return { user_id: 12345 };
        }
        if (routeURL === 'https://ridewithgps.com/routes/foreign-route') {
            return { user_id: 99999 };
        }
        throw new Error('Route not found');
    };

    const mockFetchUrl = (url, muteHttpExceptions) => {
        if (url === 'https://ridewithgps.com/routes/accessible.json') {
            return {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({ user_id: 99999 })
            };
        }
        if (url === 'https://ridewithgps.com/routes/club-owned.json') {
            return {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({ user_id: 12345 })
            };
        }
        if (url === 'https://ridewithgps.com/routes/forbidden.json') {
            return {
                getResponseCode: () => 403,
                getContentText: () => ''
            };
        }
        if (url === 'https://ridewithgps.com/routes/notfound.json') {
            return {
                getResponseCode: () => 404,
                getContentText: () => ''
            };
        }
        if (url === 'https://ridewithgps.com/routes/unknown-status.json') {
            return {
                getResponseCode: () => 500,
                getContentText: () => ''
            };
        }
        if (url === 'https://ridewithgps.com/routes/network-error.json') {
            throw new Error('Network error');
        }
        throw new Error('Network error');
    };

    const createMockRow = (overrides = {}) => ({
        rowNum: 1,
        rideName: 'Sat A Ride',
        rideURL: '',
        routeURL: 'https://ridewithgps.com/routes/club-route',
        routeName: 'Test Route',
        startDate: new Date('2026-01-15'),
        startTime: new Date('2026-01-15T10:00:00'),
        group: 'A',
        leaders: ['Leader 1'],
        location: 'Start Location',
        address: '123 Main St',
        ...overrides
    });

    const defaultOptions = {
        groupNames: ['A', 'B', 'C'],
        getRoute: mockGetRoute,
        clubUserId: 12345,
        managedEventName: mockManagedEventName,
        convertDate: mockConvertDate,
        fetchUrl: mockFetchUrl
    };

    describe('validateForScheduling', () => {
        it('should pass validation for valid row', () => {
            const row = createMockRow();
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toEqual([]);
            expect(validation.warnings).toEqual([]);
        });

        it('should detect unmanaged ride', () => {
            const row = createMockRow({ rideName: 'Unmanaged Ride' });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Ride is unmanaged');
        });

        it('should detect already scheduled ride', () => {
            const row = createMockRow({ rideURL: 'https://ridewithgps.com/events/123' });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('This ride has already been scheduled');
        });

        it('should detect missing start date', () => {
            const row = createMockRow({ startDate: null });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors.some(e => e.includes('Invalid row.startDate'))).toBe(true);
        });

        it('should detect invalid start date', () => {
            const row = createMockRow({ startDate: 'invalid' });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors.some(e => e.includes('Invalid row.startDate'))).toBe(true);
        });

        it('should detect missing start time', () => {
            const row = createMockRow({ startTime: null });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors.some(e => e.includes('Invalid row.startTime'))).toBe(true);
        });

        it('should detect invalid start time', () => {
            const row = createMockRow({ startTime: 'invalid' });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors.some(e => e.includes('Invalid row.startTime'))).toBe(true);
        });

        it('should detect empty group', () => {
            const row = createMockRow({ group: '' });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Group column is empty');
        });

        it('should detect unknown group', () => {
            const row = createMockRow({ group: 'X' });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors.some(e => e.includes('Unknown group'))).toBe(true);
        });

        it('should detect bad route', () => {
            const row = createMockRow({ routeURL: 'https://ridewithgps.com/routes/bad' });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors.some(e => e.includes('Route not found'))).toBe(true);
        });

        it('should detect foreign route', () => {
            const row = createMockRow({ routeURL: 'https://ridewithgps.com/routes/foreign-route' });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Route is not owned by SCCCC');
        });

        it('should warn about missing ride leader', () => {
            const row = createMockRow({ leaders: [] });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.warnings).toContain('No ride leader given');
        });

        it('should warn about missing location', () => {
            const row = createMockRow({ location: '' });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.warnings).toContain('Unknown location');
        });

        it('should warn about location starting with hash', () => {
            const row = createMockRow({ location: '#N/A' });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.warnings).toContain('Unknown location');
        });

        it('should warn about missing address', () => {
            const row = createMockRow({ address: '' });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.warnings).toContain('Unknown address');
        });

        it('should warn about address starting with hash', () => {
            const row = createMockRow({ address: '#N/A' });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.warnings).toContain('Unknown address');
        });

        it('should not show warnings when there are errors', () => {
            const row = createMockRow({ 
                startDate: null,
                leaders: [],
                location: ''
            });
            const result = ValidationCore.validateForScheduling([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors.length).toBeGreaterThan(0);
            expect(validation.warnings.length).toBe(0);
        });
    });

    describe('validateForCancellation', () => {
        it('should pass validation for valid row', () => {
            const row = createMockRow({ rideURL: 'https://ridewithgps.com/events/123' });
            const result = ValidationCore.validateForCancellation([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toEqual([]);
        });

        it('should detect already cancelled ride', () => {
            const row = createMockRow({ 
                rideName: 'CANCELLED: Sat A Ride',
                rideURL: 'https://ridewithgps.com/events/123'
            });
            const result = ValidationCore.validateForCancellation([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Operation not permitted on cancelled ride');
        });

        it('should detect unscheduled ride', () => {
            const row = createMockRow({ rideURL: '' });
            const result = ValidationCore.validateForCancellation([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Ride has not been scheduled');
        });

        it('should detect unmanaged ride', () => {
            const row = createMockRow({ 
                rideName: 'Unmanaged Ride',
                rideURL: 'https://ridewithgps.com/events/123'
            });
            const result = ValidationCore.validateForCancellation([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Ride is unmanaged');
        });
    });

    describe('validateForUpdate', () => {
        it('should pass validation for valid row', () => {
            const row = createMockRow({ rideURL: 'https://ridewithgps.com/events/123' });
            const result = ValidationCore.validateForUpdate([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toEqual([]);
        });

        it('should detect unscheduled ride', () => {
            const row = createMockRow({ rideURL: '' });
            const result = ValidationCore.validateForUpdate([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Ride has not been scheduled');
        });

        it('should detect all scheduling validation errors', () => {
            const row = createMockRow({ 
                rideURL: 'https://ridewithgps.com/events/123',
                startDate: null,
                group: 'X'
            });
            const result = ValidationCore.validateForUpdate([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('validateForReinstatement', () => {
        it('should pass validation for cancelled ride', () => {
            const row = createMockRow({ rideName: 'CANCELLED: Sat A Ride' });
            const result = ValidationCore.validateForReinstatement([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toEqual([]);
        });

        it('should detect non-cancelled ride', () => {
            const row = createMockRow();
            const result = ValidationCore.validateForReinstatement([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Operation not permitted when ride is not cancelled');
        });

        it('should detect unmanaged ride', () => {
            const row = createMockRow({ rideName: 'cancelled: Unmanaged Ride' });
            const result = ValidationCore.validateForReinstatement([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Ride is unmanaged');
        });
    });

    describe('validateForUnschedule', () => {
        it('should pass validation for scheduled ride', () => {
            const row = createMockRow({ rideURL: 'https://ridewithgps.com/events/123' });
            const result = ValidationCore.validateForUnschedule([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toEqual([]);
        });

        it('should detect unscheduled ride', () => {
            const row = createMockRow({ rideURL: '' });
            const result = ValidationCore.validateForUnschedule([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Ride has not been scheduled');
        });

        it('should detect unmanaged ride', () => {
            const row = createMockRow({ 
                rideName: 'Unmanaged Ride',
                rideURL: 'https://ridewithgps.com/events/123'
            });
            const result = ValidationCore.validateForUnschedule([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Ride is unmanaged');
        });
    });

    describe('validateForRouteImport', () => {
        it('should pass validation for accessible foreign route', () => {
            const row = createMockRow({ 
                routeURL: 'https://ridewithgps.com/routes/accessible'
            });
            const result = ValidationCore.validateForRouteImport([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toEqual([]);
        });

        it('should detect club-owned route', () => {
            const row = createMockRow({ 
                routeURL: 'https://ridewithgps.com/routes/club-owned'
            });
            const result = ValidationCore.validateForRouteImport([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Route is owned by SCCCC');
        });

        it('should detect forbidden route', () => {
            const row = createMockRow({ 
                routeURL: 'https://ridewithgps.com/routes/forbidden'
            });
            const result = ValidationCore.validateForRouteImport([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Route URL does not have public access');
        });

        it('should detect not found route', () => {
            const row = createMockRow({ 
                routeURL: 'https://ridewithgps.com/routes/notfound'
            });
            const result = ValidationCore.validateForRouteImport([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('This route cannot be found on the server');
        });

        it('should detect missing route URL', () => {
            const row = createMockRow({ routeURL: '', routeName: '' });
            const result = ValidationCore.validateForRouteImport([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors.some(e => e.includes('No Route URL'))).toBe(true);
        });

        it('should handle unknown HTTP status code', () => {
            const row = createMockRow({ 
                routeURL: 'https://ridewithgps.com/routes/unknown-status'
            });
            const result = ValidationCore.validateForRouteImport([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Unknown issue with Route URL');
        });

        it('should handle network error', () => {
            const row = createMockRow({ 
                routeURL: 'https://ridewithgps.com/routes/network-error'
            });
            const result = ValidationCore.validateForRouteImport([row], defaultOptions);
            
            const validation = result.get(row);
            expect(validation.errors).toContain('Unknown issue with Route URL - please check it and try again');
        });
    });

    describe('helper methods', () => {
        describe('isScheduled', () => {
            it('should return true for scheduled ride', () => {
                const row = createMockRow({ rideURL: 'https://ridewithgps.com/events/123' });
                expect(ValidationCore.isScheduled(row)).toBe(true);
            });

            it('should return false for unscheduled ride', () => {
                const row = createMockRow({ rideURL: '' });
                expect(ValidationCore.isScheduled(row)).toBe(false);
            });
        });

        describe('isCancelled', () => {
            it('should return true for cancelled ride (uppercase)', () => {
                const row = createMockRow({ rideName: 'CANCELLED: Sat A Ride' });
                expect(ValidationCore.isCancelled(row)).toBe(true);
            });

            it('should return true for cancelled ride (lowercase)', () => {
                const row = createMockRow({ rideName: 'cancelled: Sat A Ride' });
                expect(ValidationCore.isCancelled(row)).toBe(true);
            });

            it('should return false for non-cancelled ride', () => {
                const row = createMockRow({ rideName: 'Sat A Ride' });
                expect(ValidationCore.isCancelled(row)).toBe(false);
            });
        });

        describe('inappropriateGroup', () => {
            const groupSpecs = {
                'A': { MIN_ELEVATION_GAIN: 1000, MIN_LENGTH: 30 },
                'B': { MIN_ELEVATION_GAIN: 500, MAX_ELEVATION_GAIN: 1500, MIN_LENGTH: 20, MAX_LENGTH: 40 }
            };

            it('should return undefined for valid metrics', () => {
                const result = ValidationCore.inappropriateGroup('A', 1500, 35, groupSpecs);
                expect(result).toBeUndefined();
            });

            it('should detect elevation too low', () => {
                const result = ValidationCore.inappropriateGroup('A', 500, 35, groupSpecs);
                expect(result).toContain('too low');
            });

            it('should detect elevation too high', () => {
                const result = ValidationCore.inappropriateGroup('B', 2000, 35, groupSpecs);
                expect(result).toContain('too great');
            });

            it('should detect distance too short', () => {
                const result = ValidationCore.inappropriateGroup('A', 1500, 20, groupSpecs);
                expect(result).toContain('too short');
            });

            it('should detect distance too long', () => {
                const result = ValidationCore.inappropriateGroup('B', 1000, 50, groupSpecs);
                expect(result).toContain('too long');
            });

            it('should handle unknown group', () => {
                const result = ValidationCore.inappropriateGroup('X', 1500, 35, groupSpecs);
                expect(result).toContain('Unknown group');
            });

            it('should return undefined when no constraints violated', () => {
                const result = ValidationCore.inappropriateGroup('B', 1000, 30, groupSpecs);
                expect(result).toBeUndefined();
            });
        });
    });
});
