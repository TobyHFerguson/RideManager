if (typeof require !== 'undefined') {
  Globals = require('./Globals.js')
}
function DEBUG_(message) {
  Logger.log(`DEBUG: ${message}`);
}

/**
 * Class RWGPS represents the services that are obtained by using event urls
 */
class RWGPS {
  constructor(rwgpsService) {
    this.rwgpsService = rwgpsService;
  }
  getRSVPObject(event_id) {
    if (!event_id) {
      console.log(`RWGPS.getRSVPObject(${event_id}) with no event_id`)
      return { name: 'No event id given', participants: [] }
    }
    if (isNaN(event_id)) {
      console.log(`RWGPS.getRSVPObject(${event_id}) has been called with a non-number argument`);
      return { name: `I was expecting a numeric event id but got this: ${event_id}`, participants: []}
    }
    try {
      return this.getRSVPObjectByURL(Globals.EVENTS_URI + event_id)
    } catch (e) {
      Logger.log(e)
      return { name: `No such event: ${event_id}`, participants: []}
    }
  }
  getRSVPObjectByURL(e_url) {
    function getEventName(response) {
      if (response.getResponseCode() !== 200) {
        console.log(`Response code: ${response.getResponseCode()} body: ${response.getContentText()}`)
        return JSON.parse(response.getContentText()).status
      }
      return JSON.parse(response.getContentText())["event"]["name"]
    }
    function getParticipants(response) {
      if (response.getResponseCode() !== 200) {
        console.log(`Response code: ${response.getResponseCode()} body: ${response.getContentText()}`)
        return []
      }
      const body = response.getContentText();
      const json = JSON.parse(body);
      return json.filter(p => {
        return p.rsvp_status.toLowerCase() === "yes" && (p.first_name || p.last_name)
      }).map(p => { return { first_name: p.first_name ? p.first_name.trim() : p.first_name, last_name: p.last_name ? p.last_name.trim() : p.last_name} })
    }
    function getLeaders(response) {
      if (response.getResponseCode() !== 200) {
        Logger.log(`Response code: ${response.getResponseCode()} body: ${response.getContentText()}`)
        return []
      }
      const body = response.getContentText();
      const json = JSON.parse(body);
      return json.filter(o => o.id !== Globals.RIDE_LEADER_TBD_ID).map(o => {
        const n = o.text.trim().split(/\s+/)
        return { first_name: n[0], last_name: n.length > 1 ? n[1] : '', leader: true }
      })
    }
    function compareNames(l, r) {
      const a = (l.last_name + l.first_name).toLowerCase()
      const b = (r.last_name + r.first_name).toLowerCase()
      const result = a < b ? -1 : a > b ? 1 : 0
      return result;
    }
    const p_url = e_url + "/participants.json";
    const o_url = e_url + "/organizer_ids.json";
    const responses = this.rwgpsService.getAll([e_url, p_url, o_url], { muteHttpExceptions: false })
    let participants = getParticipants(responses[1]);
    const leaders = getLeaders(responses[2]);
    participants.forEach(p => {
      const li = leaders.findIndex(l => {
        return compareNames(l, p) === 0;
      });
      if (li !== -1) {
        p.leader = true;
        leaders.splice(li, 1)
      }
    })
    participants = [...participants, ...leaders].sort(compareNames)

    const rsvpObject = {
      name: getEventName(responses[0]),
      participants: participants
    }
    return rsvpObject
  }


  /**
   * Return the counts for each of the given event urls.
   * A count of 0 is given for any url that throws an error, and a log message is recorded.
   * @param {string[]} event_urls 
   * @param{string[]} rideLeaders - array of array of ride leader names, corresponding to the event_urls
   * @returns{Number[]} the counts, in the same order as the corresponding event url.
   */
  getRSVPCounts(event_urls, rideLeaders) {
    if (!event_urls || event_urls.length === 0) {
      return [0]
    }
    return event_urls.map(u => this.getRSVPObjectByURL(u).participants.length)
  }

  /**
   * Returns the basic url of the event created by coping the given template
   * @param {string} template_url - url of the RWGPS template to be copied
   * @returns the url of the copied event ending in digits
   */
  copy_template_(template_url) {
    let response = this.rwgpsService.copy_template_(template_url);
    const headers = response.getAllHeaders();
    return headers['Location'].split('-')[0];
  }
  /**
   * Get the event at the URL
   * @param{string} event_url
   * @returns{object} the event object
   */
  get_event(event_url) {
    let response = this.rwgpsService.getAll([event_url]);
    return JSON.parse(response[0].getContentText())["event"];
  }

