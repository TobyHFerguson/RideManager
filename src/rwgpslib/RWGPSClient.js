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
     * Schedule a new event (no templates - creates event directly)
     * 
     * Workflow:
     * 1. Login to establish web session
     * 2. Create event using v1 API (with logo if provided)
     * 3. Edit event with full data including organizer tokens
     * 
     * Note: Organizer IDs should be looked up by caller via RWGPSMembersAdapter.lookupUserIdByName()
     * before calling this method.
     * 
     * @param {any} eventData - Event data (name, desc, start_date, start_time, etc.)
     * @param {number[]} organizerIds - Array of organizer user IDs (pre-looked up)
     * @param {string} [logoUrl] - Optional logo URL to attach to event
     * @returns {{success: boolean, eventUrl?: string, event?: any, error?: string}} Result with new event URL and data
     */
    scheduleEvent(eventData, organizerIds, logoUrl) {
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
            console.log(logoUrl ? 'Creating event with logo...' : 'Creating event without logo...');
            const createResult = this.createEvent(eventData, logoUrl);

            if (!createResult.success) {
                return {
                    success: false,
                    error: `Failed to create event: ${createResult.error}`
                };
            }

            const newEventUrl = createResult.eventUrl;

            // Step 3: Convert organizer IDs to tokens (strings)
            // Organizer IDs are looked up by caller via RWGPSMembersAdapter.lookupUserIdByName()
            const organizerTokens = [];
            if (organizerIds && organizerIds.length > 0) {
                for (const id of organizerIds) {
                    organizerTokens.push(String(id));
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
     * Update an existing event with new data and optionally set organizers
     * 
     * Workflow:
     * 1. Login to establish web session
     * 2. Edit event with full data including organizer tokens
     * 
     * Note: Organizer IDs should be looked up by caller via RWGPSMembersAdapter.lookupUserIdByName()
     * 
     * @param {string} eventUrl - Existing event URL
     * @param {any} eventData - Event data (name, desc, starts_at, etc.)
     * @param {number[]} organizerIds - Array of organizer user IDs (optional)
     * @returns {{success: boolean, event?: any, error?: string}} Result
     */
    updateEvent(eventUrl, eventData, organizerIds) {
        try {
            // Step 1: Login
            const loginSuccess = this.login();
            if (!loginSuccess) {
                return {
                    success: false,
                    error: 'Login failed - could not establish web session'
                };
            }

            // Step 2: Convert organizer IDs to tokens (strings)
            const organizerTokens = [];
            if (organizerIds && organizerIds.length > 0) {
                for (const id of organizerIds) {
                    organizerTokens.push(String(id));
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

    // NOTE: _lookupOrganizer was removed in Task 5.3.5
    // Organizer lookup is now done by caller via RWGPSMembersAdapter.lookupUserIdByName()
    // which uses the cached "RWGPS Members" sheet for faster lookups

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
     * Add tags to an event
     * 
     * @param {string} eventId - Event ID
     * @param {string[]} tags - Tag names to add
     * @returns {{success: boolean, error?: string}} Result
     */
    _addEventTags(eventId, tags) {
        try {
            const url = 'https://ridewithgps.com/events/batch_update_tags.json';
            const options = RWGPSClientCore.buildBatchTagOptions(this.webSessionCookie, eventId, 'add', tags);

            const response = this._fetch(url, options);
            const statusCode = response.getResponseCode();

            if (statusCode === 200) {
                return { success: true };
            } else {
                return { success: false, error: `Tag addition failed with status ${statusCode}` };
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
            
            // DELETE using v1 API with Basic Auth (no login required)
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
     * Uses a single PUT request to update event data.
     * Testing proved that v1 API correctly handles all fields including start_date/start_time
     * with a single PUT (no double-edit workaround needed).
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
            
            // Single PUT with all_day=0 and actual data
            const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, '0');
            const options = RWGPSClientCore.buildV1EditEventOptions(basicAuthHeader, payload);
            
            const response = this._fetch(v1PutUrl, options);
            const statusCode = response.getResponseCode();
            
            if (statusCode === 200) {
                const responseText = response.getContentText();
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
                    error: `Edit failed with status code: ${statusCode}`
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
    /**
     * Create a new event using v1 API with optional logo
     * 
     * @param {any} eventData - Event data (name, description, start_date, etc.)
     * @param {string} [logoUrl] - Optional logo image URL to fetch and attach
     * @returns {{success: boolean, eventUrl?: string, event?: any, error?: string}} Result with event URL and data
     */
    createEvent(eventData, logoUrl) {
        try {
            // Build v1 API URL for creating event
            const v1PostUrl = 'https://ridewithgps.com/api/v1/events.json';

            // Build Basic Auth header
            const basicAuthHeader = RWGPSClientCore.buildBasicAuthHeader(this.apiKey, this.authToken);

            // Branch based on whether logo is provided
            let options;
            if (logoUrl) {
                // Create event with logo using multipart/form-data
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

                // Build multipart text structure (Core logic - pure JS, no Blob operations)
                const boundary = '----WebKitFormBoundary' + Utilities.getUuid().replace(/-/g, '');
                const textParts = RWGPSClientCore.buildMultipartTextParts(eventData, logoBlob, boundary);

                // Assemble final payload with Blob operations (Adapter responsibility)
                // Convert text parts to bytes
                const textBytes = Utilities.newBlob(textParts.textPart).getBytes();
                const logoBytes = logoBlob.getBytes();
                const endBytes = Utilities.newBlob(textParts.endBoundary).getBytes();

                // Concatenate all bytes
                /** @type {number[]} */
                const allBytes = [];
                for (let i = 0; i < textBytes.length; i++) {
                    allBytes.push(textBytes[i]);
                }
                for (let i = 0; i < logoBytes.length; i++) {
                    allBytes.push(logoBytes[i]);
                }
                for (let i = 0; i < endBytes.length; i++) {
                    allBytes.push(endBytes[i]);
                }

                // Create final multipart Blob
                const payload = Utilities.newBlob(allBytes).setContentType(`multipart/form-data; boundary=${boundary}`);

                // Build multipart request options
                options = {
                    method: 'POST',
                    headers: {
                        'Authorization': basicAuthHeader,
                        'Content-Type': `multipart/form-data; boundary=${boundary}`,
                        'Accept': 'application/json'
                    },
                    payload: payload,
                    muteHttpExceptions: true
                };
            } else {
                // Create event without logo using JSON POST
                const payload = RWGPSClientCore.buildV1EditEventPayload(eventData, '0');
                options = RWGPSClientCore.buildV1CreateEventOptions(basicAuthHeader, payload);
            }

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
                const errorMsg = logoUrl ? 'Create with logo failed' : 'Create failed';
                return {
                    success: false,
                    error: `${errorMsg} with status ${statusCode}: ${responseText}`
                };
            }

        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const errorMsg = logoUrl ? 'Create with logo failed' : 'Create failed';
            return {
                success: false,
                error: `${errorMsg}: ${err.message}`
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
     * Update the logo on an existing event using multipart form-data PUT
     * 
     * @param {string} eventUrl - Event URL (e.g., "https://ridewithgps.com/events/12345-event-name")
     * @param {string} logoUrl - Google Drive URL for the new logo image
     * @returns {{success: boolean, error?: string}} Result
     */
    updateEventLogo(eventUrl, logoUrl) {
        try {
            // Step 1: Login to establish web session (needed for multipart PUT)
            const loginSuccess = this.login();
            if (!loginSuccess) {
                return {
                    success: false,
                    error: 'Login failed - could not establish web session'
                };
            }

            // Step 2: Extract event ID from URL
            const eventId = RWGPSClientCore.extractEventId(eventUrl);
            if (!eventId) {
                return {
                    success: false,
                    error: `Could not extract event ID from URL: ${eventUrl}`
                };
            }

            // Step 3: Fetch logo from Google Drive
            const fileIdMatch = logoUrl.match(/\/file\/d\/([^\/]+)/);
            if (!fileIdMatch) {
                return {
                    success: false,
                    error: `Invalid Drive URL format: ${logoUrl}`
                };
            }
            const fileId = fileIdMatch[1];
            const logoBlob = DriveApp.getFileById(fileId).getBlob();
            console.log(`RWGPSClient.updateEventLogo: Logo fetched: ${logoBlob.getContentType()}, ${logoBlob.getBytes().length} bytes`);

            // Step 4: Build multipart form-data for logo update
            const boundary = '----WebKitFormBoundary' + Utilities.getUuid().replace(/-/g, '');
            
            // Build the multipart text parts (adapted from buildMultipartTextParts)
            const contentType = logoBlob.getContentType();
            const extension = contentType === 'image/png' ? 'png' : 'jpg';
            
            // Header part (just the logo, no event data)
            const textPart = 
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="event[logo]"; filename="logo.${extension}"\r\n` +
                `Content-Type: ${contentType}\r\n\r\n`;
            
            const endBoundary = `\r\n--${boundary}--\r\n`;

            // Step 5: Assemble final payload with Blob operations
            const textBytes = Utilities.newBlob(textPart).getBytes();
            const logoBytes = logoBlob.getBytes();
            const endBytes = Utilities.newBlob(endBoundary).getBytes();

            /** @type {number[]} */
            const allBytes = [];
            for (let i = 0; i < textBytes.length; i++) {
                allBytes.push(textBytes[i]);
            }
            for (let i = 0; i < logoBytes.length; i++) {
                allBytes.push(logoBytes[i]);
            }
            for (let i = 0; i < endBytes.length; i++) {
                allBytes.push(endBytes[i]);
            }

            const payload = Utilities.newBlob(allBytes).setContentType(`multipart/form-data; boundary=${boundary}`);

            // Step 6: Build and execute PUT request
            const basicAuthHeader = RWGPSClientCore.buildBasicAuthHeader(this.apiKey, this.authToken);
            const putUrl = `https://ridewithgps.com/api/v1/events/${eventId}.json`;

            const options = {
                method: 'PUT',
                headers: {
                    'Authorization': basicAuthHeader,
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Accept': 'application/json'
                },
                payload: payload,
                muteHttpExceptions: true
            };

            const response = this._fetch(putUrl, options);
            const statusCode = response.getResponseCode();

            if (statusCode === 200 || statusCode === 201) {
                console.log(`RWGPSClient.updateEventLogo: Logo updated successfully for event ${eventId}`);
                return { success: true };
            } else {
                const responseText = response.getContentText();
                return {
                    success: false,
                    error: `Logo update failed with status ${statusCode}: ${responseText}`
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
     * Set route expiration date by adding an expiration tag
     * 
     * Adds a tag like "expires: MM/DD/YYYY" to the route.
     * If forceUpdate is false, will skip if new date is not later than existing tag.
     * 
     * @param {string} routeUrl - Route URL
     * @param {Date} expiryDate - Expiration date
     * @param {boolean} [forceUpdate=false] - Force update even if new date is not newer
     * @returns {{success: boolean, skipped?: boolean, error?: string}} Result
     */
    setRouteExpiration(routeUrl, expiryDate, forceUpdate = false) {
        try {
            // Login to establish web session
            if (!this.login()) {
                return { success: false, error: 'Login failed' };
            }

            // Get current route to check existing expiration tag
            const routeResult = this.getRoute(routeUrl);
            if (!routeResult.success) {
                return { success: false, error: routeResult.error || 'Failed to get route' };
            }

            // Check existing expiration tag
            const tagNames = routeResult.route?.tag_names || [];
            const existingExpirationTag = tagNames.find((/** @type {string} */ tag) => tag.startsWith('expires:'));

            // Skip if not forceUpdate and existing tag is newer or equal
            if (!forceUpdate && existingExpirationTag) {
                if (!RWGPSClientCore.isExpirationTagNewer(existingExpirationTag, expiryDate)) {
                    return { success: true, skipped: true };
                }
            }

            // Build new expiration tag
            const newTag = RWGPSClientCore.buildExpirationTag(expiryDate);

            // Add the tag
            const tagResult = this._addRouteTags(routeUrl, [newTag]);
            if (!tagResult.success) {
                return { success: false, error: tagResult.error };
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
