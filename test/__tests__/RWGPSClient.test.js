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
            // Load fixture with login + delete
            RWGPSMockServer.loadFixture('unschedule');

            // Use event ID matching fixture
            const eventUrl = 'https://ridewithgps.com/events/444070';
            const result = client.deleteEvent(eventUrl);
            
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should return error if login fails', () => {
            // Don't load fixture - login will fail (no mock response)
            const eventUrl = 'https://ridewithgps.com/events/12345';
            const result = client.deleteEvent(eventUrl);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Login'); // Match actual error message
        });

        it('should return error if delete fails', () => {
            // Add expected call for login only (delete will fail with no mock response)
            RWGPSMockServer.addExpectedCall({
                url: 'https://ridewithgps.com/organizations/47/sign_in',
                method: 'POST',
                response: {
                    status: 302,
                    headers: {
                        'Set-Cookie': '_rwgps_session=test-session-cookie; path=/; HttpOnly'
                    }
                },
                status: 302,
                responseHeaders: {
                    'Set-Cookie': '_rwgps_session=test-session-cookie; path=/; HttpOnly'
                }
            });
            // Turn off strict mode so we don't fail on unexpected delete call
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
            RWGPSMockServer.loadFixture('unschedule');

            // Use event ID matching fixture
            const eventUrl = 'https://ridewithgps.com/events/444070';
            client.deleteEvent(eventUrl);

            // Check the delete call (second call after login)
            const calls = RWGPSMockServer.actualCalls;
            expect(calls.length).toBe(2);
            expect(calls[1].url).toContain('/api/v1/events/444070.json');
            expect(calls[1].method).toBe('DELETE');
        });

        it('should use Basic Auth for v1 API', () => {
            RWGPSMockServer.loadFixture('unschedule');

            // Use event ID matching fixture
            const eventUrl = 'https://ridewithgps.com/events/444070';
            client.deleteEvent(eventUrl);

            // Check the delete call has Authorization header
            const calls = RWGPSMockServer.actualCalls;
            const deleteCall = calls[1];
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

        it('should return error if login fails', () => {
            // Don't load fixture - login will fail
            const eventUrl = 'https://ridewithgps.com/events/12345';
            const result = client.getEvent(eventUrl);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Login');
        });

        it('should return error for invalid event URL', () => {
            RWGPSMockServer.loadFixture('cancel');
            
            const result = client.getEvent('invalid-url');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid event URL');
        });

        it('should use web API endpoint (not v1)', () => {
            RWGPSMockServer.loadFixture('cancel');

            const eventUrl = 'https://ridewithgps.com/events/444070';
            client.getEvent(eventUrl);

            // Check the getAll call (second call after login)
            const calls = RWGPSMockServer.actualCalls;
            expect(calls.length).toBe(2);
            expect(calls[1].url).toBe('https://ridewithgps.com/events/444070');
            expect(calls[1].method).toBe('GET');
        });

        it('should include session cookie in request', () => {
            RWGPSMockServer.loadFixture('cancel');

            const eventUrl = 'https://ridewithgps.com/events/444070';
            client.getEvent(eventUrl);

            // Check the getAll call has Cookie header
            const calls = RWGPSMockServer.actualCalls;
            const getCall = calls[1];
            expect(getCall.options.headers.Cookie).toBeDefined();
            expect(getCall.options.headers.Cookie).toContain('_rwgps_3_session=');
        });
    });

    describe('editEvent', () => {
        it('should successfully edit an event using double-edit pattern', () => {
            // Load edit fixture which contains login + 2 PUT requests only
            RWGPSMockServer.loadFixture('edit');

            const eventUrl = 'https://ridewithgps.com/events/444070';
            const eventData = {
                name: 'Updated Event Name',
                desc: 'Updated description',
                starts_at: '2030-03-01T19:00:00.000Z',
                organizers: [{ id: 498406 }],
                routes: [{ id: 50969472 }]
            };
            
            const result = client.editEvent(eventUrl, eventData);
            
            expect(result.success).toBe(true);
            expect(result.event).toBeDefined();
            expect(result.error).toBeUndefined();
        });

        it('should make two PUT requests (all_day=1, then all_day=0)', () => {
            RWGPSMockServer.loadFixture('edit');

            const eventUrl = 'https://ridewithgps.com/events/444070';
            const eventData = {
                name: 'Test Event',
                desc: 'Test description',
                starts_at: '2030-03-01T19:00:00.000Z'
            };
            
            client.editEvent(eventUrl, eventData);

            // Check calls: login (POST) + two PUTs
            const calls = RWGPSMockServer.actualCalls;
            
            // Find the PUT calls (skip login)
            const putCalls = calls.filter((/** @type {any} */ c) => c.method === 'PUT');
            expect(putCalls.length).toBe(2);
            
            // First PUT should have all_day=1
            const put1 = putCalls[0];
            expect(put1.url).toBe('https://ridewithgps.com/events/444070');
            const payload1 = JSON.parse(put1.options.payload);
            expect(payload1.all_day).toBe('1');
            
            // Second PUT should have all_day=0
            const put2 = putCalls[1];
            expect(put2.url).toBe('https://ridewithgps.com/events/444070');
            const payload2 = JSON.parse(put2.options.payload);
            expect(payload2.all_day).toBe('0');
        });

        it('should convert organizers to organizer_tokens', () => {
            RWGPSMockServer.loadFixture('edit');

            const eventUrl = 'https://ridewithgps.com/events/444070';
            const eventData = {
                name: 'Test Event',
                desc: 'Test',
                starts_at: '2030-03-01T19:00:00.000Z',
                organizers: [{ id: 498406 }, { id: 123456 }]
            };
            
            client.editEvent(eventUrl, eventData);

            const calls = RWGPSMockServer.actualCalls;
            const putCalls = calls.filter((/** @type {any} */ c) => c.method === 'PUT');
            const payload = JSON.parse(putCalls[0].options.payload);
            expect(payload.organizer_tokens).toEqual(['498406', '123456']);
        });

        it('should convert routes to route_ids', () => {
            RWGPSMockServer.loadFixture('edit');

            const eventUrl = 'https://ridewithgps.com/events/444070';
            const eventData = {
                name: 'Test Event',
                desc: 'Test',
                starts_at: '2030-03-01T19:00:00.000Z',
                routes: [{ id: 50969472 }]
            };
            
            client.editEvent(eventUrl, eventData);

            const calls = RWGPSMockServer.actualCalls;
            const putCalls = calls.filter((/** @type {any} */ c) => c.method === 'PUT');
            const payload = JSON.parse(putCalls[0].options.payload);
            expect(payload.route_ids).toEqual(['50969472']);
        });

        it('should return error if login fails', () => {
            // Don't load fixture - login will fail
            const eventUrl = 'https://ridewithgps.com/events/12345';
            const eventData = { name: 'Test' };
            
            const result = client.editEvent(eventUrl, eventData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Login');
        });

        it('should return error for invalid event URL', () => {
            RWGPSMockServer.loadFixture('edit');
            
            const eventData = { name: 'Test' };
            const result = client.editEvent('invalid-url', eventData);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid event URL');
        });

        it('should include session cookie in both PUT requests', () => {
            RWGPSMockServer.loadFixture('edit');

            const eventUrl = 'https://ridewithgps.com/events/444070';
            const eventData = {
                name: 'Test Event',
                starts_at: '2030-03-01T19:00:00.000Z'
            };
            
            client.editEvent(eventUrl, eventData);

            const calls = RWGPSMockServer.actualCalls;
            const putCalls = calls.filter((/** @type {any} */ c) => c.method === 'PUT');
            
            expect(putCalls[0].options.headers.Cookie).toBeDefined();
            expect(putCalls[0].options.headers.Cookie).toContain('_rwgps_3_session=');
            expect(putCalls[1].options.headers.Cookie).toBeDefined();
            expect(putCalls[1].options.headers.Cookie).toContain('_rwgps_3_session=');
        });
    });
});
