var should = require('chai').should();
const sinon = require('sinon');
const myPayload = require('./fixtures/MyPayload.js')
const EventFactory = require('../src/EventFactory.js');

const RWGPS = require('../src/RWGPS.js');


describe("Event Factory Tests", () => {
    const date = new Date("2023-01-01 10:00 AM");
    const row = {
        StartDate: date,
        StartTime: date,
        Group: 'A',
        RouteName: 'SCP - Seascape/Corralitos',
        RouteURL: 'http://ridewithgps.com/routes/17166902',
        RideLeader: 'Toby Ferguson',
        RideName: '',
        Location: 'Seascape County Park',
        Address: 'Seascape County Park, Sumner Ave, Aptos, CA 95003'
    }
    let rwgps;
    beforeEach(() => {
        rwgps = sinon.createStubInstance(RWGPS, {
            lookupOrganizer: sinon.stub().returns({ id: 302732, text: 'Toby Ferguson' })
        })
    })
    afterEach(() => {
        rwgps.lookupOrganizer.restore;
    })
    describe("Basic Construction", () => {


        it("should build from a row", () => {
            let actual = EventFactory.fromRow(row, rwgps);
            delete actual.cancel;
            const expected = myPayload;
            actual.should.deep.equal(expected);
        })
        it("It should create a brand new object on each call", () => {
            let e1 = EventFactory.fromRow(row, rwgps);

            let e2 = EventFactory.fromRow(row, rwgps);
            e1.should.not.equal(e2);
        })
        
    })
    describe("cancellation", () => {
        it("the new ride name should say cancelled", () => {
            const uut = EventFactory.fromRow(row, rwgps)
            let old_name = uut.name;
            let new_name = `CANCELLED: ${old_name}`;
            let expected = { ...uut, name: new_name };
            let actual = uut.cancel();
            expected.should.deep.equal(actual)
        })
    })

})