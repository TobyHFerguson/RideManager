/**
 * RWGPSClient.js
 * 
 * Thin GAS adapter for RWGPS API operations
 * Delegates business logic to RWGPSClientCore, only handles GAS I/O
 */

/* istanbul ignore if - GAS runtime check */
if (typeof require !== 'undefined') {
    var RWGPSClientCore = require('./RWGPSClientCore');
}

/**
 * RWGPSClient - Unified RWGPS API client
 * Replaces: RWGPS → RWGPSService → ApiService architecture
 */
var RWGPSClient = (function() {
    class RWGPSClient {
    /**
     * Create RWGPS client
     * 
     * @param {{apiKey: string, authToken: string, username: string, password: string}} credentials - RWGPS credentials
     */
    constructor(credentials) {
        this.apiKey = credentials.apiKey;
        this.authToken = credentials.authToken;
        this.username = credentials.username;
        this.password = credentials.password;
        this.webSessionCookie = null; // For web session authentication
    }

    /**
     * Login to RWGPS web session
     * Establishes session cookie for web API operations
     * 
     * @returns {boolean} True if login successful (cookie received)
     */
    login() {
        const loginUrl = 'https://ridewithgps.com/organizations/47/sign_in';
        const options = {
            method: 'POST',  // Use uppercase to match fixtures
            headers: {
                'user-email': this.username,
                'user-password': this.password
            },
            contentType: 'application/json',
            followRedirects: false,
            muteHttpExceptions: true
        };

        try {
            const resp = this._fetch(loginUrl, options);
            this._updateCookieFromResponse(resp);
            return !!this.webSessionCookie;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.log(`Login request failed: ${err.message}`);
            return false;
        }
    }

    /**
     * Update session cookie from response
     * 
     * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response - HTTP response
     * @private
     */
    _updateCookieFromResponse(response) {
        const headers = response.getAllHeaders();
        let setCookieHeader = headers['Set-Cookie'];
        
        if (!setCookieHeader) {
            return;
        }

        // Normalize to array
        if (!Array.isArray(setCookieHeader)) {
            setCookieHeader = [setCookieHeader];
        }

        for (const cookie of setCookieHeader) {
            if (cookie.startsWith('_rwgps_3_session=')) {
                const newCookie = cookie.split(';')[0];
                if (this.webSessionCookie !== newCookie) {
                    this.webSessionCookie = newCookie;
                }
                break;
            }
        }
    }

    /**
     * Prepare request with authentication
     * 
     * @param {{url: string, method?: string, headers?: Record<string, string>, payload?: string}} request - Request options
     * @param {'WEB_SESSION' | 'BASIC_AUTH'} authType - Authentication type
     * @returns {{url: string, method: string, headers: Record<string, string>, payload?: string, muteHttpExceptions: boolean}} Prepared request
     * @private
     */
    _prepareRequest(request, authType) {
        const headers = request.headers || {};

        // Set method based on payload if not specified
        if (request.payload && !request.method) {
            request.method = 'post';
        } else if (!request.method) {
            request.method = 'get';
        }

        if (authType === 'WEB_SESSION') {
            if (!this.webSessionCookie) {
                throw new Error('Web session not authenticated. Please log in first.');
            }
            headers['Cookie'] = this.webSessionCookie;
            headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
        } else if (authType === 'BASIC_AUTH') {
            headers['Authorization'] = this._getBasicAuthHeader();
        }

        // Normalize method to uppercase to match fixtures
        const method = request.method ? request.method.toUpperCase() : 'GET';

        return {
            url: request.url,
            method: method,
            headers: headers,
            payload: request.payload,
            muteHttpExceptions: true
        };
    }

    /**
     * Schedule a new event from template
     * 
     * This method performs the full schedule workflow:
     * 1. Login to establish web session
     * 2. Copy template to create new event
     * 3. Look up organizer IDs by name
     * 4. Edit event with full data (using double-edit pattern)
     * 5. Remove "template" tag from new event
     * 
     * @param {string} templateUrl - Template event URL
     * @param {any} eventData - Event data (name, desc, starts_at, etc.)
     * @param {string[]} organizerNames - Array of organizer names to look up
     * @returns {{success: boolean, eventUrl?: string, event?: any, error?: string}} Result
     */
    /**
     * Schedule a new event from template using v1 API createEvent
     * 
     * Workflow:
     * 1. Login to establish web session
     * 2. Create event using v1 API (with logo if provided)
     * 3. Look up organizers by name
     * 4. Edit event with full data including organizer tokens
     * 
     * @param {string} templateUrl - Template event URL (used for organizer lookup context)
     * @param {any} eventData - Event data (name, desc, starts_at, etc.)
     * @param {string[]} organizerNames - Array of organizer names to look up
     * @param {string} [logoUrl] - Optional logo URL to attach to event
     * @returns {{success: boolean, eventUrl?: string, event?: any, error?: string}} Result with new event URL and data
     */
    scheduleEvent(templateUrl, eventData, organizerNames, logoUrl) {
        try {
            // Step 1: Login
            const loginSuccess = this.login();
            if (!loginSuccess) {
                return {
                    success: false,
                    error: 'Login failed - could not establish web session'
                };
            }

            // Step 2: Create event (with or without logo)
            let createResult;
            if (logoUrl) {
                console.log('Creating event with logo...');
                createResult = this.createEventWithLogo(eventData, logoUrl);
            } else {
                console.log('Creating event without logo (no logo URL provided)...');
                createResult = this.createEvent(eventData);
            }

            if (!createResult.success) {
                return {
                    success: false,
                    error: `Failed to create event: ${createResult.error}`
                };
            }

            const newEventUrl = createResult.eventUrl;
            const newEventId = RWGPSClientCore.extractEventId(newEventUrl);

            // Step 3: Look up organizers by name
            const organizerTokens = [];
            if (organizerNames && organizerNames.length > 0) {
                for (const name of organizerNames) {
                    const organizerResult = this._lookupOrganizer(templateUrl, name);
                    if (organizerResult.success && organizerResult.organizer) {
                        organizerTokens.push(String(organizerResult.organizer.id));
                    }
                    // If organizer not found, continue with empty (TBD will be used)
                }
            }

            // Step 4: Edit event with full data and organizers
            const fullEventData = {
                ...eventData,
                organizer_tokens: organizerTokens.length > 0 ? organizerTokens : eventData.organizer_tokens
            };

            const editResult = this.editEvent(newEventUrl, fullEventData);

            if (!editResult.success) {
                // Try to clean up by deleting the created event
                this.deleteEvent(newEventUrl);
                return {
                    success: false,
                    error: `Failed to edit new event: ${editResult.error}`
                };
            }

            return {
                success: true,
                eventUrl: newEventUrl,
                event: editResult.event
            };

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return {
                success: false,
                error: err.message
            };
        }
    }

    /**
     * Update an existing event with new data and optionally add organizers
     * 
     * Workflow:
     * 1. Login to establish web session
     * 2. Look up organizers by name (optional)
     * 3. Edit event with full data including organizer tokens
     * 
     * @param {string} eventUrl - Existing event URL
     * @param {any} eventData - Event data (name, desc, starts_at, etc.)
     * @param {string[]} organizerNames - Array of organizer names to look up (optional)
     * @returns {{success: boolean, event?: any, organizers?: Array<{name: string, token: string}>, error?: string}} Result
     */
    updateEvent(eventUrl, eventData, organizerNames) {
        try {
            // Step 1: Login
            const loginSuccess = this.login();
            if (!loginSuccess) {
                return {
                    success: false,
                    error: 'Login failed - could not establish web session'
                };
            }

            // Step 2: Look up organizers by name (optional)
            const resolvedOrganizers = [];
            const organizerTokens = [];
            if (organizerNames && organizerNames.length > 0) {
                for (const name of organizerNames) {
                    const organizerResult = this._lookupOrganizer(eventUrl, name);
                    if (organizerResult.success && organizerResult.organizer) {
                        organizerTokens.push(String(organizerResult.organizer.id));
                        resolvedOrganizers.push({
                            name: organizerResult.organizer.text,
                            token: String(organizerResult.organizer.id)
                        });
                    }
                    // If organizer not found, continue (non-fatal)
                }
            }

            // Step 3: Edit event with full data
            const fullEventData = {
                ...eventData,
                organizer_tokens: organizerTokens.length > 0 ? organizerTokens : eventData.organizer_tokens
            };

            const editResult = this.editEvent(eventUrl, fullEventData);

            if (!editResult.success) {
                return {
                    success: false,
                    error: `Failed to edit event: ${editResult.error}`
                };
            }

            return {
                success: true,
                event: editResult.event,
                organizers: resolvedOrganizers
            };

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return {
                success: false,
                error: err.message
            };
        }
    }

    /**
     * Look up an organizer by name
     * 
     * @param {string} eventUrl - Event URL to use for lookup (usually template URL)
     * @param {string} organizerName - Full name of organizer
     * @returns {{success: boolean, organizer?: {id: number, text: string}, error?: string}} Result
     * @private
     */
    _lookupOrganizer(eventUrl, organizerName) {
        try {
            const eventId = RWGPSClientCore.extractEventId(eventUrl);
            if (!eventId) {
                return { success: false, error: 'Invalid event URL' };
            }

            const lookupUrl = `https://ridewithgps.com/events/${eventId}/organizer_ids.json`;
            const options = RWGPSClientCore.buildOrganizerLookupOptions(this.webSessionCookie, organizerName);

            const response = this._fetch(lookupUrl, options);
            const statusCode = response.getResponseCode();

            if (statusCode !== 200) {
                return { success: false, error: `Lookup failed with status ${statusCode}` };
            }

            const data = JSON.parse(response.getContentText());
            const match = RWGPSClientCore.findMatchingOrganizer(data.results, organizerName);

            if (match) {
                return { success: true, organizer: match };
            } else {
                return { success: false, error: `Organizer not found: ${organizerName}` };
            }

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Remove tags from an event
     * 
     * @param {string} eventId - Event ID
     * @param {string[]} tags - Tag names to remove
     * @returns {{success: boolean, error?: string}} Result
     * @private
     */
    _removeEventTags(eventId, tags) {
        try {
            const url = 'https://ridewithgps.com/events/batch_update_tags.json';
            const options = RWGPSClientCore.buildBatchTagOptions(this.webSessionCookie, eventId, 'remove', tags);

            const response = this._fetch(url, options);
            const statusCode = response.getResponseCode();

            if (statusCode === 200) {
                return { success: true };
            } else {
                return { success: false, error: `Tag removal failed with status ${statusCode}` };
            }

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Delete an event
     * 
     * @param {string} eventUrl - Event URL
     * @returns {{success: boolean, error?: string}} Result
     */
    deleteEvent(eventUrl) {
        try {
            // Parse event URL to get ID
            const parsed = RWGPSClientCore.parseEventUrl(eventUrl);
            
            // Login to establish session (even though we use Basic Auth, login is required)
            const loginSuccess = this.login();
            if (!loginSuccess) {
                return {
                    success: false,
                    error: 'Login failed - could not establish web session'
                };
            }
            
            // DELETE using v1 API with Basic Auth
            const deleteUrl = `https://ridewithgps.com/api/v1/events/${parsed.eventId}.json`;
            const request = this._prepareRequest(
                { url: deleteUrl, method: 'delete' },
                'BASIC_AUTH'
            );
            
            const response = this._fetch(request.url, request);
            const statusCode = response.getResponseCode();
            
            // 204 No Content = success
            if (statusCode === 204) {
                return { success: true };
            } else {
                return {
                    success: false,
                    error: `Unexpected status code: ${statusCode}`
                };
            }
            
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return {
                success: false,
                error: err.message
            };
        }
    }

    /**
     * Get event details
     * 
     * @param {string} eventUrl - Event URL
     * @returns {{success: boolean, event?: any, error?: string}} Result with event data
     */
    getEvent(eventUrl) {
        try {
            // Parse event URL to get ID
            const parsed = RWGPSClientCore.parseEventUrl(eventUrl);
            
            // GET event using v1 API with Basic Auth (no login needed)
            const getUrl = `https://ridewithgps.com/api/v1/events/${parsed.eventId}.json`;
            const options = {
                method: 'GET',
                headers: {
                    'Authorization': this._getBasicAuthHeader(),
                    'Accept': 'application/json'
                },
                muteHttpExceptions: true
            };
            
            const response = this._fetch(getUrl, options);
            const statusCode = response.getResponseCode();
            
            if (statusCode === 200) {
                const responseText = response.getContentText();
                const responseData = JSON.parse(responseText);
                
                // v1 API returns {"event": {...}}, unwrap the event object
                const v1Event = responseData.event || responseData;
                
                // PHASE 4: Transform v1 → web format for backward compatibility
                // Consumers still expect web format during Phase 4
                // Phase 5 will update consumers to accept v1 format directly
                const webEvent = this._transformV1ToWebFormat(v1Event);
                
                return {
                    success: true,
                    event: webEvent
                };
            } else {
                return {
                    success: false,
                    error: `API returned status ${statusCode}`
                };
            }
            
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return {
                success: false,
                error: err.message
            };
        }
    }

    /**
     * Edit an event using v1 API
     * 
     * CRITICAL: RWGPS API requires two sequential PUT requests (double-edit pattern)
     * 1. First PUT with all_day=1 (workaround to clear existing time)
     * 2. Second PUT with all_day=0 and actual event data
     * 
     * This workaround is required for the start time to be set correctly.
     * 
     * **V1 API Native Format**:
     * - Uses description (not desc)
     * - Uses start_date + start_time (not starts_at)
     * - Uses organizer_ids[] (not organizer_tokens[])
     * - Uses route_ids[] (not route_ids from web API)
     * 
     * @param {string} eventUrl - Event URL
     * @param {{name?: string, description?: string, start_date?: string, start_time?: string, visibility?: string | number, organizer_ids?: (string | number)[], route_ids?: (string | number)[], location?: string, time_zone?: string}} eventData - Event data in v1 format
     * @returns {{success: boolean, event?: any, error?: string}} Result with updated event data (v1 format)
     */
    editEvent(eventUrl, eventData) {
        try {
            // Parse event URL to get ID
            const parsed = RWGPSClientCore.parseEventUrl(eventUrl);
            
            // Build v1 API URL
            const v1PutUrl = `https://ridewithgps.com/api/v1/events/${parsed.eventId}.json`;
            const basicAuthHeader = this._getBasicAuthHeader();
            
            // FIRST PUT: Set all_day=1 (workaround)
            const payload1 = RWGPSClientCore.buildV1EditEventPayload(eventData, '1');
            const options1 = RWGPSClientCore.buildV1EditEventOptions(basicAuthHeader, payload1);
            
            const response1 = this._fetch(v1PutUrl, options1);
            const statusCode1 = response1.getResponseCode();
            
            if (statusCode1 !== 200) {
                return {
                    success: false,
                    error: `First edit failed with status code: ${statusCode1}`
                };
            }
            
            // SECOND PUT: Set all_day=0 with actual data
            const payload2 = RWGPSClientCore.buildV1EditEventPayload(eventData, '0');
            const options2 = RWGPSClientCore.buildV1EditEventOptions(basicAuthHeader, payload2);
            
            const response2 = this._fetch(v1PutUrl, options2);
            const statusCode2 = response2.getResponseCode();
            
            if (statusCode2 === 200) {
                const responseText = response2.getContentText();
                const responseData = JSON.parse(responseText);
                
                // v1 API returns {"event": {...}}, unwrap
                const event = responseData.event || responseData;
                
                return {
                    success: true,
                    event: event
                };
            } else {
                return {
                    success: false,
                    error: `Second edit failed with status code: ${statusCode2}`
                };
            }
            
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return {
                success: false,
                error: err.message
            };
        }
    }

    /**
     * Create a new event using v1 API
     * 
     * Uses POST /api/v1/events.json with Basic Auth to create a new event.
     * 
     * @param {{name: string, description?: string, start_date: string, start_time: string, visibility?: string | number, organizer_ids?: (string | number)[], route_ids?: (string | number)[], location?: string, time_zone?: string}} eventData - Event data in v1 format
     * @returns {{success: boolean, eventUrl?: string, event?: any, error?: string}} Result with event URL and data
     */
    createEvent(eventData) {
        try {
            // Build v1 API URL for creating event
            const v1PostUrl = 'https://ridewithgps.com/api/v1/events.json';

            // Build Basic Auth header
            const basicAuthHeader = RWGPSClientCore.buildBasicAuthHeader(this.apiKey, this.authToken);

            // Build payload - same structure as editEvent but with all required fields
            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, '0');

            // Build POST request options
            const options = RWGPSClientCore.buildV1CreateEventOptions(basicAuthHeader, payload);

            // Make POST request
            const response = this._fetch(v1PostUrl, options);
            const statusCode = response.getResponseCode();

            if (statusCode === 201) {
                const responseText = response.getContentText();
                const responseData = JSON.parse(responseText);

                // v1 API returns {"event": {...}}, unwrap
                const event = responseData.event || responseData;

                return {
                    success: true,
                    eventUrl: event.html_url || event.url,
                    event: event
                };
            } else {
                const responseText = response.getContentText();
                return {
                    success: false,
                    error: `Create failed with status ${statusCode}: ${responseText}`
                };
            }

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return {
                success: false,
                error: `Create failed: ${err.message}`
            };
        }
    }

    /**
     * Create a new event with logo using multipart/form-data
     * 
     * @param {any} eventData - Event data (name, description, start_date, etc.)
     * @param {string} logoUrl - Logo image URL to fetch and attach
     * @returns {{success: boolean, eventUrl?: string, event?: any, error?: string}} Result with event URL and data
     */
    createEventWithLogo(eventData, logoUrl) {
        try {
            // Build v1 API URL for creating event
            const v1PostUrl = 'https://ridewithgps.com/api/v1/events.json';

            // Build Basic Auth header
            const basicAuthHeader = RWGPSClientCore.buildBasicAuthHeader(this.apiKey, this.authToken);

            // Fetch logo image from Google Drive
            console.log(`Fetching logo from: ${logoUrl}`);
            
            // Extract file ID from Drive URL (format: https://drive.google.com/file/d/FILE_ID/view?...)
            const fileIdMatch = logoUrl.match(/\/file\/d\/([^\/]+)/);
            if (!fileIdMatch) {
                throw new Error(`Invalid Drive URL format: ${logoUrl}`);
            }
            const fileId = fileIdMatch[1];
            
            // Use DriveApp to get the actual file blob (not the HTML viewer page)
            const logoBlob = DriveApp.getFileById(fileId).getBlob();
            console.log(`Logo fetched: ${logoBlob.getContentType()}, ${logoBlob.getBytes().length} bytes`);

            // Build multipart payload with logo
            const boundary = '----WebKitFormBoundary' + Utilities.getUuid().replace(/-/g, '');
            const payload = RWGPSClientCore.buildMultipartCreateEventPayload(eventData, logoBlob, boundary);

            // Build multipart request options
            const options = {
                method: 'POST',
                headers: {
                    'Authorization': basicAuthHeader,
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Accept': 'application/json'
                },
                payload: payload,
                muteHttpExceptions: true
            };

            // Make POST request
            const response = this._fetch(v1PostUrl, options);
            const statusCode = response.getResponseCode();

            if (statusCode === 201) {
                const responseText = response.getContentText();
                const responseData = JSON.parse(responseText);

                // v1 API returns {"event": {...}}, unwrap
                const event = responseData.event || responseData;

                return {
                    success: true,
                    eventUrl: event.html_url || event.url,
                    event: event
                };
            } else {
                const responseText = response.getContentText();
                return {
                    success: false,
                    error: `Create with logo failed with status ${statusCode}: ${responseText}`
                };
            }

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return {
                success: false,
                error: `Create with logo failed: ${err.message}`
            };
        }
    }

    /**
     * Cancel an event (adds "CANCELLED: " prefix to name)
     * 
     * @param {string} eventUrl - Event URL
     * @returns {{success: boolean, event?: any, error?: string}} Result with updated event data
     */
    cancelEvent(eventUrl) {
        try {
            // Get current event
            const getResult = this.getEvent(eventUrl);
            
            if (!getResult.success) {
                return {
                    success: false,
                    error: `Failed to get event: ${getResult.error}`
                };
            }
            
            const event = getResult.event;
            
            // Check if already cancelled
            if (event.name && event.name.startsWith('CANCELLED: ')) {
                return {
                    success: false,
                    error: 'Event is already cancelled'
                };
            }
            
            // Add "CANCELLED: " prefix to name
            const modifiedEvent = {
                ...event,
                name: 'CANCELLED: ' + event.name
            };
            
            // Edit event with modified name
            const editResult = this.editEvent(eventUrl, modifiedEvent);
            
            if (!editResult.success) {
                return {
                    success: false,
                    error: `Failed to edit event: ${editResult.error}`
                };
            }
            
            return {
                success: true,
                event: editResult.event
            };
            
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return {
                success: false,
                error: err.message
            };
        }
    }

    /**
     * Reinstate a cancelled event (removes "CANCELLED: " prefix from name)
     * 
     * @param {string} eventUrl - Event URL
     * @returns {{success: boolean, event?: any, error?: string}} Result with updated event data
     */
    reinstateEvent(eventUrl) {
        try {
            // Get current event
            const getResult = this.getEvent(eventUrl);
            
            if (!getResult.success) {
                return {
                    success: false,
                    error: `Failed to get event: ${getResult.error}`
                };
            }
            
            const event = getResult.event;
            
            // Check if event is cancelled
            if (!event.name || !event.name.startsWith('CANCELLED: ')) {
                return {
                    success: false,
                    error: 'Event is not cancelled (name does not start with "CANCELLED: ")'
                };
            }
            
            // Remove "CANCELLED: " prefix from name
            const modifiedEvent = {
                ...event,
                name: event.name.substring('CANCELLED: '.length)
            };
            
            // Edit event with modified name
            const editResult = this.editEvent(eventUrl, modifiedEvent);
            
            if (!editResult.success) {
                return {
                    success: false,
                    error: `Failed to edit event: ${editResult.error}`
                };
            }
            
            return {
                success: true,
                event: editResult.event
            };
            
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return {
                success: false,
                error: err.message
            };
        }
    }

    /**
     * Copy a template event to create a new event
     * 
     * This method creates a new event by copying an existing template event.
     * The RWGPS API returns a 302 redirect with the new event URL in the Location header.
     * 
     * @param {string} templateUrl - Template event URL (e.g., "https://ridewithgps.com/events/404019-b-template")
     * @param {{name?: string, all_day?: string, copy_routes?: string, start_date?: string, start_time?: string}} [eventData] - Optional event data to set during copy
     * @returns {{success: boolean, eventUrl?: string, error?: string}} Result with new event URL
     */
    copyTemplate(templateUrl, eventData = {}) {
        try {
            // Login first
            const loginSuccess = this.login();
            if (!loginSuccess) {
                return { success: false, error: 'Login failed - could not establish web session' };
            }

            // Validate template URL
            const templateId = RWGPSClientCore.extractEventId(templateUrl);
            if (!templateId) {
                return { success: false, error: 'Invalid template URL - could not extract event ID' };
            }

            // Build copy URL - use the original URL with /copy appended (NOT .json)
            // RWGPS returns 302 redirect with Location header for this endpoint
            const copyUrl = templateUrl + '/copy';

            // Build payload with event data
            const payload = {
                'event[name]': eventData.name || 'COPIED EVENT',
                'event[all_day]': eventData.all_day || '0',
                'event[copy_routes]': eventData.copy_routes || '0',
                'event[start_date]': eventData.start_date || '',
                'event[start_time]': eventData.start_time || ''
            };

            // Make copy request - followRedirects: false is CRITICAL to get 302 with Location header
            const response = this._fetch(copyUrl, {
                method: 'POST',
                headers: {
                    'Cookie': this.webSessionCookie,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                payload: payload,
                followRedirects: false,
                muteHttpExceptions: true
            });

            const status = response.getResponseCode();

            // Copy returns 302 redirect with Location header
            if (status === 302) {
                const location = response.getHeaders()['Location'] || response.getHeaders()['location'];
                if (!location) {
                    return { success: false, error: 'Copy succeeded but no Location header found' };
                }
                return { success: true, eventUrl: location };
            } else {
                return { success: false, error: `Copy failed with status ${status}` };
            }

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: `Copy failed: ${err.message}` };
        }
    }

    /**
     * Import (copy) a route into the club library with tags
     * 
     * Workflow:
     * 1. Login to establish web session
     * 2. Copy route to club library
     * 3. Fetch full route details
     * 4. Add tags to the route
     * 
     * @param {string} routeUrl - Source route URL to copy
     * @param {{name?: string, expiry?: string, tags?: string[], userId: number}} routeData - Route copy parameters
     * @returns {{success: boolean, routeUrl?: string, route?: any, error?: string}} Result with route URL and data
     */
    importRoute(routeUrl, routeData) {
        try {
            // Step 1: Login to establish web session
            const loginSuccess = this.login();
            if (!loginSuccess) {
                return { success: false, error: 'Login failed' };
            }

            // Step 2: Copy route
            const copyResult = this._copyRoute(routeUrl, routeData);
            if (!copyResult.success) {
                return { success: false, error: `Route copy failed: ${copyResult.error}` };
            }

            const newRouteUrl = copyResult.routeUrl;

            // Step 3: Fetch full route details
            const getResult = this.getRoute(newRouteUrl);
            if (!getResult.success) {
                return { 
                    success: false, 
                    error: `Route copy succeeded but fetch failed: ${getResult.error}`,
                    routeUrl: newRouteUrl
                };
            }

            // Step 4: Add tags (non-fatal if fails)
            if (routeData.tags && routeData.tags.length > 0) {
                const tagResult = this._addRouteTags(newRouteUrl, routeData.tags);
                if (!tagResult.success) {
                    console.warn(`Warning: Tag addition failed: ${tagResult.error}`);
                }
            }

            return {
                success: true,
                routeUrl: newRouteUrl,
                route: getResult.route
            };

        } catch (/** @type {any} */ error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return {
                success: false,
                error: err.message
            };
        }
    }

    /**
     * Copy a route to club library
     * 
     * @param {string} routeUrl - Source route URL
     * @param {{name?: string, expiry?: string, tags?: string[], userId: number}} routeData - Copy parameters
     * @returns {{success: boolean, routeUrl?: string, error?: string}} Result
     * @private
     */
    _copyRoute(routeUrl, routeData) {
        try {
            const routeId = RWGPSClientCore.extractRouteId(routeUrl);
            if (!routeId) {
                return { success: false, error: 'Invalid route URL' };
            }

            const copyUrl = `https://ridewithgps.com/routes/${routeId}/copy.json`;
            const options = RWGPSClientCore.buildRouteCopyOptions(
                this.webSessionCookie,
                routeUrl,
                routeData
            );

            const response = this._fetch(copyUrl, options);
            const statusCode = response.getResponseCode();

            if (statusCode !== 200) {
                return { success: false, error: `Copy failed with status ${statusCode}` };
            }

            const data = JSON.parse(response.getContentText());
            
            if (data.success && data.url) {
                return { success: true, routeUrl: data.url };
            } else {
                return { success: false, error: 'Copy response missing URL' };
            }

        } catch (/** @type {any} */ error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Get route details via API v1
     * 
     * @param {string} routeUrl - Route URL
     * @returns {{success: boolean, route?: any, error?: string}} Result
     */
    getRoute(routeUrl) {
        try {
            const routeId = RWGPSClientCore.extractRouteId(routeUrl);
            if (!routeId) {
                return { success: false, error: 'Invalid route URL' };
            }

            const apiUrl = `https://ridewithgps.com/api/v1/routes/${routeId}.json`;
            const options = {
                method: 'GET',
                headers: {
                    'Authorization': this._getBasicAuthHeader(),
                    'Accept': 'application/json'
                },
                muteHttpExceptions: true
            };

            const response = this._fetch(apiUrl, options);
            const statusCode = response.getResponseCode();

            if (statusCode !== 200) {
                return { success: false, error: `Get route failed with status ${statusCode}` };
            }

            const data = JSON.parse(response.getContentText());
            return { success: true, route: data.route };

        } catch (/** @type {any} */ error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Add tags to a route
     * 
     * @param {string} routeUrl - Route URL
     * @param {string[]} tags - Tags to add
     * @returns {{success: boolean, error?: string}} Result
     * @private
     */
    _addRouteTags(routeUrl, tags) {
        try {
            const routeId = RWGPSClientCore.extractRouteId(routeUrl);
            if (!routeId) {
                return { success: false, error: 'Invalid route URL' };
            }

            const tagUrl = 'https://ridewithgps.com/routes/batch_update_tags.json';
            const options = RWGPSClientCore.buildRouteTagOptions(
                this.webSessionCookie,
                routeId,
                tags
            );

            const response = this._fetch(tagUrl, options);
            const statusCode = response.getResponseCode();

            if (statusCode !== 200) {
                return { success: false, error: `Tag addition failed with status ${statusCode}` };
            }

            return { success: true };

        } catch (/** @type {any} */ error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { success: false, error: err.message };
        }
    }

    /**
     * Get Basic Auth header
     * 
     * @returns {string} Basic Auth header value
     * @private
     */
    _getBasicAuthHeader() {
        return RWGPSClientCore.buildBasicAuthHeader(this.apiKey, this.authToken);
    }

    /**
     * Execute HTTP request using UrlFetchApp
     * 
     * @param {string} url - Request URL
     * @param {{method?: string, headers?: Record<string, string>, payload?: string, muteHttpExceptions?: boolean}} options - Request options
     * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse} Response
     * @private
     */
    _fetch(url, options) {
        // GAS-only code path
        /* istanbul ignore next */
        return UrlFetchApp.fetch(url, options);
    }

    /**
     * TEST: Edit event via v1 API with single PUT (no double-edit workaround)
     * Used to test if v1 API requires the double-edit pattern
     * 
     * @param {string} eventUrl - Event URL
     * @param {any} eventData - Event data
     * @returns {{success: boolean, event?: any, error?: string}}
     */
    testV1SingleEditEvent(eventUrl, eventData) {
        try {
            const parsed = RWGPSClientCore.parseEventUrl(eventUrl);
            const v1Url = `https://ridewithgps.com/api/v1/events/${parsed.eventId}.json`;
            
            // Build v1 API payload with ALL fields from OpenAPI EventPayload schema
            // Include all fields that are present in eventData
            /** @type {Record<string, any>} */
            const eventPayload = {};
            
            // Text fields
            if (eventData.name !== undefined) eventPayload.name = eventData.name;
            if (eventData.description !== undefined) eventPayload.description = eventData.description;
            
            // Date/Time fields (v1 API uses start_date + start_time, NOT starts_at)
            if (eventData.start_date !== undefined) eventPayload.start_date = eventData.start_date;
            if (eventData.start_time !== undefined) eventPayload.start_time = eventData.start_time;
            if (eventData.end_date !== undefined) eventPayload.end_date = eventData.end_date;
            if (eventData.end_time !== undefined) eventPayload.end_time = eventData.end_time;
            
            // Location fields
            if (eventData.location !== undefined) eventPayload.location = eventData.location;
            if (eventData.lat !== undefined) eventPayload.lat = eventData.lat;
            if (eventData.lng !== undefined) eventPayload.lng = eventData.lng;
            if (eventData.time_zone !== undefined) eventPayload.time_zone = eventData.time_zone;
            
            // Visibility
            if (eventData.visibility !== undefined) eventPayload.visibility = eventData.visibility;
            
            // all_day - always include for time changes
            eventPayload.all_day = eventData.all_day !== undefined ? eventData.all_day : '0';
            
            // Organizers - try both formats that OpenAPI mentions
            if (eventData.organizers !== undefined) eventPayload.organizers = eventData.organizers;
            if (eventData.organizer_ids !== undefined) eventPayload.organizer_ids = eventData.organizer_ids;
            
            const payload = { event: eventPayload };
            
            console.log(`   DEBUG: Sending PUT to ${v1Url}`);
            console.log(`   DEBUG: Payload: ${JSON.stringify(payload, null, 2)}`);
            
            const options = {
                method: 'PUT',
                headers: {
                    'Authorization': this._getBasicAuthHeader(),  // Use apiKey:authToken (not username:password)
                    'Content-Type': 'application/json'
                },
                payload: JSON.stringify(payload),
                muteHttpExceptions: true
            };
            
            const response = this._fetch(v1Url, options);
            const statusCode = response.getResponseCode();
            
            // Capture x-request-id for debugging with RWGPS support
            const headers = response.getAllHeaders();
            const requestId = headers['x-request-id'] || headers['X-Request-Id'] || 'not found';
            console.log(`   DEBUG: Response status: ${statusCode}`);
            console.log(`   DEBUG: x-request-id: ${requestId}`);
            
            if (statusCode === 200) {
                const data = JSON.parse(response.getContentText());
                return {
                    success: true,
                    event: data.event || data,
                    requestId: requestId
                };
            } else {
                return {
                    success: false,
                    error: `V1 API edit failed with status ${statusCode}`,
                    requestId: requestId
                };
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return {
                success: false,
                error: err.message
            };
        }
    }

    /**
     * Transform v1 API format to web API format for backward compatibility
     * 
     * During Phase 4: Consumers still expect web format (starts_at, desc, etc.)
     * During Phase 5: Consumers will be updated to accept v1 format directly
     * 
     * v1 format:
     * - start_date + start_time (separate fields)
     * - description
     * - organizers array with {id, name}
     * - routes array with {id, name}
     * 
     * web format:
     * - starts_at (ISO 8601 datetime)
     * - desc
     * - organizers array with {id, text}
     * - routes array with {id}
     * 
     * @param {any} v1Event - Event object in v1 format
     * @returns {any} Event object in web format
     * @private
     */
    _transformV1ToWebFormat(v1Event) {
        // Create web format event by copying v1 fields
        const webEvent = { ...v1Event };
        
        // Transform start_date + start_time → starts_at
        if (v1Event.start_date && v1Event.start_time && !v1Event.all_day) {
            // Combine date and time into ISO 8601 format
            // Use time_zone if available, otherwise default to PST (-08:00)
            const timeZone = v1Event.time_zone || 'America/Los_Angeles';
            const dateTimeStr = `${v1Event.start_date}T${v1Event.start_time}:00`;
            
            // For simplicity, use -08:00 offset for Pacific time
            // (This is approximate; real implementation should handle DST)
            webEvent.starts_at = `${dateTimeStr}-08:00`;
        } else if (v1Event.all_day && v1Event.start_date) {
            // All-day events: use midnight time
            webEvent.starts_at = `${v1Event.start_date}T00:00:00-08:00`;
        }
        
        // Add desc as alias for description (consumers may expect both)
        if (v1Event.description !== undefined) {
            webEvent.desc = v1Event.description;
        }
        
        // Transform organizers: {id, name} → {id, text}
        if (Array.isArray(v1Event.organizers)) {
            webEvent.organizers = v1Event.organizers.map((org) => ({
                id: org.id,
                text: org.name || ''
            }));
        }
        
        return webEvent;
    }
}

return RWGPSClient;
})();

/* istanbul ignore if - Node.js/Jest export */
if (typeof module !== 'undefined') {
    module.exports = RWGPSClient;
}
