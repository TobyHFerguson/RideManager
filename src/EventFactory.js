// @ts-check
/// <reference path="./gas-globals.d.ts" />
if (typeof require !== 'undefined') {
    // @ts-ignore
    (SCCCCEvent = require('./Event'));
    var dates = require('./common/dates');
    var { getGroupNames } = require('./Groups');
    // @ts-ignore
    var { getGlobals } = require('./Globals');
}

const EventFactory = function () {
    const globals = getGlobals();

    /**
     * Get a string that describes the ride
     * @param {String[]} leaders - array of ride leader organizers
     * @param {string} address - address
     * @param {number | Date} meet_time - meeting time
     * @param {number | Date} start_time - starting time
     * @returns string describing the ride
     */
    /**
     * @param {string[]} leaders
     * @param {string} address
     * @param {Date} meet_time
     * @param {Date} start_time
     * @param {string} event_id
     */
    function createDescription(leaders, address, meet_time, start_time, event_id) {
        const result =
            `Ride Leader${leaders.length > 1 ? 's' : ''}: ${leaders.join(', ')}

${address}

Arrive ${dates.T12(meet_time)} for a ${dates.T12(start_time)} rollout.

Participant List: ${globals.RSVP_BASE_URL}?event=${event_id}

All participants are assumed to have read and agreed to the clubs ride policy: ${globals.CLUB_RIDE_POLICY_URL}

Note: When using a browser use the "Go to route" link below to open up the route.`;
        return result;
    }

    /**
     * @param {any} row
     * @param {number} numRiders
     */
    function makeRideName(row, numRiders) {
        const name = (!row.RideName || SCCCCEvent.managedEventName(row.RideName, getGroupNames()))
            ? SCCCCEvent.makeManagedRideName(numRiders, row.StartDate, row.StartTime, row.Group, row.RouteName)
            : SCCCCEvent.makeUnmanagedRideName(row.RideName, numRiders);
        return name;
    }

    return {
        /**
         * @param {Row} row row object to make event from
         * @param {Organizer[]} organizers the organizers (i.e. ride leaders) for this event
         * @returns 
         */
        /**
         * @param {any} row
         * @param {Array<{id: number, text: string}>} organizers
         * @param {string} event_id
         */
        newEvent: function (row, organizers, event_id) {
            if (!organizers || !organizers.length) {
                organizers = [{ id: globals.RIDE_LEADER_TBD_ID, text: globals.RIDE_LEADER_TBD_NAME }];
            }
            if (!row) throw new Error("no row object given");
            const event = new SCCCCEvent();
            event.location = row.Location && !(row.Location.startsWith("#")) ? row.Location : "";
            event.route_ids = [row.RouteURL.split('/')[4]];
            event.start_time = row.StartTime;
            event.start_date = row.StartDate;
            event.name = makeRideName(row, organizers.filter(o => o.id !== globals.RIDE_LEADER_TBD_ID).length);
            event.organizer_tokens = organizers.map(o => o.id + "");
            let address = row.Address && !(row.Address.startsWith("#")) ? row.Address : "";
            let meet_time = dates.addMinutes(row.StartTime, -15);
            const startTime = row.StartTime instanceof Date ? row.StartTime : new Date(row.StartTime);
            const meetTimeDate = meet_time instanceof Date ? meet_time : (typeof meet_time === 'number' ? new Date(meet_time) : new Date());
            event.desc = createDescription(organizers.map(o => o.text), address, meetTimeDate, startTime, event_id);
            return event;
        },
        /**
         * @param {any} rwgpsEvent
         */
        fromRwgpsEvent: function (rwgpsEvent) {
            const event = new SCCCCEvent();
            event.all_day = rwgpsEvent.all_day ? "1" : "0";
            event.desc = rwgpsEvent.desc ? rwgpsEvent.desc.replaceAll('\r', '') : '';
            event.location = rwgpsEvent.location;
            event.name = rwgpsEvent.name;
            event.organizer_tokens = rwgpsEvent.organizer_ids;
            event.route_ids = rwgpsEvent.routes ? rwgpsEvent.routes.map((/** @type {{id: any}} */ r) => r.id + "") : [];
            const sd = (rwgpsEvent.starts_at ? new Date(rwgpsEvent.starts_at) : new Date());
            event.start_date = sd.toISOString();
            event.start_time = sd.toISOString();
            event.visibility = rwgpsEvent.visibility;
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