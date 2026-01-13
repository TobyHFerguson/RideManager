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

    describe('buildOrganizerLookupOptions', () => {
        it('should build organizer lookup request options', () => {
            const options = RWGPSClientCore.buildOrganizerLookupOptions('test-cookie', 'John Doe');
            
            expect(options.method).toBe('POST');
            expect(options.headers.Cookie).toBe('test-cookie');
            expect(options.payload.term).toBe('John'); // Uses first name only
            expect(options.payload.page).toBe(1);
        });

        it('should use first word of name as search term', () => {
            const options = RWGPSClientCore.buildOrganizerLookupOptions('cookie', 'Albert Saporta');
            
            expect(options.payload.term).toBe('Albert');
        });

        it('should handle single-word names', () => {
            const options = RWGPSClientCore.buildOrganizerLookupOptions('cookie', 'Madonna');
            
            expect(options.payload.term).toBe('Madonna');
        });
    });

    describe('findMatchingOrganizer', () => {
        it('should find exact match', () => {
            const results = [
                { id: 498406, text: 'Albert Saporta' },
                { id: 123456, text: 'Albert Einstein' }
            ];
            
            const match = RWGPSClientCore.findMatchingOrganizer(results, 'Albert Saporta');
            
            expect(match).toEqual({ id: 498406, text: 'Albert Saporta' });
        });

        it('should match case-insensitively', () => {
            const results = [
                { id: 498406, text: 'Albert Saporta' }
            ];
            
            const match = RWGPSClientCore.findMatchingOrganizer(results, 'albert saporta');
            
            expect(match).toEqual({ id: 498406, text: 'Albert Saporta' });
        });

        it('should ignore whitespace differences', () => {
            const results = [
                { id: 498406, text: 'Albert  Saporta' }
            ];
            
            const match = RWGPSClientCore.findMatchingOrganizer(results, 'Albert Saporta');
            
            expect(match).toEqual({ id: 498406, text: 'Albert  Saporta' });
        });

        it('should return null when no match found', () => {
            const results = [
                { id: 123456, text: 'John Doe' }
            ];
            
            const match = RWGPSClientCore.findMatchingOrganizer(results, 'Jane Smith');
            
            expect(match).toBeNull();
        });

        it('should return null for empty results', () => {
            const match = RWGPSClientCore.findMatchingOrganizer([], 'John Doe');
            
            expect(match).toBeNull();
        });

        it('should return null for null results', () => {
            const match = RWGPSClientCore.findMatchingOrganizer(null, 'John Doe');
            
            expect(match).toBeNull();
        });
    });

    describe('buildBatchTagOptions', () => {
        it('should build tag removal options', () => {
            const options = RWGPSClientCore.buildBatchTagOptions('test-cookie', '444070', 'remove', 'template');
            
            expect(options.method).toBe('POST');
            expect(options.headers.Cookie).toBe('test-cookie');
            expect(options.payload.tag_action).toBe('remove');
            expect(options.payload.tag_names).toBe('template');
            expect(options.payload.event_ids).toBe('444070');
        });

        it('should handle array of event IDs', () => {
            const options = RWGPSClientCore.buildBatchTagOptions('cookie', ['444070', '444071'], 'add', 'B');
            
            expect(options.payload.event_ids).toBe('444070,444071');
        });

        it('should handle array of tag names', () => {
            const options = RWGPSClientCore.buildBatchTagOptions('cookie', '444070', 'remove', ['template', 'draft']);
            
            expect(options.payload.tag_names).toBe('template,draft');
        });
    });
});