  /**
   * Get the events at the given URLs. 
   * @param{string[]} event_urls
   * @return{Event[]} events at the given urls
   * 
   * For each url that results in an error the event will be undefined.
   */
  get_events(event_urls) {
    const responses = this.rwgpsService.getAll(event_urls);
    const events = responses.map((r, i) => {
      const text = r.getContentText();
      const body = JSON.parse(r.getContentText());
      if (r.getResponseCode() !== 200) {
        console.log(`RWGPS.get_events: Error (${r.getResponseCode()}) getting ${event_urls[i]}: ${text}`);
      }
      const event = body["event"];
      return event;
    });
    return events;
  }
  /**
   * Edit the scheduled event at the given url to be consistent with the given event object
   * @param{event_url} string - the scheduled event to be modified
   * @param{event} event object - the event to be used as the source of the changes
   */
  edit_event(event_url, event) {
    // RWGPS bug that prevents an event from being properly scheduled if all_day is not set.
    let new_event = { ...event, all_day: "1" }
    let response = this.rwgpsService.edit_event(event_url, new_event);
    response = this.rwgpsService.edit_event(event_url, event);
    if (response.getResponseCode() >= 500) {
      throw Error(`received a code ${response.getResponseCode()} when editing event ${event_url}`);
    }
    return response;
  }

  /**
   * @typedef EventEditObject
   * @prop{string} url - an event url
   * @prop{Event} event - an Event
   */

  /**
   * Edit the events as defined by the list of eventEditObjects
   * @param {EventEditObject[]} eventEditObjects 
   * @returns the resulting events
   */
  edit_events(eventEditObjects) {
    // These next two lines are to work around an RWGPS bug
    const eeos = eventEditObjects.map(({ event, url }) => { return { event: { ...event, all_day: "1" }, url } });
    this.edit_events_(eeos);

    const events = this.edit_events_(eventEditObjects);
    return events;
  }
  edit_events_(eventEditObjects) {
    const responses = this.rwgpsService.edit_events(eventEditObjects);
    const events = responses.map(response => response["event"]);
    return events;
  }
  batch_delete_events(event_urls) {
    let event_ids = event_urls.map(e => e.split('/')[4].split('-')[0]);
    return this.rwgpsService.batch_delete_events(event_ids);
  }
  /**
   * Add the tags to the events. Both arrays must be non-empty. Idempotent.
   * @param {string[]} event_urls - the array of event urls
   * @param {string[]} tags - the tags
   * @returns 
   */
  tagEvents(event_urls, tags) {
    let event_ids = event_urls.map(e => e.split('/')[4].split('-')[0]);
    return this.rwgpsService.tagEvents(event_ids, tags);
  }
  /**
   * Remove the tags from the events. Both arrays must be non-empty. Idempotent.
   * @param {string[]} event_urls - the event urls
   * @param {string[]} tags - the tags
   */
  unTagEvents(event_urls, tags) {
    let event_ids = event_urls.map(e => e.split('/')[4].split('-')[0]);
    this.rwgpsService.unTagEvents(event_ids, tags);
  }

