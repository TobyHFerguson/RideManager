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
});
