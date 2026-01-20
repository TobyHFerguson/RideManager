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
    // === DOMAIN FIELDS (used by business logic) ===
    /** @type {string | undefined} v1 API field name */
    this.description = undefined;
    /** @type {string | undefined} */
    this.location = undefined;
    /** @type {string | undefined} */
    this.name = undefined;
    /** @type {number[] | undefined} v1 API field name - numbers per OpenAPI spec */
    this.organizer_ids = undefined;
    /** @type {number[] | undefined} numbers per OpenAPI spec */
    this.route_ids = undefined;
    
    // PRIMARY DATE/TIME STORAGE: Domain uses Date object
    // start_date and start_time are computed getters/setters for API compatibility
    /** @type {Date | undefined} Primary storage for start date/time */
    this._startDateTime = undefined;
    
    // NOTE: API-only fields (visibility, all_day) are NOT stored in SCCCCEvent.
    // They are added by buildV1EditEventPayload with sensible defaults:
    // - visibility: 'public' (string per OpenAPI spec)
    // - all_day: false (boolean per OpenAPI spec)
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

  // === PRIMARY DATE/TIME ACCESSORS ===
  
  /**
   * Get the start date/time as a Date object (primary storage)
   * @returns {Date | undefined}
   */
  get startDateTime() {
    return this._startDateTime;
  }

  /**
   * Set the start date/time from a Date object (primary storage)
   * @param {Date | undefined} value
   */
  set startDateTime(value) {
    this._startDateTime = value;
  }

  // === API-COMPATIBLE COMPUTED GETTERS/SETTERS ===
  
  /**
   * Get start_date in v1 API format (YYYY-MM-DD), computed from _startDateTime
   * @returns {string | undefined}
   */
  get start_date() {
    if (!this._startDateTime) return undefined;
    const year = this._startDateTime.getFullYear();
    const month = String(this._startDateTime.getMonth() + 1).padStart(2, '0');
    const day = String(this._startDateTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Set start_date from v1 API format (YYYY-MM-DD), preserving existing time or defaulting to midnight
   * @param {string | undefined} value
   */
  set start_date(value) {
    if (!value) {
      this._startDateTime = undefined;
      return;
    }
    // Parse date, preserve existing time or use midnight
    const existingTime = this._startDateTime 
      ? { hours: this._startDateTime.getHours(), minutes: this._startDateTime.getMinutes() }
      : { hours: 0, minutes: 0 };
    this._startDateTime = new Date(`${value}T00:00:00`);
    this._startDateTime.setHours(existingTime.hours, existingTime.minutes, 0, 0);
  }

  /**
   * Get start_time in v1 API format (HH:MM), computed from _startDateTime
   * @returns {string | undefined}
   */
  get start_time() {
    if (!this._startDateTime) return undefined;
    const hours = String(this._startDateTime.getHours()).padStart(2, '0');
    const minutes = String(this._startDateTime.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Set start_time from v1 API format (HH:MM), preserving existing date or using today
   * @param {string | undefined} value
   */
  set start_time(value) {
    if (!value) {
      // Setting time to undefined clears the whole datetime
      this._startDateTime = undefined;
      return;
    }
    const [hours, minutes] = value.split(':').map(Number);
    if (!this._startDateTime) {
      // Create a date with today and the given time
      this._startDateTime = new Date();
      this._startDateTime.setHours(hours, minutes, 0, 0);
    } else {
      // Preserve existing date, update time
      this._startDateTime.setHours(hours, minutes, 0, 0);
    }
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