  /**
   * The Organizer (i.e. ride leader) of an event
   * @typedef Organizer 
   * @property {string} id the organizer id
   * @property {string} text the organizer's name
   */
  /**
     * 
     * @param {string[]} names - list of ride leader names
     * @param {RWGPS} rwgps - rwgps object to lookup organizers with
     * @returns {Organizer[]} one or more organizer objects
     */
  getOrganizers(names) {
    if (!names) return [];
    //convert the names into the organizer structure
    const organizers = names.map(name => this.lookupOrganizer(Globals.A_TEMPLATE, name.trim()));
    //Figure out if any of the names are known
    const knownOrganizers = organizers.filter(o => o.id !== Globals.RIDE_LEADER_TBD_ID)
    //If any names are known then return them, else return the TBD organizer
    return (knownOrganizers.length ? knownOrganizers : { id: Globals.RIDE_LEADER_TBD_ID, text: Globals.RIDE_LEADER_TBD_NAME });
  }
  /**
   * lookup the organizer id given an event url and the organizer name
   * @param{url} string - the event url
   * @param{name} string - the organizer's name
   * @return{string} - the organizer's id
   */
  lookupOrganizer(url, organizer_name) {
    let TBD = { text: Globals.RIDE_LEADER_TBD_NAME, id: Globals.RIDE_LEADER_TBD_ID };
    if (!organizer_name) {
      return TBD;
    }
    // Make a string that can be easily and accurately compared - lowercase, all strings prefix, infix, suffix removed
    const on_lc = organizer_name.toLowerCase().split(' ').join('');
    const response = this.rwgpsService.getOrganizers(url, organizer_name);
    const rc = response.getResponseCode();
    if (rc == 200 || rc == 404) {
      try {
        const content = JSON.parse(response.getContentText());
        const names = content.results;
        let found = names.find(n => n.text.toLowerCase().split(' ').join('') === on_lc);
        if (!found) {
          found = { text: organizer_name, id: Globals.RIDE_LEADER_TBD_ID }
        }
        return found;
      } catch (e) {
        Logger.log(`RWGPS.lookupOrganizer(${url}, ${organizer_name}) threw ${e}`);
        Logger.log(`RWGPS.lookupOrganizer(${url}, ${organizer_name}) content text: ${response.getContentText()}`);
        throw (e);
      }
    }
    return TBD;
  }

  /**
 * Determine if named ride leader is known
 * @param {string} name first and last name of ride leader whose status is to be determined
 * @return {boolean} true iff the ride leader is not the default
 */
  knownRideLeader(name) {
    return this.lookupOrganizer(Globals.A_TEMPLATE, name).id !== Globals.RIDE_LEADER_TBD_ID;
  }

  /**
   * @typedef ForeignRoute
   * @type {Object}
   * @property {string} url - the foreign route's url
   * @property {Number} [visibility = 0] - the visibility to set the imported route to. Defaults to 0 (Public)
   * @property {string} [name] - the name of the imported route. Defaults to the foreign route's name.
   * @property {Date} [expiry] - date that the imported route should be expired.
   */
  /**
   * Import a route from a foreign route URL into the club library
   * @param {string |ForeignRoute} route - the foreign route url or object
   * @returns {string} url - the url of the new route in the club library
   */
  importRoute(route) {
    let fr;
    if (typeof route === typeof "") {
      fr = { url: route }
    } else {
      fr = route;
    }

    const response = this.rwgpsService.importRoute(fr);
    const body = JSON.parse(response.getContentText());
    if (body.success) {
      this.setRouteExpiration(body.url, fr.expiry);
    }
    return body.url;
  }
  /**
   * Return the object at the given route url
   * @param {string} route_url - url of route to be fetched
   */
  getRouteObject(route_url) {
    const response = this.rwgpsService.get(route_url);
    const o = JSON.parse(response.getContentText());
    return o;
  }

  /**
   * Set the expiration date of the given route to the latter of the route's current expiration date or its new one
   * @param {string} route_url - the url of the route whose expiration is to be set
   * @param {(string | Date)} [expiration_date] - the expiration date. No date removes the expiration date from the route.
   * @param {NumberLike} [extend_only = false] - When true only update the expiration if there's already an expiration date. If there's not then do nothing. When false then add the expiration regardless.
   * @returns {object} returns this for chaining
   */
  setRouteExpiration(route_url, expiration_date, extend_only = false) {
    if (!route_url) {
      return this;
    }
    const self = this;
    function findExpirationTag(route_url) {
      const route = self.getRouteObject(route_url);
      if (route.tag_names) {
        const ix = route.tag_names.findIndex(element => element.startsWith("expires: "));
        return route.tag_names[ix]
      }
    }
    function deleteExpirationTag() {
      const etag = findExpirationTag(route_url);
      if (etag) {
        const id = route_url.split('/')[4].split('-')[0];
        self.rwgpsService.unTagRoutes([id], [etag]);
      }
    }
    function getExpirationDate(etag) {
      return etag.split(": ")[1];
    }
    function makeExpirationTag(date) {
      return `expires: ${dates.MMDDYYYY(date)}`
    }

    if (!expiration_date) {
      deleteExpirationTag(route_url);
    } else {
      // cet: Current Expiration Tag
      const cet = findExpirationTag(route_url);
      if (!cet) { // No expiration tag
        if (extend_only) {
          // no-op! We've not got an expiration date but we've been told only to extend!
        } else {
          // No expiration date, but we're not extending, so add a new tag
          const id = route_url.split('/')[4].split('-')[0];
          this.rwgpsService.tagRoutes([id], [makeExpirationTag(expiration_date)]);
        }
      } else {
        // we have an expiration tag; extend_only doesn't matter here; We'll replace the tag.
        const ced = getExpirationDate(cet);
        if (dates.compare(ced, expiration_date) < 0) {
          const id = route_url.split('/')[4].split('-')[0];
          this.rwgpsService.unTagRoutes([id], [cet]);
          this.rwgpsService.tagRoutes([id], [makeExpirationTag(expiration_date)]);
        }
      }
    }
    return this;
  }
}


