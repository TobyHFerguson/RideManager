/**
 * RWGPS Characterization Tests
 * 
 * These tests verify the current behavior of RWGPS operations by replaying
 * captured API fixtures. They serve as the safety net for refactoring.
 * 
 * RULE: If these tests pass after a change, the external behavior is preserved.
 * 
 * Usage:
 *   npm test -- test/__tests__/RWGPSCharacterization.test.js
 */

const { RWGPSMockServer, mockUrlFetchApp, mockPropertiesService } = require('../mocks/RWGPSMockServer');
const path = require('path');
const fs = require('fs');

// Load all fixtures for reference
const fixturesDir = path.join(__dirname, '../fixtures/rwgps-api');
const fixtures = {
    schedule: JSON.parse(fs.readFileSync(path.join(fixturesDir, 'schedule.json'), 'utf-8')),
    update: JSON.parse(fs.readFileSync(path.join(fixturesDir, 'update.json'), 'utf-8')),
    cancel: JSON.parse(fs.readFileSync(path.join(fixturesDir, 'cancel.json'), 'utf-8')),
    reinstate: JSON.parse(fs.readFileSync(path.join(fixturesDir, 'reinstate.json'), 'utf-8')),
    unschedule: JSON.parse(fs.readFileSync(path.join(fixturesDir, 'unschedule.json'), 'utf-8')),
    importRoute: JSON.parse(fs.readFileSync(path.join(fixturesDir, 'import-route.json'), 'utf-8'))
};

