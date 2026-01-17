/**
 * TDD Tests for Cancel operation - RWGPSClientCore.buildV1EditEventPayload
 * 
 * The cancel flow:
 * 1. RWGPSClient.getEvent() → returns web format (starts_at, desc via _transformV1ToWebFormat)
 * 2. cancelEvent spreads this + modifies name → passes to editEvent
 * 3. editEvent → RWGPSClientCore.buildV1EditEventPayload → must transform back to v1 format
 * 
 * The fix: buildV1EditEventPayload must handle web format aliases:
 * - desc → description
 * - starts_at → start_date + start_time
 */

const RWGPSClientCore = require('../../src/rwgpslib/RWGPSClientCore');

describe('RWGPSClientCore.buildV1EditEventPayload - web format aliases', () => {
    
    it('should handle desc field (web format alias for description)', () => {
        const eventData = {
            name: 'Test Event',
            desc: 'This is the description from web format'
        };
        
        const result = RWGPSClientCore.buildV1EditEventPayload(eventData, '0');
        
        expect(result.event.description).toBe('This is the description from web format');
    });
    
    it('should prefer description over desc when both present', () => {
        const eventData = {
            name: 'Test Event',
            description: 'Explicit description',
            desc: 'Web format desc (should be ignored)'
        };
        
        const result = RWGPSClientCore.buildV1EditEventPayload(eventData, '0');
        
        expect(result.event.description).toBe('Explicit description');
    });
    
    it('should handle starts_at field (web format) → start_date + start_time', () => {
        const eventData = {
            name: 'Test Event',
            starts_at: '2025-01-18T10:00:00-08:00'
        };
        
        const result = RWGPSClientCore.buildV1EditEventPayload(eventData, '0');
        
        expect(result.event.start_date).toBe('2025-01-18');
        expect(result.event.start_time).toBe('10:00');
    });
    
    it('should prefer start_date/start_time over starts_at when both present', () => {
        const eventData = {
            name: 'Test Event',
            start_date: '2025-03-01',
            start_time: '09:30',
            starts_at: '2025-01-18T10:00:00-08:00' // should be ignored
        };
        
        const result = RWGPSClientCore.buildV1EditEventPayload(eventData, '0');
        
        expect(result.event.start_date).toBe('2025-03-01');
        expect(result.event.start_time).toBe('09:30');
    });
    
    it('should handle full web format event (as returned by getEvent + _transformV1ToWebFormat)', () => {
        // This simulates the exact event object that cancelEvent receives
        // after getEvent() + _transformV1ToWebFormat()
        const webFormatEvent = {
            id: 123456,
            name: 'CANCELLED: Test Event',
            description: 'Event description',
            desc: 'Event description', // alias added by _transformV1ToWebFormat
            start_date: '2025-01-18',
            start_time: '10:00',
            starts_at: '2025-01-18T10:00:00-08:00', // added by _transformV1ToWebFormat
            visibility: 'public',
            organizer_ids: ['111', '222'],
            route_ids: ['333'],
            location: 'Test Location'
        };
        
        const result = RWGPSClientCore.buildV1EditEventPayload(webFormatEvent, '0');
        
        // Should produce valid v1 API payload
        expect(result.event.name).toBe('CANCELLED: Test Event');
        expect(result.event.description).toBe('Event description');
        expect(result.event.start_date).toBe('2025-01-18');
        expect(result.event.start_time).toBe('10:00');
        expect(result.event.visibility).toBe('public');
        expect(result.event.organizer_ids).toEqual(['111', '222']);
        expect(result.event.route_ids).toEqual(['333']);
        expect(result.event.location).toBe('Test Location');
        expect(result.event.all_day).toBe('0');
    });
});
