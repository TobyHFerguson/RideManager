/**
 * RWGPSApiLogger.js
 * 
 * Captures all RWGPS API requests and responses to a spreadsheet tab.
 * Used for characterization testing - capturing current behavior before refactoring.
 * 
 * Tab: "RWGPS API Log"
 * Columns: Timestamp | Operation | URL | Method | Request | Status | Response
 */

/* istanbul ignore file - GAS-only logging utility */

var RWGPSApiLogger = (function() {
    const SHEET_NAME = 'RWGPS API Log';
    const HEADERS = ['Timestamp', 'Operation', 'URL', 'Method', 'Request Payload', 'Status', 'Response Headers', 'Response Body'];
    const MAX_CELL_LENGTH = 50000; // Google Sheets cell limit
    
    /** @type {GoogleAppsScript.Spreadsheet.Sheet | null} */
    let _sheet = null;
    
    /** @type {boolean} */
    let _enabled = true;
    
    /**
     * Get or create the API log sheet
     * @returns {GoogleAppsScript.Spreadsheet.Sheet}
     */
    function _getSheet() {
        if (_sheet) return _sheet;
        
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        _sheet = ss.getSheetByName(SHEET_NAME);
        
        if (!_sheet) {
            // Remember the currently active sheet AND selection before creating log sheet
            const originalSheet = ss.getActiveSheet();
            const originalSelection = originalSheet ? originalSheet.getActiveRange() : null;
            
            _sheet = ss.insertSheet(SHEET_NAME);
            // Set up headers
            _sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
            _sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
            _sheet.setFrozenRows(1);
            
            // Set column widths
            _sheet.setColumnWidth(1, 180); // Timestamp
            _sheet.setColumnWidth(2, 150); // Operation
            _sheet.setColumnWidth(3, 300); // URL
            _sheet.setColumnWidth(4, 60);  // Method
            _sheet.setColumnWidth(5, 400); // Request Payload
            _sheet.setColumnWidth(6, 60);  // Status
            _sheet.setColumnWidth(7, 300); // Response Headers (for 302 Location, etc.)
            _sheet.setColumnWidth(8, 400); // Response Body
            
            // Restore the original active sheet AND selection so row selection still works
            if (originalSheet) {
                ss.setActiveSheet(originalSheet);
                if (originalSelection) {
                    originalSheet.setActiveRange(originalSelection);
                }
            }
        }
        
        return _sheet;
    }
    
    /**
     * Truncate string to fit in a cell
     * @param {any} value 
     * @returns {string}
     */
    function _truncate(value) {
        if (value === null || value === undefined) return '';
        const str = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
        if (str.length > MAX_CELL_LENGTH) {
            return str.substring(0, MAX_CELL_LENGTH - 100) + '\n\n... [TRUNCATED - ' + str.length + ' chars total]';
        }
        return str;
    }
    
    /**
     * Sanitize payload - remove sensitive data
     * @param {any} payload 
     * @returns {any}
     */
    function _sanitize(payload) {
        if (!payload) return payload;
        
        // Clone to avoid modifying original
        const sanitized = typeof payload === 'string' ? payload : JSON.parse(JSON.stringify(payload));
        
        // Remove sensitive fields if present
        if (typeof sanitized === 'object') {
            if (sanitized.headers) {
                if (sanitized.headers.Cookie) sanitized.headers.Cookie = '[REDACTED]';
                if (sanitized.headers.Authorization) sanitized.headers.Authorization = '[REDACTED]';
                if (sanitized.headers['user-password']) sanitized.headers['user-password'] = '[REDACTED]';
            }
        }
        
        return sanitized;
    }
    
    /**
     * Log an API request/response pair
     * @param {string} operation - The high-level operation (e.g., 'copy_template_', 'edit_event')
     * @param {string} url - The URL being called
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {any} requestPayload - The request body/payload
     * @param {number} statusCode - HTTP response status code
     * @param {any} responseBody - The response body
     */
    function log(operation, url, method, requestPayload, statusCode, responseBody) {
        if (!_enabled) return;
        
        try {
            const sheet = _getSheet();
            const timestamp = new Date().toISOString();
            
            const row = [
                timestamp,
                operation,
                url || '',
                (method || 'GET').toUpperCase(),
                _truncate(_sanitize(requestPayload)),
                statusCode || '',
                '',  // Response Headers (populated via logResponse for 302s)
                _truncate(responseBody)
            ];
            
            sheet.appendRow(row);
            
        } catch (error) {
            // Don't let logging errors break the main flow
            console.error('RWGPSApiLogger.log error:', error);
        }
    }
    
    /**
     * Log a request before it's sent (for async/batch operations)
     * @param {string} operation 
     * @param {string} url 
     * @param {string} method 
     * @param {any} requestPayload 
     * @returns {number} Row number for later update
     */
    function logRequest(operation, url, method, requestPayload) {
        if (!_enabled) return -1;
        
        try {
            const sheet = _getSheet();
            const timestamp = new Date().toISOString();
            
            const row = [
                timestamp,
                operation,
                url || '',
                (method || 'GET').toUpperCase(),
                _truncate(_sanitize(requestPayload)),
                '(pending)',
                '',  // Response Headers
                ''   // Response Body
            ];
            
            sheet.appendRow(row);
            return sheet.getLastRow();
            
        } catch (error) {
            console.error('RWGPSApiLogger.logRequest error:', error);
            return -1;
        }
    }
    
    /**
     * Update a previously logged request with its response
     * @param {number} rowNum 
     * @param {number} statusCode 
     * @param {any} responseBody 
     * @param {Object} [responseHeaders] - Response headers (optional, captured for 302s)
     */
    function logResponse(rowNum, statusCode, responseBody, responseHeaders) {
        if (!_enabled || rowNum < 0) return;
        
        try {
            const sheet = _getSheet();
            sheet.getRange(rowNum, 6).setValue(statusCode);
            
            // Capture response headers for redirects (302) - especially Location header
            if (responseHeaders) {
                // Only log important headers
                const importantHeaders = {};
                if (responseHeaders['Location']) importantHeaders['Location'] = responseHeaders['Location'];
                if (responseHeaders['Content-Type']) importantHeaders['Content-Type'] = responseHeaders['Content-Type'];
                // Sanitize cookies
                if (responseHeaders['Set-Cookie']) importantHeaders['Set-Cookie'] = '[REDACTED]';
                
                sheet.getRange(rowNum, 7).setValue(_truncate(importantHeaders));
            }
            
            sheet.getRange(rowNum, 8).setValue(_truncate(responseBody));
        } catch (error) {
            console.error('RWGPSApiLogger.logResponse error:', error);
        }
    }
    
    /**
     * Enable or disable logging
     * @param {boolean} enabled 
     */
    function setEnabled(enabled) {
        _enabled = enabled;
    }
    
    /**
     * Check if logging is enabled
     * @returns {boolean}
     */
    function isEnabled() {
        return _enabled;
    }
    
    /**
     * Clear all log entries (keeps headers)
     */
    function clear() {
        try {
            const sheet = _getSheet();
            const lastRow = sheet.getLastRow();
            if (lastRow > 1) {
                sheet.deleteRows(2, lastRow - 1);
            }
        } catch (error) {
            console.error('RWGPSApiLogger.clear error:', error);
        }
    }
    
    /**
     * Get all log entries as an array of objects
     * @returns {Array<{timestamp: string, operation: string, url: string, method: string, request: string, status: number, response: string}>}
     */
    function getAll() {
        try {
            const sheet = _getSheet();
            const lastRow = sheet.getLastRow();
            if (lastRow <= 1) return [];
            
            const data = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
            return data.map(row => ({
                timestamp: row[0],
                operation: row[1],
                url: row[2],
                method: row[3],
                request: row[4],
                status: row[5],
                response: row[6]
            }));
        } catch (error) {
            console.error('RWGPSApiLogger.getAll error:', error);
            return [];
        }
    }
    
    return {
        log,
        logRequest,
        logResponse,
        setEnabled,
        isEnabled,
        clear,
        getAll,
        SHEET_NAME
    };
})();
