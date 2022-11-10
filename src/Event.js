

const PUBLIC = 0;
const EVENT_MANAGERS_ONLY = 1;
const MEMBERS_ONLY = 2;



class Event {
  /**
   * Create the name of a Managed Event. A Managed Event is one where this code is
   * responsible for all parts of the name and the Event body
   * @param {number} numRiders number of riders for this event
   * @param {date} start_date event start date
   * @param {date} start_time event start time
   * @param {Group} group one of 'A', 'B', or 'C'
   * @param {string} route_name name of route
   * @returns {string} name of event
   */
  static makeManagedRideName(numRiders, start_date, start_time, group, route_name) {
    return `${dates.weekday(start_date)} ${group} (${dates.MMDD(start_date)} ${dates.T24(start_time)}) [${numRiders}] ${route_name}`;
  }
  /**
   * Create the unmanaged event name by appending or updating the participant count to the main name
   * @param {string} eventName the current event name
   * @param {number} numRiders the number of riders
   * @returns {string} the new event name
   */
  static makeUnmanagedRideName(eventName, numRiders) {
    const re = /(.*?)\s\[[\d{(1,2)}]\]/;
    let name = re.exec(eventName);
    name = name ? name[1] : eventName;
    let newName = `${name} [${numRiders}]`;
    return newName;
  }
  /**
   * Return true iff this is a Managed Ride
   * @param {string} eventName the event name
   * @returns {boolean} true iff this is a managed ride
   */
  static managedEvent(eventName) {
    const re = /[MTWFS][a-z]{2}\s[ABC]\s\([^)]{11}\)\s\[\d{1,2}].*/
    return re.test(eventName);
  }

  constructor(row) {


    if (typeof row == "undefined") {
      throw new RangeError("EventObject cannot be created with an undefined row");
    }


    this.row = row;
    this.errors = [];
    this.warnings = [];
    this.rowNum = row.rowNum;

    this.auto_expire_participants = "1";
    this.all_day = "0";
    this.visibility = PUBLIC;
    this.start_date = row.StartDate.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    this.start_time = row.StartTime.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "numeric" });
    this.meet_time = (new Date(Number(row.StartTime) - 15 * 60 * 1000)).toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "numeric" });
    this.group = row.Group;
    let url = row.RouteURL.split('?')[0]
    const response = UrlFetchApp.fetch(url + ".json");
    if (JSON.parse(response.getContentText()).user_id !== SCCCC_USER_ID) {
      throw new Error('Route is not owned by SCCCC');
    } else {
      this.route_ids = [row.RouteURL.split('/')[4]];
    }
    this.organizer_names = row.RideLeader.split(',').map(rl => rl.trim()).filter(rl => rl);
    this.name = row.RideName ? row.RideName : Event.makeManagedRideName(this.organizer_names.length, row.StartDate, row.StartTime, row.Group, row.RouteName);

    let y = row.Location;
    this.location = row.Location !== undefined && row.Location !== null && row.Location !== "" && row.Location !== "#VALUE!" && row.Location !== "#N/A" ? row.Location : "";
    this.address = row.Address !== undefined && row.Address !== null && row.Address !== "" && row.Address !== "#VALUE!" && row.Address !== "#N/A" ? row.Address : "";

    this.desc = `${this.address}
          
Arrive ${this.meet_time} for a ${this.start_time} rollout.
  
All participants are assumed to have read and agreed to the clubs ride policy: https://scccc.clubexpress.com/content.aspx?page_id=22&club_id=575722&module_id=137709
  
Note: In a browser use the "Go to route" link below to open up the route.`;

    return this;
  }

  cancel() {
    this.name = 'CANCELLED: ' + this.name;
    this.desc = 'CANCELLED'
    this.row.setRideLink(this.name, this.getRideLinkURL());
  }

  setRideLink(url) {
    this.row.setRideLink(this.name, url);
  }

  updateRiderCount(numRiders) {
    if (Event.managedEvent(this.name)) {
      this.name = Event.makeManagedRideName(numRiders, this.row.StartDate, this.row.StartTime, this.row.Group, this.row.RouteName);
    } else {
      this.name = Event.makeUnmanagedRideName(this.name, numRiders);
    }
    this.row.setRideLink(this.name, this.getRideLinkURL());
  }

  getRideLinkURL() {
    return this.row.RideURL;
  }

  deleteRideLinkURL() {
    this.row.deleteRideLink();
  }
}

if (typeof module !== 'undefined') {
  module.exports = Event;
}