/**
 * This is the event I've gleaned from a working session with Chrome. It contains every property I might wish to set. 
 * Only properties from this event should be sent to RWGPS - not sure that it actually matters, but when debugging its
 * one of the things the engineers wanted to ensure. 
 */
const CANONICAL_EVENT = {
  "id": 188822,
  "name": "My New Name",
  "desc": "This is the description",
  "group_id": 5278668,
  "group_membership_id": 642972,
  "created_at": "2022-08-02T15:24:30-07:00",
  "updated_at": "2022-08-02T15:24:30-07:00",
  "official": false,
  "starts_on": null,
  "custom_tabs": "[]",
  "location": "Aptos Village",
  "slug": "188822-copied-event",
  "ends_on": null,
  "cost_in_cents": null,
  "visibility": "1",
  "starts_at": null,
  "ends_at": null,
  "request_age_and_gender": "0",
  "filter_gender": "1",
  "filter_age": "1",
  "age_splits": "35,55",
  "participant_duration": null,
  "request_email": "0",
  "organizer_ids": [
    []
  ],
  "event_series_id": null,
  "archived_at": null,
  "all_day": "0",
  "implicit_ends_at": null,
  "organizer_names_formal": [],
  "user": {
    "id": 621846,
    "name": "Santa Cruz County Cycling Club"
  },
  "creating_group": {
    "name": "",
    "visibility": 0,
    "slug": null
  },
  "start_date": "2022-08-31",
  "start_time": "",
  "end_date": "",
  "end_time": "",
  "repeat_frequency": "does not repeat",
  "weekly_repeat_every": "1",
  "weekly_repeat_until": "2022-09-02",
  "monthly_repeat_every": "0",
  "monthly_repeat_on": "0",
  "monthly_repeat_until": "2022-09-02",
  "organizer_tokens": "302732",
  "auto_expire_participants": "0",
  "route_ids": ""
}


class RWGPSService {
  constructor(email, password) {
    this.sign_in(email, password);
  }
  /**
   * 
   * @param {ForeignRoute} routeObject - the foreign route object to be imported
   * @return {string} the url of the imported route
   */
  importRoute(routeObject) {
    const url = routeObject.url + "/copy.json";
    const payload = {
      "user_id": 621846,
      "asset_type": "route",
      "privacy_code": null,
      "include_photos": false,
      ...routeObject
    }
    const options = {
      method: 'post',
      headers: {
        cookie: this.cookie,
        Accept: 'application/json'
      },
      followRedirects: false,
      muteHttpExceptions: false,
      payload: payload
    }
    return this._send_request(url, options);
  }
  /**
* Select the keys and values of the left object where every key in the left is in the right
* @param{left} object
* @param{right} object
* @return object - the new object created
*/
  key_filter(left, right) {
    let no = { ...left };
    let left_keys = Object.keys(no);
    let right_keys = Object.keys(right);
    left_keys.filter(k => !right_keys.includes(k)).forEach(k => delete no[k])
    return no;
  }

