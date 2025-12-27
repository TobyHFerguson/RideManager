/**
 * TriggerManagerCore - Pure JavaScript trigger management logic
 * Type definitions for TriggerManagerCore.js
 */

/**
 * Trigger type constants
 */
export interface TriggerTypes {
    readonly ON_OPEN: 'onOpen';
    readonly ON_EDIT: 'onEdit';
    readonly DAILY_ANNOUNCEMENT: 'dailyAnnouncement';
    readonly ANNOUNCEMENT_SCHEDULED: 'announcementScheduled';
}

/**
 * Handler function name mapping
    */
export interface HandlerFunctions {
    readonly onOpen: 'onOpen';
    readonly onEdit: 'editHandler';
    readonly dailyAnnouncement: 'dailyAnnouncementCheck';
    readonly announcementScheduled: 'announcementTrigger';
}

/**
 * Property key constants for PropertiesService
 */
export interface PropertyKeys {
    readonly ANNOUNCEMENT_NEXT_TRIGGER_TIME: 'ANNOUNCEMENT_NEXT_TRIGGER_TIME';
    readonly ANNOUNCEMENT_TRIGGER_ID: 'ANNOUNCEMENT_TRIGGER_ID';
    readonly DAILY_ANNOUNCEMENT_TRIGGER_ID: 'DAILY_ANNOUNCEMENT_TRIGGER_ID';
    readonly ON_OPEN_TRIGGER_ID: 'ON_OPEN_TRIGGER_ID';
    readonly ON_EDIT_TRIGGER_ID: 'ON_EDIT_TRIGGER_ID';
}

/**
 * Schedule configuration for a trigger
 */
export interface TriggerSchedule {
    type: 'daily' | 'at';
    hour?: number;  // For daily triggers
    time?: number | null;  // For 'at' triggers (timestamp)
}

/**
 * Complete trigger configuration object
 */
export interface TriggerConfig {
    handlerFunction: string;
    triggerType: string;
    isInstallable: boolean;
    propertyKey: string;
    timePropertyKey?: string;
    schedule?: TriggerSchedule;
}

/**
 * Result of shouldScheduleTrigger check
 */
export interface ShouldScheduleResult {
    shouldSchedule: boolean;
    reason: string;
}

/**
 * Result of shouldRemoveTrigger check
 */
export interface ShouldRemoveResult {
    shouldRemove: boolean;
    reason: string;
}

/**
 * Result of trigger installation validation
 */
export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Individual trigger installation result
 */
export interface TriggerResult {
    success: boolean;
    existed?: boolean;
    error?: string;
}

/**
 * Installation summary with all trigger results
 */
export interface InstallationSummary {
    installed: number;
    existed: number;
    failed: number;
    details: Record<string, TriggerResult>;
}

/**
 * TriggerManagerCore class - Pure JavaScript trigger management logic
 */
export class TriggerManagerCore {
    /**
     * Get trigger configuration for a specific type
     * @param triggerType - One of TRIGGER_TYPES values
     * @returns Complete trigger configuration object
     */
    static getTriggerConfig(triggerType: string): TriggerConfig;
    
    /**
     * Get all backstop trigger types (daily checks)
     * @returns Array of trigger type constants
     */
    static getBackstopTriggers(): string[];
    
    /**
     * Get all installable (non-simple) trigger types
     * @returns Array of trigger type constants
     */
    static getAllInstallableTriggers(): string[];
    
    /**
     * Get all scheduled (dynamic) trigger types
     * @returns Array of trigger type constants
     */
    static getScheduledTriggers(): string[];
    
    /**
     * Check if a trigger should be scheduled based on actual trigger existence
     * @param triggerType - Trigger type constant
     * @param existingTriggerTime - Timestamp from actual trigger query (null if no trigger, -1 if time unavailable)
     * @param newTime - New desired timestamp
     * @returns Object with shouldSchedule boolean and reason string
     */
    static shouldScheduleTrigger(
        triggerType: string, 
        existingTriggerTime: number | null, 
        newTime: number
    ): ShouldScheduleResult;
    
    /**
     * Check if a trigger should be removed
     * @param triggerType - Trigger type constant
     * @param hasWork - Whether there is work pending for this trigger
     * @returns Object with shouldRemove boolean and reason string
     */
    static shouldRemoveTrigger(triggerType: string, hasWork: boolean): ShouldRemoveResult;
    
    /**
     * Validate trigger installation request
     * @param currentUserEmail - Email of user requesting installation
     * @param ownerEmail - Email of spreadsheet owner
     * @returns Validation result with valid boolean and optional error
     */
    static validateTriggerInstallation(
        currentUserEmail: string, 
        ownerEmail: string
    ): ValidationResult;
    
    /**
     * Build installation summary from results
     * @param results - Installation results for each trigger type
     * @returns Summary with counts and details
     */
    static buildInstallationSummary(
        results: Record<string, TriggerResult>
    ): InstallationSummary;
    
    /**
     * Get trigger type constants
     */
    static readonly TRIGGER_TYPES: TriggerTypes;
    
    /**
     * Get handler function mapping
     */
    static readonly HANDLER_FUNCTIONS: HandlerFunctions;
    
    /**
     * Get property key constants
     */
    static readonly PROPERTY_KEYS: PropertyKeys;
}

export default TriggerManagerCore;
