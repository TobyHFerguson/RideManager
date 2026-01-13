/**
 * RWGPSMockServer - Mock server for replaying RWGPS API fixtures in Jest tests
 * 
 * This module provides a mock implementation that can be used to test RWGPS operations
 * without making actual API calls. It uses the captured fixtures to return realistic responses.
 * 
 * Usage:
 * ```javascript
 * const { RWGPSMockServer, mockUrlFetchApp } = require('../mocks/RWGPSMockServer');
 * 
 * beforeEach(() => {
 *     global.UrlFetchApp = mockUrlFetchApp;
 *     RWGPSMockServer.reset();
 *     RWGPSMockServer.loadFixture('schedule');
 * });
 * 
 * test('schedule creates event from template', () => {
 *     // Your test code - all UrlFetchApp.fetch calls will use fixture data
 * });
 * ```
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} ApiCall
 * @property {string} operation
 * @property {string} url
 * @property {string} method
 * @property {number} status
 * @property {any} response
 * @property {Object} [responseHeaders]
 */

/**
 * @typedef {Object} Fixture
 * @property {string} operation
 * @property {string} description
 * @property {ApiCall[]} apiCalls
 */

class RWGPSMockServer {
    constructor() {
        /** @type {ApiCall[]} */
        this.expectedCalls = [];
        /** @type {number} */
        this.callIndex = 0;
        /** @type {ApiCall[]} */
        this.actualCalls = [];
        /** @type {boolean} */
        this.strictMode = true; // If true, calls must match expected order
    }

    /**
     * Reset the mock server state
     */
    reset() {
        this.expectedCalls = [];
        this.callIndex = 0;
        this.actualCalls = [];
        this.strictMode = true;
    }

    /**
     * Load a fixture file and set up expected API calls
     * @param {string} fixtureName - Name of fixture (e.g., 'schedule', 'cancel')
     */
    loadFixture(fixtureName) {
        const fixturePath = path.join(__dirname, '../fixtures/rwgps-api', `${fixtureName}.json`);
        const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
        this.expectedCalls = fixtureData.apiCalls;
    }

    /**
     * Load multiple fixtures (for testing sequences of operations)
     * @param {string[]} fixtureNames - Array of fixture names
     */
    loadFixtures(fixtureNames) {
        this.expectedCalls = [];
        for (const name of fixtureNames) {
            const fixturePath = path.join(__dirname, '../fixtures/rwgps-api', `${name}.json`);
            const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
            this.expectedCalls.push(...fixtureData.apiCalls);
        }
    }

    /**
     * Add a custom expected call (for testing error cases, etc.)
     * @param {ApiCall} apiCall
     */
    addExpectedCall(apiCall) {
        this.expectedCalls.push(apiCall);
    }

    /**
     * Handle a fetch request and return mocked response
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {MockHTTPResponse}
     */
    fetch(url, options = {}) {
        const method = options.method || 'GET';
        
        // Record the actual call
        this.actualCalls.push({
            url,
            method,
            options
        });

        if (this.strictMode) {
            // Match calls in order
            if (this.callIndex >= this.expectedCalls.length) {
                throw new Error(
                    `Unexpected API call: ${method} ${url}\n` +
                    `Expected ${this.expectedCalls.length} calls, got ${this.callIndex + 1}`
                );
            }

            const expected = this.expectedCalls[this.callIndex];
            
            // Flexible URL matching (ignore query params for some endpoints)
            if (!this._urlMatches(url, expected.url)) {
                throw new Error(
                    `URL mismatch at call ${this.callIndex + 1}:\n` +
                    `Expected: ${expected.url}\n` +
                    `Actual:   ${url}`
                );
            }

            if (method !== expected.method) {
                throw new Error(
                    `Method mismatch at call ${this.callIndex + 1}:\n` +
                    `Expected: ${expected.method}\n` +
                    `Actual:   ${method}`
                );
            }

            this.callIndex++;
            return new MockHTTPResponse(expected.status, expected.response, expected.responseHeaders);
        } else {
            // Loose mode - find first matching call by URL pattern
            const match = this.expectedCalls.find(call => 
                this._urlMatches(url, call.url) && call.method === method
            );

            if (!match) {
                throw new Error(`No matching mock for: ${method} ${url}`);
            }

            return new MockHTTPResponse(match.status, match.response, match.responseHeaders);
        }
    }

    /**
     * Check if actual URL matches expected URL pattern
     * @param {string} actual
     * @param {string} expected
     * @returns {boolean}
     */
    _urlMatches(actual, expected) {
        // Exact match
        if (actual === expected) return true;
        
        // Match ignoring event/route IDs (replace numeric IDs with pattern)
        const normalizeUrl = (url) => {
            return url
                .replace(/\/events\/\d+/, '/events/{id}')
                .replace(/\/routes\/\d+/, '/routes/{id}')
                .replace(/-\w+$/, ''); // Remove slug suffix like "-copied-event"
        };
        
        return normalizeUrl(actual) === normalizeUrl(expected);
    }

    /**
     * Verify all expected calls were made
     * @throws {Error} If not all calls were made
     */
    verify() {
        if (this.callIndex !== this.expectedCalls.length) {
            const unmade = this.expectedCalls.slice(this.callIndex);
            throw new Error(
                `Not all expected API calls were made.\n` +
                `Made: ${this.callIndex}\n` +
                `Expected: ${this.expectedCalls.length}\n` +
                `Remaining calls: ${unmade.map(c => `${c.method} ${c.url}`).join(', ')}`
            );
        }
    }

