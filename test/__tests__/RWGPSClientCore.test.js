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

    describe('extractRouteId', () => {
        it('should extract route ID from URL', () => {
            const id = RWGPSClientCore.extractRouteId('https://ridewithgps.com/routes/53253553');
            expect(id).toBe('53253553');
        });

        it('should extract route ID from URL with slug', () => {
            const id = RWGPSClientCore.extractRouteId('https://ridewithgps.com/routes/53253553-some-route-name');
            expect(id).toBe('53253553');
        });

        it('should return null for invalid URL', () => {
            expect(RWGPSClientCore.extractRouteId('invalid-url')).toBeNull();
            expect(RWGPSClientCore.extractRouteId('')).toBeNull();
            expect(RWGPSClientCore.extractRouteId(null)).toBeNull();
        });

        it('should return null for event URL', () => {
            const id = RWGPSClientCore.extractRouteId('https://ridewithgps.com/events/444070');
            expect(id).toBeNull();
        });
    });

    describe('buildRouteCopyOptions', () => {
        it('should build route copy options with minimal data', () => {
            const sessionCookie = 'test-cookie';
            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = { userId: 621846 };

            const options = RWGPSClientCore.buildRouteCopyOptions(sessionCookie, routeUrl, routeData);

            expect(options.method).toBe('POST');
            expect(options.headers.Cookie).toBe('test-cookie');
            expect(options.contentType).toBe('application/json');
            expect(options.muteHttpExceptions).toBe(true);

            const payload = JSON.parse(options.payload);
            expect(payload.user_id).toBe(621846);
            expect(payload.asset_type).toBe('route');
            expect(payload.privacy_code).toBeNull();
            expect(payload.include_photos).toBe(false);
            expect(payload.url).toBe(routeUrl);
        });

        it('should build route copy options with all optional fields', () => {
            const sessionCookie = 'test-cookie';
            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = {
                userId: 621846,
                name: 'My Route',
                expiry: '1/31/2030',
                tags: ['B', 'Club']
            };

            const options = RWGPSClientCore.buildRouteCopyOptions(sessionCookie, routeUrl, routeData);

            const payload = JSON.parse(options.payload);
            expect(payload.name).toBe('My Route');
            expect(payload.expiry).toBe('1/31/2030');
            expect(payload.tags).toEqual(['B', 'Club']);
        });

        it('should not include optional fields when not provided', () => {
            const sessionCookie = 'test-cookie';
            const routeUrl = 'https://ridewithgps.com/routes/53253553';
            const routeData = { userId: 621846 };

            const options = RWGPSClientCore.buildRouteCopyOptions(sessionCookie, routeUrl, routeData);

            const payload = JSON.parse(options.payload);
            expect(payload.name).toBeUndefined();
            expect(payload.expiry).toBeUndefined();
            expect(payload.tags).toBeUndefined();
        });
    });

    describe('buildRouteTagOptions', () => {
        it('should build route tag options', () => {
            const sessionCookie = 'test-cookie';
            const routeId = '53715433';
            const tags = ['B', 'Club'];

            const options = RWGPSClientCore.buildRouteTagOptions(sessionCookie, routeId, tags);

            expect(options.method).toBe('POST');
            expect(options.headers.Cookie).toBe('test-cookie');
            expect(options.muteHttpExceptions).toBe(true);
            expect(options.payload.tag_action).toBe('add');
            expect(options.payload.tag_names).toBe('B,Club');
            expect(options.payload.route_ids).toBe('53715433');
        });

        it('should handle single tag', () => {
            const options = RWGPSClientCore.buildRouteTagOptions('cookie', '12345', ['B']);
            
            expect(options.payload.tag_names).toBe('B');
        });

        it('should handle empty tags array', () => {
            const options = RWGPSClientCore.buildRouteTagOptions('cookie', '12345', []);
            
            expect(options.payload.tag_names).toBe('');
        });
    });

    describe('buildV1EditEventPayload', () => {
        it('should build payload with event wrapper', () => {
            const eventData = {
                name: 'Test Event',
                description: 'Test description',
                start_date: '2030-03-01',
                start_time: '11:00'
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, '0');

            expect(payload.event).toBeDefined();
            expect(payload.event.name).toBe('Test Event');
            expect(payload.event.description).toBe('Test description');
            expect(payload.event.start_date).toBe('2030-03-01');
            expect(payload.event.start_time).toBe('11:00');
            expect(payload.event.all_day).toBe('0');
        });

        it('should convert organizer_ids to strings', () => {
            const eventData = {
                name: 'Test',
                organizer_ids: [123, 456, '789']
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, '0');

            expect(payload.event.organizer_ids).toEqual(['123', '456', '789']);
        });

        it('should convert route_ids to strings', () => {
            const eventData = {
                name: 'Test',
                route_ids: [50969472, '12345678']
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, '0');

            expect(payload.event.route_ids).toEqual(['50969472', '12345678']);
        });

        it('should set all_day flag', () => {
            const eventData = { name: 'Test' };

            const payload1 = RWGPSClientCore.buildV1EditEventPayload(eventData, '1');
            expect(payload1.event.all_day).toBe('1');

            const payload0 = RWGPSClientCore.buildV1EditEventPayload(eventData, '0');
            expect(payload0.event.all_day).toBe('0');
        });

        it('should include optional fields when provided', () => {
            const eventData = {
                name: 'Test',
                location: 'Test Location',
                time_zone: 'America/Los_Angeles',
                visibility: 'public'
            };

            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, '0');

            expect(payload.event.location).toBe('Test Location');
            expect(payload.event.time_zone).toBe('America/Los_Angeles');
            expect(payload.event.visibility).toBe('public');
        });
    });

    describe('buildV1EditEventOptions', () => {
        it('should build PUT request options with Basic Auth', () => {
            const basicAuth = 'Basic dGVzdDp0ZXN0';
            const payload = { event: { name: 'Test' } };

            const options = RWGPSClientCore.buildV1EditEventOptions(basicAuth, payload);

            expect(options.method).toBe('PUT');
            expect(options.headers.Authorization).toBe(basicAuth);
            expect(options.headers['Content-Type']).toBe('application/json');
            expect(options.headers.Accept).toBe('application/json');
            expect(options.payload).toBe(JSON.stringify(payload));
            expect(options.muteHttpExceptions).toBe(true);
        });
    });

    describe('buildV1CreateEventOptions', () => {
        it('should build POST request options with Basic Auth', () => {
            const basicAuth = 'Basic dGVzdDp0ZXN0';
            const payload = { event: { name: 'Test' } };

            const options = RWGPSClientCore.buildV1CreateEventOptions(basicAuth, payload);

            expect(options.method).toBe('POST');
            expect(options.headers.Authorization).toBe(basicAuth);
            expect(options.headers['Content-Type']).toBe('application/json');
            expect(options.headers.Accept).toBe('application/json');
            expect(options.payload).toBe(JSON.stringify(payload));
            expect(options.muteHttpExceptions).toBe(true);
        });
    });
});
