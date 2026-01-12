function DEBUG_(message) {
  Logger.log(`DEBUG: ${message}`);
}

function newCredentialManager(scriptProperties) {
  return new CredentialManager(scriptProperties);
}

function newRWGPS(rwgpsService) {
  const rwgps = new RWGPS(rwgpsService);
  return rwgps;
}

function newRWGPSService(globals, credentialManager) {
  const apiService = new ApiService(credentialManager)
  const rwgpsService = new RWGPSService(apiService, globals);
  return rwgpsService;
}

/**
 * Class RWGPS represents the services that are obtained by using event urls
 */
class RWGPS {
  constructor(rwgpsService) {
    this.globals = rwgpsService.globals;
    this.rwgpsService = rwgpsService;
  }

  /**
   * 
   * @param {PublicEventUrl[]} event_urls event urls to be deleted
   * @returns response from rwgps
   * @throws Exception if there's an error
   */
  batch_delete_events(event_urls) {
    return this.rwgpsService.batch_delete_events(event_urls);
  }

  /**
     * 
     * @param {PublicRouteUrl[]} route_urls route urls to be deleted
     * @returns response from rwgps
     * @throws Exception if there's an error
     */
  batch_delete_routes(route_urls) {
    return this.rwgpsService.batch_delete_routes(route_urls);
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
   * Edit the scheduled event at the given url to be consistent with the given event object
   * @param{event_url} string - the scheduled event to be modified
   * @param{event} event object - the event to be used as the source of the changes
   */
  edit_event(event_url, event) {
    // RWGPS bug that prevents an event from being properly scheduled if all_day is not set.
    let new_event = { ...event, all_day: "1" }
    let response = this.rwgpsService.edit_event(event_url, new_event);
    response = this.rwgpsService.edit_event(event_url, event);
    if (response.getResponseCode() !== 200) {
      throw Error(`received a code ${response.getResponseCode()} when editing event ${event_url}`);
    }
    return response;
  }

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
    const contents = responses.map(r => r.getContentText())
    const events = contents.map(c => JSON.parse(c))
    return events;
  }