  _send_request(url, options) {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getAllHeaders()['Set-Cookie'] !== undefined) {
      const newCookie = response.getAllHeaders()['Set-Cookie'].split(';')[0];
      this.cookie = newCookie;
    }
    return response;
  }
  sign_in(email, password) {
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'user-email': email,
        'user-password': password
      },
      followRedirects: false
    };
    let response = this._send_request(Globals.SIGN_IN_URI, options);
    if (response.getResponseCode() == 302 && response.getAllHeaders()["Location"] === "https://ridewithgps.com/signup") {
      throw new Error("Could not sign in - invalid credentials for RWGPS");
    }
  }


  copy_template_(template_url) {
    const url = template_url + "/copy";
    const payload = {
      'event[name]': "COPIED EVENT",
      'event[all_day]': "0",
      'event[copy_routes]': "0",
      'event[start_date]': "",
      'event[start_time]': ""
    }
    const options = {
      method: 'post',
      headers: { 'cookie': this.cookie },
      followRedirects: false,
      muteHttpExceptions: false,
      payload: payload
    }
    return this._send_request(url, options);
  }

  /**
   * GET the given url
   * @param {string} url - the url whose resource is to be fetched
   * @returns {object} the response object
   */
  get(url) {
    const options = {
      method: 'get',
      headers: {
        cookie: this.cookie,
        Accept: "application/json" // Note use of Accept header - returns a 404 otherwise. 
      },
      followRedirects: false,
      muteHttpExceptions: false
    }
    return this._send_request(url, options);
  }
  edit_event(event_url, event) {
    let new_event = this.key_filter(event, CANONICAL_EVENT);
    const options = {
      method: 'put',
      contentType: 'application/json',
      payload: JSON.stringify(new_event),
      headers: {
        cookie: this.cookie,
        Accept: "application/json" // Note use of Accept header - returns a 404 otherwise. 
      },
      followRedirects: false,
      muteHttpExceptions: true
    }
    return this._send_request(event_url, options);
  }
  round_trip(event_url, event) {
    const options = {
      method: 'put',
      contentType: 'application/json',
      payload: JSON.stringify(event),
      headers: {
        cookie: this.cookie,
        Accept: "application/json" // Note use of Accept header - returns a 404 otherwise. 
      },
      followRedirects: false,
      muteHttpExceptions: false
    }
    return this._send_request(event_url, options);
  }

  /**
   * Delete multiple events
   * @param{event_ids} - an array containing the ids of the events to delete
   */
  batch_delete_events(event_ids) {
    let url = "https://ridewithgps.com/events/batch_destroy.json";
    const payload = { event_ids: event_ids.join() }
    const options = {
      method: 'post',
      headers: { 'cookie': this.cookie },
      followRedirects: false,
      payload: payload
    }
    return this._send_request(url, options);
  }
  /**
   * Update multiple tags on multiple resources
   * @param{!(NumberLike | NumberLike[])} ids - an id or an array of ids of the resources to be tagged
   * @param{!(string | string[])} tags - an optional tag or array of tags
   * @param{!string} tag_action - one of 'add' or 'remove' to indicate addition or removal of tags
   * @param{!string} resource - the kind of resource to be operated on, one of 'event' or 'route'
  */
  _batch_update_tags(ids, tag_action, tags, resource) {
    if (ids.length > 0 && tags.length > 0) {
      const url = `https://ridewithgps.com/${resource}s/batch_update_tags.json`;
      const payload = { tag_action, tag_names: tags.join() };
      payload[`${resource}_ids`] = ids.join();
      const options = {
        method: 'post',
        headers: { 'cookie': this.cookie },
        followRedirects: false,
        payload: payload
      }
      return this._send_request(url, options);
    }
  }

  /**
 * A number, or a string containing a number.
 * @typedef {(number|string)} NumberLike
 */
  /**
   * Add multiple tags to multiple events - idempotent
   * @param{NumberLike[]} ids - an array containing the ids of the events to add the tags to
   * @param{string[]} tags - an array of the tags to be added to the events
   */
  tagEvents(ids, tags) {
    return this._batch_update_tags(ids, "add", tags, 'event');
  }

  /**
   * remove multiple tags from multiple events - idempotent
   * @param{NumberLike[]} ids - an array containing the ids of the events to remove the tags from
   * @param{string[]} tags - an array of the tags to be removed from the events
   */
  unTagEvents(ids, tags) {
    return this._batch_update_tags(ids, "remove", tags, 'event');
  }

  /**
    * Add multiple tags to multiple routes - idempotent
    * @param{NumberLike[]} ids - an array containing the ids of the routes to add the tags to
    * @param{string[]} tags - an array of the tags to be added to the routes
    */
  tagRoutes(ids, tags) {
    return this._batch_update_tags(ids, "add", tags, 'route');
  }

  /**
  * Remove multiple tags from multiple routes - idempotent
  * @param{NumberLike[]} ids - an array containing the ids of the routes to add the tags to
  * @param{string[]} tags - an array of the tags to be removed from the routes
  */
  unTagRoutes(route_ids, tags) {
    return this._batch_update_tags(route_ids, "remove", tags, 'route');
  }

  getOrganizers(url, organizer_name) {
    url = `${url}/organizer_ids.json`;
    const payload = { term: organizer_name.split(' ')[0], page: 1 }
    const options = {
      method: 'post',
      headers: { 'cookie': this.cookie },
      followRedirects: false,
      payload: payload
    }
    return this._send_request(url, options);
  }

  getAll(urls, override = {}) {
    const requests = urls.map(url => {
      let r = {
        url,
        method: 'get',
        headers: {
          cookie: this.cookie,
          Accept: "application/json" // Note use of Accept header - returns a 404 otherwise. 
        },
        followRedirects: false,
        muteHttpExceptions: true,
        ...override
      };
      return r;
    })
    return UrlFetchApp.fetchAll(requests);
  }

  edit_events(eventEditObjects) {
    const self = this;
    function createRequest(eventEditObject) {
      let new_event = self.key_filter(eventEditObject.event, CANONICAL_EVENT);
      const request = {
        url: eventEditObject.url,
        method: 'put',
        contentType: 'application/json',
        payload: JSON.stringify(new_event),
        headers: {
          cookie: self.cookie,
          Accept: "application/json" // Note use of Accept header - returns a 404 otherwise. 
        },
        followRedirects: false,
        muteHttpExceptions: true
      }
      return request;
    }
    const requests = eventEditObjects.map(eeo => createRequest(eeo));
    const responses = UrlFetchApp.fetchAll(requests);
    return responses;
  }
}

