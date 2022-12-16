const should = require('chai').should();
const Address = require('../src/AddressTable');

describe("test Address", () => {
    describe("simple prefix", () => {
        it("should find the simple prefix value", () => {
            const addresses = [ ["p2", "a2", "l2", "point2"], [ "p1", "a1", "l1", "point1"]];
            const address = new Address(addresses);
            const expected = {address: "a1", location: "l1"}
            const actual = address.fromPrefix("p1");
            actual.should.deep.equal(expected)
        })
        it("should find ")
        it("should find a more complex prefix value", () => {
            const addresses = [ [ "p 1", "a1", "l1", "point1"]];
            const address = new Address(addresses);
            const expected = {address: "a1", location: "l1"}
            const actual = address.fromPrefix("p 1");
            actual.should.deep.equal(expected)
        })
        it("should return undefined if the prefix is not found", () => {
            const addresses = [ [ "p 1", "a1", "l1", "point1"]];
            const address = new Address(addresses);
            const expected = {address: "a1", location: "l1"}
            const actual = address.fromPrefix("p 3");
            should.not.exist(actual)
        })
    })
})