  /**
   * 
   * @returns {ClubMember[]} An array of club members
   */
  get_club_members() {
    const response= this.rwgpsService.getClubMembers();
    const clubMembers = JSON.parse(response.getContentText());
    return clubMembers;
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
     * 
     * @param {string[]} names - list of ride leader names
     * @param {RWGPS} rwgps - rwgps object to lookup organizers with
     * @returns {Organizer[]} one or more organizer objects
     */
  getOrganizers(names) {
    //TODO - use the private table mechanism to get all users in one go.
    if (!names) return [];
    //convert the names into the organizer structure
    const organizers = names.map(name => this.lookupOrganizer(this.globals.A_TEMPLATE, name.trim()));
    //Figure out if any of the names are known
    const knownOrganizers = organizers.filter(o => o.id !== this.globals.RIDE_LEADER_TBD_ID)
    //If any names are known then return them, else return the TBD organizer
    return (knownOrganizers.length ? knownOrganizers : { id: this.globals.RIDE_LEADER_TBD_ID, text: this.globals.RIDE_LEADER_TBD_NAME });
  }

  /**
   * Return the object at the given route url
   * @param {PublicRouteUrl} route_url - url of route to be fetched
   */
  getRouteObject(route_url) {
    const response = this.rwgpsService.getRoute(route_url);
    const o = JSON.parse(response.getContentText());
    return o;
  }

  /**
   * Return the counts for each of the given event urls.
   * A count of 0 is given for any url that throws an error, and a log message is recorded.
   * @param {PublicEventUrl[]} event_urls
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
   * get the RSVP Object given an event id
   * @param {number} event_id the id of the event
   * @returns {RSVPObject} the rsvp object that represents this event's participants
   */
  //TODO - deprecate this in favor of getRSVPObjectByURL
  getRSVPObject(event_id) {
    if (!event_id) {
      console.log(`RWGPS.getRSVPObject(${event_id}) with no event_id`)
      return { name: 'No event id given', participants: [] }
    }
    if (isNaN(event_id)) {
      console.log(`RWGPS.getRSVPObject(${event_id}) has been called with a non-number argument`);
      return { name: `I was expecting a numeric event id but got this: ${event_id}`, participants: [] }
    }
    try {
      return this.getRSVPObjectByURL(this.globals.EVENTS_URI + event_id)
    } catch (e) {
      Logger.log(e)
      return { name: `No such event: ${event_id}`, participants: [] }
    }
  }

  /**
   * Get the RSVP Object that corresponds to the event at the given url
   * @param {PublicEventUrl} e_url Url of an event
   * @returns {RSVPObject} the rsvp object that represents the given event
   */
  getRSVPObjectByURL(e_url) {
    const globals = this.globals;
    function getEventName(response) {
      if (response.getResponseCode() !== 200) {
        console.log(`Response code: ${response.getResponseCode()} body: ${response.getContentText()}`)
        return "No event found"
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
      return json.filter(p =>
        (p.rsvp_status.toLowerCase() === "yes") && (p.first_name || p.last_name)
      )
    }
    /**
     * @typedef {Object} Organizer
     * @param{number} id
     * @param{string} text
     */
    /**
     * 
     * @param {*} response 
     * @returns {Organizer[]}
     */
    function getLeaders(response) {
      if (response.getResponseCode() !== 200) {
        Logger.log(`Response code: ${response.getResponseCode()} body: ${response.getContentText()}`)
        return []
      }
      const body = response.getContentText();
      const json = JSON.parse(body);
      return json.filter(o => o.id !== globals.RIDE_LEADER_TBD_ID).map(o => {
        const n = o.text.trim().split(/\s+/)
        return { user_id: o.id, first_name: n[0], last_name: n.length > 1 ? n[1] : '', leader: true }
      })
    }
    function compareParticipants(l, r) {
      function flatten(p) {
        function z(v) { return v ? v : 'zzzzz' }
        let f = z(p.last_name) + z(p.first_name)
        return f.toLowerCase();
      }

      const a = flatten(l)
      const b = flatten(r)
      const result = a < b ? -1 : a > b ? 1 : 0
      return result;
    }
    const p_url = e_url + "/participants.json";
    const o_url = e_url + "/organizer_ids.json";
    let responses;
    try {
      // TODO: move batching logic into RWGPSService note.
      responses = this.rwgpsService.getAll([e_url, p_url, o_url], { muteHttpExceptions: false })
      let participants = getParticipants(responses[1]);
      const leaders = getLeaders(responses[2]);
      participants.forEach(p => {
        const li = leaders.findIndex(l => {
          return l.user_id === p.user_id;
        });
        if (li !== -1) {
          p.leader = true;
          leaders.splice(li, 1)
        }
      })
      participants = [...participants, ...leaders].toSorted(compareParticipants)

      const rsvpObject = {
        name: getEventName(responses[0]),
        participants: participants
      }
      return rsvpObject
    }
    catch (e) {
      console.warn(`${e.message} - original URL: ${e_url}`)
      return { name: "No Event Found", participants: [] }
    }
  }

  /**
   * Import a route from a foreign route URL into the club library
   * @param {Route} route - the foreign route url or object
   * @returns {PublicRouteUrl} url - the url of the new route in the club library
   * @throws Exception if the import fails for any reason.
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
      let localRoute = { ...fr, url: body.url }
      this.setRouteExpiration(localRoute);
    }
    return body.url;
  }

  /**
 * Determine if named ride leader is known
 * @param {string} name first and last name of ride leader whose status is to be determined
 * @return {boolean} true iff the ride leader is not the default
 */
  knownRideLeader(name) {
    return this.lookupOrganizer(this.globals.A_TEMPLATE, name).id !== this.globals.RIDE_LEADER_TBD_ID;
  }

  /**
   * lookup the organizer id given an event url and the organizer name
   * @param{url} string - the event url
   * @param{name} string - the organizer's name
   * @return{string} - the organizer's id
   */
  lookupOrganizer(url, organizer_name) {
    let TBD = { text: this.globals.RIDE_LEADER_TBD_NAME, id: this.globals.RIDE_LEADER_TBD_ID };
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
          found = { text: organizer_name, id: this.globals.RIDE_LEADER_TBD_ID }
        }
        return found;
      } catch (e) {
        //TODO this logging is just incorrect. Need to fix!
        Logger.log(`RWGPS.lookupOrganizer(${url}, ${organizer_name}) threw ${e}`);
        Logger.log(`RWGPS.lookupOrganizer(${url}, ${organizer_name}) content text: ${response.getContentText()}`);
        throw (e);
      }
    }
    return TBD;
  }

  //TODO - figure out what or why we need this!
  /**
   * Set the expiration date of the given route to the latter of the route's current expiration date or its new one
   * @param {Route} localRoute - the url of the route whose expiration is to be set
   * @param {NumberLike} [extend_only = false] - When true only update the expiration if there's already an expiration date. If there's not then do nothing. When false then add the expiration regardless.
   * @returns {object} returns this for chaining
   */
  setRouteExpiration(localRoute, extend_only = false) {
    if (!localRoute.url) {
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
    function deleteExpirationTag(route_url) {
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
    if (!localRoute.expiry) {
      deleteExpirationTag(localRoute.url);
    } else {
      localRoute.tags = [...(localRoute.tags || [])]
      localRoute.tags.push(makeExpirationTag(localRoute.expiry));
      // cet: Current Expiration Tag
      const cet = findExpirationTag(localRoute.url);
      if (!cet) { // No expiration tag
        if (extend_only) {
          // no-op! We've not got an expiration date but we've been told only to extend!
        } else {
          // No expiration date, but we're not extending, so add a new tag
          this.rwgpsService.tagRoutes([localRoute.url], localRoute.tags);
        }
      } else {
        // we have an expiration tag; extend_only doesn't matter here; We'll replace the tag.
        const ced = getExpirationDate(cet);
        if (dates.compare(ced, localRoute.expiry) < 0) {
          const id = route_url.split('/')[4].split('-')[0];
          this.rwgpsService.unTagRoutes([id], [cet]);
          this.rwgpsService.tagRoutes([id], localRoute.tags);
        }
      }
    }
    return this;
  }

  /**
   * Add the tags to the events. Both arrays must be non-empty. Idempotent.
   * @param {PublicEventUrl | PublicEventUrl[]} event_urls - the array of event urls
   * @param {string | string[]} tags - the tags
   * @returns {HTTPResponse} the response from rwgpsService
   */
  tagEvents(event_urls, tags) {
    return this.rwgpsService.tagEvents(event_urls, tags);
  }

  /**
   * Remove the tags from the events. Both arrays must be non-empty. Idempotent.
   * @param {PublicEventUrl | PublicEventUrl[]} event_urls - the event urls
   * @param {string | string[]} tags - the tags
   * @returns {HTTPResponse} the response from rwgpsService
   */
  unTagEvents(event_urls, tags) {
    return this.rwgpsService.unTagEvents(event_urls, tags);
  }
}

if (typeof module !== 'undefined') {
  module.exports = { RWGPS, RWGPSService }
}

if (typeof module !== 'undefined') {
  module.exports = RWGPS;
}
