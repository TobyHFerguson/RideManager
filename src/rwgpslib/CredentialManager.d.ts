/**
 * CredentialManager - Manages RWGPS credentials from Script Properties
 */

declare class CredentialManager {
    constructor(scriptProperties: GoogleAppsScript.Properties.Properties);
    getUsername(): string;
    getPassword(): string;
    getApiKey(): string;
    getAuthToken(): string;
}

export default CredentialManager;
