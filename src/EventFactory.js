// @ts-check
/// <reference path="./gas-globals.d.ts" />
/// <reference path="./Externals.d.ts" />
// In Jest/Node.js: require modules for testing
if (typeof require !== 'undefined') {
    var dates = require('./common/dates');
    var Groups = require('./Groups');
    var Globals = require('./Globals');
}

// SCCCCEvent is accessed as a global - it's declared as a class in SCCCCEvent.js
// and is globally available in both GAS (file concatenation) and Jest (test setup)

/**
 * @typedef {import('./Externals').Organizer} Organizer
 * @typedef {import('./Externals').RWGPSEvent} RWGPSEvent
 */

var EventFactory = (function() {

/**
 * Get a string that describes the ride
 * @param {string[]} leaders - array of ride leader names
 * @param {string} address - address
 * @param {Date} meet_time - meeting time
 * @param {Date} start_time - starting time
 * @param {string | number} event_id - event ID
 * @param {Object.<string, any>} globals - globals object
 * @returns {string} string describing the ride
 */
function createDescription_(leaders, address, meet_time, start_time, event_id, globals) {
    const result =
        `Ride Leader${leaders.length > 1 ? 's' : ''}: ${leaders.join(', ')}

${address}

Arrive ${dates.T12(meet_time)} for a ${dates.T12(start_time)} rollout.

All participants are assumed to have read and agreed to the clubs ride policy: ${globals.CLUB_RIDE_POLICY_URL}

Note: When using a browser use the "Go to route" link below to open up the route.`;
    return result;
}

/**
 * @param {InstanceType<typeof RowCore>} row
 * @returns {string}
 */
function makeRideName_(row) {
    const name = (!row.rideName || SCCCCEvent.managedEventName(row.rideName, Groups.getGroupNames()))
        ? SCCCCEvent.makeManagedRideName(row.startDateTime, row.group, row.routeName)
        : SCCCCEvent.makeUnmanagedRideName(row.rideName);
    return name;
}

class EventFactory {
    /**
     * @param {InstanceType<typeof RowCore>} row row object to make event from
     * @param {Organizer[]} organizers the organizers (i.e. ride leaders) for this event
     * @param {string | number} event_id the event ID (extracted from event URL)
     * @returns {InstanceType<typeof SCCCCEvent>} the constructed event
     */
    static newEvent(row, organizers, event_id) {
        const globals = Globals.getGlobals();
        if (!organizers || !organizers.length) {
            organizers = [{ id: globals.RIDE_LEADER_TBD_ID, text: globals.RIDE_LEADER_TBD_NAME }];
        }
        if (!row) throw new Error("no row object given");
        const event = new SCCCCEvent();
        event.location = row.location && !(row.location.startsWith("#")) ? row.location : "";
        event.route_ids = [row.routeURL.split('/')[4]];
        event.startDateTime = row.startDateTime;
        event.name = makeRideName_(row);
        event.organizer_tokens = organizers.map(o => o.id + "");
        let address = row.address && !(row.address.startsWith("#")) ? row.address : "";
        let meet_time = dates.addMinutes(row.startTime, -15);
        const startTime = row.startTime instanceof Date ? row.startTime : new Date(row.startTime);
        const meetTimeDate = meet_time instanceof Date ? meet_time : (typeof meet_time === 'number' ? new Date(meet_time) : new Date());
        event.desc = createDescription_(organizers.map(o => o.text), address, meetTimeDate, startTime, event_id, globals);
        return event;
    }

    /**
     * @param {RWGPSEvent} rwgpsEvent
     * @returns {InstanceType<typeof SCCCCEvent>}
     */
    static fromRwgpsEvent(rwgpsEvent) {
        const event = new SCCCCEvent();
        event.all_day = rwgpsEvent.all_day ? "1" : "0";
        event.desc = rwgpsEvent.desc ? rwgpsEvent.desc.replaceAll('\r', '') : '';
        event.location = rwgpsEvent.location;
        event.name = rwgpsEvent.name;
        event.organizer_tokens = rwgpsEvent.organizer_ids ? rwgpsEvent.organizer_ids.map(id => String(id)) : undefined;
        event.route_ids = rwgpsEvent.routes ? rwgpsEvent.routes.map((/** @type {{id: any}} */ r) => r.id + "") : [];
        event.startDateTime = rwgpsEvent.starts_at ? new Date(rwgpsEvent.starts_at) : new Date();
        event.visibility = rwgpsEvent.visibility || 0;
        if (event.name && event.name.trim().endsWith(']')) {
            console.error(`Event name '${event.name}' should not end with ']' - this is likely a bug in the RWGPS event import code`);
        }
        return event;
    }
}

return EventFactory;
})();

if (typeof module !== 'undefined') {
    module.exports = EventFactory;
}