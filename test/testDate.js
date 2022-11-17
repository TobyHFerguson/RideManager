const should = require('chai').should();
const dates = require('../src/dates');
const sinon = require('sinon');


describe("date tests", () => {
    describe("dates.convert() tests", () => {
        it("should return the original date", () => {
            let d = new Date();
            dates.convert(d).should.equal(d);
        })
        it("should convert a number", () => {
            let n = 12345;
            let d = new Date(n);
            dates.convert(d).should.equal(d);
        })
        it("should return NaN", () => {
            dates.convert(() => {}).should.be.NaN;
        })
    })
    describe("dates.MMDD() tests", () => {
        it("should create a date that looks like MM/DD", () => {
            let n = 12345;
            let d = new Date(n);
            dates.MMDD(d).should.equal("12/31");
        })
        it("should produce a Nan when the date is busted", () => {
            dates.MMDD(() => {}).should.be.NaN;
        })
    })
    describe("dates.MMDDYYYY() tests", () => {
        it("should create a date that looks like MM/DD/YYYY", () => {
            let n = 12345;
            let d = new Date(n);
            dates.MMDDYYYY(d).should.equal("12/31/1969");
        })
        it("should produce a NaN when the date is busted", () => {
            dates.MMDD(() => {}).should.be.NaN;
        })
    })
    describe("dates.YYYY_MM_DD() tests", () => {
        it("should create a date that looks like YYYY-MM-DD", () => {
            let n = "2023-01-01T10:00:00-08:00";
            let d = new Date(n);
            dates.YYYY_MM_DD(d).should.equal("2023-01-01");
        })
        it("should produce a NaN when the date is busted", () => {
            dates.MMDD(() => {}).should.be.NaN;
        })
    })
    describe("dates.weekday() tests", () => {
        it("should produce a three letter weekday", () => {
            let n = 12345;
            let d = new Date(n);
            dates.weekday(d).should.equal("Wed");
        })
        it("should produce a NaN when the date is busted", () => {
            dates.weekday(() => {}).should.be.NaN;
        })        
    })
    describe("dates.T24", () => {
        it("should produce a 24 hour time", () => {
            let n = "2023-01-01T10:00:00"
            let d = new Date(n);
            dates.T24(d).should.equal("10:00");
        })
        it("should produce a NaN when the date is busted", () => {
            dates.T24(() => {}).should.be.NaN;
        }) 
    })
    describe("dates.add()", () => {
        it("should return a date that is one day more than the initial day, including months and years", () => {
            const d = new Date("12/31/2023");
            dates.add(d, 1).should.deep.equal(new Date("1/1/2024"))
        })
    })
    describe("dates.T12()", () => {
        it("should return a 12 hour representation of a time", () => {
            const d = new Date("2023-01-01T13:15:00");
            dates.T12(d).should.equal("1:15 PM");
        })
        it("should convert 10:00 AM to 10:00 AM", () => {
            dates.T12("2023-01-01 10:00 AM").should.equal("10:00 AM");
        })
    })
    describe("dates.addMinutes()", () => {
        it("should return a time that is 15 minutes less", () => {
            const d = new Date("2023-01-01T13:15:00");
            dates.addMinutes(d, -15).should.deep.equal(new Date("2023-01-01T13:00:00"));
        })
    })
})