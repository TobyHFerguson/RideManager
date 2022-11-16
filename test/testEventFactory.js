var should = require('chai').should();
const sinon = require('sinon');
const myPayload = require('./fixtures/MyPayload.js')
const EventFactory = require('../src/EventFactory.js');
const RWGPS = require('../src/RWGPS.js');
const rwgpsEvent = require('./fixtures/event.json');


describe("Event Factory Tests", () => {
    const managedRow = {
        StartDate: "2023-01-01 10:00 AM",
        StartTime: "2023-01-01 10:00 AM",
        Group: 'A',
        RouteName: 'SCP - Seascape/Corralitos',
        RouteURL: 'http://ridewithgps.com/routes/17166902',
        RideLeader: 'Toby Ferguson',
        RideName: '',
        Location: 'Seascape County Park',
        Address: 'Address: Seascape County Park, Sumner Ave, Aptos, CA 95003'
    }
    const unmanagedRow = { ...managedRow, RideName: 'Tobys Ride' }
    let rwgps;
    beforeEach(() => {
        rwgps = sinon.createStubInstance(RWGPS, {
            lookupOrganizer: sinon.stub().returns({ id: 302732, text: 'Toby Ferguson' }),
            get_event: sinon.stub().returns(rwgpsEvent.event)
        })
    })
    afterEach(() => {
        rwgps.lookupOrganizer.restore;
        rwgps.get_event.restore;
    })
    describe("Basic Construction", () => {
        describe("fromRow()", () => {
            it("should build from a row", () => {
                let actual = EventFactory.fromRow(managedRow, rwgps);
                const expected = myPayload;
                actual.should.deep.equal(expected);
            })
            it("It should create a brand new object on each call", () => {
                let e1 = EventFactory.fromRow(managedRow, rwgps);

                let e2 = EventFactory.fromRow(managedRow, rwgps);
                e1.should.not.equal(e2);
            })
            it("should use the given ride name", () => {
                const expected = { ...myPayload, name: 'Tobys Ride [1]' }
                const actual = EventFactory.fromRow(unmanagedRow, rwgps);
                expected.should.deep.equal(actual);
            })
            it("should throw an error if either parameter is missing", () => {
                (() => EventFactory.fromRow()).should.throw("no row object given");
                (() => EventFactory.fromRow(managedRow)).should.throw("no rwgps object given");
            })
        })
        describe("fromRwgpsEvent()", () => {
            
            it("should construct an event", () => {
                let actual = EventFactory.fromRwgpsEvent('fakeUrl', rwgps);
                delete actual.cancel;
                const expected = myPayload;
                expected.should.deep.equal(actual);  
            })
        })
    })
    describe("cancellation", () => {
        it("the new ride name should say cancelled", () => {
            const uut = EventFactory.fromRow(managedRow, rwgps)
            let old_name = uut.name;
            let new_name = `CANCELLED: ${old_name}`;
            let expected = { ...uut, name: new_name };
            let actual = uut.cancel();
            expected.should.deep.equal(actual)
        })
        it("cancel should be idempotent on an already cancelled event", () => {
            const uut = EventFactory.fromRow(managedRow, rwgps);
            let old_name = uut.name;
            let new_name = `CANCELLED: ${old_name}`;
            let expected = { ...uut, name: new_name };
            let actual = uut.cancel().cancel();
            expected.should.deep.equal(actual)
        })
    })
    describe("updateRiderCount()", () => {
        it("managedRow", () => {
            const uut = EventFactory.fromRow(managedRow, rwgps);
            let expected = { ...uut, name: 'Sun A (1/1 10:00) [6] SCP - Seascape/Corralitos' };
            let actual = uut.updateRiderCount(6);
            actual.should.deep.equal(expected);
        })
        it("unmanagedRow", () => {
            const uut = EventFactory.fromRow(unmanagedRow, rwgps);
            let expected = { ...uut, name: 'Tobys Ride [6]' };
            let actual = uut.updateRiderCount(6);
            actual.should.deep.equal(expected);
        })
    })

})