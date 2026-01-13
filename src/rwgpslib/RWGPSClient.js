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
     * @param {string} templateUrl - Template event URL
     * @param {any} eventData - Event data
     * @param {string[]} organizerNames - Organizer names
     * @returns {{success: boolean, eventUrl?: string, error?: string}} Result
     */
    scheduleEvent(templateUrl, eventData, organizerNames) {
        // TODO: Implement in Task 3.10
        throw new Error('scheduleEvent not yet implemented');
    }

    /**
     * Update an existing event
     * 
     * @param {string} eventUrl - Event URL
     * @param {any} eventData - Updated event data
     * @returns {{success: boolean, error?: string}} Result
     */
    updateEvent(eventUrl, eventData) {
        // TODO: Implement in Task 3.11
        throw new Error('updateEvent not yet implemented');
    }

    /**
     * Cancel an event (adds CANCELLED prefix)
     * 
     * @param {string} eventUrl - Event URL
     * @returns {{success: boolean, error?: string}} Result
     */
    cancelEvent(eventUrl) {
        // TODO: Implement in Task 3.7
        throw new Error('cancelEvent not yet implemented');
    }

    /**
     * Reinstate a cancelled event (removes CANCELLED prefix)
     * 
     * @param {string} eventUrl - Event URL
     * @returns {{success: boolean, error?: string}} Result
     */
    reinstateEvent(eventUrl) {
        // TODO: Implement in Task 3.8
        throw new Error('reinstateEvent not yet implemented');
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
            
            // Login to establish session
            const loginSuccess = this.login();
            if (!loginSuccess) {
                return {
                    success: false,
                    error: 'Login failed - could not establish web session'
                };
            }
            
            // GET event using web API (not v1 API)
            const getUrl = `https://ridewithgps.com/events/${parsed.eventId}`;
            const options = RWGPSClientCore.buildGetEventOptions(this.webSessionCookie);
            
            const response = this._fetch(getUrl, options);
            const statusCode = response.getResponseCode();
            
            if (statusCode === 200) {
                const responseText = response.getContentText();
                const data = JSON.parse(responseText);
                
                // The response contains {"event": {...}} wrapper
                if (data && data.event) {
                    return {
                        success: true,
                        event: data.event
                    };
                } else {
                    return {
                        success: false,
                        error: 'Unexpected response format: missing event property'
                    };
                }
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
     * Edit an event
     * 
     * CRITICAL: RWGPS API requires two sequential PUT requests (double-edit pattern)
     * 1. First PUT with all_day=1 (workaround to clear existing time)
     * 2. Second PUT with all_day=0 and actual event data
     * 
     * This workaround is required for the start time to be set correctly.
     * 
     * @param {string} eventUrl - Event URL
     * @param {any} eventData - Event data object (from getEvent or modified)
     * @returns {{success: boolean, event?: any, error?: string}} Result with updated event data
     */
    editEvent(eventUrl, eventData) {
        try {
            // Parse event URL to get ID
            const parsed = RWGPSClientCore.parseEventUrl(eventUrl);
            
            // Login to establish session
            const loginSuccess = this.login();
            if (!loginSuccess) {
                return {
                    success: false,
                    error: 'Login failed - could not establish web session'
                };
            }
            
            // Build PUT URL
            const putUrl = `https://ridewithgps.com/events/${parsed.eventId}`;
            
            // FIRST PUT: Set all_day=1 (workaround)
            const payload1 = RWGPSClientCore.buildEditEventPayload(eventData, '1');
            const options1 = RWGPSClientCore.buildEditEventOptions(this.webSessionCookie, payload1);
            
            const response1 = this._fetch(putUrl, options1);
            const statusCode1 = response1.getResponseCode();
            
            if (statusCode1 !== 200) {
                return {
                    success: false,
                    error: `First edit failed with status code: ${statusCode1}`
                };
            }
            
            // SECOND PUT: Set all_day=0 with actual data
            const payload2 = RWGPSClientCore.buildEditEventPayload(eventData, '0');
            const options2 = RWGPSClientCore.buildEditEventOptions(this.webSessionCookie, payload2);
            
            const response2 = this._fetch(putUrl, options2);
            const statusCode2 = response2.getResponseCode();
            
            if (statusCode2 === 200) {
                const responseText = response2.getContentText();
                const data = JSON.parse(responseText);
                
                return {
                    success: true,
                    event: data
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
     * Import a route
     * 
     * @param {string} routeUrl - Route URL
     * @param {any} options - Import options
     * @returns {{success: boolean, routeUrl?: string, error?: string}} Result
     */
    importRoute(routeUrl, options) {
        // TODO: Implement in Task 3.12
        throw new Error('importRoute not yet implemented');
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
}

return RWGPSClient;
})();

/* istanbul ignore if - Node.js/Jest export */
if (typeof module !== 'undefined') {
    module.exports = RWGPSClient;
}
