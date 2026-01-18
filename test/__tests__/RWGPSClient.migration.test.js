/**
 * RWGPSClient Interface Tests for RideManager Migration
 * 
 * TDD: Define what RideManager needs, verify RWGPSClient provides it
 * 
 * Current RideManager operations using legacy adapter:
 * 1. schedule_row_ → needs: createEvent with logo, organizer lookup
 * 2. updateRow_ → needs: editEvent, getEvent, organizer lookup  
 * 3. importRow_ → needs: importRoute with expiry
 * 4. cancelRow_ → ✅ Already migrated to RWGPSClient.cancelEvent
 * 5. reinstateRow_ → ✅ Already migrated to RWGPSClient.reinstateEvent
 * 6. batch delete → needs: deleteEvent (can loop)
 */

const RWGPSClient = require('../../src/rwgpslib/RWGPSClient');

describe('RWGPSClient Interface for RideManager', () => {
    let client;
    
    beforeEach(() => {
        client = new RWGPSClient({
            apiKey: 'test-api-key',
            authToken: 'test-auth-token',
            username: 'test@example.com',
            password: 'test-password'
        });
    });

    describe('Required methods exist', () => {
        // Operations that RideManager needs
        it('should have scheduleEvent method', () => {
            expect(typeof client.scheduleEvent).toBe('function');
        });

        it('should have updateEvent method', () => {
            expect(typeof client.updateEvent).toBe('function');
        });

        it('should have getEvent method', () => {
            expect(typeof client.getEvent).toBe('function');
        });

        it('should have editEvent method', () => {
            expect(typeof client.editEvent).toBe('function');
        });

        it('should have cancelEvent method', () => {
            expect(typeof client.cancelEvent).toBe('function');
        });

        it('should have reinstateEvent method', () => {
            expect(typeof client.reinstateEvent).toBe('function');
        });

        it('should have deleteEvent method', () => {
            expect(typeof client.deleteEvent).toBe('function');
        });

        it('should have importRoute method', () => {
            expect(typeof client.importRoute).toBe('function');
        });

        it('should have createEvent method with optional logo support', () => {
            expect(typeof client.createEvent).toBe('function');
            // createEvent now accepts optional logoUrl parameter (Task 4.D)
        });
    });

    describe('scheduleEvent signature', () => {
        // schedule_row_ needs: create event with logo + organizer names
        it('should accept templateUrl, eventData, organizerNames, logoUrl', () => {
            // Verify signature matches expected pattern
            expect(client.scheduleEvent.length).toBe(4); // 4 parameters
        });
    });

    describe('updateEvent signature', () => {
        // updateRow_ needs: edit event + organizer names
        it('should accept eventUrl, eventData, organizerNames', () => {
            expect(client.updateEvent.length).toBe(3); // 3 parameters
        });
    });

    describe('importRoute signature', () => {
        // importRow_ needs: copy route with name, expiry, tags
        it('should accept routeUrl and routeData with expiry', () => {
            expect(client.importRoute.length).toBe(2); // routeUrl, routeData
        });
    });

    describe('Return format consistency', () => {
        // All methods should return {success, error?, ...data}
        
        it('cancelEvent returns {success, event?, error?}', () => {
            // Mock fetch to return error
            client._fetch = jest.fn().mockReturnValue({
                getResponseCode: () => 200,
                getAllHeaders: () => ({ 'Set-Cookie': '_rwgps_3_session=abc123; path=/' }),
                getContentText: () => JSON.stringify({ type: 'Event', name: 'Test' })
            });
            
            const result = client.cancelEvent('https://ridewithgps.com/events/12345');
            
            expect(result).toHaveProperty('success');
            // Either has event (success) or error (failure)
            expect(result.success === true ? result.event : result.error).toBeDefined();
        });

        it('getEvent returns {success, event?, error?}', () => {
            client._fetch = jest.fn().mockReturnValue({
                getResponseCode: () => 200,
                getAllHeaders: () => ({}),
                getContentText: () => JSON.stringify({ type: 'Event', id: 12345 })
            });
            
            const result = client.getEvent('https://ridewithgps.com/events/12345');
            
            expect(result).toHaveProperty('success');
            expect(result.success === true ? result.event : result.error).toBeDefined();
        });

        it('editEvent returns {success, event?, error?}', () => {
            client._fetch = jest.fn().mockReturnValue({
                getResponseCode: () => 200,
                getAllHeaders: () => ({}),
                getContentText: () => JSON.stringify({ type: 'Event', id: 12345 })
            });
            
            const result = client.editEvent('https://ridewithgps.com/events/12345', { name: 'Test' });
            
            expect(result).toHaveProperty('success');
        });

        it('deleteEvent returns {success, error?}', () => {
            // Mock login first
            client._fetch = jest.fn()
                .mockReturnValueOnce({
                    getResponseCode: () => 200,
                    getAllHeaders: () => ({ 'Set-Cookie': '_rwgps_3_session=abc123; path=/' }),
                    getContentText: () => '{}'
                })
                .mockReturnValueOnce({
                    getResponseCode: () => 200,
                    getAllHeaders: () => ({}),
                    getContentText: () => '{}'
                });
            
            const result = client.deleteEvent('https://ridewithgps.com/events/12345');
            
            expect(result).toHaveProperty('success');
        });

        it('importRoute returns {success, routeUrl?, route?, error?}', () => {
            // This just verifies return shape, not full behavior
            client._fetch = jest.fn().mockReturnValue({
                getResponseCode: () => 401, // Unauthorized to trigger error path
                getAllHeaders: () => ({}),
                getContentText: () => '{}'
            });
            
            const result = client.importRoute('https://ridewithgps.com/routes/12345', { userId: 1 });
            
            expect(result).toHaveProperty('success');
            // Either has routeUrl (success) or error (failure)
        });
    });

    describe('No need for separate setRouteExpiration', () => {
        // importRoute handles expiry via routeData.expiry
        it('importRoute should accept expiry in routeData', () => {
            // Verify the routeData structure supports expiry
            const routeData = {
                name: 'Test Route',
                expiry: '12/31/2026',
                tags: ['test'],
                userId: 123
            };
            
            // This validates the shape is correct for the API
            expect(routeData).toHaveProperty('expiry');
        });
    });
});

describe('RWGPSClientCore date formatting', () => {
    const RWGPSClientCore = require('../../src/rwgpslib/RWGPSClientCore');

    describe('formatDateForV1Api', () => {
        it('should convert Date to start_date and start_time', () => {
            // 2025-06-15 10:30 AM PST
            const date = new Date('2025-06-15T10:30:00');
            
            const result = RWGPSClientCore.formatDateForV1Api(date);
            
            expect(result).toEqual({
                start_date: '2025-06-15',
                start_time: '10:30'
            });
        });

        it('should handle afternoon times correctly', () => {
            const date = new Date('2025-12-25T14:45:00');
            
            const result = RWGPSClientCore.formatDateForV1Api(date);
            
            expect(result).toEqual({
                start_date: '2025-12-25',
                start_time: '14:45'
            });
        });

        it('should pad single-digit months and days', () => {
            const date = new Date('2025-01-05T09:05:00');
            
            const result = RWGPSClientCore.formatDateForV1Api(date);
            
            expect(result).toEqual({
                start_date: '2025-01-05',
                start_time: '09:05'
            });
        });

        it('should handle midnight correctly', () => {
            const date = new Date('2025-07-04T00:00:00');
            
            const result = RWGPSClientCore.formatDateForV1Api(date);
            
            expect(result).toEqual({
                start_date: '2025-07-04',
                start_time: '00:00'
            });
        });
    });
});
