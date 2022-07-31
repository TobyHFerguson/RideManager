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
   * Edit the scheduled event at the given url to be consistent with the given event object
   * @param{event_url} string - the scheduled event to be modified
   * @param{event} event object - the event to be used as the source of the changes
   */
  edit_event(event_url, event) {
    // Looking up organizer ids can only be done in the context of the event url, hence we embellish the event at this late stage in the process
    event.organizer_ids = this._lookupOrganizerId(event_url, event.organizer_name);
    event.desc = `Ride Leader: ${event.organizer_ids.includes(RIDE_LEADER_TBD_ID) ? RIDE_LEADER_TBD_NAME : event.organizer_name}

    ${event.desc}`;
    let response = this.rwgpsService.edit_event(event_url, event);
    if (response.getResponseCode() >= 500) {
      throw Error(`received a code ${response.getResponseCode()} when editing event ${event_url}`);
    }
  }
  batch_delete_events(event_urls) {
    let event_ids = event_urls.map(e => e.split('/')[4].split('-')[0]);
    return this.rwgpsService.batch_delete_events(event_ids);
  }
  add_tags(event_urls, tags) {
    let event_ids = event_urls.map(e => e.split('/')[4].split('-')[0]);
    return this.rwgpsService.add_tags(event_ids, tags);
  }
  remove_tags(event_urls, tags) {
    let event_ids = event_urls.map(e => e.split('/')[4].split('-')[0]);
    this.rwgpsService.remove_tags(event_ids, tags);
  }
  /**
   * lookup the organizer id given the event url and the organizer name
   * @param{url} string - the event url
   * @param{name} string - the organizer's name
   * @return{string} - the organizer's id
   */
  _lookupOrganizerId(url, organizer_name) {
    if (organizer_name === null || organizer_name === "") {
      return [RIDE_LEADER_TBD_ID];
    }
    let response = this.rwgpsService._lookupOrganizerId(url, organizer_name);
    let rc = response.getResponseCode();
    if (rc == 200 || rc == 404) {
      try {
        const names = JSON.parse(response.getContentText()).results;
        for (var i = 0; i < names.length; i++) {
          if (names[i].text.toLowerCase() === organizer_name.toLowerCase()) {
            return [names[i].id];
          }
        }
        return [RIDE_LEADER_TBD_ID];
      } catch (e) {
        Logger.log(`RWGPS._lookupOrganizerId(${url}, ${organizer_name}) threw ${e}`);
        Logger.log(`RWGPS._lookupOrganizerId(${url}, ${organizer_name}) content text: ${response.getContentText()}`);
        throw (e);
      }
    }
    return [RIDE_LEADER_TBD_ID];
  }
}


class RWGPSService {
  constructor(email, password) {
    this.sign_in(email, password);
  }

  _send_request(url, options) {
    const response = UrlFetchApp.fetch(url, options);
    this.cookie = response.getAllHeaders()['Set-Cookie'].split(';')[0];
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


  edit_event(event_url, event) {
    const options = {
      method: 'put',
      contentType: 'application/json',
      payload: JSON.stringify(event),
      headers: { cookie: this.cookie },
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
  * Update multiple tags on multiple events
   * @param{event_ids} array - an array containing the ids of the events to add the tags to
   * @param{tags} array - an array of the tags to be added to the events
  */
  _batch_update_tags(event_ids, tag_action, tags) {
    if (event_ids.length > 0 && tags.length > 0) {
      let url = "https://ridewithgps.com/events/batch_update_tags.json";
      const payload = { event_ids: event_ids.join(), tag_action, tag_names: tags.join() };
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
   * Add multiple tags to multiple events
   * @param{event_ids} array - an array containing the ids of the events to add the tags to
   * @param{tags} array - an array of the tags to be added to the events
   */
  add_tags(event_ids, tags) {
    return this._batch_update_tags(event_ids, "add", tags);
  }

  /**
   * remove multiple tags to multiple events
   * @param{event_ids} array - an array containing the ids of the events to add the tags to
   * @param{tags} array - an array of the tags to be added to the events
   */
  remove_tags(event_ids, tags) {
    return this._batch_update_tags(event_ids, "remove", tags);
  }


  _lookupOrganizerId(url, organizer_name) {
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
