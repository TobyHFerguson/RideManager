// @ts-check
/// <reference path="./gas-globals.d.ts" />

if (typeof require !== 'undefined') {
  var dates = require('./common/dates');
}

var SCCCCEvent = (function() {

class SCCCCEvent {
  // Managed names can be of the form:
  // Mon A 1/1 10:00 AM Ride route name
  // Mon A 1/1 10:00 route name

  // the sub patterns are:
  // 3 letter capitalized day name
  // 2 digit month / 2 digit day (US Style dates)
  // 2 digit hour : 2 digit minute AM or PM (12 hour times)

  // In addition, there can be an optional 'CANCELLED: ' prefix.

  /**
   * @param {string[]} [groupNames]
   */
  static makeManagedRE(groupNames = []) {
    const grps = groupNames.join('|');
    const MANAGED_RE_STR = `^(?<cancelled>(CANCELLED: )?)(?<meta>[MTWFS][a-z]{2} (${grps}) \\(\\d{1,2}\\/\\d{1,2} \\d\\d:\\d\\d( [AP]M)?\\) ?)(?<suffix>.*$)`;
    const MANAGED_RE = new RegExp(MANAGED_RE_STR);
    return MANAGED_RE;
  }
  /**
   * Create the name of a Managed Event. A Managed Event is one where this code is
   * responsible for all parts of the name and the Event body.
   * 
   * @param {Date} startDateTime event start date/time
   * @param {string} groupName name of group
   * @param {string} route_name name of route
   * @returns {string} name of event
   */
  static makeManagedRideName(startDateTime, groupName, route_name) {
    return `${dates.weekday(startDateTime)} ${groupName} (${dates.MMDD(startDateTime)} ${dates.T24(startDateTime)}) ${route_name}`;
  }
  /**
   * Create the unmanaged event name by appending or updating the participant count to the main name
   * @param {string} eventName the current event name
   * @returns {string} the new event name
   */
  static makeUnmanagedRideName(eventName) {
    const li = eventName.lastIndexOf(' [');
    const name = (li != -1) ? eventName.slice(0, li) : eventName;
    let newName = `${name}`;
    return newName;
  }
  /**
   * Return true iff this is a Managed Ride - which means that either there is no eventName, or the eventName matches a REGEXP
   * @param {string} eventName the event name
   * @param{string[]} groupNames a list of all possible groups
   * @returns {boolean} true iff this is a managed ride
   */
  static managedEventName(eventName, groupNames) {
    const RE = SCCCCEvent.makeManagedRE(groupNames);
    return !eventName || RE.test(eventName);
  }


  constructor() {
    // === v1 API NATIVE FIELDS (passed directly to API) ===
    this.all_day = '0';
    this.auto_expire_participants = '1';
    /** @type {string | undefined} v1 API field name */
    this.description = undefined;
    /** @type {string | undefined} */
    this.location = undefined;
    /** @type {string | undefined} */
    this.name = undefined;
    /** @type {string[] | undefined} v1 API field name */
    this.organizer_ids = undefined;
    /** @type {string[] | undefined} */
    this.route_ids = undefined;
    /** @type {string | undefined} v1 API field: "2025-01-20" */
    this.start_date = undefined;
    /** @type {string | undefined} v1 API field: "09:00" */
    this.start_time = undefined;
    /** @type {number} */
    this.visibility = 0;
  }

  // === LEGACY ALIASES (for backward compatibility during migration) ===
  
  /** @deprecated Use description instead */
  get desc() { return this.description; }
  /** @deprecated Use description instead */
  set desc(v) { this.description = v; }
  
  /** @deprecated Use organizer_ids instead */
  get organizer_tokens() { return this.organizer_ids; }
  /** @deprecated Use organizer_ids instead */
  set organizer_tokens(v) { this.organizer_ids = v; }

  // === CONVENIENCE GETTER/SETTER for startDateTime ===
  
  /**
   * Get startDateTime computed from start_date and start_time
   * @returns {Date | undefined}
   */
  get startDateTime() {
    if (this.start_date && this.start_time) {
      return new Date(`${this.start_date}T${this.start_time}`);
    }
    return undefined;
  }

  /**
   * Set start_date and start_time from a Date object
   * @param {Date | undefined} value
   */
  set startDateTime(value) {
    if (!value) {
      this.start_date = undefined;
      this.start_time = undefined;
      return;
    }
    // Format as YYYY-MM-DD
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    this.start_date = `${year}-${month}-${day}`;
    // Format as HH:MM
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    this.start_time = `${hours}:${minutes}`;
  }
  isCancelled() {
    return this.name ? this.name.startsWith('CANCELLED: ') : false;
  }
  cancel() {
    this.name = this.isCancelled() ? this.name  : `CANCELLED: ${this.name || ''}`;
    return this;
  }
  reinstate() {
    this.name = this.name ? this.name.replace('CANCELLED: ', '') : '';
    return this;
  }

  /**
   * @param {string[]} groupNames
   */
  managedEvent(groupNames) {
    const result = SCCCCEvent.managedEventName(this.name || '', groupNames);
    return result;
  }
  /**
   * @param {string} name
   * @param {string[]} groupNames
   */
  static getGroupName(name, groupNames) {
    const match = SCCCCEvent.makeManagedRE(groupNames).exec(name);
    if (match && match.groups) {
      return match.groups.meta.split(' ')[1];
    }
    return '';
  }
}

// For GAS: Ensure SCCCCEvent is available globally regardless of file load order
// The Exports pattern with getters handles lazy evaluation
return SCCCCEvent;
})();

if (typeof module !== 'undefined') {
  module.exports = SCCCCEvent;
}

