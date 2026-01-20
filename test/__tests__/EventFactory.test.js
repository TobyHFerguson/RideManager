// Mock the entire Groups module
jest.mock('../../src/Groups', () => ({
  getGroupNames: jest.fn(() => ['A', 'B', 'C', 'D']),
  getGroupSpecs: jest.fn(() => ({
    A: { Template: 'Template A', MIN_LENGTH: 10 },
    B: { Template: 'Template B', MIN_LENGTH: 15 }
  })) // Mock other functions if needed
}));

jest.mock('../../src/Globals', () => ({
  getGlobals: jest.fn(() => ({
    RIDE_LEADER_TBD_ID: 9999,
    RIDE_LEADER_TBD_NAME: 'To Be Determined',
    RSVP_BASE_URL: 'https://tinyurl.com/3k29mpdr',
    CLUB_RIDE_POLICY_URL: 'https://scccc.clubexpress.com/content.aspx?page_id=22&club_id=575722&module_id=137709'
}))
}));



const managedEvent = require('../fixtures/managedEvent.js');
const SCCCCEvent = require('../../src/SCCCCEvent');
// Make SCCCCEvent available globally for EventFactory (mimics GAS environment)
global.SCCCCEvent = SCCCCEvent;
const EventFactory = require('../../src/EventFactory.js');
const managedRwgpsEvent = require('../fixtures/managedRwgpsEvent.json').event;
const organizers = [{ id: 302732, text: "Toby Ferguson" }];
const dates = require('../../submodules/Dates/src/dates');
const { getGlobals } = require('../../src/Globals');



