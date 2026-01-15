/**
 * Type definitions for RWGPSLibAdapter.js
 * 
 * Provides both legacy factory methods (backward compatibility)
 * and new architecture class exports (Phase 5).
 */

import type { RWGPSCore as RWGPSCoreType } from './RWGPSCore';
import type { RWGPSAdapter as RWGPSAdapterType } from './RWGPSAdapter';
import type { RWGPSFacade as RWGPSFacadeType } from './RWGPSFacade';

/**
 * RWGPSLibAdapter interface
 * Mimics the external RWGPSLib library interface while also exposing new architecture
 */
interface RWGPSLibAdapterInterface {
    // ========================================
    // LEGACY FACTORY METHODS
    // ========================================
    
    /**
     * Create a new CredentialManager instance
     */
    newCredentialManager(scriptProperties: GoogleAppsScript.Properties.Properties): CredentialManager;
    
    /**
     * Create a new RWGPS instance (legacy API)
     */
    newRWGPS(rwgpsService: RWGPSService): RWGPS;
    
    /**
     * Create a new RWGPSService instance
     */
    newRWGPSService(globals: object, credentialManager: CredentialManager): RWGPSService;
    
    // ========================================
    // NEW ARCHITECTURE CLASSES (Phase 5)
    // ========================================
    
    /**
     * RWGPSCore class - Pure JavaScript business logic
     */
    readonly RWGPSCore: typeof RWGPSCoreType;
    
    /**
     * RWGPSAdapter class - Thin GAS wrapper for HTTP calls
     */
    readonly RWGPSAdapter: typeof RWGPSAdapterType;
    
    /**
     * RWGPSFacade class - Clean public API with domain-friendly types
     */
    readonly RWGPSFacade: typeof RWGPSFacadeType;
    
    /**
     * Create a new RWGPSFacade instance with default configuration
     */
    newFacade(): InstanceType<typeof RWGPSFacadeType>;
}

declare const RWGPSLibAdapter: RWGPSLibAdapterInterface;
export default RWGPSLibAdapter;
