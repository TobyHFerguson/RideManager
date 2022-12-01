const Event = require("../src/Event");
const should = require('chai').should();

describe("Event Tests", () => {
    describe("test managedEvent()", () => {
        it("regexp matches Tue 'B' Ride (1/1 10:00 AM)", () => {
            Event.managedEventName("Tue 'B' Ride (1/1 10:00 AM) [3] fargle").should.be.true;
            let event = new Event();
            event.name = "Tue 'B' Ride (1/1 10:00 AM) [3] fargle";
            event.managedEvent().should.be.true;
        })
        it("regexp matches Tue 'B' Ride (11/15 10:00 AM)", () => {
            Event.managedEventName("Tue 'B' Ride (11/15 10:00 AM)").should.be.true;
        })
        it("regexp matches Sat A (12/31 10:00)", () => {
            Event.managedEventName("Sat A (12/31 10:00)").should.be.true;
        })
        it("doesn't match a non managed ride", () => {
            (Event.managedEventName("My Non Managed Ride")).should.be.false;
            const event = new Event();
            event.name = "My Non Managed Ride";
            let actual = event.managedEvent();
            actual.should.be.false;
            event.name = 'Tobys Simple Event [1]';
            (!event.managedEvent()).should.be.true;
        })
        it("an empty ride is managed", () => {
            Event.managedEventName("").should.be.true;
        })
        it("no name will be managed", () => {
            Event.managedEventName().should.be.true;
        })
        it("detects 'foobar [12]' as unmanaged", () => {
            (!Event.managedEventName("foobar [12]")).should.be.true;
        })
    })
    describe("test makeUnmanagedRideName()", () => {
        it("returns the original name with the rsvp appended", () => {
            Event.makeUnmanagedRideName("Name", 10).should.equal("Name [10]");
        })
        it("updates the rsvp only", () => {
            Event.makeUnmanagedRideName("Name [1]", 12).should.equal("Name [12]");
        })
    })
    describe("test updateCountInName()", () => {
        it("updates the unmanaged name", () => {
            Event.updateCountInName("foobar [12]", 9).should.equal("foobar [9]")
        })
        it("updates the managed name", () => {
            Event.updateCountInName("Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos", 12).should.equal("Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos")
        })
    })
    describe("test updateRiderCount()", () => {
        it("updates the unmanaged name", () => {
            const uut = new Event();
            uut.name = "foobar [12]";
            const expected = new Event();
            expected.name = "foobar [9]";
            const changed = uut.updateRiderCount(9);
            uut.should.deep.equal(expected);
            changed.should.be.true;
        })
        it("updates the managed name", () => {
            const uut = new Event();
            uut.name = "Sun A (1/1 10:00) [0] SCP - Seascape/Corralitos";
            const expected = new Event();
            expected.name = "Sun A (1/1 10:00) [12] SCP - Seascape/Corralitos";
            const changed = uut.updateRiderCount(12);
            uut.should.deep.equal(expected);
            changed.should.be.true;
        })
        it("should return false if the count hasn't changed (unmanaged)", () => {
            const uut = new Event();
            uut.name = "foobar [12]";
            const changed = uut.updateRiderCount(12);
            changed.should.be.false;
        })
        it("should return false if the count hasn't changed (managed)", () => {
            const uut = new Event();
            uut.name = "Sun A (1/1 10:00) [11] SCP - Seascape/Corralitos";
            const changed = uut.updateRiderCount(11);
            changed.should.be.false;
        })
    })
    describe("cancellation", () => {
        it("the new ride name should say cancelled", () => {
            const uut = new Event();
            uut.name = "Some Name";
            let old_name = uut.name;
            let new_name = `CANCELLED: ${old_name}`;
            let expected = { ...uut, name: new_name };
            let actual = uut.cancel();
            actual.should.deep.equal(expected)
        })
        it("cancel should be idempotent on an already cancelled event", () => {
            const uut = new Event();
            uut.name = "Some Name";
            let old_name = uut.name;
            let new_name = `CANCELLED: ${old_name}`;
            let expected = { ...uut, name: new_name };
            let actual = uut.cancel().cancel();
            actual.should.deep.equal(expected)
        })
    })
    describe("reinstation", () => {
        it('should become uncanceled', () => {
            const uut = new Event();
            uut.name = "CANCELLED: Some Name";
            let new_name = "Some Name";
            let expected = { ...uut, name: new_name };
            let actual = uut.reinstate();
            actual.should.deep.equal(expected)
        })
    })
})