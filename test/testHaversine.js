const should = require('chai').should();
const haversine_distance = require('../src/haversine');

describe("haversine_distance tests", () => {
    it("should calculate distance between two points", () => {
        const p1 = { lng: -156.66578, lat: 20.99424 };
        const p2 = { lat: 20.99417, lng: -156.6655 };
        const distance = haversine_distance(p1, p2)
        distance.should.equal(32.90922325955254);
    })
    it("should return same value no matter which order", () => {
        const p1 = { lng: -156.66578, lat: 20.99424 };
        const p2 = { lat: 20.99417, lng: -156.6655 };
        const distance1 = haversine_distance(p1, p2);
        const distance2 = haversine_distance(p1, p2)
        distance1.should.equal(distance2);
    });
})