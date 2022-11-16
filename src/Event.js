if (typeof require !== 'undefined') {
  dates = require('./dates.js');
}

const MANAGED_RE = /(?<prefix>[MTWFS][a-z]{2} (([ABC] \(\d{1,2}\/\d{1,2} \d\d:\d\d\))|('[ABC]' Ride \(\d{1,2}\/\d{1,2} \d\d:\d\d [AP]M\))))( \[(\d{1,2})\])*(?<suffix>.*$)/



class Event {
  /**
   * Create the name of a Managed Event. A Managed Event is one where this code is
   * responsible for all parts of the name and the Event body.
   * 
   * Note that due to the vagaries of Google Spreadsheets the start date and start time are independent, although both are a date and a time!
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
    const li = eventName.lastIndexOf(' [');
    const name = (li != -1) ? eventName.slice(0, li) : eventName;
    let newName = `${name} [${numRiders}]`;
    return newName;
  }
  /**
   * Return true iff this is a Managed Ride
   * @param {string} eventName the event name
   * @returns {boolean} true iff this is a managed ride
   */
  static managedEvent(eventName) {
    return !eventName || MANAGED_RE.test(eventName);
  }

  static updateCountInName(name, count) {
    let match = MANAGED_RE.exec(name);
    if (match) {
      return `${match.groups.prefix} [${count}] ${match.groups.suffix.trim()}`;
    }
    return Event.makeUnmanagedRideName(name, count);
  }
  constructor() {
    this.all_day = '0',
      this.auto_expire_participants = '1',
      this.desc = undefined,
      this.location = undefined,
      this.name = undefined,
      this.organizer_tokens = undefined,
      this.route_ids = undefined,
      this.start_date = undefined,
      this.start_time = undefined,
      this.visibility = 0
  }
  cancel() {
    if (!this.name.startsWith('CANCELLED: '))
      this.name = 'CANCELLED: ' + this.name;
    return this;
  }

  updateRiderCount(numRiders) {
    this.name = Event.updateCountInName(this.name, numRiders);
    return this;
  }
}

if (typeof module !== 'undefined') {
  module.exports = Event;
}

