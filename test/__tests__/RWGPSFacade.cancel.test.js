/**
 * TDD Tests for RWGPSFacade cancel operation
 * 
 * The cancel operation should:
 * 1. Accept SCCCCEvent with API-style fields (desc, organizer_tokens, etc.)
 * 2. Transform to RWGPS v1 API format
 * 3. Send the update successfully
 * 
 * These tests are written FIRST (TDD) to specify expected behavior.
 */

const RWGPSCore = require('../../src/rwgpslib/RWGPSCore');

describe('RWGPSFacade cancel operation - TDD', () => {
    describe('_transformEventInput should handle SCCCCEvent fields', () => {
        
        // The transformer needs to handle BOTH naming conventions:
        // - Domain style: description, organizer_ids, routeUrls
        // - SCCCCEvent style: desc, organizer_tokens, route_ids
        
        it('should transform SCCCCEvent-style "desc" field to API description', () => {
            // SCCCCEvent uses "desc", API uses "description"
            const input = {
                name: 'CANCELLED: Sat A (1/15 10:00) Some Ride',
                desc: 'This is the description'
            };
            
            // We need a way to test _transformEventInput
            // For now, test RWGPSCore.buildEditEventPayload which should handle this
            const payload = RWGPSCore.buildEditEventPayload(input);
            
            expect(payload.event.name).toBe('CANCELLED: Sat A (1/15 10:00) Some Ride');
            expect(payload.event.description).toBe('This is the description');
        });
        
        it('should transform SCCCCEvent-style "organizer_tokens" to API organizer_ids', () => {
            const input = {
                name: 'CANCELLED: Sat A (1/15 10:00) Some Ride',
                organizer_tokens: ['123', '456']
            };
            
            const payload = RWGPSCore.buildEditEventPayload(input);
            
            expect(payload.event.organizer_ids).toEqual(['123', '456']);
        });
        
        it('should transform SCCCCEvent-style "route_ids" directly', () => {
            const input = {
                name: 'CANCELLED: Sat A (1/15 10:00) Some Ride',
                route_ids: ['789']
            };
            
            const payload = RWGPSCore.buildEditEventPayload(input);
            
            expect(payload.event.route_ids).toEqual(['789']);
        });
        
        it('should handle startDateTime Date object', () => {
            const input = {
                name: 'CANCELLED: Sat A (1/15 10:00) Some Ride',
                startDateTime: new Date('2026-01-15T10:00:00')
            };
            
            const payload = RWGPSCore.buildEditEventPayload(input);
            
            expect(payload.event.start_date).toBe('2026-01-15');
            expect(payload.event.start_time).toBe('10:00');
        });
        
        it('should handle full SCCCCEvent cancel scenario', () => {
            // This is what cancelRow_ passes to edit_event
            const cancelledEvent = {
                all_day: '0',
                auto_expire_participants: '1',
                desc: 'Some description',
                location: 'Start Location',
                name: 'CANCELLED: Sat A (1/15 10:00) Some Ride',
                organizer_tokens: ['123'],
                route_ids: ['456'],
                startDateTime: new Date('2026-01-15T10:00:00'),
                visibility: 0
            };
            
            const payload = RWGPSCore.buildEditEventPayload(cancelledEvent);
            
            // Should have transformed all fields correctly
            expect(payload.event.name).toBe('CANCELLED: Sat A (1/15 10:00) Some Ride');
            expect(payload.event.description).toBe('Some description');
            expect(payload.event.location).toBe('Start Location');
            expect(payload.event.organizer_ids).toEqual(['123']);
            expect(payload.event.route_ids).toEqual(['456']);
            expect(payload.event.start_date).toBe('2026-01-15');
            expect(payload.event.start_time).toBe('10:00');
            expect(payload.event.all_day).toBe('0');
        });
    });
});
