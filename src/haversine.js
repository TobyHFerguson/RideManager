// Taken from https://cloud.google.com/blog/products/maps-platform/how-calculate-distances-map-maps-javascript-api
/**
 * @typedef{Point}
 * @property{Number} lat - decimal latitude. Must be in range [-90, 90]
 * @property{Number} lng - decimal longitude. Must be in range [-180, +180]
 */

/**
 * Calculate the straight line distance between two points in lat/long format
 */
 function haversine_distance(p1, p2) {
    // var R = 6371.0710 // Radius of the Earth in Km
    var R = 3958.8 * 1760; // Radius of the Earth in yards
    var rlat1 = p1.lat * (Math.PI / 180); // Convert degrees to radians
    var rlat2 = p2.lat * (Math.PI / 180); // Convert degrees to radians
    var difflat = rlat2 - rlat1; // Radian difference (latitudes)
    var difflon = (p2.lng - p1.lng) * (Math.PI / 180); // Radian difference (longitudes)
  
    var d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)));
    return d;
  }
  
  
  function testHaversine() {
    const p1 = { lng: -156.66578, lat: 20.99424 };
    const p2 = { lat: 20.99417, lng: -156.6655 };
    const distance = haversine_distance(p1, p2)
    console.log(`${distance} yards`)
  }
  