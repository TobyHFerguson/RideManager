var should = require('chai').should();
const sinon = require('sinon');
const managedEvent = require('./fixtures/MyPayload.js')
const EventFactory = require('../src/EventFactory.js');
const Globals = require('../src/1Globals.js');
const managedRwgpsEvent = require('./fixtures/event.json').event;
const organizers = [{ id: 302732, text: "Toby Ferguson" }];


describe("Event Factory Tests", () => {
    const managedRow = {
        StartDate: "2023-01-01T08:00:00.00Z",
        StartTime: "1899-12-30T18:00:00.000Z",
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
            it("should build from a row", () => {
                const actual = EventFactory.newEvent(managedRow, organizers);
                const expected = managedEvent;
                actual.should.deep.equal(expected);
            })
            it("It should create a brand new object on each call", () => {
                let e1 = EventFactory.newEvent(managedRow, organizers);

                let e2 = EventFactory.newEvent(managedRow, organizers);
                e1.should.not.equal(e2);
            })
            it("should use the given ride name for unmanaged events", () => {
                const expected = { ...managedEvent, name: 'Tobys Ride [1]' }
                const actual = EventFactory.newEvent(unmanagedRow, organizers);
                actual.should.deep.equal(expected);
            })
            it("should create a new ride name for managed events", () => {
                const expected = { ...managedEvent, 
                    name: "Thu A (6/1 10:00) [1] SCP - Seascape/Corralitos",
                    "start_date": "2023-06-01T18:00:00.000Z",
                    "start_time": "2023-06-01T18:00:00.000Z"
                  }
                const mr = { ...managedRow, StartDate: "2023-06-01T08:00:00.00Z",}
                const actual = EventFactory.newEvent(mr, organizers);
                actual.should.deep.equal(expected);
            })
            it("should throw an error if row is missing", () => {
                (() => EventFactory.newEvent()).should.throw("no row object given");
            })
            it("should return an event even if organizers is missing", () => {
                const expected = { ...managedEvent };
                expected.desc = expected.desc.replace("Toby Ferguson", "To Be Determined")
                expected.name = expected.name.replace("[1]", "[0]");
                expected.organizer_tokens = [Globals.RIDE_LEADER_TBD_ID + ""];

                const actual = EventFactory.newEvent(managedRow, [])
                actual.should.deep.equal(expected);
            })
        })
        describe("fromRwgpsEvent()", () => {

            it("should return the managedEvent", () => {
                let actual = EventFactory.fromRwgpsEvent(managedRwgpsEvent);
                const expected = managedEvent;
                actual.should.deep.equal(expected);
            })
            it("should return an event even if the description is missing", () => {
                const testcase = managedRwgpsEvent;
                delete testcase.desc;
                let actual = EventFactory.fromRwgpsEvent(testcase);
                const expected = managedEvent;
                expected.desc = '';
                actual.should.deep.equal(expected);
            })
            it("should return an event even if the routes are missing", () => {
                const testcase = managedRwgpsEvent;
                delete testcase.routes;
                let actual = EventFactory.fromRwgpsEvent(testcase);
                const expected = managedEvent;
                expected.route_ids = [];
                actual.should.deep.equal(expected);
            })
            it("should return an event even if the start_at date is missing", () => {
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
                actual.should.deep.equal(expected);
                actual_start_date.should.be.a("string");
                actual_start_time.should.be.a("string");
            })
        })
    })
})