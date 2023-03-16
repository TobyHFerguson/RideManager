if (typeof require !== 'undefined') {
    dates = require('./dates.js');
    Globals = require('./Globals.js');
    Event = require('./Event.js')
}
const EventFactory = function () {
    /**
     * Get a string that describes the ride
     * @param {String[]} leaders - array of ride leader organizers
     * @param {string} address - address
     * @param {date} meet_time - meeting time
     * @param {date} start_time - starting time
     * @returns string describing the ride
     */
    function createDescription(leaders, address, meet_time, start_time) {


        return `Ride Leader${leaders.length > 1 ? 's' : ''}: ${leaders.join(', ')}

    ${address}
          
Arrive ${dates.T12(meet_time)} for a ${dates.T12(start_time)} rollout.
  
All participants are assumed to have read and agreed to the clubs ride policy: https://scccc.clubexpress.com/content.aspx?page_id=22&club_id=575722&module_id=137709
  
Note: In a browser use the "Go to route" link below to open up the route.`;
    }



    function makeRideName(row, numRiders) {
        const name = (!row.RideName || Event.managedEventName(row.RideName))
            ? Event.makeManagedRideName(numRiders, row.StartDate, row.StartTime, row.Group, row.RouteName)
            : Event.makeUnmanagedRideName(row.RideName, numRiders);
        return name;
    }


    return {
        /**
         * @param {Row} row row object to make event from
         * @param {Organizers[]} organizers the organizers (i.e. ride leaders) for this event
         * @returns 
         */
        newEvent: function (row, organizers) {
            if (!organizers || !organizers.length) {
                organizers = [{ id: Globals.RIDE_LEADER_TBD_ID, text: Globals.RIDE_LEADER_TBD_NAME }]
            }
            if (!row) throw new Error("no row object given");
            const event = new Event();
            event.location = row.Location && !(row.Location.startsWith("#")) ? row.Location : "";
            event.route_ids = [row.RouteURL.split('/')[4]];
            const start = dates.convert(row.StartDate);
            const time = dates.convert(row.StartTime);
            start.setUTCHours(time.getUTCHours())
            start.setUTCMinutes(time.getUTCMinutes())
            start.setUTCSeconds(time.getUTCSeconds())
            start.setUTCMilliseconds(0);
            event.start_time = row.StartTime;
            event.start_date = row.StartDate;
            event.name = makeRideName(row, organizers.filter(o => o.id !== Globals.RIDE_LEADER_TBD_ID).length);
            event.organizer_tokens = organizers.map(o => o.id + "");
            let address = row.Address && !(row.Address.startsWith("#")) ? row.Address : "";
            let meet_time = dates.addMinutes(row.StartTime, -15);
            event.desc = createDescription(organizers.map(o => o.text), address, meet_time, row.StartTime);
            return event;
        },
        fromRwgpsEvent: function (rwgpsEvent) {
            const event = new Event();
            event.all_day = rwgpsEvent.all_day ? "1" : "0";
            event.desc = rwgpsEvent.desc ? rwgpsEvent.desc.replaceAll('\r', '') : '';
            event.location = rwgpsEvent.location;
            event.name = rwgpsEvent.name;
            event.organizer_tokens = rwgpsEvent.organizer_ids;
            event.route_ids = rwgpsEvent.routes ? rwgpsEvent.routes.map(r => r.id + "") : [];
            const sd = (rwgpsEvent.starts_at ? new Date(rwgpsEvent.starts_at) : new Date());
            event.start_date = sd;
            event.start_time = sd;
            event.visibility = rwgpsEvent.visibility;
            return event;
        }
    }
}()

if (typeof module !== 'undefined') {
    module.exports = EventFactory;
}