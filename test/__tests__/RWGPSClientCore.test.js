/**
 * RWGPSClientCore.test.js
 * 
 * Tests for pure JavaScript business logic (no GAS dependencies)
 */

const RWGPSClientCore = require('../../src/rwgpslib/RWGPSClientCore');

describe('RWGPSClientCore', () => {
    describe('parseEventUrl', () => {
        it('should parse standard event URL', () => {
            const url = 'https://ridewithgps.com/events/12345';
            const result = RWGPSClientCore.parseEventUrl(url);
            
            expect(result.eventId).toBe('12345');
            expect(result.fullUrl).toBe(url);
        });

        it('should handle URL with trailing slash', () => {
            const url = 'https://ridewithgps.com/events/12345/';
            const result = RWGPSClientCore.parseEventUrl(url);
            
            expect(result.eventId).toBe('12345');
        });

        it('should throw on invalid URL', () => {
            expect(() => {
                RWGPSClientCore.parseEventUrl('not-a-url');
            }).toThrow();
        });

        it('should throw on non-string input', () => {
            expect(() => {
                RWGPSClientCore.parseEventUrl(null);
            }).toThrow('Invalid event URL: must be a non-empty string');
        });

        it('should throw on empty string', () => {
            expect(() => {
                RWGPSClientCore.parseEventUrl('');
            }).toThrow('Invalid event URL: must be a non-empty string');
        });
    });

    describe('extractEventId', () => {
        it('should extract ID from standard URL', () => {
            const id = RWGPSClientCore.extractEventId('https://ridewithgps.com/events/12345');
            expect(id).toBe('12345');
        });

        it('should extract ID from URL with query params', () => {
            const id = RWGPSClientCore.extractEventId('https://ridewithgps.com/events/12345?foo=bar');
            expect(id).toBe('12345');
        });

        it('should return null for non-event URL', () => {
            const id = RWGPSClientCore.extractEventId('https://ridewithgps.com/routes/12345');
            expect(id).toBeNull();
        });

        it('should return null for null input', () => {
            const id = RWGPSClientCore.extractEventId(null);
            expect(id).toBeNull();
        });

        it('should return null for empty string', () => {
            const id = RWGPSClientCore.extractEventId('');
            expect(id).toBeNull();
        });
    });

    describe('buildRequestOptions', () => {
        it('should build GET request options', () => {
            const options = RWGPSClientCore.buildRequestOptions('get');
            
            expect(options.method).toBe('get');
            expect(options.muteHttpExceptions).toBe(true);
            expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
            expect(options.payload).toBeUndefined();
        });

        it('should build POST request with payload', () => {
            const payload = { name: 'Test Event' };
            const options = RWGPSClientCore.buildRequestOptions('post', payload);
            
            expect(options.method).toBe('post');
            expect(options.payload).toBe(JSON.stringify(payload));
        });

        it('should merge additional headers', () => {
            const options = RWGPSClientCore.buildRequestOptions('get', null, {
                'Authorization': 'Basic abc123'
            });
            
            expect(options.headers['Content-Type']).toBe('application/json');
            expect(options.headers['Authorization']).toBe('Basic abc123');
        });
    });

    describe('buildBasicAuthHeader', () => {
        it('should build Basic Auth header', () => {
            const header = RWGPSClientCore.buildBasicAuthHeader('mykey', 'mytoken');
            
            // Should be Base64 encoded "mykey:mytoken"
            expect(header).toMatch(/^Basic /);
            expect(header).toBe('Basic ' + Buffer.from('mykey:mytoken').toString('base64'));
        });
    });

    describe('validateEventData', () => {
        it('should validate complete event data', () => {
            const eventData = {
                name: 'Test Ride',
                starts_at: '2026-01-15T09:00:00',
                route_id: '12345'
            };
            
            const result = RWGPSClientCore.validateEventData(eventData);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject event without name', () => {
            const eventData = {
                starts_at: '2026-01-15T09:00:00'
            };
            
            const result = RWGPSClientCore.validateEventData(eventData);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Event name is required');
        });

        it('should reject event without start time', () => {
            const eventData = {
                name: 'Test Ride'
            };
            
            const result = RWGPSClientCore.validateEventData(eventData);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Start time is required');
        });

        it('should allow missing route_id (for cancelled events)', () => {
            const eventData = {
                name: 'CANCELLED: Test Ride',
                starts_at: '2026-01-15T09:00:00'
            };
            
            const result = RWGPSClientCore.validateEventData(eventData);
            
            expect(result.valid).toBe(true);
        });
    });
});
