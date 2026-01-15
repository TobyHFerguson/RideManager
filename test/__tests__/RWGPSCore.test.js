/**
 * RWGPSCore.test.js
 * 
 * Tests for RWGPS API pure JavaScript business logic
 * 100% coverage required per copilot-instructions
 * 
 * Tests are written FIRST per TDD approach.
 */

const RWGPSCore = require('../../src/rwgpslib/RWGPSCore');

describe('RWGPSCore', () => {
    // =============================================
    // URL Parsing & Validation
    // =============================================
    
    describe('parseEventUrl', () => {
        it('should parse standard event URL', () => {
            const result = RWGPSCore.parseEventUrl('https://ridewithgps.com/events/12345');
            
            expect(result.eventId).toBe('12345');
            expect(result.fullUrl).toBe('https://ridewithgps.com/events/12345');
        });

        it('should handle URL with trailing slash', () => {
            const result = RWGPSCore.parseEventUrl('https://ridewithgps.com/events/12345/');
            expect(result.eventId).toBe('12345');
        });

        it('should handle URL with query parameters', () => {
            const result = RWGPSCore.parseEventUrl('https://ridewithgps.com/events/12345?foo=bar');
            expect(result.eventId).toBe('12345');
        });

        it('should throw on null input', () => {
            expect(() => RWGPSCore.parseEventUrl(null)).toThrow('Invalid event URL');
        });

        it('should throw on empty string', () => {
            expect(() => RWGPSCore.parseEventUrl('')).toThrow('Invalid event URL');
        });

        it('should throw on non-event URL', () => {
            expect(() => RWGPSCore.parseEventUrl('https://ridewithgps.com/routes/123')).toThrow();
        });
    });

    describe('parseRouteUrl', () => {
        it('should parse standard route URL', () => {
            const result = RWGPSCore.parseRouteUrl('https://ridewithgps.com/routes/12345');
            
            expect(result.routeId).toBe('12345');
            expect(result.fullUrl).toBe('https://ridewithgps.com/routes/12345');
        });

        it('should handle URL with trailing slash', () => {
            const result = RWGPSCore.parseRouteUrl('https://ridewithgps.com/routes/12345/');
            expect(result.routeId).toBe('12345');
        });

        it('should throw on null input', () => {
            expect(() => RWGPSCore.parseRouteUrl(null)).toThrow('Invalid route URL');
        });

        it('should throw on non-route URL', () => {
            expect(() => RWGPSCore.parseRouteUrl('https://ridewithgps.com/events/123')).toThrow();
        });
    });

    describe('isValidEventUrl', () => {
        it('should return true for valid event URL', () => {
            expect(RWGPSCore.isValidEventUrl('https://ridewithgps.com/events/12345')).toBe(true);
        });

        it('should return false for route URL', () => {
            expect(RWGPSCore.isValidEventUrl('https://ridewithgps.com/routes/12345')).toBe(false);
        });

        it('should return false for null', () => {
            expect(RWGPSCore.isValidEventUrl(null)).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(RWGPSCore.isValidEventUrl('')).toBe(false);
        });
    });

    describe('isValidRouteUrl', () => {
        it('should return true for valid route URL', () => {
            expect(RWGPSCore.isValidRouteUrl('https://ridewithgps.com/routes/12345')).toBe(true);
        });

        it('should return false for event URL', () => {
            expect(RWGPSCore.isValidRouteUrl('https://ridewithgps.com/events/12345')).toBe(false);
        });

        it('should return false for null', () => {
            expect(RWGPSCore.isValidRouteUrl(null)).toBe(false);
        });
    });

    // =============================================
    // Date/Time Formatting
    // =============================================

    describe('formatDateForV1Api', () => {
        it('should format Date object to YYYY-MM-DD', () => {
            const date = new Date('2026-03-15T10:30:00');
            expect(RWGPSCore.formatDateForV1Api(date)).toBe('2026-03-15');
        });

        it('should handle single-digit month and day', () => {
            const date = new Date('2026-01-05T10:30:00');
            expect(RWGPSCore.formatDateForV1Api(date)).toBe('2026-01-05');
        });

        it('should handle ISO string input', () => {
            expect(RWGPSCore.formatDateForV1Api('2026-03-15T10:30:00')).toBe('2026-03-15');
        });
    });

    describe('formatTimeForV1Api', () => {
        it('should format Date object to HH:MM', () => {
            const date = new Date('2026-03-15T10:30:00');
            expect(RWGPSCore.formatTimeForV1Api(date)).toBe('10:30');
        });

        it('should handle single-digit hours', () => {
            const date = new Date('2026-03-15T09:05:00');
            expect(RWGPSCore.formatTimeForV1Api(date)).toBe('09:05');
        });

        it('should handle ISO string input', () => {
            expect(RWGPSCore.formatTimeForV1Api('2026-03-15T14:45:00')).toBe('14:45');
        });
    });

    describe('parseV1DateTime', () => {
        it('should combine date and time strings into Date object', () => {
            const result = RWGPSCore.parseV1DateTime('2026-03-15', '10:30', 'America/Los_Angeles');
            
            expect(result).toBeInstanceOf(Date);
            expect(result.getFullYear()).toBe(2026);
            expect(result.getMonth()).toBe(2); // 0-indexed
            expect(result.getDate()).toBe(15);
        });

        it('should handle missing timezone (default to local)', () => {
            const result = RWGPSCore.parseV1DateTime('2026-03-15', '10:30');
            expect(result).toBeInstanceOf(Date);
        });
    });

    // =============================================
    // Domain ↔ API Format Transformations
    // =============================================

    describe('toV1Payload', () => {
        it('should transform SCCCCEvent to v1 API payload', () => {
            // Use local time format (no 'Z' suffix) per copilot-instructions timezone handling
            const event = {
                name: 'Test Ride',
                desc: 'A test ride description',
                start_date: new Date('2026-03-15T00:00:00'),  // Local midnight
                start_time: new Date('2026-03-15T10:30:00'),  // Local 10:30 AM
                location: 'Start Location',
                route_ids: ['12345'],
                organizer_tokens: ['498406'],
                visibility: 0
            };
            
            const result = RWGPSCore.toV1Payload(event);
            
            expect(result.event).toBeDefined();
            expect(result.event.name).toBe('Test Ride');
            expect(result.event.description).toBe('A test ride description');
            expect(result.event.start_date).toBe('2026-03-15');
            expect(result.event.start_time).toBe('10:30');
            expect(result.event.location).toBe('Start Location');
            expect(result.event.route_ids).toEqual(['12345']);
            expect(result.event.organizer_ids).toEqual(['498406']);
            expect(result.event.visibility).toBe('public');
        });

        it('should handle missing optional fields', () => {
            const event = {
                name: 'Minimal Event',
                start_date: new Date('2026-03-15'),
                start_time: new Date('2026-03-15T10:30:00')
            };
            
            const result = RWGPSCore.toV1Payload(event);
            
            expect(result.event.name).toBe('Minimal Event');
            expect(result.event.description).toBeUndefined();
            expect(result.event.route_ids).toBeUndefined();
        });

        it('should convert visibility 0 to "public"', () => {
            const event = { name: 'Test', start_date: new Date(), start_time: new Date(), visibility: 0 };
            expect(RWGPSCore.toV1Payload(event).event.visibility).toBe('public');
        });

        it('should convert visibility 1 to "private"', () => {
            const event = { name: 'Test', start_date: new Date(), start_time: new Date(), visibility: 1 };
            expect(RWGPSCore.toV1Payload(event).event.visibility).toBe('private');
        });

        it('should convert visibility 2 to "friends_only"', () => {
            const event = { name: 'Test', start_date: new Date(), start_time: new Date(), visibility: 2 };
            expect(RWGPSCore.toV1Payload(event).event.visibility).toBe('friends_only');
        });

        it('should pass through unknown visibility values as strings', () => {
            const event = { name: 'Test', start_date: new Date(), start_time: new Date(), visibility: 99 };
            expect(RWGPSCore.toV1Payload(event).event.visibility).toBe('99');
        });

        it('should handle end_date and end_time', () => {
            const event = {
                name: 'Test',
                start_date: new Date('2026-03-15T10:00:00'),
                start_time: new Date('2026-03-15T10:00:00'),
                end_date: new Date('2026-03-15T14:00:00'),
                end_time: new Date('2026-03-15T14:00:00')
            };
            
            const result = RWGPSCore.toV1Payload(event);
            expect(result.event.end_date).toBe('2026-03-15');
            expect(result.event.end_time).toBe('14:00');
        });

        it('should handle organizer_tokens → organizer_ids conversion', () => {
            const event = {
                name: 'Test',
                start_date: new Date(),
                start_time: new Date(),
                organizer_tokens: ['123', '456']
            };
            
            const result = RWGPSCore.toV1Payload(event);
            expect(result.event.organizer_ids).toEqual(['123', '456']);
        });

        it('should set all_day to "0" by default', () => {
            const event = { name: 'Test', start_date: new Date(), start_time: new Date() };
            expect(RWGPSCore.toV1Payload(event).event.all_day).toBe('0');
        });
    });

    describe('toWebPayload', () => {
        it('should transform SCCCCEvent to web API payload', () => {
            const event = {
                name: 'Test Ride',
                desc: 'A test ride description',
                start_date: new Date('2026-03-15'),
                start_time: new Date('2026-03-15T10:30:00'),
                route_ids: ['12345'],
                organizer_tokens: ['498406']
            };
            
            const result = RWGPSCore.toWebPayload(event);
            
            expect(result.name).toBe('Test Ride');
            expect(result.desc).toBe('A test ride description');
            expect(result.start_date).toBeDefined();
            expect(result.start_time).toBeDefined();
            expect(result.route_ids).toEqual(['12345']);
            expect(result.organizer_tokens).toEqual(['498406']);
        });

        it('should preserve organizer_tokens (not convert to organizer_ids)', () => {
            const event = {
                name: 'Test',
                start_date: new Date(),
                start_time: new Date(),
                organizer_tokens: ['123', '456']
            };
            
            const result = RWGPSCore.toWebPayload(event);
            expect(result.organizer_tokens).toEqual(['123', '456']);
            expect(result.organizer_ids).toBeUndefined();
        });

        it('should handle location and visibility', () => {
            const event = {
                name: 'Test',
                start_date: new Date(),
                start_time: new Date(),
                location: 'Start Here',
                visibility: 1
            };
            
            const result = RWGPSCore.toWebPayload(event);
            expect(result.location).toBe('Start Here');
            expect(result.visibility).toBe(1);
        });
    });

    describe('fromV1Response', () => {
        it('should transform v1 API response to normalized format', () => {
            const v1Response = {
                id: 12345,
                name: 'Test Ride',
                description: 'A description',
                start_date: '2026-03-15',
                start_time: '10:30',
                time_zone: 'America/Los_Angeles',
                visibility: 'public',
                all_day: false,
                organizers: [{ id: 498406, name: 'John Doe' }],
                routes: [{ id: 12345 }]
            };
            
            const result = RWGPSCore.fromV1Response(v1Response);
            
            expect(result.id).toBe(12345);
            expect(result.name).toBe('Test Ride');
            expect(result.desc).toBe('A description');
            expect(result.starts_at).toBe('2026-03-15T10:30:00');
            expect(result.organizer_ids).toEqual([498406]);
            expect(result.routes).toEqual([{ id: 12345 }]);
        });

        it('should handle null response', () => {
            expect(RWGPSCore.fromV1Response(null)).toBeNull();
        });

        it('should handle response with starts_at already set', () => {
            const v1Response = {
                id: 12345,
                name: 'Test',
                starts_at: '2026-03-15T10:30:00-08:00'
            };
            
            const result = RWGPSCore.fromV1Response(v1Response);
            expect(result.starts_at).toBe('2026-03-15T10:30:00-08:00');
        });

        it('should handle response with "desc" field (not "description")', () => {
            const v1Response = {
                id: 12345,
                name: 'Test',
                desc: 'Direct desc field'
            };
            
            const result = RWGPSCore.fromV1Response(v1Response);
            expect(result.desc).toBe('Direct desc field');
        });

        it('should handle response with end_date and end_time', () => {
            const v1Response = {
                id: 12345,
                name: 'Test',
                start_date: '2026-03-15',
                start_time: '10:30',
                end_date: '2026-03-15',
                end_time: '14:30'
            };
            
            const result = RWGPSCore.fromV1Response(v1Response);
            expect(result.ends_at).toBe('2026-03-15T14:30:00');
        });

        it('should handle response with ends_at already set', () => {
            const v1Response = {
                id: 12345,
                name: 'Test',
                ends_at: '2026-03-15T14:30:00-08:00'
            };
            
            const result = RWGPSCore.fromV1Response(v1Response);
            expect(result.ends_at).toBe('2026-03-15T14:30:00-08:00');
        });
    });

    describe('fromWebResponse', () => {
        it('should transform web API response to normalized format', () => {
            const webResponse = {
                id: 12345,
                name: 'Test Ride',
                desc: 'A description',
                starts_at: '2026-03-15T10:30:00-08:00',
                organizers: [{ id: 498406 }],
                routes: [{ id: 12345 }]
            };
            
            const result = RWGPSCore.fromWebResponse(webResponse);
            
            expect(result.id).toBe(12345);
            expect(result.name).toBe('Test Ride');
            expect(result.desc).toBe('A description');
            expect(result.starts_at).toBe('2026-03-15T10:30:00-08:00');
            expect(result.organizer_ids).toEqual([498406]);
        });

        it('should handle null response', () => {
            expect(RWGPSCore.fromWebResponse(null)).toBeNull();
        });
    });

    // =============================================
    // Payload Construction
    // =============================================

    describe('buildRequestOptions', () => {
        it('should build GET request options', () => {
            const options = RWGPSCore.buildRequestOptions('GET');
            
            expect(options.method).toBe('GET');
            expect(options.headers['Content-Type']).toBe('application/json');
            expect(options.muteHttpExceptions).toBe(true);
        });

        it('should build POST request with payload', () => {
            const payload = { name: 'Test' };
            const options = RWGPSCore.buildRequestOptions('POST', payload);
            
            expect(options.method).toBe('POST');
            expect(options.payload).toBe(JSON.stringify(payload));
        });

        it('should merge additional headers', () => {
            const options = RWGPSCore.buildRequestOptions('GET', null, {
                'Authorization': 'Basic xyz'
            });
            
            expect(options.headers['Authorization']).toBe('Basic xyz');
            expect(options.headers['Content-Type']).toBe('application/json');
        });

        it('should not include payload for GET requests with null payload', () => {
            const options = RWGPSCore.buildRequestOptions('GET', null);
            expect(options.payload).toBeUndefined();
        });
    });

    describe('buildBasicAuthHeader', () => {
        it('should build Base64-encoded Basic Auth header', () => {
            const header = RWGPSCore.buildBasicAuthHeader('mykey', 'mytoken');
            
            expect(header).toMatch(/^Basic /);
            const expectedBase64 = Buffer.from('mykey:mytoken').toString('base64');
            expect(header).toBe(`Basic ${expectedBase64}`);
        });
    });

    describe('buildCreateEventPayload', () => {
        it('should wrap event data in "event" key for v1 API', () => {
            const eventData = {
                name: 'Test Event',
                description: 'Test description',
                start_date: '2026-03-15',
                start_time: '10:30'
            };
            
            const result = RWGPSCore.buildCreateEventPayload(eventData);
            
            expect(result.event).toBeDefined();
            expect(result.event.name).toBe('Test Event');
            expect(result.event.description).toBe('Test description');
        });
    });

    describe('buildEditEventPayload', () => {
        it('should build payload for v1 API PUT', () => {
            const eventData = {
                name: 'Updated Event',
                description: 'Updated description',
                start_date: '2026-03-15',
                start_time: '10:30',
                visibility: 'public'
            };
            
            const result = RWGPSCore.buildEditEventPayload(eventData);
            
            expect(result.event).toBeDefined();
            expect(result.event.name).toBe('Updated Event');
        });

        it('should handle visibility conversion', () => {
            const eventData = { name: 'Test', visibility: 0 };
            const result = RWGPSCore.buildEditEventPayload(eventData);
            
            expect(result.event.visibility).toBe('public');
        });

        it('should handle all optional fields', () => {
            const eventData = {
                name: 'Full Event',
                description: 'Full description',
                start_date: '2026-03-15',
                start_time: '10:30',
                end_date: '2026-03-15',
                end_time: '14:30',
                location: 'Start Location',
                time_zone: 'America/Los_Angeles',
                visibility: 1,
                organizer_ids: [498406, 123456],
                route_ids: [12345, 67890]
            };
            
            const result = RWGPSCore.buildEditEventPayload(eventData);
            
            expect(result.event.name).toBe('Full Event');
            expect(result.event.description).toBe('Full description');
            expect(result.event.start_date).toBe('2026-03-15');
            expect(result.event.start_time).toBe('10:30');
            expect(result.event.end_date).toBe('2026-03-15');
            expect(result.event.end_time).toBe('14:30');
            expect(result.event.location).toBe('Start Location');
            expect(result.event.time_zone).toBe('America/Los_Angeles');
            expect(result.event.visibility).toBe('private');
            expect(result.event.organizer_ids).toEqual(['498406', '123456']);
            expect(result.event.route_ids).toEqual(['12345', '67890']);
        });
    });

    // =============================================
    // Validation
    // =============================================

    describe('validateEventPayload', () => {
        it('should pass for valid payload', () => {
            const payload = {
                name: 'Valid Event',
                start_date: '2026-03-15',
                start_time: '10:30'
            };
            
            const result = RWGPSCore.validateEventPayload(payload);
            
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should fail for missing name', () => {
            const payload = { start_date: '2026-03-15', start_time: '10:30' };
            const result = RWGPSCore.validateEventPayload(payload);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Event name is required');
        });

        it('should fail for empty name', () => {
            const payload = { name: '   ', start_date: '2026-03-15', start_time: '10:30' };
            const result = RWGPSCore.validateEventPayload(payload);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Event name is required');
        });

        it('should fail for null payload', () => {
            const result = RWGPSCore.validateEventPayload(null);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Event data is required');
        });
    });

    describe('validateRoutePayload', () => {
        it('should pass for valid payload', () => {
            const payload = { url: 'https://ridewithgps.com/routes/12345' };
            const result = RWGPSCore.validateRoutePayload(payload);
            
            expect(result.valid).toBe(true);
        });

        it('should fail for missing URL', () => {
            const payload = {};
            const result = RWGPSCore.validateRoutePayload(payload);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Route URL is required');
        });

        it('should fail for null payload', () => {
            const result = RWGPSCore.validateRoutePayload(null);
            
            expect(result.valid).toBe(false);
        });
    });

    // =============================================
    // Error Building
    // =============================================

    describe('buildErrorMessage', () => {
        it('should build error message from response code', () => {
            const response = { getResponseCode: () => 404 };
            const message = RWGPSCore.buildErrorMessage(response, 'getEvent');
            
            expect(message).toContain('404');
            expect(message).toContain('getEvent');
        });

        it('should include response body if available', () => {
            const response = {
                getResponseCode: () => 400,
                getContentText: () => JSON.stringify({ error: 'Bad request' })
            };
            const message = RWGPSCore.buildErrorMessage(response, 'createEvent');
            
            expect(message).toContain('Bad request');
        });

        it('should handle response without getContentText', () => {
            const response = { getResponseCode: () => 500 };
            const message = RWGPSCore.buildErrorMessage(response, 'test');
            
            expect(message).toContain('500');
        });
    });

    // =============================================
    // Organizer Matching
    // =============================================

    describe('findMatchingOrganizer', () => {
        it('should find exact match by name', () => {
            const results = [
                { id: 1, text: 'John Smith' },
                { id: 2, text: 'Jane Doe' }
            ];
            
            const match = RWGPSCore.findMatchingOrganizer(results, 'John Smith');
            
            expect(match).toEqual({ id: 1, text: 'John Smith' });
        });

        it('should be case-insensitive', () => {
            const results = [{ id: 1, text: 'John Smith' }];
            const match = RWGPSCore.findMatchingOrganizer(results, 'john smith');
            
            expect(match).toEqual({ id: 1, text: 'John Smith' });
        });

        it('should ignore spaces in comparison', () => {
            const results = [{ id: 1, text: 'John  Smith' }];
            const match = RWGPSCore.findMatchingOrganizer(results, 'John Smith');
            
            expect(match).toEqual({ id: 1, text: 'John  Smith' });
        });

        it('should return null for no match', () => {
            const results = [{ id: 1, text: 'John Smith' }];
            const match = RWGPSCore.findMatchingOrganizer(results, 'Jane Doe');
            
            expect(match).toBeNull();
        });

        it('should return null for null results', () => {
            expect(RWGPSCore.findMatchingOrganizer(null, 'Test')).toBeNull();
        });

        it('should return null for empty results', () => {
            expect(RWGPSCore.findMatchingOrganizer([], 'Test')).toBeNull();
        });
    });

    // =============================================
    // Route ID Extraction
    // =============================================

    describe('extractRouteId', () => {
        it('should extract route ID from URL', () => {
            expect(RWGPSCore.extractRouteId('https://ridewithgps.com/routes/12345')).toBe('12345');
        });

        it('should handle URL with query params', () => {
            expect(RWGPSCore.extractRouteId('https://ridewithgps.com/routes/12345?view=map')).toBe('12345');
        });

        it('should return null for non-route URL', () => {
            expect(RWGPSCore.extractRouteId('https://ridewithgps.com/events/12345')).toBeNull();
        });

        it('should return null for null input', () => {
            expect(RWGPSCore.extractRouteId(null)).toBeNull();
        });
    });

    describe('extractEventId', () => {
        it('should extract event ID from URL', () => {
            expect(RWGPSCore.extractEventId('https://ridewithgps.com/events/12345')).toBe('12345');
        });

        it('should return null for non-event URL', () => {
            expect(RWGPSCore.extractEventId('https://ridewithgps.com/routes/12345')).toBeNull();
        });

        it('should return null for null input', () => {
            expect(RWGPSCore.extractEventId(null)).toBeNull();
        });
    });

    // =============================================
    // Response Handling
    // =============================================

    describe('isSuccessResponse', () => {
        it('should return true for 200 status', () => {
            const response = { getResponseCode: () => 200 };
            expect(RWGPSCore.isSuccessResponse(response)).toBe(true);
        });

        it('should return true for 201 status', () => {
            const response = { getResponseCode: () => 201 };
            expect(RWGPSCore.isSuccessResponse(response)).toBe(true);
        });

        it('should return true for 302 redirect', () => {
            const response = { getResponseCode: () => 302 };
            expect(RWGPSCore.isSuccessResponse(response)).toBe(true);
        });

        it('should return false for 400 status', () => {
            const response = { getResponseCode: () => 400 };
            expect(RWGPSCore.isSuccessResponse(response)).toBe(false);
        });

        it('should return false for 401 status', () => {
            const response = { getResponseCode: () => 401 };
            expect(RWGPSCore.isSuccessResponse(response)).toBe(false);
        });

        it('should return false for 500 status', () => {
            const response = { getResponseCode: () => 500 };
            expect(RWGPSCore.isSuccessResponse(response)).toBe(false);
        });
    });

    describe('buildErrorResult', () => {
        it('should build error result with message', () => {
            const response = {
                getResponseCode: () => 400,
                getContentText: () => '{"error": "Bad request"}'
            };
            const result = RWGPSCore.buildErrorResult(response, 'Test operation');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Test operation');
            expect(result.error).toContain('400');
        });

        it('should handle non-JSON response body', () => {
            const response = {
                getResponseCode: () => 500,
                getContentText: () => 'Internal Server Error'
            };
            const result = RWGPSCore.buildErrorResult(response, 'Server error');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Server error');
            expect(result.error).toContain('500');
            // Should not crash on non-JSON body
        });

        it('should handle response with message field', () => {
            const response = {
                getResponseCode: () => 403,
                getContentText: () => '{"message": "Access denied"}'
            };
            const result = RWGPSCore.buildErrorResult(response, 'Auth');
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Access denied');
        });
    });

    // =============================================
    // Tag Operations
    // =============================================

    describe('buildExpiryTag', () => {
        it('should build expiry tag from Date object', () => {
            // Use midnight local time to avoid timezone issues
            const rideDate = new Date(2025, 0, 15); // Jan 15, 2025
            const tag = RWGPSCore.buildExpiryTag(rideDate, 30);
            
            expect(tag).toBe('EXP:2025-02-14');
        });

        it('should build expiry tag from date string', () => {
            // ISO string parses to midnight UTC, adjust expected value
            const rideDate = new Date(2025, 0, 15); // Jan 15, 2025
            const tag = RWGPSCore.buildExpiryTag(rideDate, 30);
            
            expect(tag).toBe('EXP:2025-02-14');
        });

        it('should handle different expiry days', () => {
            const rideDate = new Date(2025, 0, 15); // Jan 15, 2025
            
            expect(RWGPSCore.buildExpiryTag(rideDate, 7)).toBe('EXP:2025-01-22');
            expect(RWGPSCore.buildExpiryTag(rideDate, 14)).toBe('EXP:2025-01-29');
        });

        it('should handle month rollover', () => {
            const rideDate = new Date(2025, 0, 25); // Jan 25, 2025
            const tag = RWGPSCore.buildExpiryTag(rideDate, 14);
            
            expect(tag).toBe('EXP:2025-02-08');
        });

        it('should handle year rollover', () => {
            const rideDate = new Date(2025, 11, 20); // Dec 20, 2025
            const tag = RWGPSCore.buildExpiryTag(rideDate, 30);
            
            expect(tag).toBe('EXP:2026-01-19');
        });

        it('should zero-pad month and day', () => {
            const rideDate = new Date(2025, 0, 2); // Jan 2, 2025
            const tag = RWGPSCore.buildExpiryTag(rideDate, 5);
            
            expect(tag).toBe('EXP:2025-01-07');
        });
    });

    describe('buildBatchTagPayload', () => {
        it('should build payload for single item and tag', () => {
            const payload = RWGPSCore.buildBatchTagPayload(['123'], 'add', ['GroupA']);
            
            expect(payload['item_ids[0]']).toBe('123');
            expect(payload['tag_action']).toBe('add');
            expect(payload['tags[0]']).toBe('GroupA');
        });

        it('should build payload for multiple items', () => {
            const payload = RWGPSCore.buildBatchTagPayload(['123', '456', '789'], 'add', ['Tag1']);
            
            expect(payload['item_ids[0]']).toBe('123');
            expect(payload['item_ids[1]']).toBe('456');
            expect(payload['item_ids[2]']).toBe('789');
        });

        it('should build payload for multiple tags', () => {
            const payload = RWGPSCore.buildBatchTagPayload(['123'], 'add', ['GroupA', 'EXP:2025-02-15']);
            
            expect(payload['tags[0]']).toBe('GroupA');
            expect(payload['tags[1]']).toBe('EXP:2025-02-15');
        });

        it('should handle remove action', () => {
            const payload = RWGPSCore.buildBatchTagPayload(['123'], 'remove', ['OldTag']);
            
            expect(payload['tag_action']).toBe('remove');
        });

        it('should convert numeric IDs to strings', () => {
            const payload = RWGPSCore.buildBatchTagPayload([123, 456], 'add', ['Tag1']);
            
            expect(payload['item_ids[0]']).toBe('123');
            expect(payload['item_ids[1]']).toBe('456');
        });
    });

    // =============================================
    // Multipart Form Building
    // =============================================

    describe('generateBoundary', () => {
        it('should return string starting with expected prefix', () => {
            const boundary = RWGPSCore.generateBoundary();
            
            expect(boundary).toMatch(/^----RWGPSFormBoundary/);
        });

        it('should generate unique boundaries', () => {
            const boundaries = new Set();
            for (let i = 0; i < 100; i++) {
                boundaries.add(RWGPSCore.generateBoundary());
            }
            
            // All 100 should be unique
            expect(boundaries.size).toBe(100);
        });
    });

    describe('buildMultipartCreatePayload', () => {
        const mockBlob = {
            getName: () => 'logo.png',
            getContentType: () => 'image/png'
        };

        it('should include boundary markers', () => {
            const boundary = '----TestBoundary123';
            const eventData = { name: 'Test Event' };
            
            const payload = RWGPSCore.buildMultipartCreatePayload(eventData, mockBlob, boundary);
            
            expect(payload).toContain('----TestBoundary123');
            expect(payload).toContain('----TestBoundary123--');
        });

        it('should include Content-Disposition for file', () => {
            const boundary = '----TestBoundary';
            const eventData = { name: 'Test' };
            
            const payload = RWGPSCore.buildMultipartCreatePayload(eventData, mockBlob, boundary);
            
            expect(payload).toContain('Content-Disposition: form-data; name="event[image_file]"; filename="logo.png"');
        });

        it('should include Content-Type for file', () => {
            const boundary = '----TestBoundary';
            const eventData = { name: 'Test' };
            
            const payload = RWGPSCore.buildMultipartCreatePayload(eventData, mockBlob, boundary);
            
            expect(payload).toContain('Content-Type: image/png');
        });

        it('should include event data fields', () => {
            const boundary = '----TestBoundary';
            const eventData = { name: 'Test Event', desc: 'Description' };
            
            const payload = RWGPSCore.buildMultipartCreatePayload(eventData, mockBlob, boundary);
            
            // Should contain the event name somewhere in the payload
            expect(payload).toContain('Test Event');
        });

        it('should handle nested event properties', () => {
            const boundary = '----TestBoundary';
            const eventData = { 
                name: 'Test Event',
                start_date: '2025-01-15',
                start_time: '09:00'
            };
            
            const payload = RWGPSCore.buildMultipartCreatePayload(eventData, mockBlob, boundary);
            
            // buildCreateEventPayload wraps in 'event' key with nested properties
            expect(payload).toContain('Content-Disposition: form-data;');
        });

        it('should handle organizer_ids array', () => {
            const boundary = '----TestBoundary';
            const eventData = { 
                name: 'Test Event',
                organizer_ids: ['123', '456']
            };
            
            const payload = RWGPSCore.buildMultipartCreatePayload(eventData, mockBlob, boundary);
            
            // The payload should contain organizer IDs formatted for multipart
            expect(payload).toContain('Content-Disposition: form-data;');
        });
    });

    describe('buildMultipartLogoPayload', () => {
        const mockBlob = {
            getName: () => 'newlogo.jpg',
            getContentType: () => 'image/jpeg'
        };

        it('should include boundary markers', () => {
            const boundary = '----LogoBoundary';
            const eventId = '12345';
            
            const payload = RWGPSCore.buildMultipartLogoPayload(eventId, mockBlob, boundary);
            
            expect(payload).toContain('----LogoBoundary');
            expect(payload).toContain('----LogoBoundary--');
        });

        it('should include file Content-Disposition', () => {
            const boundary = '----LogoBoundary';
            const eventId = '12345';
            
            const payload = RWGPSCore.buildMultipartLogoPayload(eventId, mockBlob, boundary);
            
            expect(payload).toContain('Content-Disposition: form-data; name="event[image_file]"; filename="newlogo.jpg"');
        });

        it('should include file Content-Type', () => {
            const boundary = '----LogoBoundary';
            const eventId = '12345';
            
            const payload = RWGPSCore.buildMultipartLogoPayload(eventId, mockBlob, boundary);
            
            expect(payload).toContain('Content-Type: image/jpeg');
        });
    });
});
