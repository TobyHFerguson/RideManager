const Event = require("../src/Event");
const should = require('chai').should();

describe("Event Tests", () => {
    describe("test managedRide()", () => {
        it("regexp matches Tue 'B' Ride (11/15 10:00 AM)", () => {
            Event.managedEvent("Tue 'B' Ride (11/15 10:00 AM)").should.be.true;
        })
        it("regexp matches Sat A (12/31 10:00)", () => {
            Event.managedEvent("Sat A (12/31 10:00)").should.be.true;
        })
        it("doesn't match a non managed ride", () => {
            Event.managedEvent("My Non Managed Ride").should.be.false;
        })
        it("an empty ride is managed", () => {
            Event.managedEvent("").should.be.true;
        })
        it("no name will be managed", () => {
            Event.managedEvent().should.be.true;
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
})