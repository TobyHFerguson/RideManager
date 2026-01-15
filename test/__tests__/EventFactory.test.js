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
                const expected = { ...managedEvent, 
                    name: `Thu A (6/1 ${hour}) SCP - Seascape/Corralitos`,
                    startDateTime: start,
                }
                if (hour === "11:00") { 
                    expected.desc = expected.desc.replace("Arrive 9:45 AM for a 10:00 AM rollout.", "Arrive 10:45 AM for a 11:00 AM rollout.");
                }
                const mr = makeRow({ startDate: start });
                const actual = EventFactory.newEvent(mr, organizers, 1234);
                expect(actual).toMatchObject(expected);
            })
            test("should throw an error if row is missing", () => {
                expect(() => EventFactory.newEvent()).toThrow("no row object given");
            })
            test("should return an event even if organizers is missing", () => {
                const expected = { ...managedEvent };
                expected.desc = expected.desc.replace("Toby Ferguson", "To Be Determined")
                expected.organizer_tokens = [getGlobals().RIDE_LEADER_TBD_ID + ""];

                const actual = EventFactory.newEvent(managedRow, [], 1234)
                expect(actual).toMatchObject(expected);
            })
        })
        describe("fromRwgpsEvent()", () => {

            test("should return the managedEvent", () => {
                let actual = EventFactory.fromRwgpsEvent(managedRwgpsEvent);
                const expected = managedEvent;
                // Don't compare desc since RWGPS events preserve original description text
                const { desc: _, ...expectedWithoutDesc } = expected;
                const { desc: __, ...actualWithoutDesc } = actual;
                expect(actualWithoutDesc).toMatchObject(expectedWithoutDesc);
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