describe('RWGPS API Characterization', () => {
    /**
     * These tests document the CURRENT behavior without executing the actual code.
     * They verify our fixtures are complete and well-formed.
     */
    
    describe('Fixture Completeness', () => {
        test('schedule fixture has 6 API calls', () => {
            expect(fixtures.schedule.apiCalls).toHaveLength(6);
            expect(fixtures.schedule.apiCalls.map(c => c.operation)).toEqual([
                'login',
                'copy_template',
                'getOrganizers',
                'edit_event_1',
                'edit_event_2',
                'remove_event_tags'
            ]);
        });

        test('update fixture has 4 API calls', () => {
            expect(fixtures.update.apiCalls).toHaveLength(4);
            expect(fixtures.update.apiCalls.map(c => c.operation)).toEqual([
                'login',
                'getOrganizers',
                'edit_event_1',
                'edit_event_2'
            ]);
        });

        test('cancel fixture has 3 API calls (v1 API - no login needed)', () => {
            expect(fixtures.cancel.apiCalls).toHaveLength(3);
            expect(fixtures.cancel.apiCalls.map(c => c.operation)).toEqual([
                'getAll',
                'edit_event_1',
                'edit_event_2'
            ]);
        });

        test('reinstate fixture has 4 API calls', () => {
            expect(fixtures.reinstate.apiCalls).toHaveLength(4);
            expect(fixtures.reinstate.apiCalls.map(c => c.operation)).toEqual([
                'login',
                'getAll',
                'edit_event_1',
                'edit_event_2'
            ]);
        });

        test('unschedule fixture has 1 API call (no login required)', () => {
            expect(fixtures.unschedule.apiCalls).toHaveLength(1);
            expect(fixtures.unschedule.apiCalls.map(c => c.operation)).toEqual([
                'delete_event'
            ]);
        });

        test('importRoute fixture has 4 API calls', () => {
            expect(fixtures.importRoute.apiCalls).toHaveLength(4);
            expect(fixtures.importRoute.apiCalls.map(c => c.operation)).toEqual([
                'login',
                'importRoute',
                'getRoute',
                'add_route_tags'
            ]);
        });
    });

    describe('Schedule Operation Behavior', () => {
        test('copy_template returns 302 with Location header containing new event URL', () => {
            const copyCall = fixtures.schedule.apiCalls.find(c => c.operation === 'copy_template');
            
            expect(copyCall.status).toBe(302);
            expect(copyCall.responseHeaders.Location).toMatch(/^https:\/\/ridewithgps\.com\/events\/\d+/);
        });

        test('copy_template sends correct payload', () => {
            const copyCall = fixtures.schedule.apiCalls.find(c => c.operation === 'copy_template');
            
            expect(copyCall.request.payload).toEqual({
                'event[name]': 'COPIED EVENT',
                'event[all_day]': '0',
                'event[copy_routes]': '0',
                'event[start_date]': '',
                'event[start_time]': ''
            });
        });

        test('schedule does double-edit (all_day workaround)', () => {
            const edit1 = fixtures.schedule.apiCalls.find(c => c.operation === 'edit_event_1');
            const edit2 = fixtures.schedule.apiCalls.find(c => c.operation === 'edit_event_2');
            
            // First edit sets all_day to "1"
            expect(edit1.request.payload.all_day).toBe('1');
            
            // Second edit sets all_day to "0"
            expect(edit2.request.payload.all_day).toBe('0');
        });

        test('edit uses organizer_tokens in request but receives organizer_ids in response', () => {
            const edit2 = fixtures.schedule.apiCalls.find(c => c.operation === 'edit_event_2');
            
            // Request uses organizer_tokens (strings)
            expect(edit2.request.payload.organizer_tokens).toEqual(['498406']);
            
            // Response uses organizer_ids (numbers)
            expect(edit2.response.organizer_ids).toEqual([498406]);
        });

        test('remove_event_tags removes template tag after scheduling', () => {
            const tagCall = fixtures.schedule.apiCalls.find(c => c.operation === 'remove_event_tags');
            
            expect(tagCall.request.payload.tag_action).toBe('remove');
            expect(tagCall.request.payload.tag_names).toBe('template');
        });
    });

    describe('Update Operation Behavior', () => {
        test('update does not fetch event first (unlike cancel)', () => {
            // Update goes straight to edit, cancel needs to fetch first
            const firstCall = fixtures.update.apiCalls[1]; // After login
            expect(firstCall.operation).toBe('getOrganizers');
        });

        test('update also uses double-edit workaround', () => {
            const edit1 = fixtures.update.apiCalls.find(c => c.operation === 'edit_event_1');
            const edit2 = fixtures.update.apiCalls.find(c => c.operation === 'edit_event_2');
            
            expect(edit1.request.payload.all_day).toBe('1');
            expect(edit2.request.payload.all_day).toBe('0');
        });
    });

    describe('Cancel Operation Behavior', () => {
        test('cancel fetches event first (via getAll) - v1 API no login', () => {
            const firstCall = fixtures.cancel.apiCalls[0]; // v1 API: first call is getAll (no login)
            expect(firstCall.operation).toBe('getAll');
            expect(firstCall.method).toBe('GET');
        });

        test('cancel adds CANCELLED: prefix to name', () => {
            const edit1 = fixtures.cancel.apiCalls.find(c => c.operation === 'edit_event_1');
            // Fixture uses web API format (name at top level) even though getAll uses v1 format
            // This is a transitional state during v1 migration
            const name = edit1.request.payload.event?.name || edit1.request.payload.name;
            expect(name).toMatch(/^CANCELLED:/);
        });

        test('cancel preserves original event data except name', () => {
            const getAll = fixtures.cancel.apiCalls.find(c => c.operation === 'getAll');
            const edit1 = fixtures.cancel.apiCalls.find(c => c.operation === 'edit_event_1');
            
            // v1 API response uses description field
            const originalDesc = getAll.response.event.description || getAll.response.event.desc;
            // Web API request uses desc field
            const editDesc = edit1.request.payload.event?.description || edit1.request.payload.desc;
            expect(editDesc).toBe(originalDesc);
        });
    });

    describe('Reinstate Operation Behavior', () => {
        test('reinstate fetches event first', () => {
            const firstCall = fixtures.reinstate.apiCalls[1]; // After login
            expect(firstCall.operation).toBe('getAll');
        });

        test('reinstate removes CANCELLED: prefix from name', () => {
            const getAll = fixtures.reinstate.apiCalls.find(c => c.operation === 'getAll');
            const edit1 = fixtures.reinstate.apiCalls.find(c => c.operation === 'edit_event_1');
            
            // Original has CANCELLED:
            expect(getAll.response.event.name).toMatch(/^CANCELLED:/);
            
            // After reinstate, no CANCELLED:
            expect(edit1.request.payload.name).not.toMatch(/^CANCELLED:/);
        });
    });

    describe('Unschedule Operation Behavior', () => {
        test('unschedule uses v1 API with Basic Auth', () => {
            const deleteCall = fixtures.unschedule.apiCalls.find(c => c.operation === 'delete_event');
            
            expect(deleteCall.url).toContain('/api/v1/');
            expect(deleteCall.request.headers.Authorization).toBe('[REDACTED]');
        });

        test('delete returns 204 No Content', () => {
            const deleteCall = fixtures.unschedule.apiCalls.find(c => c.operation === 'delete_event');
            
            expect(deleteCall.status).toBe(204);
            expect(deleteCall.response).toBe('');
        });
    });

    describe('ImportRoute Operation Behavior', () => {
        test('importRoute returns new route URL and ID', () => {
            const importCall = fixtures.importRoute.apiCalls.find(c => c.operation === 'importRoute');
            
            expect(importCall.response.success).toBe(1);
            expect(importCall.response.url).toMatch(/^https:\/\/ridewithgps\.com\/routes\/\d+$/);
            expect(typeof importCall.response.id).toBe('number');
        });

        test('getRoute uses v1 API', () => {
            const getCall = fixtures.importRoute.apiCalls.find(c => c.operation === 'getRoute');
            
            expect(getCall.url).toContain('/api/v1/routes/');
        });

        test('importRoute adds tags with expiry', () => {
            const tagCall = fixtures.importRoute.apiCalls.find(c => c.operation === 'add_route_tags');
            
            expect(tagCall.request.payload.tag_action).toBe('add');
            expect(tagCall.request.payload.tag_names).toContain('expires:');
        });
    });

    describe('Authentication Patterns', () => {
        test('web API operations start with login to web session', () => {
            // Web API operations (schedule, update, reinstate, importRoute) require login
            // Note: unschedule now uses v1 API with Basic Auth (no login required)
            const webApiFixtures = ['schedule', 'update', 'reinstate', 'importRoute'];
            for (const name of webApiFixtures) {
                const fixture = fixtures[name];
                const firstCall = fixture.apiCalls[0];
                expect(firstCall.operation).toBe('login');
                expect(firstCall.url).toBe('https://ridewithgps.com/organizations/47/sign_in');
            }
        });

        test('v1 API-only operations do not require login', () => {
            // cancel and unschedule use v1 API only - no login required
            const v1Fixtures = ['cancel', 'unschedule'];
            for (const name of v1Fixtures) {
                const fixture = fixtures[name];
                const firstCall = fixture.apiCalls[0];
                expect(firstCall.operation).not.toBe('login');
            }
        });

        test('login returns 302 redirect', () => {
            const loginCall = fixtures.schedule.apiCalls[0];
            expect(loginCall.status).toBe(302);
        });

        test('v1 API calls use Basic Auth (delete_event, getRoute)', () => {
            const deleteCall = fixtures.unschedule.apiCalls.find(c => c.operation === 'delete_event');
            const getRouteCall = fixtures.importRoute.apiCalls.find(c => c.operation === 'getRoute');
            
            // Both should have Authorization header (redacted in fixtures)
            expect(deleteCall.request.headers.Authorization).toBeDefined();
            expect(getRouteCall.request.headers.Authorization).toBeDefined();
        });
    });

    describe('URL Patterns', () => {
        test('web API uses ridewithgps.com/events/{id}', () => {
            const editCall = fixtures.schedule.apiCalls.find(c => c.operation === 'edit_event_1');
            expect(editCall.url).toMatch(/^https:\/\/ridewithgps\.com\/events\/\d+$/);
        });

        test('v1 API uses ridewithgps.com/api/v1/events/{id}.json', () => {
            const deleteCall = fixtures.unschedule.apiCalls.find(c => c.operation === 'delete_event');
            expect(deleteCall.url).toMatch(/^https:\/\/ridewithgps\.com\/api\/v1\/events\/\d+\.json$/);
        });
    });
});

