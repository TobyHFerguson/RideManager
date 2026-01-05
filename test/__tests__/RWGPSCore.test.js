// @ts-check
/**
 * Tests for RWGPSCore - Pure JavaScript business logic for RWGPS operations
 * 
 * This module contains NO GAS API calls - only pure logic that can be tested in Jest.
 * All HTTP interactions are mocked.
 */

const RWGPSCore = require('../../src/RWGPSCore');

describe('RWGPSCore', () => {
    describe('extractEventId', () => {
        it('should extract ID from standard event URL', () => {
            const url = 'https://ridewithgps.com/events/403834-copied-event';
            expect(RWGPSCore.extractEventId(url)).toBe('403834');
        });

        it('should extract ID from URL without slug', () => {
            const url = 'https://ridewithgps.com/events/12345';
            expect(RWGPSCore.extractEventId(url)).toBe('12345');
        });

        it('should throw error for invalid URL', () => {
            expect(() => RWGPSCore.extractEventId('')).toThrow('URL is required');
            expect(() => RWGPSCore.extractEventId(null)).toThrow('URL is required');
        });

        it('should return null for URL without ID', () => {
            const url = 'https://ridewithgps.com/events/';
            expect(RWGPSCore.extractEventId(url)).toBeNull();
        });
    });

    describe('extractRouteId', () => {
        it('should extract ID from standard route URL', () => {
            const url = 'https://ridewithgps.com/routes/12345';
            expect(RWGPSCore.extractRouteId(url)).toBe('12345');
        });

        it('should extract ID from route URL with slug', () => {
            const url = 'https://ridewithgps.com/routes/54321-my-route';
            expect(RWGPSCore.extractRouteId(url)).toBe('54321');
        });

        it('should throw error for invalid URL', () => {
            expect(() => RWGPSCore.extractRouteId('')).toThrow('URL is required');
            expect(() => RWGPSCore.extractRouteId(null)).toThrow('URL is required');
        });
    });

    describe('isPublicEventUrl', () => {
        it('should validate correct event URLs', () => {
            expect(RWGPSCore.isPublicEventUrl('https://ridewithgps.com/events/403834')).toBe(true);
            expect(RWGPSCore.isPublicEventUrl('https://ridewithgps.com/events/403834-event-name')).toBe(true);
        });

        it('should reject invalid event URLs', () => {
            expect(RWGPSCore.isPublicEventUrl('https://ridewithgps.com/events/403834/')).toBe(false);
            expect(RWGPSCore.isPublicEventUrl('https://ridewithgps.com/routes/403834')).toBe(false);
            expect(RWGPSCore.isPublicEventUrl('')).toBe(false);
        });

        it('should throw error for null/undefined', () => {
            expect(() => RWGPSCore.isPublicEventUrl(null)).toThrow('URL is required');
            expect(() => RWGPSCore.isPublicEventUrl(undefined)).toThrow('URL is required');
        });
    });

    describe('isPublicRouteUrl', () => {
        it('should validate correct route URLs', () => {
            expect(RWGPSCore.isPublicRouteUrl('https://ridewithgps.com/routes/12345')).toBe(true);
        });

        it('should reject invalid route URLs', () => {
            expect(RWGPSCore.isPublicRouteUrl('https://ridewithgps.com/routes/12345-slug')).toBe(false);
            expect(RWGPSCore.isPublicRouteUrl('https://ridewithgps.com/events/12345')).toBe(false);
            expect(RWGPSCore.isPublicRouteUrl('')).toBe(false);
        });

        it('should throw error for null/undefined', () => {
            expect(() => RWGPSCore.isPublicRouteUrl(null)).toThrow('URL is required');
        });
    });

    describe('prepareEventPayload', () => {
        it('should filter event to canonical fields only', () => {
            const event = {
                name: 'Test Event',
                desc: 'Description',
                extraField: 'should be removed',
                all_day: 1,
                starts_at: '2026-01-15T10:00:00Z'
            };

            const payload = RWGPSCore.prepareEventPayload(event);

            expect(payload).toHaveProperty('name', 'Test Event');
            expect(payload).toHaveProperty('desc', 'Description');
            expect(payload).toHaveProperty('all_day', 1);
            expect(payload).toHaveProperty('starts_at', '2026-01-15T10:00:00Z');
            expect(payload).not.toHaveProperty('extraField');
        });

        it('should handle minimal event object', () => {
            const event = { name: 'Minimal Event' };
            const payload = RWGPSCore.prepareEventPayload(event);
            expect(payload).toHaveProperty('name', 'Minimal Event');
            expect(Object.keys(payload).length).toBe(1);
        });

        it('should throw error for invalid event', () => {
            expect(() => RWGPSCore.prepareEventPayload(null)).toThrow('Event object is required');
            expect(() => RWGPSCore.prepareEventPayload(undefined)).toThrow('Event object is required');
        });
    });

    describe('prepareAllDayWorkaround', () => {
        it('should add all_day: "1" to event', () => {
            const event = { name: 'Test', desc: 'Description' };
            const result = RWGPSCore.prepareAllDayWorkaround(event);
            expect(result).toEqual({ name: 'Test', desc: 'Description', all_day: '1' });
        });

        it('should override existing all_day value', () => {
            const event = { name: 'Test', all_day: 0 };
            const result = RWGPSCore.prepareAllDayWorkaround(event);
            expect(result).toEqual({ name: 'Test', all_day: '1' });
        });

        it('should not mutate original event', () => {
            const event = { name: 'Test' };
            const result = RWGPSCore.prepareAllDayWorkaround(event);
            expect(event).not.toHaveProperty('all_day');
            expect(result).toHaveProperty('all_day', '1');
        });
    });

    describe('parseEventFromResponse', () => {
        it('should extract event from response JSON', () => {
            const responseText = JSON.stringify({
                event: {
                    name: 'Test Event',
                    id: 12345,
                    desc: 'Description'
                }
            });

            const event = RWGPSCore.parseEventFromResponse(responseText);
            expect(event).toEqual({
                name: 'Test Event',
                id: 12345,
                desc: 'Description'
            });
        });

        it('should handle malformed JSON', () => {
            expect(() => RWGPSCore.parseEventFromResponse('not json')).toThrow();
        });

        it('should handle missing event property', () => {
            const responseText = JSON.stringify({ data: 'no event here' });
            const event = RWGPSCore.parseEventFromResponse(responseText);
            expect(event).toBeUndefined();
        });
    });

    describe('buildCopyTemplatePayload', () => {
        it('should create payload with default values', () => {
            const payload = RWGPSCore.buildCopyTemplatePayload();
            expect(payload).toEqual({
                'event[name]': 'COPIED EVENT',
                'event[all_day]': '0',
                'event[copy_routes]': '0',
                'event[start_date]': '',
                'event[start_time]': ''
            });
        });

        it('should accept custom event name', () => {
            const payload = RWGPSCore.buildCopyTemplatePayload('My Custom Event');
            expect(payload['event[name]']).toBe('My Custom Event');
        });
    });

    describe('extractLocationFromHeaders', () => {
        it('should extract and trim location from headers', () => {
            const headers = {
                'Location': 'https://ridewithgps.com/events/12345-event-name'
            };
            const url = RWGPSCore.extractLocationFromHeaders(headers);
            expect(url).toBe('https://ridewithgps.com/events/12345');
        });

        it('should handle location without slug', () => {
            const headers = {
                'Location': 'https://ridewithgps.com/events/67890'
            };
            const url = RWGPSCore.extractLocationFromHeaders(headers);
            expect(url).toBe('https://ridewithgps.com/events/67890');
        });

        it('should throw error if Location header missing', () => {
            expect(() => RWGPSCore.extractLocationFromHeaders({})).toThrow('Location header not found');
        });
    });

    describe('prepareRouteImportPayload', () => {
        it('should create payload with all fields', () => {
            const route = {
                url: 'https://ridewithgps.com/routes/12345',
                name: 'Test Route',
                expiry: '12/31/2026',
                tags: ['tag1', 'tag2']
            };

            const payload = RWGPSCore.prepareRouteImportPayload(route);

            expect(payload).toEqual({
                user_id: 621846,
                asset_type: 'route',
                privacy_code: null,
                include_photos: false,
                url: 'https://ridewithgps.com/routes/12345',
                name: 'Test Route',
                expiry: '12/31/2026',
                tags: ['tag1', 'tag2']
            });
        });

        it('should work with minimal route object', () => {
            const route = {
                url: 'https://ridewithgps.com/routes/99999'
            };

            const payload = RWGPSCore.prepareRouteImportPayload(route);

            expect(payload).toMatchObject({
                user_id: 621846,
                asset_type: 'route',
                privacy_code: null,
                include_photos: false,
                url: 'https://ridewithgps.com/routes/99999'
            });
        });

        it('should throw error for invalid route', () => {
            expect(() => RWGPSCore.prepareRouteImportPayload(null)).toThrow('Route object is required');
            expect(() => RWGPSCore.prepareRouteImportPayload({})).toThrow('Invalid foreign route URL');
        });
    });

    describe('parseImportRouteResponse', () => {
        it('should extract URL from successful response', () => {
            const responseText = JSON.stringify({
                success: true,
                url: 'https://ridewithgps.com/routes/54321'
            });

            const result = RWGPSCore.parseImportRouteResponse(responseText);
            expect(result).toEqual({
                success: true,
                url: 'https://ridewithgps.com/routes/54321'
            });
        });

        it('should handle failed response', () => {
            const responseText = JSON.stringify({
                success: false,
                error: 'Route not found'
            });

            const result = RWGPSCore.parseImportRouteResponse(responseText);
            expect(result.success).toBe(false);
            expect(result.error).toBe('Route not found');
        });
    });

    describe('normalizeRideLeaderName', () => {
        it('should normalize name to lowercase without spaces', () => {
            expect(RWGPSCore.normalizeRideLeaderName('John Doe')).toBe('johndoe');
            expect(RWGPSCore.normalizeRideLeaderName('Jane   Smith')).toBe('janesmith');
        });

        it('should handle single names', () => {
            expect(RWGPSCore.normalizeRideLeaderName('Madonna')).toBe('madonna');
        });

        it('should handle empty string', () => {
            expect(RWGPSCore.normalizeRideLeaderName('')).toBe('');
        });
    });

    describe('findOrganizerByName', () => {
        const organizers = [
            { id: 1, text: 'John Doe' },
            { id: 2, text: 'Jane Smith' },
            { id: 3, text: 'Bob Wilson' }
        ];

        it('should find organizer by exact normalized name', () => {
            const result = RWGPSCore.findOrganizerByName('john doe', organizers);
            expect(result).toEqual({ id: 1, text: 'John Doe' });
        });

        it('should ignore spacing differences', () => {
            const result = RWGPSCore.findOrganizerByName('jane   smith', organizers);
            expect(result).toEqual({ id: 2, text: 'Jane Smith' });
        });

        it('should return null for non-existent name', () => {
            const result = RWGPSCore.findOrganizerByName('unknown person', organizers);
            expect(result).toBeNull();
        });

        it('should handle empty organizers list', () => {
            const result = RWGPSCore.findOrganizerByName('john doe', []);
            expect(result).toBeNull();
        });
    });

    describe('createTBDOrganizer', () => {
        it('should create TBD organizer with provided name', () => {
            const result = RWGPSCore.createTBDOrganizer('Unknown Leader', 999);
            expect(result).toEqual({
                id: 999,
                text: 'Unknown Leader'
            });
        });
    });

    describe('parseOrganizersResponse', () => {
        it('should extract organizers from response', () => {
            const responseText = JSON.stringify({
                results: [
                    { id: 1, text: 'John Doe' },
                    { id: 2, text: 'Jane Smith' }
                ]
            });

            const organizers = RWGPSCore.parseOrganizersResponse(responseText);
            expect(organizers).toEqual([
                { id: 1, text: 'John Doe' },
                { id: 2, text: 'Jane Smith' }
            ]);
        });

        it('should handle empty results', () => {
            const responseText = JSON.stringify({ results: [] });
            const organizers = RWGPSCore.parseOrganizersResponse(responseText);
            expect(organizers).toEqual([]);
        });
    });

    describe('buildTagPayload', () => {
        it('should build payload for single event and tag', () => {
            const payload = RWGPSCore.buildTagPayload('12345', 'template', 'remove', 'event');
            expect(payload).toEqual({
                tag_action: 'remove',
                tag_names: 'template',
                event_ids: '12345'
            });
        });

        it('should build payload for multiple events', () => {
            const payload = RWGPSCore.buildTagPayload(['123', '456'], ['tag1', 'tag2'], 'add', 'event');
            expect(payload).toEqual({
                tag_action: 'add',
                tag_names: 'tag1,tag2',
                event_ids: '123,456'
            });
        });

        it('should build payload for routes', () => {
            const payload = RWGPSCore.buildTagPayload('789', 'mytag', 'add', 'route');
            expect(payload).toEqual({
                tag_action: 'add',
                tag_names: 'mytag',
                route_ids: '789'
            });
        });

        it('should throw error for invalid tag_action', () => {
            expect(() => RWGPSCore.buildTagPayload('123', 'tag', 'invalid', 'event'))
                .toThrow('Invalid tag_action');
        });

        it('should throw error for invalid resource', () => {
            expect(() => RWGPSCore.buildTagPayload('123', 'tag', 'add', 'invalid'))
                .toThrow('Invalid resource');
        });
    });

    describe('buildDeleteRequestsForEvents', () => {
        it('should create delete requests for single event URL', () => {
            const urls = ['https://ridewithgps.com/events/12345-event'];
            const requests = RWGPSCore.buildDeleteRequestsForEvents(urls);

            expect(requests).toEqual([{
                url: 'https://ridewithgps.com/api/v1/events/12345.json',
                method: 'delete'
            }]);
        });

        it('should create delete requests for multiple event URLs', () => {
            const urls = [
                'https://ridewithgps.com/events/111',
                'https://ridewithgps.com/events/222-event'
            ];
            const requests = RWGPSCore.buildDeleteRequestsForEvents(urls);

            expect(requests).toHaveLength(2);
            expect(requests[0]).toEqual({
                url: 'https://ridewithgps.com/api/v1/events/111.json',
                method: 'delete'
            });
            expect(requests[1]).toEqual({
                url: 'https://ridewithgps.com/api/v1/events/222.json',
                method: 'delete'
            });
        });

        it('should throw error for invalid event URL', () => {
            const urls = ['https://ridewithgps.com/routes/12345'];
            expect(() => RWGPSCore.buildDeleteRequestsForEvents(urls))
                .toThrow('Invalid public event URL');
        });
    });
});
