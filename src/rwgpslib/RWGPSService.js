class RWGPSService {
    constructor(apiService, globals) {
        this.apiService = apiService;
        this.globals = globals;
        this.apiService.login();
    }

    /**
     * Update multiple tags on multiple resources
     * @param{!(NumberLike | NumberLike[])} ids - an id or an array of ids of the resources to be tagged
     * @param{!(string | string[])} tags - an optional tag or array of tags
     * @param{!string} tag_action - one of 'add' or 'remove' to indicate addition or removal of tags
     * @param{!string} resource - the kind of resource to be operated on, one of 'event' or 'route'
    */
    _batch_update_tags(ids, tag_action, tags, resource) {
        if (!ids) {
            throw new Error('ids is required');
        }
        if (!Array.isArray(ids)) {
            ids = [ids];
        }
        if (!tags) {
            throw new Error('tags is required');
        }
        if (!Array.isArray(tags)) {
            tags = [tags];
        }
        if (tag_action !== 'add' && tag_action !== 'remove') {
            throw new Error(`Invalid tag_action: ${tag_action}`);
        }
        if (resource !== 'event' && resource !== 'route') {
            throw new Error(`Invalid resource: ${resource}`);
        }   
        const url = `https://ridewithgps.com/${resource}s/batch_update_tags.json`;
        const payload = { tag_action, tag_names: tags.join() };
        payload[`${resource}_ids`] = ids.join();
        const options = {
            payload: payload,
            muteHttpExceptions: true
        }
        return this.apiService.fetchUserData(url, options, `${tag_action}_${resource}_tags`);
    }

    /**
     * Check if a URL is a public event URL
     * @param {string} url - the URL to check
     * @returns {boolean} true if the URL is a public event URL, false otherwise
     */
    _isPublicEventUrl(url) {
        if (!url || url.length === 0) {
            throw new Error('URL is required');
        }
        const publicEventPattern = /^https:\/\/ridewithgps\.com\/events\/\d+[^/]*$/;
        return publicEventPattern.test(url);
    }

    /**
     * Check if a URL is a public route URL
     * @param {string} url - the URL to check
     * @returns {boolean} true if the URL is a public route URL, false otherwise
     */
    _isPublicRouteUrl(url) {
        if (!url || url.length === 0) {
            throw new Error('URL is required');
        }
        const publicRoutePattern = /^https:\/\/ridewithgps\.com\/routes\/\d+$/;
        return publicRoutePattern.test(url);
    }

    /**
  * Select the keys and values of the left object where every key in the left is in the right
  * @param{left} object
  * @param{right} object
  * @return object - the new object created
  */
    _key_filter(left, right) {
        if (!left || typeof left !== 'object') {
            throw new Error('Left object is required');
        }
        if (!right || typeof right !== 'object') {
            throw new Error('Right object is required');
        }
        let no = { ...left };
        let left_keys = Object.keys(no);
        let right_keys = Object.keys(right);
        left_keys.filter(k => !right_keys.includes(k)).forEach(k => delete no[k])
        return no;
    }

    /**
     * Old method that used to send requests. Used to debug only library. Not used anymore.
     * @param {string} url 
     * @param {*} options 
     * @returns {HttpResponse} 
     */
    //TODO - remove this method
    _send_request(url, options) {
        if (!url || url.length === 0) {
            throw new Error('URL is required');
        }
        options.headers = { ...options.headers, 'cookie': this.apiService.webSessionCookie };
        console.log('Sending request to URL:', url);
        console.log('With options:', options);
        const response = UrlFetchApp.fetch(url, options);
        return response;
    }

    /**
     * Delete multiple events
     * @param {PublicEventUrl | PublicEventUrl[]} event_urls
     *  - an array containing the public URLs of the events to delete
     * @returns {HttpResponse | HttpResponse[]} the response object(s) corresponding to the deleted events
     */
    //TODO - take an array of public event URLs
    batch_delete_events(event_urls) {
        return this.deleteEvent(event_urls);
    }

    /**
     * Delete multiple routes
     * @param {PublicRouteUrl | PublicRouteUrl[]} route_urls - an array containing the public URLs of the routes to delete
     * @returns {HttpResponse | HttpResponse[]} the response object(s) corresponding to the deleted routes
     */
    //TODO - take an array of public route URLs
    batch_delete_routes(route_urls) {
        return this.deleteRoute(route_urls)
    }

    /**
     * Copy an event template
     * @param {PublicEventUrl} template_url
     * @returns {HttpResponse} the response object
     * 
     * Note, the Location header of the response contains the URL of the new event
     */
    copy_template_(template_url) {
        if (!this._isPublicEventUrl(template_url)) {
            throw new Error(`Invalid public event URL: ${template_url}`);
        }
        // POST to https://ridewithgps.com/events/186557-a-template/copy
        // with form data:
        const url = template_url + "/copy"; // not JSON - need to get the html redirect
        const payload = {
            'event[name]': "COPIED EVENT",
            'event[all_day]': "0",
            'event[copy_routes]': "0",
            'event[start_date]': "",
            'event[start_time]': ""
        }
        const options = {
            payload: payload,
            followRedirects: false, // important to get the 302 redirect
        }
        return this.apiService.fetchUserData(url, options, 'copy_template');
    }

    /**
     * Delete one or more events
     * @param {PublicEventUrl | PublicEventUrl[]} event_urls
     * @returns {HttpResponse[]} the response objects
     */
    deleteEvent(event_urls) {
        if (!Array.isArray(event_urls)) {
            event_urls = [event_urls];
        }
        event_urls.forEach(url => {
            if (!this._isPublicEventUrl(url)) {
                throw new Error(`Invalid public event URL: ${url}`);
            }
        })
        // DELETE to https://ridewithgps.com/api/v1/events/403834.json
        // where 403834 is the event ID extracted from the event_url
        const requests = event_urls.map(url => {
            const id = this.extractIdFromUrl(url);
            return {
                url: `https://ridewithgps.com/api/v1/events/${id}.json`,
                method: 'delete',
            }
        })
        const responses = this.apiService.fetchClubData(requests, {}, 'delete_event');
        return (responses.length === 1) ? responses[0] : responses;
    }

    /**
     * Delete one or more routes
     * @param {PublicRouteUrl | PublicRouteUrl[]} routeUrls - the public route URL(s) to delete
     * @returns {HttpResponse | HttpResponse[]} the response object(s)
     */
    deleteRoute(routeUrls) {
        if (!Array.isArray(routeUrls)) {
            routeUrls = [routeUrls];
        }
        routeUrls.forEach(url => {
            if (!this._isPublicRouteUrl(url)) {
                throw new Error('Invalid public route URL: ' + url);
            }
        });
        const requests = routeUrls.map(url => {
            const id = this.extractIdFromUrl(url);
            return {
                url: `https://ridewithgps.com/api/v1/routes/${id}.json`,
                method: 'delete',
            }
        });
        const responses = this.apiService.fetchClubData(requests, {}, 'delete_route');
        return (responses.length === 1) ? responses[0] : responses;
    }

    /**
     * Edit an event
     * @param {PublicEventUrl} event_url - the public URL of the event to be edited
     * @param {Event} event - the event object containing the updated details only
     * @returns {object} the response object
     */
    edit_event(event_url, event) {
        if (!this._isPublicEventUrl(event_url)) {
            throw new Error(`Invalid public event URL: ${event_url}`);
        }
        //TODO - validate event object
        let new_event = this._key_filter(event, CANONICAL_EVENT);
        const options = {
            method: 'put',
            contentType: 'application/json',
            payload: JSON.stringify(new_event),
            headers: {
                Accept: "application/json" // Note use of Accept header - returns a 404 otherwise. 
            },
            followRedirects: false,
            muteHttpExceptions: true
        }
        return this.apiService.fetchUserData(event_url, options, 'edit_event');
    }

    /**
     * Edit multiple events
     * @param {EventEditObject[]} eventEditObjects - an array of event edit objects
     * @returns {HttpResponse[]} - an array of response objects for each event edit
     */
    edit_events(eventEditObjects) {
        if (!Array.isArray(eventEditObjects)) {
            throw new Error('eventEditObjects must be an array');
        }
        const self = this;
        function createRequest(eventEditObject) {
            let new_event = self._key_filter(eventEditObject.event, CANONICAL_EVENT);
            const request = {
                url: eventEditObject.url,
                method: 'put',
                contentType: 'application/json',
                payload: JSON.stringify(new_event),
                headers: {
                    Accept: "application/json" // Note use of Accept header - returns a 404 otherwise. 
                },
                followRedirects: false,
                muteHttpExceptions: true
            }
            return request;
        }
        const requests = eventEditObjects.map(eeo => createRequest(eeo));
        const responses = this.apiService.fetchUserData(requests, {}, 'edit_events');
        return responses;
    }

    /**
     * Extract ID from a RWGPS URL
     * @param {string} url - URL like "https://ridewithgps.com/events/403834-copied-event"
     * @return {string} the ID extracted from the URL (e.g., "403834")
     */
    extractIdFromUrl(url) {
        if (!url || url.length === 0) {
            throw new Error('URL is required');
        }
        const match = url.match(/\/(\d+)(-|$)/);
        return match ? match[1] : null;
    }

    /**
     * GET the given url
     * @param {string} url - the url whose resource is to be fetched
     * @returns {object} the response object
     */
    get(url) {
        return this.apiService.fetchPublicData(url, {}, 'get');
    }

    /**
     * Get all events or routes
     * @param {string[]} urls - an array of public event or route URLs
     * @param {*} override - optional override parameters
     * @returns {HttpResponse[]} - an array of response objects
     */
    getAll(urls, override = {}) {
        if (!Array.isArray(urls)) {
            throw new Error('urls must be an array');
        }
        const requests = urls.map(url => {
            let r = {
                url,
                headers: {
                    Accept: "application/json" // Note use of Accept header - returns a 404 otherwise. 
                },
                ...override
            };
            return r;
        })
        console.log('Requests are:', requests);
        return this.apiService.fetchUserData(requests, {}, 'getAll');
    }

    /**
     * get all the club members
     * @returns {Object[ClubMember]}
     */
    getClubMembers() {
        const url = `https://ridewithgps.com/clubs/47/table_members.json`;
        return this.apiService.fetchUserData(url, {}, 'getClubMembers');
    }

    /**
     * 
     * @param {PublicEventUrl} url - public event URL
     * @returns {Object} event object as per https://github.com/ridewithgps/developers/blob/master/endpoints/events.md#get-apiv1eventsidjson
     */
    getEvent(url) {
        if (!this._isPublicEventUrl(url)) {
            throw new Error(`Invalid public event URL: ${url}`);
        }
        const id = this.extractIdFromUrl(url);
        const event_url = `https://ridewithgps.com/api/v1/events/${id}.json`;
        console.log('Event URL is:', event_url);
        return this.apiService.fetchClubData(event_url, {}, 'getEvent');
    }

    /**
     * Get organizer IDs for a specific event
     * @param {PublicEventUrl} url public event URL
     * @param {string} organizer_name 
     * @returns 
     */
    //TODO - use the private table mechanism to get all users in one go.
    //TODO: get rid of organizer_name - not needed.
    getOrganizers(url, organizer_name) {
        if (!this._isPublicEventUrl(url)) {
            throw new Error(`Invalid public event URL: ${url}`);
        }
        if (!organizer_name || organizer_name.length === 0) {
            throw new Error('Organizer name is required');
        }
        url = `${url}/organizer_ids.json`;
        const payload = { term: organizer_name.split(' ')[0], page: 1 }
        const options = {
            payload: payload
        }
        return this.apiService.fetchUserData(url, options, 'getOrganizers');
    }

    /**
     * Get a single route by ID
     * @param {PublicRouteUrl} url - the ID of the route to retrieve
     * @returns {object} the response object
     */
    getRoute(url) {
        if (!this._isPublicRouteUrl(url)) {
            throw new Error(`Invalid public route URL: ${url}`);
        }
        const options = {
            headers: {
                Accept: "application/json" // Note use of Accept header - returns a 404 otherwise. 
            }
        }
        const routeUrl = 'https://ridewithgps.com/api/v1/routes/' + this.extractIdFromUrl(url) + '.json';
        console.log('Route URL is:', routeUrl);
        const response = this.apiService.fetchClubData(routeUrl, options, 'getRoute');
        return response;
    }

    /**
     * Import a foreign route
     * @param {ForeignRoute} routeObject - the foreign route object to be imported
     */
    importRoute(routeObject) {
        if (!routeObject) {
            throw new Error('Route object is required');
        } else if (!routeObject.url || !this._isPublicRouteUrl(routeObject.url)) {
            throw new Error(`Invalid foreign route URL: ${routeObject.url}`);
        }
        const url = routeObject.url + "/copy.json";
        const payload = {
            "user_id": 621846, // SCCCC user
            "asset_type": "route",
            "privacy_code": null,
            "include_photos": false,
            ...routeObject
        }
        const options = {
            payload: payload
        }
        return this.apiService.fetchUserData(url, options, 'importRoute');
    }

    /**
     * Add multiple tags to multiple events - idempotent
     * @param{!(PublicEventUrl | PublicEventUrl[])} urls - an id or an array of ids of the resources to be tagged
     * @param{!(string | string[])} tags - an optional tag or array of tags
     */
    tagEvents(urls, tags) {
        if (!Array.isArray(urls)) {
            urls = [urls];
        }
        const ids = urls.map(url => {
            if (!this._isPublicEventUrl(url)) {
                throw new Error(`Invalid public event URL: ${url}`);
            }
            return this.extractIdFromUrl(url);
        });
        return this._batch_update_tags(ids, "add", tags, 'event');
    }

    /**
      * Add multiple tags to multiple routes - idempotent
    * @param{!(PublicRouteUrl | PublicRouteUrl[])} urls - an id or an array of ids of the resources to be tagged
     * @param{!(string | string[])} tags - an optional tag or array of tags
      */
    tagRoutes(urls, tags) {
        if (!Array.isArray(urls)) {
            urls = [urls];
        }
        const ids = urls.map(url => {
            if (!this._isPublicRouteUrl(url)) {
                throw new Error(`Invalid public route URL: ${url}`);
            }
            return this.extractIdFromUrl(url);
        });
        return this._batch_update_tags(ids, "add", tags, 'route');
    }

    /**
     * remove multiple tags from multiple events - idempotent
     * @param{!(PublicEventUrl | PublicEventUrl[])} urls - an id or an array of ids of the resources to be tagged
     * @param{!(string | string[])} tags - an optional tag or array of tags
     */
    unTagEvents(urls, tags) {
        if (!Array.isArray(urls)) {
            urls = [urls];
        }
        const ids = urls.map(url => {
            if (!this._isPublicEventUrl(url)) {
                throw new Error(`Invalid public event URL: ${url}`);
            }
            return this.extractIdFromUrl(url);
        });
        return this._batch_update_tags(ids, "remove", tags, 'event');
    }

    /**
    * Remove multiple tags from multiple routes - idempotent
    * @param{!(PublicRouteUrl | PublicRouteUrl[])} urls - an id or an array of ids of the resources to be tagged
    * @param{!(string | string[])} tags - an optional tag or array of tags
    */
    unTagRoutes(urls, tags) {
        if (!Array.isArray(urls)) {
            urls = [urls];
        }
        const ids = urls.map(url => {
            if (!this._isPublicRouteUrl(url)) {
                throw new Error(`Invalid public route URL: ${url}`);
            }
            return this.extractIdFromUrl(url);
        });
        return this._batch_update_tags(ids, "remove", tags, 'route');
    }
}
