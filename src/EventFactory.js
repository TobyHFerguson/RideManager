// @ts-check
/// <reference path="./gas-globals.d.ts" />
/// <reference path="./Externals.d.ts" />
if (typeof require !== 'undefined') {
    // @ts-ignore
    (SCCCCEvent = require('./SCCCCEvent'));
    var dates = require('./common/dates');
    var { getGroupNames } = require('./Groups');
    // @ts-ignore
    var { getGlobals } = require('./Globals');
    var { default: RowCore } = require('./RowCore');
}

/**
 * @typedef {import('./Externals').Organizer} Organizer
 * @typedef {import('./Externals').RWGPSEvent} RWGPSEvent
 */

const EventFactory = function () {
    const globals = getGlobals();

    /**
     * Get a string that describes the ride
     * @param {string[]} leaders - array of ride leader names
     * @param {string} address - address
     * @param {Date} meet_time - meeting time
     * @param {Date} start_time - starting time
     * @param {string | number} event_id - event ID
     * @returns {string} string describing the ride
     */
    function createDescription(leaders, address, meet_time, start_time, event_id) {
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
    function makeRideName(row) {
        const name = (!row.rideName || SCCCCEvent.managedEventName(row.rideName, getGroupNames()))
            ? SCCCCEvent.makeManagedRideName(row.startDate, row.startTime, row.group, row.routeName)
            : SCCCCEvent.makeUnmanagedRideName(row.rideName);
        return name;
    }

    return {
        /**
         * @param {InstanceType<typeof RowCore>} row row object to make event from
         * @param {Organizer[]} organizers the organizers (i.e. ride leaders) for this event
         * @param {string | number} event_id the event ID (extracted from event URL)
         * @returns {InstanceType<typeof SCCCCEvent>} the constructed event
         */
        newEvent: function (row, organizers, event_id) {
            if (!organizers || !organizers.length) {
                organizers = [{ id: globals.RIDE_LEADER_TBD_ID, text: globals.RIDE_LEADER_TBD_NAME }];
            }
            if (!row) throw new Error("no row object given");
            const event = new SCCCCEvent();
            event.location = row.location && !(row.location.startsWith("#")) ? row.location : "";
            event.route_ids = [row.routeURL.split('/')[4]];
            event.start_time = row.startTime;
            event.start_date = row.startDate;
            event.name = makeRideName(row);
            event.organizer_tokens = organizers.map(o => o.id + "");
            let address = row.address && !(row.address.startsWith("#")) ? row.address : "";
            let meet_time = dates.addMinutes(row.startTime, -15);
            const startTime = row.startTime instanceof Date ? row.startTime : new Date(row.startTime);
            const meetTimeDate = meet_time instanceof Date ? meet_time : (typeof meet_time === 'number' ? new Date(meet_time) : new Date());
            event.desc = createDescription(organizers.map(o => o.text), address, meetTimeDate, startTime, event_id);
            return event;
        },
        /**
         * @param {RWGPSEvent} rwgpsEvent
         * @returns {InstanceType<typeof SCCCCEvent>}
         */
        fromRwgpsEvent: function (rwgpsEvent) {
            const event = new SCCCCEvent();
            event.all_day = rwgpsEvent.all_day ? "1" : "0";
            event.desc = rwgpsEvent.desc ? rwgpsEvent.desc.replaceAll('\r', '') : '';
            event.location = rwgpsEvent.location;
            event.name = rwgpsEvent.name;
            event.organizer_tokens = rwgpsEvent.organizer_ids ? rwgpsEvent.organizer_ids.map(id => String(id)) : undefined;
            event.route_ids = rwgpsEvent.routes ? rwgpsEvent.routes.map((/** @type {{id: any}} */ r) => r.id + "") : [];
            const sd = (rwgpsEvent.starts_at ? new Date(rwgpsEvent.starts_at) : new Date());
            event.start_date = sd.toISOString();
            event.start_time = sd.toISOString();
            event.visibility = rwgpsEvent.visibility || 0;
            if (event.name && event.name.trim().endsWith(']')) {
                console.error(`Event name '${event.name}' should not end with ']' - this is likely a bug in the RWGPS event import code`);
            }
            return event;
        }
    }
}()

if (typeof module !== 'undefined') {
    module.exports = EventFactory;
}