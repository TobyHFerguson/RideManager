/**
 * A class to centralize access to and validation of credentials
 * stored in Script Properties.
 */
class CredentialManager {
    constructor(scriptProperties) {
        this.scriptProperties = scriptProperties;
    }

    getUsername() {
        const username = this.scriptProperties.getProperty('rwgps_username');
        if (!username) {
            throw new Error('rwgps_username is not defined in Script Properties.');
        }
        return username;
    }

    getPassword() {
        const password = this.scriptProperties.getProperty('rwgps_password');
        if (!password) {
            throw new Error('rwgps_password is not defined in Script Properties.');
        }
        return password;
    }

    getApiKey() {
        const apiKey = this.scriptProperties.getProperty('rwgps_api_key');
        if (!apiKey) {
            throw new Error('rwgps_api_key is not defined in Script Properties.');
        }
        return apiKey;
    }

    getAuthToken() {
        const authToken = this.scriptProperties.getProperty('rwgps_auth_token');
        if (!authToken) {
            throw new Error('rwgps_auth_token is not defined in Script Properties.');
        }
        return authToken;
    }
}
