
/**
 * The main API service. It handles all fetch requests and
 * manages authentication using an internal CredentialManager.
 */
class ApiService {
    constructor(credentialManager) {
        this.credentialManager = credentialManager;
        this.webSessionCookie = null;
    }

    // A private helper method to prepare a single request with proper method and authentication headers.
    _prepareRequest(request, authType) {
        let headers = request.headers || {};

        // Automatically set the method based on the presence of a payload
        if (request.payload && !request.method) {
            request.method = 'post';
        } else if (!request.method) {
            request.method = 'get';
        }

        if (authType) {
            if (authType === 'WEB_SESSION') {
                if (!this.webSessionCookie) {
                    throw new Error('Web session not authenticated. Please log in first.');
                }
                headers['Cookie'] = this.webSessionCookie;
                headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
            } else if (authType === 'BASIC_AUTH') {
                const apiKey = this.credentialManager.getApiKey();
                const authToken = this.credentialManager.getAuthToken();
                const encodedAuth = Utilities.base64Encode(`${apiKey}:${authToken}`);
                headers['Authorization'] = `Basic ${encodedAuth}`;
            }
        }

        request.headers = headers;
        return {
            ...request
        };
    }

    /**
     * Handles the initial login to get the web session cookie.
     */
    login() {
        const username = this.credentialManager.getUsername();
        const password = this.credentialManager.getPassword();
        const loginUrl = 'https://ridewithgps.com/organizations/47/sign_in';
        const headers = { 'user-email': username, 'user-password': password };
        const options = {
            method: 'post',
            headers: headers,
            contentType: 'application/json',
            followRedirects: false
        };

        try {
            const resp = UrlFetchApp.fetch(loginUrl, options);
            this._updateCookieFromResponse(resp);  // new
            return !!this.webSessionCookie;        // success if we got a cookie
        } catch (e) {
            console.log(`Login request failed: ${e.message}`);
            return false;
        }
    }


    // Internal fetch — always resolves to UrlFetchApp calls for Step 1
    _doFetch(requests) {
        if (Array.isArray(requests)) {
            const responses = UrlFetchApp.fetchAll(requests);
            responses.forEach(resp => this._updateCookieFromResponse(resp));
            return responses;
        } else {
            const { url, ...opts } = requests;
            console.log('ApiService._doFetch() - Fetching URL:', url);
            console.log('ApiService._doFetch() - With options:', opts);
            const resp = UrlFetchApp.fetch(url, opts);
            return resp;
        }
    }

    /**
     * Look for a Set-Cookie header and update the stored session cookie if present.
     */
    _updateCookieFromResponse(response) {
        const headers = response.getAllHeaders();
        let setCookieHeader = headers['Set-Cookie'];
        if (!setCookieHeader) return;

        // normalize to array
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
     * A single, powerful fetch method that handles both individual and batch requests.
     *
     * @param {string|Array<Object>} endpoint A single endpoint string or an array of request objects.
     * @param {Object} [options={}] The options object for a single request, or a default options object for all requests in a batch.
     * @param {string} authType The authentication type for the request(s).
     * @returns {UrlFetchApp.HTTPResponse|Array<UrlFetchApp.HTTPResponse>} The response(s) from the API.
     */
    _fetch(endpoint, options, authType) {
        if (Array.isArray(endpoint)) {
            const processedRequests = endpoint.map(request => {
                const finalRequest = { ...request, ...options };
                return this._prepareRequest(finalRequest, authType);
            });
            return this._doFetch(processedRequests);
        } else {
            const url = `${endpoint}`;
            const request = this._prepareRequest({ url, ...options }, authType);
            return this._doFetch(request);
        }
    }

    // Wrappers that provide a clean, user-friendly API
    // ----------------------------------------------------

    /**
     * Fetches data that requires a web session. Handles both single and batch requests.
     * @param {string|Array<Object>} endpoint
     * @param {Object} [options={}]
     * @returns {UrlFetchApp.HTTPResponse|Array<UrlFetchApp.HTTPResponse>}
     */
    fetchUserData(endpoint, options = {}) {
        return this._fetch(endpoint, options, 'WEB_SESSION');
    }

    /**
     * Fetches club data using Basic Authentication. Handles both single and batch requests.
     * @param {string|Array<Object>} endpoint
     * @param {Object} [options={}]
     * @returns {UrlFetchApp.HTTPResponse|Array<UrlFetchApp.HTTPResponse>}
     */
    fetchClubData(endpoint, options = {}) {
        return this._fetch(endpoint, options, 'BASIC_AUTH');
    }

    /**
     * Fetches public data without authentication. Handles both single and batch requests.
     * @param {string|Array<Object>} endpoint
     * @param {Object} [options={}] an options object to be applied to all requests
     * @returns {UrlFetchApp.HTTPResponse|Array<UrlFetchApp.HTTPResponse>}
     */
    fetchPublicData(endpoint, options = {}) {
        return this._fetch(endpoint, options, null);
    }
}


/**
 * Minimal smoke tests for ApiService stabilization step.
 */
function smokeTest_ApiService() {
    const scriptProperties = PropertiesService.getScriptProperties();
    const creds = new CredentialManager(scriptProperties);
    const api = new ApiService(creds);

    // 1. Test login + web session fetch
    try {
        Logger.log('--- Test: WEB_SESSION ---');
        if (api.login()) {
            const resp = api.fetchUserData('https://ridewithgps.com/events/186234.json');
            Logger.log('WEB_SESSION success: ' + resp.getResponseCode());
            Logger.log(resp.getContentText().substring(0, 200)); // show first 200 chars
        } else {
            Logger.log('WEB_SESSION login failed.');
        }
    } catch (e) {
        Logger.log('WEB_SESSION error: ' + e.message);
    }

    // 2. Test Basic Auth fetch
    try {
        Logger.log('--- Test: BASIC_AUTH ---');
        const resp = api.fetchClubData('https://ridewithgps.com/api/v1/events/398589.json');
        Logger.log('BASIC_AUTH success: ' + resp.getResponseCode());
        Logger.log(resp.getContentText().substring(0, 200));
    } catch (e) {
        Logger.log('BASIC_AUTH error: ' + e.message);
    }

    // 3. Test Public fetch
    try {
        Logger.log('--- Test: PUBLIC ---');
        const resp = api.fetchPublicData('https://ridewithgps.com/events/398589.json');
        Logger.log('PUBLIC success: ' + resp.getResponseCode());
        Logger.log(resp.getContentText().substring(0, 200));
    } catch (e) {
        Logger.log('PUBLIC error: ' + e.message);
    }

    // 4. Test Batch fetch (Basic Auth as an example)
    try {
        Logger.log('--- Test: BATCH ---');
        const requests = [
            { url: 'https://ridewithgps.com/events/404021.json' },
            { url: 'https://ridewithgps.com/events/404019.json' }
        ];
        const resps = api.fetchClubData(requests);
        resps.forEach((resp, i) => {
            Logger.log(`Batch[${i}] code: ` + resp.getResponseCode());
            Logger.log(resp.getContentText().substring(0, 200));
        });
    } catch (e) {
        Logger.log('BATCH error: ' + e.message);
    }

    Logger.log('--- Smoke test finished ---');
}
