// Mock the entire Groups module
jest.mock('../src/Groups', () => ({
  getGroupNames: jest.fn(() => ['A', 'B', 'C', 'D']),
  getGroupSpecs: jest.fn(() => ({
    A: { Template: 'Template A', MIN_LENGTH: 10 },
    B: { Template: 'Template B', MIN_LENGTH: 15 }
  })) // Mock other functions if needed
}));

const managedEvent = require('./fixtures/managedEvent.js');
const EventFactory = require('../src/EventFactory.js');
const Globals = require('../src/Globals.js');
const managedRwgpsEvent = require('./fixtures/managedRwgpsEvent.json').event;
const organizers = [{ id: 302732, text: "Toby Ferguson" }];
const dates = require('../submodules/Dates/src/dates');



describe("Event Factory Tests", () => {
    const managedRow = {
        StartDate: "2023-01-01T18:00:00.000Z",
        StartTime: "2023-01-01T18:00:00.000Z",
        Group: 'A',
        RouteName: 'SCP - Seascape/Corralitos',
        RouteURL: 'http://ridewithgps.com/routes/17166902',
        RideLeader: 'Toby Ferguson',
        RideName: '',
        RideURL: '',
        Location: 'Seascape County Park',
        Address: 'Address: Seascape County Park, Sumner Ave, Aptos, CA 95003'
    }
    const unmanagedRow = { ...managedRow, RideName: 'Tobys Ride' }
    describe("Basic Construction", () => {
        describe("fromRow()", () => {
            test("should build from a row", () => {
                const actual = EventFactory.newEvent(managedRow, organizers, 1234);
                const expected = managedEvent;
                expect(actual).toEqual(expected);
            })
            test("It should create a brand new object on each call", () => {
                let e1 = EventFactory.newEvent(managedRow, organizers);

                let e2 = EventFactory.newEvent(managedRow, organizers);
                expect(e1).not.toBe(e2);
            })
            test("should use the given ride name for unmanaged events", () => {
                const expected = { ...managedEvent, name: 'Tobys Ride [1]' }
                const actual = EventFactory.newEvent(unmanagedRow, organizers, 1234);
                expect(actual).toEqual(expected);
            })
            test("should create a new ride name for managed events", () => {
                const start = new Date("2023-06-01T18:00:00.000Z");
                const hour = dates.T24(start)
                const expected = { ...managedEvent, 
                    name: `Thu A (6/1 ${hour}) [1] SCP - Seascape/Corralitos`,
                    "start_date": start.toISOString(),
                    "start_time": start.toISOString(),
                }
                if (hour === "11:00") { 
                    expected.desc = expected.desc.replace("Arrive 9:45 AM for a 10:00 AM rollout.", "Arrive 10:45 AM for a 11:00 AM rollout.");
                }
                const mr = { ...managedRow, StartDate: "2023-06-01T18:00:00.000Z", StartTime: "2023-06-01T18:00:00.000Z"}
                const actual = EventFactory.newEvent(mr, organizers, 1234);
                expect(actual).toEqual(expected);
            })
            test("should throw an error if row is missing", () => {
                expect(() => EventFactory.newEvent()).toThrow("no row object given");
            })
            test("should return an event even if organizers is missing", () => {
                const expected = { ...managedEvent };
                expected.desc = expected.desc.replace("Toby Ferguson", "To Be Determined")
                expected.name = expected.name.replace("[1]", "[0]");
                expected.organizer_tokens = [Globals["RIDE_LEADER_TBD_ID"] + ""];

                const actual = EventFactory.newEvent(managedRow, [], 1234)
                expect(actual).toEqual(expected);
            })
        })
        describe("fromRwgpsEvent()", () => {

            test("should return the managedEvent", () => {
                let actual = EventFactory.fromRwgpsEvent(managedRwgpsEvent);
                const expected = managedEvent;
                expect(actual).toEqual(expected);
            })
            test("should return an event even if the description is missing", () => {
                const testcase = managedRwgpsEvent;
                delete testcase.desc;
                let actual = EventFactory.fromRwgpsEvent(testcase);
                const expected = managedEvent;
                expected.desc = '';
                expect(actual).toEqual(expected);
            })
            test("should return an event even if the routes are missing", () => {
                const testcase = managedRwgpsEvent;
                delete testcase.routes;
                let actual = EventFactory.fromRwgpsEvent(testcase);
                const expected = managedEvent;
                expected.route_ids = [];
                expect(actual).toEqual(expected);
            })
            test("should return an event even if the start_at date is missing", () => {
                const testcase = managedRwgpsEvent;
                delete testcase.starts_at;
                let actual = EventFactory.fromRwgpsEvent(testcase);
                const actual_start_date = actual.start_date;
                const actual_start_time = actual.start_time;
                delete actual.start_time;
                delete actual.start_date;
                const expected = managedEvent;
                delete expected.start_date;
                delete expected.start_time;
                expect(actual).toEqual(expected);
                expect(typeof actual_start_date).toBe("string");
                expect(typeof actual_start_time).toBe("string");
            })
        })
    })
})