if (typeof module !== 'undefined') {
  module.exports = { RWGPS, RWGPSService }
}

function printTimings_(times, prefix) {
  const total = times.reduce((p, t) => p + t, 0);
  const avg = total / times.length;
  const max = times.reduce((p, t) => p >= t ? p : t, 0);
  const min = times.reduce((p, t) => p <= t ? p : t, 10000);
  console.log(`${prefix} - Average: ${avg} min: ${min} max: ${max}, total: ${total}`);
}

//=========== Tests ===========
function testGetRSVPCounts() {
  const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
  const rwgps = new RWGPS(rwgpsService);
  const test_cases = [
    ['https://ridewithgps.com/events/196660-copied-event', 15],
    ['https://ridewithgps.com/events/193587-copied-event', 6],
    ['https://ridewithgps.com/routes/copied-event', 0]
  ];
  const counts = rwgps.getRSVPCounts(test_cases.map(tc => tc[0]));
  counts.forEach((actual, i) => {
    const uut = test_cases[i][0]
    const expected = test_cases[i][1];
    if (actual !== expected) {
      console.log(`Error - expected uut: ${uut} to give ${expected} but got ${actual}`)
    }
  })
}
function testGetEvents() {
  const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
  const rwgps = new RWGPS(rwgpsService);
  const events = rwgps.get_events([Globals.A_TEMPLATE, Globals.B_TEMPLATE]);
  if (!(events.length == 2)) console.log("didn't get the expected number of events");
}
function testEditEvents() {
  const NUMTESTS = 1;
  const NUMEVENTS = 5;
  const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
  const rwgps = new RWGPS(rwgpsService);
  function createTestEvents() {
    const urls = [];
    for (let i = 0; i < NUMEVENTS; i++) {
      urls.push(rwgps.copy_template_(Globals.A_TEMPLATE));
    }
    return urls;
  }

  function test(eventEditObjects, f) {
    const timings = [];

    for (let i = 0; i < NUMTESTS; i++) {
      const start = new Date();
      f(eventEditObjects);
      timings.push(new Date() - start);
    }
    printTimings_(timings, f.name);
  }

  function editSingle(eventEditObjects) {
    eventEditObjects.forEach(({ event, url }) =>
      rwgps.edit_event(url, event));
  }

  function editAll(eventEditObjects) {
    rwgps.edit_events(eventEditObjects);
  }

  function createEventEditObjects(urls) {
    let rwgpsEvents = rwgpsService.getAll(urls).map(resp => JSON.parse(resp.getContentText()));
    let events = rwgpsEvents.map(e => EventFactory.fromRwgpsEvent(e));
    let eventEditObjects = events.map((e, i) => { return { event: e, url: urls[i] } });
    return eventEditObjects;
  }
  let urls = createTestEvents();
  let eventEditObjects = createEventEditObjects(urls);
  eventEditObjects.forEach(({ event, url }) => event.name = "EDIT SINGLE TEST");
  test(eventEditObjects, editSingle);
  // rwgps.batch_delete_events(urls);
  urls = createTestEvents();
  eventEditObjects = createEventEditObjects(urls);
  eventEditObjects.forEach(({ event, url }) => event.name = "EDIT ALL TEST");
  test(eventEditObjects, editAll);
  // rwgps.batch_delete_events(urls);
}
function testGetAll() {
  function timedGet(urls) {
    const start = new Date();
    let results = rwgpsService.getAll(urls);
    let ids = results.map(r => {
      const rc = r.getResponseCode();
      const body = JSON.parse(r.getContentText()).event.id;
    })
    return new Date() - start;
  }

  const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
  const events = ['https://ridewithgps.com/events/198070', 'https://ridewithgps.com/events/196909'];
  const urls = [];
  let timings = [];
  for (let i = 0; i < 100; i++) {
    timings.push(timedGet(['https://ridewithgps.com/events/198070']))
  }
  printTimings_(timings);

  for (let i = 0; i < 100; i++) {
    urls.push(events[0]);
  }
  timings = [];
  timings.push(timedGet(urls))
  printTimings_(timings);
}
//------------------------------
// function testEditNameOnly() {
//   const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
//   const rwgps = new RWGPS(rwgpsService);
//   const event_URL = rwgps.copy_template_("https://ridewithgps.com/events/196961-test-event");
//   console.log(`New Event URL: ${event_URL}`);
//   const initial_body = rwgps.get_event(event_URL);
//   const ibk = Object.keys(initial_body);
//   const new_body = JSON.parse(rwgps.edit_event(event_URL, initial_body).getContentText());
//   const nbk = Object.keys(new_body);
//   if (ibk.length !== nbk.length){
//     console.log("Expected keys to be same - they weren't")
//   }
//   rwgps.batch_delete_events([event_URL]);
// }

