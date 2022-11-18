var should = require('chai').should();
const sinon = require('sinon');
const managedEvent = require('./fixtures/MyPayload.js')
const EventFactory = require('../src/EventFactory.js');
const Globals = require('../src/Globals.js');
const managedRwgpsEvent = require('./fixtures/event.json').event;
const organizers = [ { id: 302732, text: "Toby Ferguson"}];


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
            it("should use the given ride name", () => {
                const expected = { ...managedEvent, name: 'Tobys Ride [1]' }
                const actual = EventFactory.newEvent(unmanagedRow, organizers);
                actual.should.deep.equal(expected);
            })
            it("should throw an error if row is missing", () => {
                (() => EventFactory.newEvent()).should.throw("no row object given");
            })
            it("should return an event even if organizers is missing", () => {
                const expected = { ...managedEvent };
                expected.desc = expected.desc.replace("Toby Ferguson", "To Be Determined")
                expected.name = expected.name.replace("[1]", "[0]");
                expected.organizer_tokens = [ Globals.RIDE_LEADER_TBD_ID+""]; 
                
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
        })
    })
})