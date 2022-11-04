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
  copy_template_(template_url) {
    let response = this.rwgpsService.copy_template_(template_url);
    const headers = response.getAllHeaders();
    return headers['Location'];
  }
  /**
   * Get the event at the URL
   * @param{string} event_url
   * @returns{object} the event object
   */
  get_event(event_url) {
    let response = this.rwgpsService.get(event_url);
    return JSON.parse(response.getContentText())["event"];
  }
  /**
   * Edit the scheduled event at the given url to be consistent with the given event object
   * @param{event_url} string - the scheduled event to be modified
   * @param{event} event object - the event to be used as the source of the changes
   */
  edit_event(event_url, event) {
    let response = this.rwgpsService.edit_event(event_url, event);
    if (response.getResponseCode() >= 500) {
      throw Error(`received a code ${response.getResponseCode()} when editing event ${event_url}`);
    }
    return response;
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
  untagEvents(event_urls, tags) {
    let event_ids = event_urls.map(e => e.split('/')[4].split('-')[0]);
    this.rwgpsService.untagEvents(event_ids, tags);
  }

  /**
   * lookup the organizer id given an event url and the organizer name
   * @param{url} string - the event url
   * @param{name} string - the organizer's name
   * @return{string} - the organizer's id
   */
  lookupOrganizer(url, organizer_name) {
    let TBD = { text: RIDE_LEADER_TBD_NAME, id: RIDE_LEADER_TBD_ID };
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
          found = { text: organizer_name, id: RIDE_LEADER_TBD_ID }
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
    return this.lookupOrganizer(A_TEMPLATE, name).id !== RIDE_LEADER_TBD_ID;
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
      if (fr.expiry) {
        this.setRouteExpiration(fr.url, fr.expiry)
      }
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
   * @returns {object} returns this for chaining
   */
  setRouteExpiration(route_url, expiration_date) {
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
      const id = route_url.split('/')[4].split('-')[0];
      self.rwgpsService.unTagRoutes([id], [etag]);
    }
    function getExpirationDate(etag) {
      return etag.split(": ")[1];
    }
    function makeExpirationTag(date) {
      return `expires: ${date}`
    }

    if (!expiration_date) {
      deleteExpirationTag(route_url);
    } else {
      const cet = findExpirationTag(route_url);
      if (!cet) {
        const id = route_url.split('/')[4].split('-')[0];
        this.rwgpsService.tagRoutes([id], [makeExpirationTag(expiration_date)]);
      } else {
        const ced = getExpirationDate(cet);
        if (dates.compare(ced, expiration_date) < 0) {
          const id = route_url.split('/')[4].split('-')[0];
          this.rwgpsService.unTagRoutes([id], [makeExpirationTag(ced)]);
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
      this.cookie = response.getAllHeaders()['Set-Cookie'].split(';')[0];
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
    let response = this._send_request(SIGN_IN_URI, options);
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
      muteHttpExceptions: true
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
}

function testUdatingRouteExpiration() {
  const rwgpsService = new RWGPSService('toby.h.ferguson@icloud.com', '1rider1');
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
  const rwgpsService = new RWGPSService('toby.h.ferguson@icloud.com', '1rider1');
  const rwgps = new RWGPS(rwgpsService);
  rwgps.setRouteExpiration("https://ridewithgps.com/routes/41365882", "11/22/2023");
  rwgps.setRouteExpiration("https://ridewithgps.com/routes/41365882");
  const tag_found = rwgps.getRouteObject("https://ridewithgps.com/routes/41365882").tag_names.includes("expires: 11/22/2023")
  if (tag_found) {
    throw Error("testDeletingRouteExpiration() failed - unexpectedly found deleted tag 'expires: 11/22/2023'");
  }
}
function testSetRouteExpiration() {
  const rwgpsService = new RWGPSService('toby.h.ferguson@icloud.com', '1rider1');
  const rwgps = new RWGPS(rwgpsService);
  rwgps.setRouteExpiration("https://ridewithgps.com/routes/41365882", "11/22/2023");
  const tag_found = rwgps.getRouteObject("https://ridewithgps.com/routes/41365882").tag_names.includes("expires: 11/22/2023")
  if (!tag_found) {
    throw Error("testSetRouteExpiration() failed - no tag 'expires: 11/22/2023' was found");
  }
}
function testTagEvents() {
  const rwgpsService = new RWGPSService('toby.h.ferguson@icloud.com', '1rider1');
  rwgpsService.tagEvents(['189081'], ['Tobys Tag']);
}
function testUntagEvents() {
  const rwgpsService = new RWGPSService('toby.h.ferguson@icloud.com', '1rider1');
  rwgpsService.unTagEvents(['189081'], ['Tobys Tag']);
}
function testUnTagRoutes() {
  const rwgpsService = new RWGPSService('toby.h.ferguson@icloud.com', '1rider1');
  rwgpsService.unTagRoutes(['41365882'], ['Tobys Tag']);
}
function testTagRoutes() {
  const rwgpsService = new RWGPSService('toby.h.ferguson@icloud.com', '1rider1');
  rwgpsService.tagRoutes(['41365882'], ['Tobys Tag']);
}
function testGetEvent() {
  let rwgps = new RWGPS(new RWGPSService("toby.h.ferguson@icloud.com", "1rider1"));
  let url = "https://ridewithgps.com/events/189081-copied-event";
  const event = rwgps.get_event(url);
  Logger.log(event.starts_at);
  Logger.log(new Date(event.starts_at));
  console.log(new Date("9/27/2022 09:00"));
  console.log(dates.compare("9/27/2022", event.starts_at));
}

function testLookupOrganizer() {
  const rwgpsService = new RWGPSService('toby.h.ferguson@icloud.com', '1rider1');
  const rwgps = new RWGPS(rwgpsService);

  const name = 'Peter Stanger';

  const organizer = rwgps.lookupOrganizer(A_TEMPLATE, name);
  console.log(organizer);
  console.log(rwgps.knownRideLeader(name))
}

function testImportRoute() {
  const rwgpsService = new RWGPSService('toby.h.ferguson@icloud.com', '1rider1');
  const rwgps = new RWGPS(rwgpsService);
  console.log(rwgps.importRoute('https://ridewithgps.com/routes/19551869'));
  console.log(rwgps.importRoute({ url: 'https://ridewithgps.com/routes/19551869', visibility: 2, name: "Toby's new route" }));
}