function testEditEvent() {
  const event = {
    all_day: '0',
    auto_expire_participants: '1',
    desc: 'Ride Leader: Toby Ferguson\n\n    Address: Seascape County Park, Sumner Ave, Aptos, CA 95003\n          \nArrive 9:45 AM for a 10:00 AM rollout.\n  \nAll participants are assumed to have read and agreed to the clubs ride policy: https://scccc.clubexpress.com/content.aspx?page_id=22&club_id=575722&module_id=137709\n  \nNote: In a browser use the "Go to route" link below to open up the route.',
    location: 'Seascape County Park',
    name: 'Sun A (1/1 10:00) [1] SCP - Seascape/Corralitos',
    organizer_tokens: ['302732'],
    route_ids: ['17166902'],
    start_date: '2023-01-01T10:00.000-08:00',
    start_time: '21899-12-30T10:00.000-08:00',
    visibility: 0,
  }
  const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
  const rwgps = new RWGPS(rwgpsService);
  const event_URL = rwgps.copy_template_("https://ridewithgps.com/events/194877");
  console.log(`New Event URL: ${event_URL}`);
  rwgps.edit_event(event_URL, event);
  console.log(rwgps.get_event(event_URL));
}
// function testGetParticipants() {
//   let rwgps, event_URL;
//   const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
//   rwgps = new RWGPS(rwgpsService);

// }
function testRoundTrip() {
  let rwgps, event_URL;
  try {
    const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
    rwgps = new RWGPS(rwgpsService);
    event_URL = rwgps.copy_template_("https://ridewithgps.com/events/196910");
    console.log(`New Event URL: ${event_URL}`);
    const initial_body = rwgps.get_event(event_URL);
    initial_body.organizer_ids = initial_body.organizer_ids.join(',');
    initial_body.route_ids = initial_body.routes.map(r => r.id).join(',');
    const sa = initial_body.starts_at ? initial_body.starts_at : new Date();
    initial_body.start_date = sa.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    initial_body.start_time = sa.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "numeric" });

    const ibk = Object.keys(initial_body);
    const new_body = JSON.parse(rwgps.edit_event(event_URL, initial_body).getContentText());
    const nbk = Object.keys(new_body);
    if (ibk.length !== nbk.length) {
      console.log("Expected keys to be same - they weren't")
    }
  }
  catch (e) {
    console.log(e);
    rwgps.batch_delete_events([event_URL]);
  }
}

