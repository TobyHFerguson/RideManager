/**
 * RWGPSClientFactory.test.js
 * 
 * Tests for the RWGPSClientFactory - single point for creating RWGPSClient instances
 */

// Mock GAS globals BEFORE requiring the module
global.PropertiesService = {
    getScriptProperties: jest.fn(() => ({
        getProperty: jest.fn((key) => {
            const props = {
                'rwgps_api_key': 'test-api-key',
                'rwgps_auth_token': 'test-auth-token',
                'rwgps_username': 'test-user',
                'rwgps_password': 'test-pass'
            };
            return props[key] || null;
        })
    }))
};

// Mock UrlFetchApp for RWGPSClient
global.UrlFetchApp = {
    fetch: jest.fn()
};

const RWGPSClientFactory = require('../../src/rwgpslib/RWGPSClientFactory');
const RWGPSClient = require('../../src/rwgpslib/RWGPSClient');
const CredentialManager = require('../../src/rwgpslib/CredentialManager');

describe('RWGPSClientFactory', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create()', () => {
        it('should return an RWGPSClient instance', () => {
            const client = RWGPSClientFactory.create();
            
            expect(client).toBeInstanceOf(RWGPSClient);
        });

        it('should configure client with credentials from PropertiesService', () => {
            const client = RWGPSClientFactory.create();
            
            // Verify PropertiesService was called
            expect(PropertiesService.getScriptProperties).toHaveBeenCalled();
            
            // Verify client has the expected credentials
            expect(client.apiKey).toBe('test-api-key');
            expect(client.authToken).toBe('test-auth-token');
            expect(client.username).toBe('test-user');
            expect(client.password).toBe('test-pass');
        });

        it('should throw if credentials are missing', () => {
            // Override mock to return null for a required credential
            PropertiesService.getScriptProperties.mockReturnValueOnce({
                getProperty: jest.fn((key) => {
                    if (key === 'rwgps_api_key') return null;
                    return 'test-value';
                })
            });
            
            expect(() => RWGPSClientFactory.create()).toThrow('rwgps_api_key is not defined');
        });

        it('should create new instance each time (not singleton)', () => {
            const client1 = RWGPSClientFactory.create();
            const client2 = RWGPSClientFactory.create();
            
            expect(client1).not.toBe(client2);
        });
    });
});