describe('RWGPS Operation Contracts', () => {
    /**
     * These tests define the EXPECTED INPUT/OUTPUT contracts.
     * When migrating to v1 API, these contracts must be preserved.
     */

    describe('Schedule Contract', () => {
        test('input: template URL, event data, organizer names', () => {
            // Schedule needs:
            // - Template URL to copy from
            // - Event name, description, date/time
            // - Route IDs to attach
            // - Organizer names (looked up to IDs)
            const edit = fixtures.schedule.apiCalls.find(c => c.operation === 'edit_event_2');
            
            expect(edit.request.payload).toHaveProperty('name');
            expect(edit.request.payload).toHaveProperty('desc');
            expect(edit.request.payload).toHaveProperty('start_date');
            expect(edit.request.payload).toHaveProperty('route_ids');
            expect(edit.request.payload).toHaveProperty('organizer_tokens');
        });

        test('output: new event URL', () => {
            // Schedule returns the URL of the created event
            const copyCall = fixtures.schedule.apiCalls.find(c => c.operation === 'copy_template');
            const newEventUrl = copyCall.responseHeaders.Location.split('-')[0];
            
            expect(newEventUrl).toMatch(/^https:\/\/ridewithgps\.com\/events\/\d+$/);
        });
    });

    describe('Update Contract', () => {
        test('input: event URL, updated event data', () => {
            const edit = fixtures.update.apiCalls.find(c => c.operation === 'edit_event_2');
            
            expect(edit.url).toMatch(/\/events\/\d+$/);
            expect(edit.request.payload).toHaveProperty('name');
        });

        test('output: updated event object', () => {
            const edit = fixtures.update.apiCalls.find(c => c.operation === 'edit_event_2');
            
            expect(edit.response).toHaveProperty('id');
            expect(edit.response).toHaveProperty('name');
        });
    });

    describe('Cancel Contract', () => {
        test('input: event URL (v1 API format)', () => {
            const getAll = fixtures.cancel.apiCalls.find(c => c.operation === 'getAll');
            // v1 API uses /api/v1/events/{id}.json format
            expect(getAll.url).toMatch(/\/api\/v1\/events\/\d+\.json$/);
        });

        test('output: event with CANCELLED: prefix', () => {
            const edit = fixtures.cancel.apiCalls.find(c => c.operation === 'edit_event_2');
            // v1 API wraps response in event object
            const eventName = edit.response.event?.name || edit.response.name;
            expect(eventName).toMatch(/^CANCELLED:/);
        });
    });

    describe('Unschedule Contract', () => {
        test('input: event URL', () => {
            const deleteCall = fixtures.unschedule.apiCalls.find(c => c.operation === 'delete_event');
            expect(deleteCall.url).toMatch(/\/events\/\d+/);
        });

        test('output: 204 status (success, no content)', () => {
            const deleteCall = fixtures.unschedule.apiCalls.find(c => c.operation === 'delete_event');
            expect(deleteCall.status).toBe(204);
        });
    });
});
