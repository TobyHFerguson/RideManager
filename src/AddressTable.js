class AddressTable {
    constructor(addresses) {
        this.addresses = addresses
        this.byPrefix = addresses.reduce((p,c) => {
            p[`${c[0]}`] = {address: c[1], location: c[2]};
            return p;
        }, {})
        
    }
    fromPrefix(prefix) {
        return this.byPrefix[prefix];
    }
    fromPoint(point) {
        const results = this.byPrefix.point.filter(p => haversine_distance(p, point) < 500);
        return results[0];
    }
}

if (typeof module !== 'undefined') {
    module.exports = Address;
}