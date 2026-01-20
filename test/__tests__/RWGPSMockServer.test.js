/**
 * Tests for RWGPSMockServer
 * 
 * Verifies the mock server correctly loads fixtures and replays API responses.
 */

const { RWGPSMockServer, mockUrlFetchApp, MockHTTPResponse } = require('../mocks/RWGPSMockServer');

describe('RWGPSMockServer', () => {
    beforeEach(() => {
        RWGPSMockServer.reset();
    });

    describe('loadFixture', () => {
        it('loads schedule fixture successfully', () => {
            expect(() => RWGPSMockServer.loadFixture('schedule')).not.toThrow();
            expect(RWGPSMockServer.expectedCalls.length).toBe(6);
        });

        it('loads all fixture files', () => {
            const fixtures = ['schedule', 'update', 'cancel', 'reinstate', 'unschedule', 'import-route'];
            for (const name of fixtures) {
                RWGPSMockServer.reset();
                expect(() => RWGPSMockServer.loadFixture(name)).not.toThrow();
                expect(RWGPSMockServer.expectedCalls.length).toBeGreaterThan(0);
            }
        });

        it('throws for non-existent fixture', () => {
            expect(() => RWGPSMockServer.loadFixture('nonexistent')).toThrow();
        });
    });

    describe('loadFixtures (multiple)', () => {
        it('combines fixtures for sequence testing', () => {
            RWGPSMockServer.loadFixtures(['schedule', 'cancel']);
            // schedule has 6 calls, cancel has 3 (v1 API - no login)
            expect(RWGPSMockServer.expectedCalls.length).toBe(9);
        });
    });

    describe('fetch in strict mode', () => {
        beforeEach(() => {
            RWGPSMockServer.loadFixture('unschedule');
        });

        it('returns correct response for delete', () => {
            // unschedule fixture now has only DELETE (no login)
            const response = mockUrlFetchApp.fetch(
                'https://ridewithgps.com/api/v1/events/444070.json',
                { method: 'DELETE' }
            );
            
            expect(response.getResponseCode()).toBe(204);
            expect(response.getContentText()).toBe(''); // Empty response for 204
        });

        it('throws on unexpected extra call', () => {
            // unschedule fixture now has only DELETE (no login)
            mockUrlFetchApp.fetch('https://ridewithgps.com/api/v1/events/444070.json', { method: 'DELETE' });
            
            expect(() => {
                mockUrlFetchApp.fetch('https://ridewithgps.com/extra', { method: 'GET' });
            }).toThrow(/Unexpected API call/);
        });

        it('throws on wrong URL', () => {
            expect(() => {
                mockUrlFetchApp.fetch('https://ridewithgps.com/wrong-url', { method: 'DELETE' });
            }).toThrow(/URL mismatch/);
        });

        it('throws on wrong method', () => {
            expect(() => {
                mockUrlFetchApp.fetch('https://ridewithgps.com/api/v1/events/444070.json', { method: 'GET' });
            }).toThrow(/Method mismatch/);
        });
    });

    describe('URL matching', () => {
        beforeEach(() => {
            RWGPSMockServer.loadFixture('schedule');
        });

        it('matches URLs with different event IDs', () => {
            // Skip login
            mockUrlFetchApp.fetch('https://ridewithgps.com/organizations/47/sign_in', { method: 'POST' });
            
            // copy_template - uses different event ID in URL
            const response = mockUrlFetchApp.fetch(
                'https://ridewithgps.com/events/404019-b-template/copy',
                { method: 'POST' }
            );
            
            expect(response.getResponseCode()).toBe(302);
        });
    });

    describe('verify', () => {
        beforeEach(() => {
            RWGPSMockServer.loadFixture('unschedule');
        });

        it('passes when all calls made', () => {
            // unschedule fixture now has only DELETE (no login)
            mockUrlFetchApp.fetch('https://ridewithgps.com/api/v1/events/444070.json', { method: 'DELETE' });
            
            expect(() => RWGPSMockServer.verify()).not.toThrow();
        });

        it('fails when calls missing', () => {
            // Make no calls - should fail since fixture expects DELETE
            
            expect(() => RWGPSMockServer.verify()).toThrow(/Not all expected API calls were made/);
        });
    });

    describe('getSummary', () => {
        it('returns summary of actual calls', () => {
            RWGPSMockServer.loadFixture('unschedule');
            // unschedule fixture now has only DELETE (no login)
            mockUrlFetchApp.fetch('https://ridewithgps.com/api/v1/events/444070.json', { method: 'DELETE' });
            
            const summary = RWGPSMockServer.getSummary();
            expect(summary).toContain('DELETE');
            expect(summary).toContain('444070');
        });
    });
});

describe('MockHTTPResponse', () => {
    it('returns status code', () => {
        const response = new MockHTTPResponse(200, { data: 'test' });
        expect(response.getResponseCode()).toBe(200);
    });

    it('returns JSON response as string', () => {
        const response = new MockHTTPResponse(200, { data: 'test' });
        expect(response.getContentText()).toBe('{"data":"test"}');
    });

    it('returns string response as-is', () => {
        const response = new MockHTTPResponse(200, 'plain text');
        expect(response.getContentText()).toBe('plain text');
    });

    it('returns headers', () => {
        const response = new MockHTTPResponse(302, '', { Location: 'https://example.com' });
        expect(response.getAllHeaders()).toEqual({ Location: 'https://example.com' });
    });

    it('gets header case-insensitively', () => {
        const response = new MockHTTPResponse(302, '', { Location: 'https://example.com' });
        expect(response.getHeader('location')).toBe('https://example.com');
        expect(response.getHeader('LOCATION')).toBe('https://example.com');
    });
});
