/**
 * RWGPSAdapter.d.ts
 * 
 * Type definitions for RWGPSAdapter - thin GAS wrapper for RWGPS API
 */

/**
 * Credential provider interface
 */
export interface CredentialProvider {
    getApiKey(): string;
    getAuthToken(): string;
    getUsername(): string;
    getPassword(): string;
}

/**
 * HTTP response interface (matches GAS HTTPResponse)
 */
export interface HTTPResponse {
    getResponseCode(): number;
    getContentText(): string;
    getAllHeaders(): Record<string, string | string[]>;
}

/**
 * Request options for fetch calls
 */
export interface RequestOptions {
    method: string;
    headers: Record<string, string>;
    payload?: string;
    muteHttpExceptions: boolean;
    followRedirects?: boolean;
    contentType?: string;
}

/**
 * Login result
 */
export interface LoginResult {
    success: boolean;
    error?: string;
}

/**
 * RWGPSAdapter - Thin GAS wrapper for RWGPS API calls
 * 
 * Contains ONLY:
 * - UrlFetchApp.fetch() calls
 * - Credential/auth handling
 * - Session cookie management
 * 
 * NO business logic - that's in RWGPSCore
 */
declare class RWGPSAdapter {
    /**
     * Create adapter with credential provider
     * @param credentials - Credential provider (CredentialManager or mock)
     */
    constructor(credentials: CredentialProvider);

    /**
     * Login to RWGPS web session
     * Establishes session cookie for web API operations
     * @returns Login result with success/error
     */
    login(): LoginResult;

    /**
     * Check if web session is authenticated
     * @returns True if session cookie exists
     */
    isAuthenticated(): boolean;

    /**
     * Fetch from v1 API with Basic Auth
     * @param method - HTTP method (GET, POST, PUT, DELETE)
     * @param endpoint - API endpoint (e.g., '/events/12345.json')
     * @param payload - Optional request body (will be JSON stringified)
     * @returns HTTP response
     */
    fetchV1(method: string, endpoint: string, payload?: any): HTTPResponse;

    /**
     * Fetch from v1 API with multipart form data (for file uploads)
     * @param method - HTTP method (POST, PUT)
     * @param endpoint - API endpoint (e.g., '/events.json')
     * @param payload - Multipart form payload (pre-built with boundaries)
     * @param boundary - Multipart boundary string
     * @returns HTTP response
     */
    fetchV1Multipart(method: string, endpoint: string, payload: string, boundary: string): HTTPResponse;

    /**
     * Fetch from v1 API with multipart Blob payload (for binary file uploads)
     * @param method - HTTP method (POST, PUT)
     * @param endpoint - API endpoint (e.g., '/events.json')
     * @param payload - Multipart form payload as Blob
     * @param boundary - Multipart boundary string
     * @returns HTTP response
     */
    fetchV1MultipartBlob(method: string, endpoint: string, payload: GoogleAppsScript.Base.Blob, boundary: string): HTTPResponse;

    /**
     * Fetch from web API with session cookie
     * @param method - HTTP method
     * @param endpoint - API endpoint (e.g., '/events/12345/edit.json')
     * @param payload - Optional request body
     * @returns HTTP response
     * @throws Error if not authenticated
     */
    fetchWeb(method: string, endpoint: string, payload?: any): HTTPResponse;

    /**
     * Fetch from web API with form-encoded body (for login)
     * @param method - HTTP method
     * @param endpoint - API endpoint
     * @param formData - Form data object
     * @returns HTTP response
     */
    fetchWebForm(method: string, endpoint: string, formData?: Record<string, string>): HTTPResponse;
}

export default RWGPSAdapter;