function testImportRoute() {
  const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
  const rwgps = new RWGPS(rwgpsService);
  console.log(rwgps.importRoute('https://ridewithgps.com/routes/19551869'));
  console.log(rwgps.importRoute({ url: 'https://ridewithgps.com/routes/19551869', visibility: 2, name: "Toby's new route", expiry: '12/24/2022' }));
}

function testUdatingRouteExpiration() {
  const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
  const rwgps = new RWGPS(rwgpsService);
  rwgps.setRouteExpiration("https://ridewithgps.com/routes/41365882", "11/22/2023");
  rwgps.setRouteExpiration("https://ridewithgps.com/routes/41365882", "11/23/2023");
  const new_tag_found = rwgps.getRouteObject("https://ridewithgps.com/routes/41365882").tag_names.includes("expires: 11/23/2023")
  if (!new_tag_found) {
    throw Error("testUdatingRouteExpiration() failed - no tag 'expires: 11/23/2023' was found");
  }
  const old_tag_found = rwgps.getRouteObject("https://ridewithgps.com/routes/41365882").tag_names.includes("expires: 11/22/2023")
  if (old_tag_found) {
    throw Error("testDeletingRouteExpiration() failed - unexpectedly found expired tag 'expires: 11/22/2023'");
  }
}
function testDeletingRouteExpiration() {
  const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
  const rwgps = new RWGPS(rwgpsService);
  rwgps.setRouteExpiration("https://ridewithgps.com/routes/41365882", "11/22/2023");
  rwgps.setRouteExpiration("https://ridewithgps.com/routes/41365882");
  const tag_found = rwgps.getRouteObject("https://ridewithgps.com/routes/41365882").tag_names.includes("expires: 11/22/2023")
  if (tag_found) {
    throw Error("testDeletingRouteExpiration() failed - unexpectedly found deleted tag 'expires: 11/22/2023'");
  }
}
function testSetRouteExpiration() {
  const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
  const rwgps = new RWGPS(rwgpsService);
  rwgps.setRouteExpiration("https://ridewithgps.com/routes/41365882", "11/22/2023");
  const tag_found = rwgps.getRouteObject("https://ridewithgps.com/routes/41365882").tag_names.includes("expires: 11/22/2023")
  if (!tag_found) {
    throw Error("testSetRouteExpiration() failed - no tag 'expires: 11/22/2023' was found");
  }
}
function testTagEvents() {
  const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
  rwgpsService.tagEvents(['189081'], ['Tobys Tag']);
}
function testUntagEvents() {
  const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
  rwgpsService.unTagEvents(['189081'], ['Tobys Tag']);
}
function testUnTagRoutes() {
  const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
  rwgpsService.unTagRoutes(['41365882'], ['Tobys Tag']);
}
function testTagRoutes() {
  const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
  rwgpsService.tagRoutes(['41365882'], ['Tobys Tag']);
}
function testGetEvent() {
  let rwgps = new RWGPS(new RWGPSService(Credentials.username, Credentials.password));
  let url = "https://ridewithgps.com/events/189081-copied-event";
  const event = rwgps.get_event(url);
  Logger.log(event.starts_at);
  Logger.log(new Date(event.starts_at));
  console.log(new Date("9/27/2022 09:00"));
  console.log(dates.compare("9/27/2022", event.starts_at));
}

function testLookupOrganizer() {
  const rwgpsService = new RWGPSService(Credentials.username, Credentials.password);
  const rwgps = new RWGPS(rwgpsService);

  const name = 'Peter Stanger';

  const organizer = rwgps.lookupOrganizer(Globals.A_TEMPLATE, name);
  console.log(organizer);
  console.log(rwgps.knownRideLeader(name))
}

function testGetRSVPObject() {
  const id = 215744
  let rwgps = new RWGPS(new RWGPSService(Credentials.username, Credentials.password));
  const rsvpObject = rwgps.getRSVPObject(id);
  console.log(rsvpObject);
}
if (typeof module !== 'undefined') {
  module.exports = RWGPS;
}

