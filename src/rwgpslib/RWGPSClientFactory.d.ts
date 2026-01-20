/**
 * RWGPSClientFactory - Factory for creating RWGPSClient instances
 * 
 * Provides a single point for creating RWGPSClient instances.
 * Swappable for testing - tests can mock UrlFetchApp at HTTP level.
 * 
 * @see GitHub Issue #199 for design discussion
 */

import type RWGPSClientClass from './RWGPSClient';

/**
 * Factory for creating RWGPSClient instances
 */
declare namespace RWGPSClientFactory {
    /**
     * Create a new RWGPSClient instance.
     * Uses CredentialManager to get credentials from Script Properties.
     * 
     * @returns {RWGPSClient} Configured RWGPSClient instance
     * @throws {Error} If required credentials are missing from Script Properties
     */
    function create(): InstanceType<typeof RWGPSClientClass>;
}

export default RWGPSClientFactory;
