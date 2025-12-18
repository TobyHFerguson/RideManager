/// <reference path="./UserLogger.d.ts" />
/// <reference path="./TriggerManagerCore.d.ts" />

/**
 * TriggerManager - Centralized trigger management for ALL project triggers
 * Type definitions for TriggerManager.js
 * 
 * Thin GAS adapter around TriggerManagerCore (pure JavaScript, fully tested).
 */

/**
 * Result of trigger scheduling operation
 */
export interface ScheduleTriggerResult {
    created: boolean;
    triggerId: string;
}

/**
 * Result of trigger installation operation
 */
export interface InstallTriggerResult {
    installed: boolean;
    existed: boolean;
    triggerId: string;
}

/**
 * Result of trigger removal operation
 */
export interface RemoveTriggersResult {
    success: boolean;
    deletedCount: number;
    errors: string[];
}

/**
 * Installation summary with success flag
 */
export interface InstallationResult {
    success: boolean;
    installed: number;
    existed: number;
    failed: number;
    details: Record<string, {
        success: boolean;
        existed?: boolean;
        error?: string;
    }>;
}

/**
 * TriggerManager class - GAS adapter for trigger management
 * 
 * All operations are owner-only and idempotent.
 * Logs all operations to User Activity Log.
 */
export class TriggerManager {
    /**
     * Document properties service for storing trigger IDs
     */
    private docProps: GoogleAppsScript.Properties.Properties;
    
    /**
     * Reference to TriggerManagerCore for business logic
     */
    private core: typeof import('./TriggerManagerCore').default;
    
    /**
     * Initialize TriggerManager
     */
    constructor();
    
    /**
     * Check if current user is the spreadsheet owner
     * @returns True if current user is owner
     */
    isOwner(): boolean;
    
    /**
     * Ensure current user is owner, throw error if not
     * @throws Error if current user is not the owner
     */
    requireOwner(): void;
    
    /**
     * Install all required triggers (onOpen, onEdit, daily backstops)
     * Idempotent: Safe to call multiple times
     * Owner-only operation
     * 
     * @returns Installation result with summary
     * @throws Error if user is not owner
     */
    installAllTriggers(): InstallationResult;
    
    /**
     * Remove all triggers (both daily backstops and scheduled triggers)
     * Idempotent: Safe to call multiple times
     * Owner-only operation
     * 
     * @returns Removal result with deletion counts
     * @throws Error if user is not owner
     */
    removeAllTriggers(): RemoveTriggersResult;
    
    /**
     * Schedule the next announcement trigger for a specific time
     * Idempotent: If trigger already exists for same time, does nothing
     * Owner-only operation
     * 
     * @param sendTime - When the announcement should be sent (Date or timestamp)
     * @returns Scheduling result with created flag and trigger ID
     * @throws Error if user is not owner
     */
    scheduleAnnouncementTrigger(sendTime: Date | number): ScheduleTriggerResult;
    
    /**
     * Schedule the next retry queue trigger for a specific time
     * Idempotent: If trigger already exists for same time, does nothing
     * Owner-only operation
     * 
     * @param retryTime - When the retry should be processed (Date or timestamp)
     * @returns Scheduling result with created flag and trigger ID
     * @throws Error if user is not owner
     */
    scheduleRetryTrigger(retryTime: Date | number): ScheduleTriggerResult;
    
    /**
     * Remove the scheduled announcement trigger
     * Idempotent: Safe to call even if trigger doesn't exist
     * Owner-only operation
     * 
     * @throws Error if user is not owner
     */
    removeAnnouncementTrigger(): void;
    
    /**
     * Remove the scheduled retry trigger
     * Idempotent: Safe to call even if trigger doesn't exist
     * Owner-only operation
     * 
     * @throws Error if user is not owner
     */
    removeRetryTrigger(): void;
    
    /**
     * Generic method to schedule a timed trigger
     * @private
     * @param triggerType - Trigger type from TriggerManagerCore.TRIGGER_TYPES
     * @param time - When the trigger should fire (Date or timestamp)
     * @param logAction - Action name for logging
     * @returns Scheduling result with created flag and trigger ID
     */
    private _scheduleTimedTrigger(
        triggerType: string, 
        time: Date | number, 
        logAction: string
    ): ScheduleTriggerResult;
    
    /**
     * Generic method to remove a scheduled trigger
     * @private
     * @param triggerType - Trigger type from TriggerManagerCore.TRIGGER_TYPES
     * @param logAction - Action name for logging
     */
    private _removeScheduledTrigger(triggerType: string, logAction: string): void;
    
    /**
     * Ensure a trigger exists (universal method for all trigger types)
     * Idempotent: Creates only if missing
     * @private
     * @param triggerType - Trigger type from TriggerManagerCore.TRIGGER_TYPES
     * @returns Installation result with flags and trigger ID
     */
    private _ensureTrigger(triggerType: string): InstallTriggerResult;
    
    /**
     * Delete a scheduled trigger by property key
     * @private
     * @param propKey - Property key storing the trigger ID
     * @param handlerName - Handler function name for logging
     * @returns True if trigger was deleted
     */
    private _deleteScheduledTrigger(propKey: string, handlerName: string): boolean;
    
    /**
     * Delete all triggers by handler function name
     * @private
     * @param handlerName - Handler function name to match
     * @returns Number of triggers deleted
     */
    private _deleteTriggersByHandlerName(handlerName: string): number;
}

export default TriggerManager;
