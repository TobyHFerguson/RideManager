if (typeof require) {
    var dates = require('./dates.js');
    var Globals = require('./Globals.js');
    var Event = require('./Event.js')
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

    Address: ${address}
          
Arrive ${dates.T12(meet_time)} for a ${dates.T12(start_time)} rollout.
  
All participants are assumed to have read and agreed to the clubs ride policy: https://scccc.clubexpress.com/content.aspx?page_id=22&club_id=575722&module_id=137709
  
Note: In a browser use the "Go to route" link below to open up the route.`;
    }

    /**
     * 
     * @param {string} names - comma separated list of ride leader names
     * @param {RWGPS} rwgps - rwgps object to lookup organizers with
     * @returns one or more organizer objects
     */
    function getOrganizers(names, rwgps) {
        //convert the names into the organizer structure
        const organizers = names.split(',').map(name => rwgps.lookupOrganizer(Globals.A_TEMPLATE, name.trim()));
        //Figure out if any of the names are known
        const knownOrganizers = organizers.filter(o => o.id !== Globals.RIDE_LEADER_TBD_ID)
        //If any names are known then return them, else return the TBD organizer
        return (knownOrganizers.length ? knownOrganizers : { id: Globals.RIDE_LEADER_TBD_ID, text: Globals.RIDE_LEADER_TBD_NAME });
    }

    function makeRideName(row, numRiders) {
        return row.RideName ?
            Event.makeUnmanagedRideName(row.RideName, numRiders) :
            Event.makeManagedRideName(numRiders, row.StartDate, row.Group, row.RouteName);
    }
    return {
        fromRow: function (row, rwgps) {
            if (!row) throw new Error("no row object given");
            if (!rwgps) throw new Error("no rwgps object given");
            const event = new Event();
            event.location = row.Location && !(row.Location.startsWith("#")) ? row.Location : "";
            event.route_ids = [row.RouteURL.split('/')[4]];
            event.start_time = dates.T12(row.StartTime);
            event.start_date = row.StartDate.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
            const organizers = getOrganizers(row.RideLeader, rwgps);
            event.name = makeRideName(row, organizers.length);
            event.organizer_tokens = organizers.map(o => o.id + "");
            let address = row.Address && !(row.Address.startsWith("#")) ? row.Address : "";
            let meet_time = (new Date(Number(row.StartTime) - 15 * 60 * 1000));
            event.desc = createDescription(organizers.map(o => o.text), address, meet_time, row.StartTime);
            return event;
        }
    }
}()

if (typeof module !== 'undefined') {
    module.exports = EventFactory;
}