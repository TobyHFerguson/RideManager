/**
 * RWGPSAdapter.js
 * 
 * Thin GAS wrapper for RWGPS API calls
 * NO business logic - that's in RWGPSCore
 * 
 * Contains ONLY:
 * - UrlFetchApp.fetch() calls
 * - Credential/auth handling
 * - Session cookie management
 * 
 * @module RWGPSAdapter
 */

/// <reference path="../gas-globals.d.ts" />

// @ts-check

/* istanbul ignore if - GAS runtime check */
if (typeof require !== 'undefined') {
    var RWGPSCore = require('./RWGPSCore');
}

/**
 * @typedef {import('./RWGPSAdapter').CredentialProvider} CredentialProvider
 * @typedef {import('./RWGPSAdapter').LoginResult} LoginResult
 */

/**
 * RWGPSAdapter - Thin GAS wrapper for RWGPS API
 * Uses class pattern per copilot-instructions Rule 4.5
 * Wrapped in IIFE for GAS compatibility (avoids duplicate class declarations)
 */
var RWGPSAdapter = (function() {

class RWGPSAdapter {
    /**
     * Base URL for RWGPS API
     * @returns {string}
     */
    static get BASE_URL() {
        return 'https://ridewithgps.com';
    }
    
    /**
     * V1 API path prefix
     * @returns {string}
     */
    static get V1_API_PATH() {
        return '/api/v1';
    }
    
    /**
     * Login path for web session
     * @returns {string}
     */
    static get LOGIN_PATH() {
        return '/organizations/47/sign_in';
    }
    
    /**
     * Session cookie name
     * @returns {string}
     */
    static get SESSION_COOKIE_NAME() {
        return '_rwgps_3_session';
    }

    /**
     * Create adapter with credential provider
     * 
     * @param {CredentialProvider} credentials - Credential provider (CredentialManager or mock)
     */
    constructor(credentials) {
        /** @type {CredentialProvider} */
        this._credentials = credentials;
        
        /** @type {string | null} */
        this._sessionCookie = null;
    }

    // =============================================
    // Authentication
    // =============================================

    /**
     * Login to RWGPS web session
     * Establishes session cookie for web API operations
     * 
     * @returns {LoginResult} Login result with success/error
     */
    login() {
        const url = `${RWGPSAdapter.BASE_URL}${RWGPSAdapter.LOGIN_PATH}`;
        
        /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
        const options = {
            method: 'post',
            headers: {
                'user-email': this._credentials.getUsername(),
                'user-password': this._credentials.getPassword()
            },
            contentType: 'application/json',
            followRedirects: false,
            muteHttpExceptions: true
        };

        try {
            const response = this._fetch(url, options);
            this._extractSessionCookie(response);
            
            if (this._sessionCookie) {
                return { success: true };
            } else {
                return { 
                    success: false, 
                    error: 'No session cookie received from login response' 
                };
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            return { 
                success: false, 
                error: `Login request failed: ${err.message}` 
            };
        }
    }

    /**
     * Check if web session is authenticated
     * 
     * @returns {boolean} True if session cookie exists
     */
    isAuthenticated() {
        return this._sessionCookie !== null;
    }

    /**
     * Clear session cookie (logout)
     */
    clearSession() {
        this._sessionCookie = null;
    }

    // =============================================
    // API Fetch Methods
    // =============================================

    /**
     * Fetch from v1 API with Basic Auth
     * 
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {string} endpoint - API endpoint (e.g., '/events/12345.json')
     * @param {any} [payload] - Optional request body (will be JSON stringified)
     * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse} HTTP response
     */
    fetchV1(method, endpoint, payload) {
        const url = `${RWGPSAdapter.BASE_URL}${RWGPSAdapter.V1_API_PATH}${endpoint}`;
        // NOTE: buildRequestOptions exists in RWGPSCore (see RWGPSCore.js:431, test coverage: 100%)
        // TypeScript error is false positive due to module import type resolution
        // @ts-expect-error - TypeScript can't resolve class methods through module imports
        const options = RWGPSCore.buildRequestOptions(method, payload, {
            'Authorization': this._getBasicAuthHeader()
        });
        
        return this._fetch(url, options);
    }

    /**
     * Fetch from v1 API with multipart form data (for file uploads)
     * 
     * @param {string} method - HTTP method (POST, PUT)
     * @param {string} endpoint - API endpoint (e.g., '/events.json')
     * @param {string} payload - Multipart form payload (pre-built with boundaries)
     * @param {string} boundary - Multipart boundary string
     * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse} HTTP response
     */
    fetchV1Multipart(method, endpoint, payload, boundary) {
        const url = `${RWGPSAdapter.BASE_URL}${RWGPSAdapter.V1_API_PATH}${endpoint}`;
        
        /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
        const options = {
            method: /** @type {GoogleAppsScript.URL_Fetch.HttpMethod} */ (method.toLowerCase()),
            headers: {
                'Authorization': this._getBasicAuthHeader(),
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            payload: payload,
            muteHttpExceptions: true
        };
        
        return this._fetch(url, options);
    }

    /**
     * Fetch from v1 API with multipart Blob payload (for binary file uploads)
     * 
     * @param {string} method - HTTP method (POST, PUT)
     * @param {string} endpoint - API endpoint (e.g., '/events.json')
     * @param {GoogleAppsScript.Base.Blob} payload - Multipart form payload as Blob
     * @param {string} boundary - Multipart boundary string
     * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse} HTTP response
     */
    fetchV1MultipartBlob(method, endpoint, payload, boundary) {
        const url = `${RWGPSAdapter.BASE_URL}${RWGPSAdapter.V1_API_PATH}${endpoint}`;
        
        /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
        const options = {
            method: /** @type {GoogleAppsScript.URL_Fetch.HttpMethod} */ (method.toLowerCase()),
            headers: {
                'Authorization': this._getBasicAuthHeader(),
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            payload: payload.getBytes(),
            muteHttpExceptions: true
        };
        
        return this._fetch(url, options);
    }

    /**
     * Fetch from web API with session cookie
     * 
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint (e.g., '/events/12345/edit.json')
     * @param {any} [payload] - Optional request body
     * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse} HTTP response
     * @throws {Error} If not authenticated
     */
    fetchWeb(method, endpoint, payload) {
        if (!this._sessionCookie) {
            throw new Error('Web session not authenticated. Call login() first.');
        }

        const url = `${RWGPSAdapter.BASE_URL}${endpoint}`;
        // NOTE: buildRequestOptions exists in RWGPSCore (see RWGPSCore.js:431, test coverage: 100%)
        // TypeScript error is false positive due to module import type resolution
        // @ts-expect-error - TypeScript can't resolve class methods through module imports
        const options = RWGPSCore.buildRequestOptions(method, payload, {
            'Cookie': this._sessionCookie,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        });

        const response = this._fetch(url, options);
        
        // Update session cookie if response contains a new one
        this._extractSessionCookie(response);
        
        return response;
    }

    /**
     * Fetch from web API with form-encoded body
     * Used for specific endpoints that expect form data
     * 
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Record<string, string>} [formData] - Form data object
     * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse} HTTP response
     */
    fetchWebForm(method, endpoint, formData) {
        if (!this._sessionCookie) {
            throw new Error('Web session not authenticated. Call login() first.');
        }

        const url = `${RWGPSAdapter.BASE_URL}${endpoint}`;
        
        /** @type {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} */
        const options = {
            method: /** @type {GoogleAppsScript.URL_Fetch.HttpMethod} */ (method.toLowerCase()),
            headers: {
                'Cookie': this._sessionCookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            muteHttpExceptions: true
        };

        if (formData) {
            options.payload = formData;
        }

        const response = this._fetch(url, options);
        this._extractSessionCookie(response);
        
        return response;
    }

    // =============================================
    // Private Helpers
    // =============================================

    /**
     * Get Basic Auth header for v1 API
     * 
     * @returns {string} Basic Auth header value
     * @private
     */
    _getBasicAuthHeader() {
        // NOTE: buildBasicAuthHeader exists in RWGPSCore (see RWGPSCore.js:447, test coverage: 100%)
        // TypeScript error is false positive due to module import type resolution
        // @ts-expect-error - TypeScript can't resolve class methods through module imports
        return RWGPSCore.buildBasicAuthHeader(
            this._credentials.getApiKey(),
            this._credentials.getAuthToken()
        );
    }

    /**
     * Extract session cookie from response headers
     * 
     * @param {GoogleAppsScript.URL_Fetch.HTTPResponse} response - HTTP response
     * @private
     */
    _extractSessionCookie(response) {
        // GAS getAllHeaders() returns object type but we need to access Set-Cookie
        const headers = /** @type {Record<string, string | string[]>} */ (response.getAllHeaders());
        let setCookieHeader = headers['Set-Cookie'];
        
        if (!setCookieHeader) {
            return;
        }

        // Normalize to array (GAS returns string or string[])
        if (!Array.isArray(setCookieHeader)) {
            setCookieHeader = [setCookieHeader];
        }

        for (const cookie of setCookieHeader) {
            if (cookie.startsWith(`${RWGPSAdapter.SESSION_COOKIE_NAME}=`)) {
                // Extract just the cookie value (before any ;)
                const newCookie = cookie.split(';')[0];
                if (this._sessionCookie !== newCookie) {
                    this._sessionCookie = newCookie;
                }
                break;
            }
        }
    }

    /**
     * Execute HTTP request using UrlFetchApp
     * 
     * @param {string} url - Request URL
     * @param {GoogleAppsScript.URL_Fetch.URLFetchRequestOptions} options - Request options
     * @returns {GoogleAppsScript.URL_Fetch.HTTPResponse} HTTP response
     * @private
     */
    _fetch(url, options) {
        /* istanbul ignore next - GAS-only code path */
        return UrlFetchApp.fetch(url, options);
    }
}

return RWGPSAdapter;
})();

/* istanbul ignore if - Node.js/Jest export */
if (typeof module !== 'undefined') {
    module.exports = RWGPSAdapter;
}