    /**
     * Get summary of calls made
     * @returns {string}
     */
    getSummary() {
        return this.actualCalls.map((call, i) => 
            `${i + 1}. ${call.method} ${call.url}`
        ).join('\n');
    }
}

/**
 * Mock HTTP Response that mimics GAS HTTPResponse
 */
class MockHTTPResponse {
    /**
     * @param {number} statusCode
     * @param {any} response
     * @param {Object} [headers]
     */
    constructor(statusCode, response, headers = {}) {
        this.statusCode = statusCode;
        this.response = response;
        this.headers = headers;
    }

    /**
     * Get response status code
     * @returns {number}
     */
    getResponseCode() {
        return this.statusCode;
    }

    /**
     * Get response content as text
     * @returns {string}
     */
    getContentText() {
        if (typeof this.response === 'string') {
            return this.response;
        }
        return JSON.stringify(this.response);
    }

    /**
     * Get all response headers
     * @returns {Object}
     */
    getAllHeaders() {
        return this.headers;
    }

    /**
     * Get specific header (case-insensitive)
     * @param {string} name
     * @returns {string|undefined}
     */
    getHeader(name) {
        const lowerName = name.toLowerCase();
        for (const [key, value] of Object.entries(this.headers)) {
            if (key.toLowerCase() === lowerName) {
                return value;
            }
        }
        return undefined;
    }
}

// Singleton instance
const mockServer = new RWGPSMockServer();

/**
 * Mock UrlFetchApp for GAS compatibility
 * Drop-in replacement for global.UrlFetchApp in tests
 */
const mockUrlFetchApp = {
    /**
     * @param {string} url
     * @param {Object} [options]
     * @returns {MockHTTPResponse}
     */
    fetch(url, options) {
        return mockServer.fetch(url, options);
    },

    /**
     * Batch fetch (not commonly used, but available)
     * @param {Array<{url: string, method?: string, payload?: any}>} requests
     * @returns {MockHTTPResponse[]}
     */
    fetchAll(requests) {
        return requests.map(req => mockServer.fetch(req.url, req));
    }
};

/**
 * Mock PropertiesService for GAS compatibility
 */
const mockPropertiesService = {
    _userProps: {},
    _scriptProps: {},

    getUserProperties() {
        return {
            getProperty: (key) => this._userProps[key] || null,
            setProperty: (key, value) => { this._userProps[key] = value; },
            deleteProperty: (key) => { delete this._userProps[key]; },
            getProperties: () => ({ ...this._userProps })
        };
    },

    getScriptProperties() {
        return {
            getProperty: (key) => this._scriptProps[key] || null,
            setProperty: (key, value) => { this._scriptProps[key] = value; },
            deleteProperty: (key) => { delete this._scriptProps[key]; },
            getProperties: () => ({ ...this._scriptProps })
        };
    },

    reset() {
        this._userProps = {};
        this._scriptProps = {};
    }
};

/**
 * Mock SpreadsheetApp for logging tests
 */
const createMockSpreadsheetApp = () => {
    const sheets = {};
    let activeSheet = null;
    let activeRange = null;

    const createMockSheet = (name) => {
        const data = [];
        return {
            getName: () => name,
            getLastRow: () => data.length,
            getLastColumn: () => data[0]?.length || 0,
            getRange: (row, col, numRows, numCols) => ({
                getValues: () => {
                    const result = [];
                    for (let r = row - 1; r < row - 1 + (numRows || 1); r++) {
                        const rowData = [];
                        for (let c = col - 1; c < col - 1 + (numCols || 1); c++) {
                            rowData.push(data[r]?.[c] || '');
                        }
                        result.push(rowData);
                    }
                    return result;
                },
                setValues: (values) => {
                    for (let r = 0; r < values.length; r++) {
                        if (!data[row - 1 + r]) data[row - 1 + r] = [];
                        for (let c = 0; c < values[r].length; c++) {
                            data[row - 1 + r][col - 1 + c] = values[r][c];
                        }
                    }
                },
                setValue: (value) => {
                    if (!data[row - 1]) data[row - 1] = [];
                    data[row - 1][col - 1] = value;
                }
            }),
            appendRow: (rowData) => {
                data.push([...rowData]);
            },
            setColumnWidths: () => {},
            setFrozenRows: () => {},
            _data: data,
            getActiveRange: () => activeRange
        };
    };

    return {
        getActiveSpreadsheet: () => ({
            getSheetByName: (name) => sheets[name] || null,
            insertSheet: (name) => {
                sheets[name] = createMockSheet(name);
                return sheets[name];
            },
            getActiveSheet: () => activeSheet,
            setActiveSheet: (sheet) => { activeSheet = sheet; }
        }),
        setActiveRange: (range) => { activeRange = range; },
        _sheets: sheets,
        _reset: () => {
            Object.keys(sheets).forEach(k => delete sheets[k]);
            activeSheet = null;
            activeRange = null;
        }
    };
};

module.exports = {
    RWGPSMockServer: mockServer,
    MockHTTPResponse,
    mockUrlFetchApp,
    mockPropertiesService,
    createMockSpreadsheetApp
};
