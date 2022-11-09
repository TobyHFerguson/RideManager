const should = require('chai').should();
const dates = require('../src/dates');

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
            let n = 12345;
            let d = new Date(n);
            dates.T24(d).should.equal("16:00");
        })
        it("should produce a NaN when the date is busted", () => {
            dates.T24(() => {}).should.be.NaN;
        }) 
    })
    describe("dates.add()", () => {})
})