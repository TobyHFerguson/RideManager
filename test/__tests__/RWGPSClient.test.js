/**
 * RWGPSClient.test.js
 * 
 * Tests for RWGPSClient adapter (GAS layer)
 * Uses RWGPSMockServer to replay fixtures
 */

const RWGPSClient = require('../../src/rwgpslib/RWGPSClient');
const { RWGPSMockServer, mockUrlFetchApp } = require('../mocks/RWGPSMockServer');

describe('RWGPSClient', () => {
    let client;
    
    beforeEach(() => {
        // Create client with test credentials
        client = new RWGPSClient({
            apiKey: 'test-api-key',
            authToken: 'test-auth-token',
            username: 'test@example.com',
            password: 'test-password'
        });
        
        // Setup mock server
        RWGPSMockServer.reset();
        
        // Mock UrlFetchApp globally
        global.UrlFetchApp = mockUrlFetchApp;
        
        // Mock Utilities.base64Encode for Basic Auth
        global.Utilities = {
            base64Encode: (str) => Buffer.from(str).toString('base64')
        };
    });
    
    afterEach(() => {
        delete global.UrlFetchApp;
        delete global.Utilities;
    });
    
    describe('deleteEvent', () => {
        it('should successfully delete an event', () => {
            // Add only DELETE call (no login required)
            RWGPSMockServer.addExpectedCall({
                url: 'https://ridewithgps.com/api/v1/events/444070.json',
                method: 'DELETE',
                response: '',
                status: 204
            });

            // Use event ID matching fixture
            const eventUrl = 'https://ridewithgps.com/events/444070';
            const result = client.deleteEvent(eventUrl);
            
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should return error if delete returns non-204 status', () => {
            // Mock DELETE returning error status
            RWGPSMockServer.addExpectedCall({
                url: 'https://ridewithgps.com/api/v1/events/12345.json',
                method: 'DELETE',
                response: JSON.stringify({ error: 'Not found' }),
                status: 404
            });
            
            const eventUrl = 'https://ridewithgps.com/events/12345';
            const result = client.deleteEvent(eventUrl);

            expect(result.success).toBe(false);
            expect(result.error).toContain('404');
        });

        it('should return error if delete request throws exception', () => {
            // Turn off strict mode so we don't fail on unexpected call
            RWGPSMockServer.strictMode = false;

            const eventUrl = 'https://ridewithgps.com/events/12345';
            const result = client.deleteEvent(eventUrl);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should handle invalid event URL', () => {
            const result = client.deleteEvent('not-a-valid-url');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid event URL');
        });

        it('should use v1 API endpoint', () => {
            // Add only DELETE call (no login)
            RWGPSMockServer.addExpectedCall({
                url: 'https://ridewithgps.com/api/v1/events/444070.json',
                method: 'DELETE',
                response: '',
                status: 204
            });

            // Use event ID matching fixture
            const eventUrl = 'https://ridewithgps.com/events/444070';
            client.deleteEvent(eventUrl);

            // Check only the delete call (no login)
            const calls = RWGPSMockServer.actualCalls;
            expect(calls.length).toBe(1);
            expect(calls[0].url).toContain('/api/v1/events/444070.json');
            expect(calls[0].method).toBe('DELETE');
        });

        it('should use Basic Auth for v1 API', () => {
            // Add only DELETE call (no login)
            RWGPSMockServer.addExpectedCall({
                url: 'https://ridewithgps.com/api/v1/events/444070.json',
                method: 'DELETE',
                response: '',
                status: 204
            });

            // Use event ID matching fixture
            const eventUrl = 'https://ridewithgps.com/events/444070';
            client.deleteEvent(eventUrl);

            // Check the delete call has Authorization header (first and only call)
            const calls = RWGPSMockServer.actualCalls;
            const deleteCall = calls[0];
            expect(deleteCall.options.headers.Authorization).toBeDefined();
            expect(deleteCall.options.headers.Authorization).toContain('Basic ');
        });
    });

    describe('getEvent', () => {
        it('should successfully get event details', () => {
            // Load cancel fixture which contains login + getAll
            RWGPSMockServer.loadFixture('cancel');

            // Use event ID matching fixture
            const eventUrl = 'https://ridewithgps.com/events/444070';
            const result = client.getEvent(eventUrl);
            
            expect(result.success).toBe(true);
            expect(result.event).toBeDefined();
            expect(result.event.id).toBe(444070);
            expect(result.event.name).toContain('Fri B');
            expect(result.error).toBeUndefined();
        });

        it('should return error on API failure', () => {
            // Don't load fixture - API call will fail
            const eventUrl = 'https://ridewithgps.com/events/12345';
            const result = client.getEvent(eventUrl);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should return error for invalid event URL', () => {
            RWGPSMockServer.loadFixture('cancel');
            
            const result = client.getEvent('invalid-url');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid event URL');
        });

        it('should use v1 API endpoint', () => {
            RWGPSMockServer.loadFixture('cancel');

            const eventUrl = 'https://ridewithgps.com/events/444070';
            client.getEvent(eventUrl);

            // Check the v1 API call (no login needed for v1 API)
            const calls = RWGPSMockServer.actualCalls;
            expect(calls.length).toBe(1);
            expect(calls[0].url).toBe('https://ridewithgps.com/api/v1/events/444070.json');
            expect(calls[0].method).toBe('GET');
        });

        it('should use Basic Auth with v1 API', () => {
            RWGPSMockServer.loadFixture('cancel');

            const eventUrl = 'https://ridewithgps.com/events/444070';
            client.getEvent(eventUrl);

            // Check the v1 API call has Authorization header
            const calls = RWGPSMockServer.actualCalls;
            expect(calls[0].options.headers.Authorization).toBeDefined();
            expect(calls[0].options.headers.Authorization).toContain('Basic ');
        });
    });

    describe('editEvent', () => {
        it('should successfully edit an event using single PUT', () => {
            // Load edit fixture which contains 1 PUT request (v1 API, no login)
            RWGPSMockServer.loadFixture('edit');

            const eventUrl = 'https://ridewithgps.com/events/444070';
            // Use v1 format: description, start_date, start_time, organizer_ids, route_ids
            const eventData = {
                name: 'Fri B (3/1 11:00) CCP - Rancho San Vicente Open Space-Bald Peak-Calero Reservoir',
                description: 'Ride Leader: Albert Saporta',
                start_date: '2030-03-01',
                start_time: '11:00',
                visibility: '0',
                organizer_ids: ['498406'],
                route_ids: ['50969472']
            };
            
            const result = client.editEvent(eventUrl, eventData);
            
            expect(result.success).toBe(true);
            expect(result.event).toBeDefined();
            expect(result.event.id).toBe(444070);
            expect(result.error).toBeUndefined();
        });

        it('should make single PUT request with all_day=0', () => {
            RWGPSMockServer.loadFixture('edit');

            const eventUrl = 'https://ridewithgps.com/events/444070';
            // Use v1 format input
            const eventData = {
                name: 'Fri B (3/1 11:00) CCP - Rancho San Vicente Open Space-Bald Peak-Calero Reservoir',
                description: 'Ride Leader: Albert Saporta',
                start_date: '2030-03-01',
                start_time: '11:00',
                visibility: '0',
                organizer_ids: ['498406'],
                route_ids: ['50969472']
            };
            
            client.editEvent(eventUrl, eventData);

            // Check calls: single PUT (no login needed for v1 API)
            const calls = RWGPSMockServer.actualCalls;
            const putCalls = calls.filter((/** @type {any} */ c) => c.method === 'PUT');
            expect(putCalls.length).toBe(1);
            
            // Single PUT should have all_day=0 and use v1 endpoint
            const put = putCalls[0];
            expect(put.url).toBe('https://ridewithgps.com/api/v1/events/444070.json');
            const payload = JSON.parse(put.options.payload);
            expect(payload.event.all_day).toBe('0');
            expect(payload.event.name).toBe(eventData.name);
            expect(payload.event.start_date).toBe(eventData.start_date);
            expect(payload.event.start_time).toBe(eventData.start_time);
        });

        it('should use v1 API with organizer_ids directly', () => {
            RWGPSMockServer.loadFixture('edit');

            const eventUrl = 'https://ridewithgps.com/events/444070';
            // v1 format uses organizer_ids directly (not organizers array)
            const eventData = {
                name: 'Fri B (3/1 11:00) CCP - Rancho San Vicente Open Space-Bald Peak-Calero Reservoir',
                description: 'Ride Leader: Albert Saporta',
                start_date: '2030-03-01',
                start_time: '11:00',
                organizer_ids: ['498406', '123456'],
                route_ids: ['50969472']
            };
            
            client.editEvent(eventUrl, eventData);

            const calls = RWGPSMockServer.actualCalls;
            const putCalls = calls.filter((/** @type {any} */ c) => c.method === 'PUT');
            const payload = JSON.parse(putCalls[0].options.payload);
            expect(payload.event.organizer_ids).toEqual(['498406', '123456']);
        });

        it('should use v1 API with route_ids directly', () => {
            RWGPSMockServer.loadFixture('edit');

            const eventUrl = 'https://ridewithgps.com/events/444070';
            // v1 format uses route_ids directly
            const eventData = {
                name: 'Fri B (3/1 11:00) CCP - Rancho San Vicente Open Space-Bald Peak-Calero Reservoir',
                description: 'Ride Leader: Albert Saporta',
                start_date: '2030-03-01',
                start_time: '11:00',
                route_ids: ['50969472']
            };
            
            client.editEvent(eventUrl, eventData);

            const calls = RWGPSMockServer.actualCalls;
            const putCalls = calls.filter((/** @type {any} */ c) => c.method === 'PUT');
            const payload = JSON.parse(putCalls[0].options.payload);
            expect(payload.event.route_ids).toEqual(['50969472']);
        });

        it('should return error if API call fails', () => {
            // Don't load fixture - API call will fail
            const eventUrl = 'https://ridewithgps.com/events/12345';
            const eventData = { name: 'Test' };
            
            const result = client.editEvent(eventUrl, eventData);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should return error for invalid event URL', () => {
            RWGPSMockServer.loadFixture('edit');
            
            const eventData = { name: 'Test' };
            const result = client.editEvent('invalid-url', eventData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid event URL');
        });

        it('should use Basic Auth in PUT request', () => {
            RWGPSMockServer.loadFixture('edit');

            const eventUrl = 'https://ridewithgps.com/events/444070';
            const eventData = {
                name: 'Fri B (3/1 11:00) CCP - Rancho San Vicente Open Space-Bald Peak-Calero Reservoir',
                description: 'Ride Leader: Albert Saporta',
                start_date: '2030-03-01',
                start_time: '11:00'
            };
            
            client.editEvent(eventUrl, eventData);

            const calls = RWGPSMockServer.actualCalls;
            const putCalls = calls.filter((/** @type {any} */ c) => c.method === 'PUT');
            
            // v1 API uses Basic Auth, not cookies
            expect(putCalls.length).toBe(1);
            expect(putCalls[0].options.headers.Authorization).toBeDefined();
            expect(putCalls[0].options.headers.Authorization).toContain('Basic ');
        });
    });

    describe('createEvent', () => {
        it('should create a new event using v1 API POST', () => {
            // Load create fixture
            RWGPSMockServer.loadFixture('create');

            const eventData = {
                name: 'Test New Event',
                description: 'Test description',
                start_date: '2030-03-15',
                start_time: '10:00',
                visibility: 'members'
            };

            const result = client.createEvent(eventData);

            expect(result.success).toBe(true);
            expect(result.eventUrl).toBeDefined();
            expect(result.event).toBeDefined();
            expect(result.event.name).toBe('Test New Event');
        });

        it('should use v1 API with route_ids and organizer_ids', () => {
            RWGPSMockServer.loadFixture('create');

            const eventData = {
                name: 'Event with Routes',
                start_date: '2030-03-15',
                start_time: '10:00',
                route_ids: ['50969472', '12345678'],
                organizer_ids: ['111111', '222222']
            };

            client.createEvent(eventData);

            const calls = RWGPSMockServer.actualCalls;
            const postCalls = calls.filter((/** @type {any} */ c) => c.method === 'POST');
            expect(postCalls.length).toBeGreaterThan(0);
            
            const payload = JSON.parse(postCalls[postCalls.length - 1].options.payload);
            expect(payload.event.route_ids).toEqual(['50969472', '12345678']);
            expect(payload.event.organizer_ids).toEqual(['111111', '222222']);
        });

        it('should use Basic Auth for v1 API', () => {
            RWGPSMockServer.loadFixture('create');

            const eventData = {
                name: 'Test Event',
                start_date: '2030-03-15',
                start_time: '10:00'
            };

            client.createEvent(eventData);

            const calls = RWGPSMockServer.actualCalls;
            const postCalls = calls.filter((/** @type {any} */ c) => c.method === 'POST');
            
            // v1 API uses Basic Auth
            const lastPost = postCalls[postCalls.length - 1];
            expect(lastPost.options.headers.Authorization).toBeDefined();
            expect(lastPost.options.headers.Authorization).toContain('Basic ');
        });

        it('should return error if API call fails', () => {
            // Don't load fixture - API call will fail
            const eventData = {
                name: 'Test Event',
                start_date: '2030-03-15',
                start_time: '10:00'
            };

            const result = client.createEvent(eventData);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should set all_day to 0 by default', () => {
            RWGPSMockServer.loadFixture('create');

            const eventData = {
                name: 'Timed Event',
                start_date: '2030-03-15',
                start_time: '10:00'
            };

            client.createEvent(eventData);

            const calls = RWGPSMockServer.actualCalls;
            const postCalls = calls.filter((/** @type {any} */ c) => c.method === 'POST');
            const payload = JSON.parse(postCalls[postCalls.length - 1].options.payload);
            expect(payload.event.all_day).toBe('0');
        });

        it('should create event with logo using multipart/form-data', () => {
            RWGPSMockServer.loadFixture('create');

            // Mock Utilities for boundary generation and newBlob
            global.Utilities = {
                getUuid: jest.fn().mockReturnValue('12345678-1234-1234-1234-123456789012'),
                newBlob: jest.fn().mockImplementation((data) => {
                    const blobData = typeof data === 'string' ? new TextEncoder().encode(data) : data;
                    return {
                        getBytes: () => blobData,
                        setContentType: jest.fn().mockReturnThis()
                    };
                })
            };

            // Mock DriveApp for logo fetch
            const mockGetBytes = jest.fn().mockReturnValue(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])); // JPEG magic bytes
            const mockLogoBlob = {
                getContentType: jest.fn().mockReturnValue('image/jpeg'),
                getBytes: mockGetBytes
            };
            global.DriveApp = {
                getFileById: jest.fn().mockReturnValue({
                    getBlob: jest.fn().mockReturnValue(mockLogoBlob)
                })
            };

            const eventData = {
                name: 'Event with Logo',
                description: 'Test with logo',
                start_date: '2030-03-15',
                start_time: '10:00'
            };

            const logoUrl = 'https://drive.google.com/file/d/1234567890abcdef/view';
            const result = client.createEvent(eventData, logoUrl);

            if (!result.success) {
                console.log('Error:', result.error);
            }

            expect(result.success).toBe(true);
            expect(result.eventUrl).toBeDefined();
            expect(DriveApp.getFileById).toHaveBeenCalledWith('1234567890abcdef');

            // Verify multipart Content-Type was used
            const calls = RWGPSMockServer.actualCalls;
            const postCalls = calls.filter((/** @type {any} */ c) => c.method === 'POST');
            const lastPost = postCalls[postCalls.length - 1];
            expect(lastPost.options.headers['Content-Type']).toContain('multipart/form-data');
        });

        it('should handle invalid Drive URL when creating with logo', () => {
            RWGPSMockServer.loadFixture('create');

            const eventData = {
                name: 'Test Event',
                start_date: '2030-03-15',
                start_time: '10:00'
            };

            const invalidLogoUrl = 'https://invalid-url.com/image.jpg';
            const result = client.createEvent(eventData, invalidLogoUrl);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid Drive URL format');
        });
    });

    describe('cancelEvent', () => {
        it('should add CANCELLED: prefix to event name', () => {
            // Mock getEvent and editEvent to avoid fixture complexity
            const originalGetEvent = client.getEvent;
            const originalEditEvent = client.editEvent;

            client.getEvent = () => ({
                success: true,
                event: {
                    id: 444070,
                    name: 'Test Event',
                    desc: 'Test description'
                }
            });

            let editedEvent;
            client.editEvent = (/** @type {string} */ eventUrl, /** @type {any} */ eventData) => {
                editedEvent = eventData;
                return {
                    success: true,
                    event: eventData
                };
            };

            const eventUrl = 'https://ridewithgps.com/events/444070';
            const result = client.cancelEvent(eventUrl);

            expect(result.success).toBe(true);
            expect(result.event).toBeDefined();
            expect(editedEvent.name).toBe('CANCELLED: Test Event');

            // Restore
            client.getEvent = originalGetEvent;
            client.editEvent = originalEditEvent;
        });

        it('should return error if event already cancelled', () => {
            // Mock getEvent to return event with CANCELLED: prefix
            const originalGetEvent = client.getEvent;
            client.getEvent = () => ({
                success: true,
                event: {
                    name: 'CANCELLED: Test Event',
                    id: 444070
                }
            });

            const eventUrl = 'https://ridewithgps.com/events/444070';
            const result = client.cancelEvent(eventUrl);

            expect(result.success).toBe(false);
            expect(result.error).toContain('already cancelled');

            // Restore
            client.getEvent = originalGetEvent;
        });

        it('should return error if editEvent fails', () => {
            // Mock getEvent to succeed (v1 API doesn't need login)
            const originalGetEvent = client.getEvent;
            client.getEvent = () => ({
                success: true,
                event: {
                    name: 'Fri B (3/1 11:00) Test Ride',
                    id: 12345,
                    description: 'Test description',
                    start_date: '2030-03-01',
                    start_time: '11:00'
                }
            });

            // Don't load fixture - v1 API call will fail
            const eventUrl = 'https://ridewithgps.com/events/12345';
            
            const result = client.cancelEvent(eventUrl);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to edit event');

            // Restore
            client.getEvent = originalGetEvent;
        });

        it('should return error for invalid event URL', () => {
            const result = client.cancelEvent('invalid-url');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid event URL');
        });

        it('should return error if getEvent fails', () => {
            // Mock getEvent to fail
            const originalGetEvent = client.getEvent;
            client.getEvent = () => ({
                success: false,
                error: 'Failed to fetch event'
            });

            const eventUrl = 'https://ridewithgps.com/events/444070';
            const result = client.cancelEvent(eventUrl);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to fetch event');

            // Restore
            client.getEvent = originalGetEvent;
        });

        it('should return error if editEvent fails', () => {
            // Mock both methods
            const originalGetEvent = client.getEvent;
            const originalEditEvent = client.editEvent;

            client.getEvent = () => ({
                success: true,
                event: {
                    id: 444070,
                    name: 'Test Event'
                }
            });

            client.editEvent = () => ({
                success: false,
                error: 'Failed to edit event'
            });

            const eventUrl = 'https://ridewithgps.com/events/444070';
            const result = client.cancelEvent(eventUrl);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to edit event');

            // Restore
            client.getEvent = originalGetEvent;
            client.editEvent = originalEditEvent;
        });
    });

    describe('reinstateEvent', () => {
        it('should remove CANCELLED: prefix from event name', () => {
            // Mock getEvent and editEvent to avoid fixture complexity
            const originalGetEvent = client.getEvent;
            const originalEditEvent = client.editEvent;

            client.getEvent = () => ({
                success: true,
                event: {
                    id: 444070,
                    name: 'CANCELLED: Test Event',
                    desc: 'Test description'
                }
            });

            let editedEvent;
            client.editEvent = (/** @type {string} */ eventUrl, /** @type {any} */ eventData) => {
                editedEvent = eventData;
                return {
                    success: true,
                    event: eventData
                };
            };

            const eventUrl = 'https://ridewithgps.com/events/444070';
            const result = client.reinstateEvent(eventUrl);

            expect(result.success).toBe(true);
            expect(result.event).toBeDefined();
            expect(editedEvent.name).toBe('Test Event');

            // Restore
            client.getEvent = originalGetEvent;
            client.editEvent = originalEditEvent;
        });

        it('should return error if event is not cancelled', () => {
            // Mock getEvent to return event without CANCELLED: prefix
            const originalGetEvent = client.getEvent;
            client.getEvent = () => ({
                success: true,
                event: {
                    name: 'Test Event',
                    id: 444070
                }
            });

            const eventUrl = 'https://ridewithgps.com/events/444070';
            const result = client.reinstateEvent(eventUrl);

            expect(result.success).toBe(false);
            expect(result.error).toContain('not cancelled');

            // Restore
            client.getEvent = originalGetEvent;
        });

        it('should return error if editEvent fails', () => {
            // Mock getEvent to succeed with v1 format data
            const originalGetEvent = client.getEvent;
            client.getEvent = () => ({
                success: true,
                event: {
                    name: 'CANCELLED: Fri B (3/1 11:00) Test Ride',
                    id: 12345,
                    description: 'Test description',
                    start_date: '2024-03-01',
                    start_time: '11:00'
                }
            });

            // Don't load fixture - editEvent will fail (no mock response)
            const eventUrl = 'https://ridewithgps.com/events/12345';
            
            const result = client.reinstateEvent(eventUrl);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to edit event');

            // Restore
            client.getEvent = originalGetEvent;
        });

        it('should return error for invalid event URL', () => {
            const result = client.reinstateEvent('invalid-url');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid event URL');
        });

        it('should return error if getEvent fails', () => {
            // Mock getEvent to fail
            const originalGetEvent = client.getEvent;
            client.getEvent = () => ({
                success: false,
                error: 'Failed to fetch event'
            });

            const eventUrl = 'https://ridewithgps.com/events/444070';
            const result = client.reinstateEvent(eventUrl);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to fetch event');

            // Restore
            client.getEvent = originalGetEvent;
        });

        it('should return error if editEvent fails', () => {
            // Mock both methods
            const originalGetEvent = client.getEvent;
            const originalEditEvent = client.editEvent;

            client.getEvent = () => ({
                success: true,
                event: {
                    id: 444070,
                    name: 'CANCELLED: Test Event'
                }
            });

            client.editEvent = () => ({
                success: false,
                error: 'Failed to edit event'
            });

            const eventUrl = 'https://ridewithgps.com/events/444070';
            const result = client.reinstateEvent(eventUrl);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to edit event');

            // Restore
            client.getEvent = originalGetEvent;
            client.editEvent = originalEditEvent;
        });
    });

    describe('scheduleEvent', () => {
        it('should schedule a new event with organizer IDs', () => {
            // Use mocks instead of fixture (fixture has complex multi-call flow)
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            jest.spyOn(client, 'createEvent').mockReturnValue({
                success: true,
                eventUrl: 'https://ridewithgps.com/events/444070-new-event',
                event: { id: 444070 }
            });
            jest.spyOn(client, 'editEvent').mockReturnValue({
                success: true,
                event: { 
                    id: 444070, 
                    name: 'Fri B (3/1 10:00) CCP - Test Ride',
                    all_day: false,
                    starts_at: '2030-03-01T10:00:00-08:00'
                }
            });

            // New signature: scheduleEvent(eventData, organizerIds, logoUrl)
            const eventData = {
                name: 'Fri B (3/1 10:00) CCP - Test Ride',
                desc: 'Ride Leader: Albert Saporta\n\nArrive 9:45 AM for a 10:00 AM rollout.',
                starts_at: '2030-03-01T18:00:00.000Z',
                visibility: 0,
                route_ids: ['50969472']
            };
            const organizerIds = [498406]; // Pre-looked-up organizer IDs

            const result = client.scheduleEvent(eventData, organizerIds);

            expect(result.success).toBe(true);
            expect(result.eventUrl).toBe('https://ridewithgps.com/events/444070-new-event');
            expect(result.event).toBeDefined();
            expect(result.event.id).toBe(444070);
        });

        it('should pass organizer tokens to editEvent', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            jest.spyOn(client, 'createEvent').mockReturnValue({
                success: true,
                eventUrl: 'https://ridewithgps.com/events/444070',
                event: { id: 444070 }
            });
            const editSpy = jest.spyOn(client, 'editEvent').mockReturnValue({
                success: true,
                event: { id: 444070, name: 'Test' }
            });

            // Pass organizer IDs directly (no lookup needed)
            client.scheduleEvent(
                { name: 'Test Event', starts_at: '2030-01-01T10:00:00Z' },
                [498406] // Organizer ID pre-looked-up
            );

            // Verify editEvent was called with organizer tokens
            expect(editSpy).toHaveBeenCalledWith(
                'https://ridewithgps.com/events/444070',
                expect.objectContaining({
                    organizer_tokens: ['498406']
                })
            );
        });

        it('should return error if login fails', () => {
            // Don't load fixture - login will fail
            const result = client.scheduleEvent(
                { name: 'Test Event', starts_at: '2030-01-01T10:00:00Z' },
                [12345] // Organizer IDs
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Login');
        });

        it('should return error if event creation fails', () => {
            // Mock login success but createEvent failure
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            jest.spyOn(client, 'createEvent').mockReturnValue({
                success: false,
                error: 'Create failed'
            });

            const result = client.scheduleEvent(
                { name: 'Test Event', starts_at: '2030-01-01T10:00:00Z' },
                []
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('create event');
        });

        it('should delete new event if edit fails', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            jest.spyOn(client, 'createEvent').mockReturnValue({
                success: true,
                eventUrl: 'https://ridewithgps.com/events/444070',
                event: { id: 444070 }
            });
            jest.spyOn(client, 'editEvent').mockReturnValue({
                success: false,
                error: 'Edit failed'
            });
            const deleteSpy = jest.spyOn(client, 'deleteEvent').mockReturnValue({ success: true });

            const result = client.scheduleEvent(
                { name: 'Test Event', starts_at: '2030-01-01T10:00:00Z' },
                []
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('edit new event');
            expect(deleteSpy).toHaveBeenCalledWith('https://ridewithgps.com/events/444070');
        });

        it('should still succeed if tag removal fails', () => {
            // NOTE: scheduleEvent no longer calls _removeEventTags (removed when migrated to v1 API)
            // This test verifies that the overall flow still works
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            jest.spyOn(client, 'createEvent').mockReturnValue({
                success: true,
                eventUrl: 'https://ridewithgps.com/events/444070',
                event: { id: 444070 }
            });
            jest.spyOn(client, 'editEvent').mockReturnValue({
                success: true,
                event: { id: 444070, name: 'Test Event' }
            });

            const result = client.scheduleEvent(
                { name: 'Test Event', starts_at: '2030-01-01T10:00:00Z' },
                [] // No organizers
            );

            // Should succeed
            expect(result.success).toBe(true);
            expect(result.eventUrl).toBe('https://ridewithgps.com/events/444070');
        });

        it('should handle empty organizer IDs', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            jest.spyOn(client, 'createEvent').mockReturnValue({
                success: true,
                eventUrl: 'https://ridewithgps.com/events/444070',
                event: { id: 444070 }
            });
            jest.spyOn(client, 'editEvent').mockReturnValue({
                success: true,
                event: { id: 444070, name: 'Test Event' }
            });

            const result = client.scheduleEvent(
                { name: 'Test Event', starts_at: '2030-01-01T10:00:00Z' },
                [] // Empty array
            );

            expect(result.success).toBe(true);
        });

        it('should handle null organizer IDs', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            jest.spyOn(client, 'createEvent').mockReturnValue({
                success: true,
                eventUrl: 'https://ridewithgps.com/events/444070',
                event: { id: 444070 }
            });
            jest.spyOn(client, 'editEvent').mockReturnValue({
                success: true,
                event: { id: 444070, name: 'Test Event' }
            });

            const result = client.scheduleEvent(
                { name: 'Test Event', starts_at: '2030-01-01T10:00:00Z' },
                null // null
            );

            expect(result.success).toBe(true);
        });
    });

    describe('updateEvent', () => {
        it('should update an existing event', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            jest.spyOn(client, 'editEvent').mockReturnValue({
                success: true,
                event: { 
                    id: 444070, 
                    name: 'Updated Event Name',
                    starts_at: '2030-03-01T10:00:00-08:00'
                }
            });

            const eventUrl = 'https://ridewithgps.com/events/444070-existing-event';
            const eventData = {
                name: 'Updated Event Name',
                starts_at: '2030-03-01T10:00:00-08:00'
            };

            const result = client.updateEvent(eventUrl, eventData);

            expect(result.success).toBe(true);
            expect(result.event).toBeDefined();
            expect(result.event.name).toBe('Updated Event Name');
        });

        it('should update event with organizer IDs', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            const editSpy = jest.spyOn(client, 'editEvent').mockReturnValue({
                success: true,
                event: { id: 444070, name: 'Test' }
            });

            // Pass organizer IDs directly (no lookup needed)
            client.updateEvent(
                'https://ridewithgps.com/events/444070',
                { name: 'Updated Event', starts_at: '2030-01-01T10:00:00Z' },
                [498406] // Organizer IDs
            );

            // Verify editEvent was called with organizer tokens
            expect(editSpy).toHaveBeenCalledWith(
                'https://ridewithgps.com/events/444070',
                expect.objectContaining({
                    organizer_tokens: ['498406']
                })
            );
        });

        it('should return error if login fails', () => {
            jest.spyOn(client, 'login').mockReturnValue(false);

            const result = client.updateEvent(
                'https://ridewithgps.com/events/444070',
                { name: 'Updated Event' }
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('Login');
        });

        it('should return error if edit fails', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            jest.spyOn(client, 'editEvent').mockReturnValue({
                success: false,
                error: 'Edit failed'
            });

            const result = client.updateEvent(
                'https://ridewithgps.com/events/444070',
                { name: 'Updated Event' }
            );

            expect(result.success).toBe(false);
            expect(result.error).toContain('edit event');
        });

        it('should handle empty organizer IDs', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            jest.spyOn(client, 'editEvent').mockReturnValue({
                success: true,
                event: { id: 444070, name: 'Updated Event' }
            });

            const result = client.updateEvent(
                'https://ridewithgps.com/events/444070',
                { name: 'Updated Event' },
                [] // Empty array
            );

            expect(result.success).toBe(true);
        });

        it('should handle null organizer IDs', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            jest.spyOn(client, 'editEvent').mockReturnValue({
                success: true,
                event: { id: 444070, name: 'Updated Event' }
            });

            const result = client.updateEvent(
                'https://ridewithgps.com/events/444070',
                { name: 'Updated Event' },
                null // null
            );

            expect(result.success).toBe(true);
        });

        it('should handle undefined organizer IDs', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            jest.spyOn(client, 'editEvent').mockReturnValue({
                success: true,
                event: { id: 444070, name: 'Updated Event' }
            });

            const result = client.updateEvent(
                'https://ridewithgps.com/events/444070',
                { name: 'Updated Event' }
                // No organizerIds parameter
            );

            expect(result.success).toBe(true);
        });
    });

    describe('_removeEventTags', () => {
        it('should remove tags from event', () => {
            client.webSessionCookie = 'test-cookie';
            const mockResponse = {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({ events: [] })
            };
            jest.spyOn(client, '_fetch').mockReturnValue(mockResponse);

            const result = client._removeEventTags('444070', ['template']);

            expect(result.success).toBe(true);
        });

        it('should return error on failure', () => {
            client.webSessionCookie = 'test-cookie';
            const mockResponse = {
                getResponseCode: () => 400,
                getContentText: () => 'Bad Request'
            };
            jest.spyOn(client, '_fetch').mockReturnValue(mockResponse);

            const result = client._removeEventTags('444070', ['template']);

            expect(result.success).toBe(false);
            expect(result.error).toContain('status 400');
        });
    });

    describe('importRoute', () => {
        it('should successfully import route without tags', () => {
            // Load fixture
            RWGPSMockServer.loadFixture('import-route');

            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = {
                name: 'DELETE ME',
                userId: 621846
            };

            const result = client.importRoute(routeUrl, routeData);

            expect(result.success).toBe(true);
            expect(result.routeUrl).toBe('https://ridewithgps.com/routes/53715433');
            expect(result.route).toBeDefined();
            expect(result.route.id).toBe(53715433);
            expect(result.route.name).toBe('DELETE ME');
        });

        it('should successfully import route with tags', () => {
            // Load fixture
            RWGPSMockServer.loadFixture('import-route');

            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = {
                name: 'DELETE ME',
                expiry: '1/31/2030',
                tags: ['B'],
                userId: 621846
            };

            const result = client.importRoute(routeUrl, routeData);

            expect(result.success).toBe(true);
            expect(result.routeUrl).toBe('https://ridewithgps.com/routes/53715433');
            expect(result.route).toBeDefined();
        });

        it('should return error if login fails', () => {
            // Mock login failure
            jest.spyOn(client, 'login').mockReturnValue(false);

            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = { userId: 621846 };

            const result = client.importRoute(routeUrl, routeData);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Login failed');
        });

        it('should return error if copy fails', () => {
            // Mock successful login
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';

            // Mock copy failure
            const mockResponse = {
                getResponseCode: () => 400,
                getContentText: () => 'Bad Request'
            };
            jest.spyOn(client, '_fetch').mockReturnValue(mockResponse);

            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = { userId: 621846 };

            const result = client.importRoute(routeUrl, routeData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Route copy failed');
        });

        it('should handle fetch failure after copy', () => {
            // Mock successful login
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';

            // Mock successful copy
            const copyResponse = {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({
                    success: 1,
                    url: 'https://ridewithgps.com/routes/53715433'
                })
            };

            // Mock failed get
            const getResponse = {
                getResponseCode: () => 404,
                getContentText: () => 'Not Found'
            };

            let callCount = 0;
            jest.spyOn(client, '_fetch').mockImplementation(() => {
                callCount++;
                return callCount === 1 ? copyResponse : getResponse;
            });

            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = { userId: 621846 };

            const result = client.importRoute(routeUrl, routeData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('fetch failed');
            expect(result.routeUrl).toBe('https://ridewithgps.com/routes/53715433');
        });

        it('should continue if tag addition fails', () => {
            // Load fixture
            RWGPSMockServer.loadFixture('import-route');

            // Mock console.warn to verify it's called
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = {
                name: 'DELETE ME',
                tags: ['B'],
                userId: 621846
            };

            // Mock successful copy and get, but failed tag addition
            const originalFetch = client._fetch.bind(client);
            jest.spyOn(client, '_fetch').mockImplementation((url, options) => {
                // Tag addition fails
                if (url.includes('batch_update_tags')) {
                    return {
                        getResponseCode: () => 500,
                        getContentText: () => 'Internal Server Error'
                    };
                }
                // Use original fetch for other calls
                return originalFetch(url, options);
            });

            const result = client.importRoute(routeUrl, routeData);

            expect(result.success).toBe(true); // Should still succeed
            expect(result.routeUrl).toBeDefined();
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Tag addition failed'));

            warnSpy.mockRestore();
        });
    });

    describe('getRoute', () => {
        it('should successfully get route details', () => {
            const mockResponse = {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({
                    route: {
                        id: 53715433,
                        name: 'Test Route',
                        distance: 46318,
                        elevation_gain: 452
                    }
                })
            };
            jest.spyOn(client, '_fetch').mockReturnValue(mockResponse);

            const result = client.getRoute('https://ridewithgps.com/routes/53715433');

            expect(result.success).toBe(true);
            expect(result.route).toBeDefined();
            expect(result.route.id).toBe(53715433);
            expect(result.route.name).toBe('Test Route');
        });

        it('should return error for invalid URL', () => {
            const result = client.getRoute('invalid-url');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid route URL');
        });

        it('should return error on fetch failure', () => {
            const mockResponse = {
                getResponseCode: () => 404,
                getContentText: () => 'Not Found'
            };
            jest.spyOn(client, '_fetch').mockReturnValue(mockResponse);

            const result = client.getRoute('https://ridewithgps.com/routes/53715433');

            expect(result.success).toBe(false);
            expect(result.error).toContain('status 404');
        });
    });

    describe('_copyRoute', () => {
        it('should successfully copy route', () => {
            client.webSessionCookie = 'test-cookie';
            const mockResponse = {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({
                    success: 1,
                    url: 'https://ridewithgps.com/routes/53715433',
                    id: 53715433
                })
            };
            jest.spyOn(client, '_fetch').mockReturnValue(mockResponse);

            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = {
                name: 'Test Route',
                userId: 621846
            };

            const result = client._copyRoute(routeUrl, routeData);

            expect(result.success).toBe(true);
            expect(result.routeUrl).toBe('https://ridewithgps.com/routes/53715433');
        });

        it('should return error for invalid URL', () => {
            client.webSessionCookie = 'test-cookie';
            const result = client._copyRoute('invalid-url', { userId: 621846 });

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid route URL');
        });

        it('should return error on copy failure', () => {
            client.webSessionCookie = 'test-cookie';
            const mockResponse = {
                getResponseCode: () => 400,
                getContentText: () => 'Bad Request'
            };
            jest.spyOn(client, '_fetch').mockReturnValue(mockResponse);

            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = { userId: 621846 };

            const result = client._copyRoute(routeUrl, routeData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('status 400');
        });

        it('should return error if response missing URL', () => {
            client.webSessionCookie = 'test-cookie';
            const mockResponse = {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({ success: 1 }) // Missing url
            };
            jest.spyOn(client, '_fetch').mockReturnValue(mockResponse);

            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = { userId: 621846 };

            const result = client._copyRoute(routeUrl, routeData);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Copy response missing URL');
        });
    });

    describe('_addRouteTags', () => {
        it('should successfully add tags', () => {
            client.webSessionCookie = 'test-cookie';
            const mockResponse = {
                getResponseCode: () => 200,
                getContentText: () => JSON.stringify({
                    routes: [{ id: 53715433, name: 'Test Route', tag_names: ['B'] }]
                })
            };
            jest.spyOn(client, '_fetch').mockReturnValue(mockResponse);

            const result = client._addRouteTags('https://ridewithgps.com/routes/53715433', ['B']);

            expect(result.success).toBe(true);
        });

        it('should return error for invalid URL', () => {
            client.webSessionCookie = 'test-cookie';
            const result = client._addRouteTags('invalid-url', ['B']);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid route URL');
        });

        it('should return error on failure', () => {
            client.webSessionCookie = 'test-cookie';
            const mockResponse = {
                getResponseCode: () => 500,
                getContentText: () => 'Internal Server Error'
            };
            jest.spyOn(client, '_fetch').mockReturnValue(mockResponse);

            const result = client._addRouteTags('https://ridewithgps.com/routes/53715433', ['B']);

            expect(result.success).toBe(false);
            expect(result.error).toContain('status 500');
        });
    });

    describe('setRouteExpiration', () => {
        it('should add expiration tag to route', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            
            jest.spyOn(client, 'getRoute').mockReturnValue({
                success: true,
                route: { id: 53715433, name: 'Test Route', tag_names: ['B', 'expires: 01/01/2025'] }
            });
            jest.spyOn(client, '_addRouteTags').mockReturnValue({ success: true });
            
            // Use local time format (no 'Z' suffix) to avoid timezone issues
            const expiryDate = new Date('2025-03-15T12:00:00');
            const result = client.setRouteExpiration('https://ridewithgps.com/routes/53715433', expiryDate);
            
            expect(result.success).toBe(true);
            expect(client._addRouteTags).toHaveBeenCalledWith(
                'https://ridewithgps.com/routes/53715433',
                ['expires: 03/15/2025']
            );
        });

        it('should skip if new date is not newer than existing tag', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            
            // Existing tag is 03/15/2025
            jest.spyOn(client, 'getRoute').mockReturnValue({
                success: true,
                route: { id: 53715433, name: 'Test Route', tag_names: ['B', 'expires: 03/15/2025'] }
            });
            jest.spyOn(client, '_addRouteTags');
            
            // New date is 02/01/2025 (earlier than existing) - use local time
            const expiryDate = new Date('2025-02-01T12:00:00');
            const result = client.setRouteExpiration('https://ridewithgps.com/routes/53715433', expiryDate);
            
            expect(result.success).toBe(true);
            expect(result.skipped).toBe(true);
            expect(client._addRouteTags).not.toHaveBeenCalled();
        });

        it('should update if forceUpdate is true even when not newer', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            
            jest.spyOn(client, 'getRoute').mockReturnValue({
                success: true,
                route: { id: 53715433, name: 'Test Route', tag_names: ['B', 'expires: 03/15/2025'] }
            });
            jest.spyOn(client, '_addRouteTags').mockReturnValue({ success: true });
            
            // Earlier date but forceUpdate=true - use local time
            const expiryDate = new Date('2025-02-01T12:00:00');
            const result = client.setRouteExpiration('https://ridewithgps.com/routes/53715433', expiryDate, true);
            
            expect(result.success).toBe(true);
            expect(result.skipped).toBeFalsy();
            expect(client._addRouteTags).toHaveBeenCalled();
        });

        it('should return error if login fails', () => {
            jest.spyOn(client, 'login').mockReturnValue(false);
            
            const result = client.setRouteExpiration('https://ridewithgps.com/routes/53715433', new Date());
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Login failed');
        });

        it('should return error if getRoute fails', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            
            jest.spyOn(client, 'getRoute').mockReturnValue({
                success: false,
                error: 'Route not found'
            });
            
            const result = client.setRouteExpiration('https://ridewithgps.com/routes/53715433', new Date());
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Route not found');
        });

        it('should return error if addRouteTags fails', () => {
            jest.spyOn(client, 'login').mockReturnValue(true);
            client.webSessionCookie = 'test-cookie';
            
            jest.spyOn(client, 'getRoute').mockReturnValue({
                success: true,
                route: { id: 53715433, name: 'Test Route', tag_names: [] }
            });
            jest.spyOn(client, '_addRouteTags').mockReturnValue({
                success: false,
                error: 'Tag addition failed'
            });
            
            const result = client.setRouteExpiration('https://ridewithgps.com/routes/53715433', new Date());
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Tag addition failed');
        });
    });
});