describe("Event Factory Tests", () => {
    // Mock row with startDateTime getter (like real RowCore)
    const makeRow = (overrides = {}) => {
        const row = {
            startDate: new Date("2023-01-01T18:00:00.000Z"),
            get startTime() { return this.startDate; },
            get startDateTime() { return this.startDate; },
            group: 'A',
            routeName: 'SCP - Seascape/Corralitos',
            routeURL: 'http://ridewithgps.com/routes/17166902',
            rideLeader: 'Toby Ferguson',
            rideName: '',
            rideURL: '',
            location: 'Seascape County Park',
            address: 'Address: Seascape County Park, Sumner Ave, Aptos, CA 95003',
            ...overrides
        };
        // Update startTime/startDateTime getters if startDate is overridden
        if (overrides.startDate) {
            Object.defineProperty(row, 'startTime', { get() { return this.startDate; } });
            Object.defineProperty(row, 'startDateTime', { get() { return this.startDate; } });
        }
        return row;
    };
    
    const managedRow = makeRow();
    const unmanagedRow = makeRow({ rideName: 'Tobys Ride' });
    
    // Task 7.4: Tests for v1 API field names
    describe("v1 API field names (Task 7.4)", () => {
        describe("newEvent() uses v1 fields directly", () => {
            test("should set description (not just desc alias)", () => {
                const event = EventFactory.newEvent(managedRow, organizers, 1234);
                expect(event.description).toBeDefined();
                expect(event.description).toContain('Ride Leader');
            });
            
            test("should set organizer_ids (not just organizer_tokens alias)", () => {
                const event = EventFactory.newEvent(managedRow, organizers, 1234);
                expect(event.organizer_ids).toBeDefined();
                expect(event.organizer_ids).toEqual(['302732']);
            });
            
            test("should set start_date and start_time", () => {
                const event = EventFactory.newEvent(managedRow, organizers, 1234);
                expect(event.start_date).toBeDefined();
                expect(event.start_time).toBeDefined();
                // Verify format matches v1 API expectations
                expect(event.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                expect(event.start_time).toMatch(/^\d{2}:\d{2}$/);
            });
            
            test("startDateTime getter should compute from start_date and start_time", () => {
                const event = EventFactory.newEvent(managedRow, organizers, 1234);
                const expectedDateTime = managedRow.startDateTime;
                expect(event.startDateTime).toEqual(expectedDateTime);
            });
        });
        
        describe("fromRwgpsEvent() uses v1 fields directly", () => {
            test("should set description from rwgps desc field", () => {
                const event = EventFactory.fromRwgpsEvent(managedRwgpsEvent);
                expect(event.description).toBeDefined();
                expect(event.description).toContain('Ride Leader');
            });
            
            test("should set organizer_ids from rwgps organizer_ids", () => {
                const event = EventFactory.fromRwgpsEvent(managedRwgpsEvent);
                expect(event.organizer_ids).toBeDefined();
                expect(event.organizer_ids).toEqual(['302732']);
            });
            
            test("should set start_date and start_time from starts_at", () => {
                const event = EventFactory.fromRwgpsEvent(managedRwgpsEvent);
                expect(event.start_date).toBeDefined();
                expect(event.start_time).toBeDefined();
                expect(event.start_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
                expect(event.start_time).toMatch(/^\d{2}:\d{2}$/);
            });
        });
    });

    describe("Basic Construction", () => {
        describe("fromRow()", () => {
            test("should build from a row", () => {
                const actual = EventFactory.newEvent(managedRow, organizers, 1234);
                const expected = managedEvent;
                expect(actual).toMatchObject(expected);
            })
            test("It should create a brand new object on each call", () => {
                let e1 = EventFactory.newEvent(managedRow, organizers);

                let e2 = EventFactory.newEvent(managedRow, organizers);
                expect(e1).not.toBe(e2);
            })
            test("should use the given ride name for unmanaged events", () => {
                const expected = { ...managedEvent, name: 'Tobys Ride' }
                const actual = EventFactory.newEvent(unmanagedRow, organizers, 1234);
                expect(actual).toMatchObject(expected);
            })
            test("should create a new ride name for managed events", () => {
                const start = new Date("2023-06-01T18:00:00.000Z");
                const hour = dates.T24(start)
                // Build expected with v1 field names
                const expectedDescription = hour === "11:00" 
                    ? managedEvent.description.replace("Arrive 9:45 AM for a 10:00 AM rollout.", "Arrive 10:45 AM for a 11:00 AM rollout.")
                    : managedEvent.description;
                const expected = { 
                    ...managedEvent, 
                    name: `Thu A (6/1 ${hour}) SCP - Seascape/Corralitos`,
                    // Use v1 field names
                    description: expectedDescription,
                    desc: expectedDescription,
                    start_date: '2023-06-01',
                    start_time: hour,
                }
                const mr = makeRow({ startDate: start });
                const actual = EventFactory.newEvent(mr, organizers, 1234);
                expect(actual).toMatchObject(expected);
            })
            test("should throw an error if row is missing", () => {
                expect(() => EventFactory.newEvent()).toThrow("no row object given");
            })
            test("should return an event even if organizers is missing", () => {
                // Build expected with v1 field names
                const expectedDescription = managedEvent.description.replace("Toby Ferguson", "To Be Determined");
                const expected = { 
                    ...managedEvent,
                    description: expectedDescription,
                    desc: expectedDescription,
                    organizer_ids: [getGlobals().RIDE_LEADER_TBD_ID + ""],
                    organizer_tokens: [getGlobals().RIDE_LEADER_TBD_ID + ""],
                };
                // Remove legacy aliases from expected since we compare using toMatchObject
                delete expected.desc;
                delete expected.organizer_tokens;

                const actual = EventFactory.newEvent(managedRow, [], 1234)
                expect(actual).toMatchObject(expected);
            })
        })
        describe("fromRwgpsEvent()", () => {

            test("should return the managedEvent", () => {
                let actual = EventFactory.fromRwgpsEvent(managedRwgpsEvent);
                const expected = managedEvent;
                // Check domain properties (NOT API-only fields like visibility, all_day, auto_expire_participants)
                expect(actual.location).toBe(expected.location);
                expect(actual.name).toBe(expected.name);
                expect(actual.route_ids).toEqual(expected.route_ids);
                // Check via legacy aliases (organizer_tokens is getter for organizer_ids)
                expect(actual.organizer_tokens).toEqual(expected.organizer_tokens);
                // Check startDateTime (getter that computes from start_date/start_time)
                expect(actual.startDateTime).toEqual(expected.startDateTime);
            })
            test("should return an event even if the description is missing", () => {
                const testcase = { ...managedRwgpsEvent };
                delete testcase.desc;
                let actual = EventFactory.fromRwgpsEvent(testcase);
                // desc should be empty when missing
                expect(actual.desc).toBe('');
                // Other fields should still be present
                expect(actual.name).toBe(managedRwgpsEvent.name);
                expect(actual.location).toBe(managedRwgpsEvent.location);
            })
            test("should return an event even if the routes are missing", () => {
                const testcase = { ...managedRwgpsEvent };
                delete testcase.routes;
                let actual = EventFactory.fromRwgpsEvent(testcase);
                // route_ids should be empty array when routes missing
                expect(actual.route_ids).toEqual([]);
                // Other fields should still be present
                expect(actual.name).toBe(managedRwgpsEvent.name);
                expect(actual.location).toBe(managedRwgpsEvent.location);
            })
            test("should return an event even if the starts_at date is missing", () => {
                const testcase = { ...managedRwgpsEvent };
                delete testcase.starts_at;
                let actual = EventFactory.fromRwgpsEvent(testcase);
                // Should have a startDateTime (defaulting to current time)
                expect(actual.startDateTime).toBeInstanceOf(Date);
                // Other fields should still match
                expect(actual.name).toBe(managedRwgpsEvent.name);
                expect(actual.location).toBe(managedRwgpsEvent.location);
            })
            
            // Task 7.7: v1 format support
            test("should handle v1 format with start_date and start_time", () => {
                const v1Event = {
                    name: 'Test Event',
                    description: 'Test description',
                    start_date: '2025-03-15',
                    start_time: '09:30',
                    location: 'Test Location',
                    visibility: 'public',
                    routes: [{ id: 12345, name: 'Test Route' }],
                    organizers: [{ id: 99999, name: 'Test Leader' }]
                };
                
                const actual = EventFactory.fromRwgpsEvent(v1Event);
                
                expect(actual.name).toBe('Test Event');
                expect(actual.description).toBe('Test description');
                expect(actual.location).toBe('Test Location');
                expect(actual.route_ids).toEqual(['12345']);
                // Check start_date and start_time are parsed correctly
                expect(actual.start_date).toBe('2025-03-15');
                expect(actual.start_time).toBe('09:30');
            })
            
            test("should prefer start_date/start_time over starts_at when both present", () => {
                const mixedEvent = {
                    name: 'Test Event',
                    start_date: '2025-06-01',
                    start_time: '14:00',
                    starts_at: '2025-01-01T10:00:00-08:00', // should be ignored
                    routes: []
                };
                
                const actual = EventFactory.fromRwgpsEvent(mixedEvent);
                
                // Should use start_date/start_time, not starts_at
                expect(actual.start_date).toBe('2025-06-01');
                expect(actual.start_time).toBe('14:00');
            })
            
            test("should extract organizer_ids from organizers array", () => {
                const v1Event = {
                    name: 'Test Event',
                    start_date: '2025-03-15',
                    start_time: '09:30',
                    organizers: [
                        { id: 111, name: 'Leader 1' },
                        { id: 222, name: 'Leader 2' }
                    ],
                    routes: []
                };
                
                const actual = EventFactory.fromRwgpsEvent(v1Event);
                
                // Should extract IDs as strings
                expect(actual.organizer_ids).toEqual(['111', '222']);
            })
            
            test("should log error when event name ends with ]", () => {
                const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
                const testcase = { ...managedRwgpsEvent, name: "Bad Event Name ]" };
                EventFactory.fromRwgpsEvent(testcase);
                expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("should not end with ']'"));
                consoleSpy.mockRestore();
            })
        })
    })
})