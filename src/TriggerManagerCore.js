// @ts-check
/**
 * TriggerManagerCore - Pure JavaScript trigger management logic
 * 
 * This module contains all business logic for trigger management.
 * NO GAS DEPENDENCIES - can be tested in Jest with 100% coverage.
 * 
 * All GAS-specific operations (ScriptApp, PropertiesService) are in TriggerManager.js
 */

// Node.js compatibility
// @ts-ignore - require is only available in Node.js test environment, not in GAS runtime
if (typeof require !== 'undefined') {
    // No dependencies - pure JavaScript
}

// Trigger configuration constants
const TRIGGER_TYPES = {
    ON_OPEN: 'onOpen',
    ON_EDIT: 'onEdit',
    DAILY_ANNOUNCEMENT: 'dailyAnnouncement',
    ANNOUNCEMENT_SCHEDULED: 'announcementScheduled',
    DAILY_RWGPS_MEMBERS: 'dailyRWGPSMembersDownload'
};

const HANDLER_FUNCTIONS = {
    [TRIGGER_TYPES.ON_OPEN]: 'onOpen',
    [TRIGGER_TYPES.ON_EDIT]: 'editHandler',
    [TRIGGER_TYPES.DAILY_ANNOUNCEMENT]: 'dailyAnnouncementCheck',
    [TRIGGER_TYPES.ANNOUNCEMENT_SCHEDULED]: 'announcementTrigger',
    [TRIGGER_TYPES.DAILY_RWGPS_MEMBERS]: 'dailyRWGPSMembersDownload'
};

const PROPERTY_KEYS = {
    ANNOUNCEMENT_NEXT_TRIGGER_TIME: 'ANNOUNCEMENT_NEXT_TRIGGER_TIME',
    ANNOUNCEMENT_TRIGGER_ID: 'ANNOUNCEMENT_TRIGGER_ID',
    DAILY_ANNOUNCEMENT_TRIGGER_ID: 'DAILY_ANNOUNCEMENT_TRIGGER_ID',
    DAILY_RWGPS_MEMBERS_TRIGGER_ID: 'DAILY_RWGPS_MEMBERS_TRIGGER_ID',
    ON_OPEN_TRIGGER_ID: 'ON_OPEN_TRIGGER_ID',
    ON_EDIT_TRIGGER_ID: 'ON_EDIT_TRIGGER_ID'
};

class TriggerManagerCore {
        /**
         * Get trigger configuration for a specific type
         * @param {string} triggerType - One of TRIGGER_TYPES values
         * @returns {Record<string, any>} Trigger configuration with handler, property key, and schedule details
         */
        static getTriggerConfig(triggerType) {
            if (!HANDLER_FUNCTIONS[triggerType]) {
                throw new Error(`Unknown trigger type: ${triggerType}`);
            }
            
            /** @type {Record<string, any>} */
            const config = {
                handlerFunction: HANDLER_FUNCTIONS[triggerType],
                triggerType: triggerType
            };
            
            // Determine if this is an installable trigger (requires manual installation)
            // vs simple trigger (automatically installed by GAS)
            switch (triggerType) {
                case TRIGGER_TYPES.ON_OPEN:
                    config.isInstallable = true; // Need installable to run as owner
                    config.propertyKey = PROPERTY_KEYS.ON_OPEN_TRIGGER_ID;
                    break;
                    
                case TRIGGER_TYPES.ON_EDIT:
                    config.isInstallable = true; // Need installable to run as owner
                    config.propertyKey = PROPERTY_KEYS.ON_EDIT_TRIGGER_ID;
                    break;
                    
                case TRIGGER_TYPES.DAILY_ANNOUNCEMENT:
                    config.isInstallable = true;
                    config.propertyKey = PROPERTY_KEYS.DAILY_ANNOUNCEMENT_TRIGGER_ID;
                    config.schedule = { type: 'daily', hour: 2 };
                    break;
                    
                case TRIGGER_TYPES.ANNOUNCEMENT_SCHEDULED:
                    config.isInstallable = true;
                    config.propertyKey = PROPERTY_KEYS.ANNOUNCEMENT_TRIGGER_ID;
                    config.timePropertyKey = PROPERTY_KEYS.ANNOUNCEMENT_NEXT_TRIGGER_TIME;
                    config.schedule = { type: 'at', time: null }; // Set at runtime
                    break;
                    
                case TRIGGER_TYPES.DAILY_RWGPS_MEMBERS:
                    config.isInstallable = true;
                    config.propertyKey = PROPERTY_KEYS.DAILY_RWGPS_MEMBERS_TRIGGER_ID;
                    config.schedule = { type: 'daily', hour: 2 };
                    break;
            }
            
            return config;
        }
        
        /**
         * Get all backstop trigger types (daily checks)
         * @returns {string[]} Array of trigger type constants
         */
        static getBackstopTriggers() {
            return [
                TRIGGER_TYPES.DAILY_ANNOUNCEMENT,
                TRIGGER_TYPES.DAILY_RWGPS_MEMBERS
            ];
        }
        
        /**
         * Get all installable (non-simple) trigger types
         * Note: ANNOUNCEMENT_SCHEDULED is excluded - it's scheduled dynamically via scheduleAnnouncementTrigger()
         * @returns {string[]} Array of trigger type constants
         */
        static getAllInstallableTriggers() {
            return [
                TRIGGER_TYPES.ON_OPEN,
                TRIGGER_TYPES.ON_EDIT,
                TRIGGER_TYPES.DAILY_ANNOUNCEMENT,
                TRIGGER_TYPES.DAILY_RWGPS_MEMBERS
            ];
        }
        
        /**
         * Get all scheduled (dynamic) trigger types
         * @returns {string[]} Array of trigger type constants
         */
        static getScheduledTriggers() {
            return [
                TRIGGER_TYPES.ANNOUNCEMENT_SCHEDULED,
            ];
        }
        
        /**
     * Check if a trigger should be scheduled (or rescheduled)
     * @param {string} triggerType - Trigger type constant
     * @param {number|null|undefined} existingTriggerTime - Time from existing trigger (queried from ScriptApp), or null/undefined if no trigger exists
     * @param {number} newTime - New time to schedule for
     * @returns {{shouldSchedule: boolean, reason: string}} Scheduling decision
     */
    static shouldScheduleTrigger(triggerType, existingTriggerTime, newTime) {
        const config = TriggerManagerCore.getTriggerConfig(triggerType);
        
        if (!config.timePropertyKey) {
            return {
                shouldSchedule: false,
                reason: 'Trigger type does not support scheduling'
            };
        }
        
        // If no trigger exists, schedule it
        if (existingTriggerTime === null || existingTriggerTime === undefined) {
            return {
                shouldSchedule: true,
                reason: 'No trigger currently exists'
            };
        }
        
        // If same time, don't reschedule (idempotent)
        if (existingTriggerTime === newTime) {
            return {
                shouldSchedule: false,
                reason: 'Trigger already scheduled for this time'
            };
        }
        
        // Different time - need to reschedule
        return {
            shouldSchedule: true,
            reason: `Time changed from ${new Date(existingTriggerTime)} to ${new Date(newTime)}`
        };
    }
    
    /**
     * Check if a trigger should be removed
     * @param {string} triggerType - Trigger type constant
     * @param {boolean} hasWork - Whether there is work pending for this trigger
     * @returns {Object} {shouldRemove: boolean, reason: string}
     */
    static shouldRemoveTrigger(triggerType, hasWork) {
        const config = TriggerManagerCore.getTriggerConfig(triggerType);
            
            // Scheduled triggers should be removed when no work pending
            if (config.schedule && config.schedule.type === 'at') {
                if (!hasWork) {
                    return {
                        shouldRemove: true,
                        reason: 'No pending work for scheduled trigger'
                    };
                }
                return {
                    shouldRemove: false,
                    reason: 'Work still pending'
                };
            }
            
            // Backstop triggers should never be auto-removed
            return {
                shouldRemove: false,
                reason: 'Backstop triggers are permanent'
            };
        }
        
        /**
         * Validate trigger installation request
         * @param {string} currentUserEmail - Email of user requesting installation
         * @param {string} ownerEmail - Email of spreadsheet owner
         * @returns {{valid: boolean, error?: string}} Validation result
         */
        static validateTriggerInstallation(currentUserEmail, ownerEmail) {
            if (!currentUserEmail) {
                return {
                    valid: false,
                    error: 'Current user email not provided'
                };
            }
            
            if (!ownerEmail) {
                return {
                    valid: false,
                    error: 'Owner email not available'
                };
            }
            
            if (currentUserEmail !== ownerEmail) {
                return {
                    valid: false,
                    error: `Only the spreadsheet owner (${ownerEmail}) can install triggers. Current user: ${currentUserEmail}`
                };
            }
            
            return { valid: true };
        }
        
        /**
         * Build installation summary from results
         * @param {Record<string, {success: boolean, existed?: boolean}>} results - Installation results for each trigger type
         * @returns {{installed: number, existed: number, failed: number, details: Record<string, any>}} Installation summary
         */
        static buildInstallationSummary(results) {            /** @type {{installed: number, existed: number, failed: number, details: Record<string, any>}} */            const summary = {
                installed: 0,
                existed: 0,
                failed: 0,
                details: {}
            };
            
            Object.entries(results).forEach(([triggerType, result]) => {
                if (result.success) {
                    if (result.existed) {
                        summary.existed++;
                    } else {
                        summary.installed++;
                    }
                } else {
                    summary.failed++;
                }
                (/** @type {Record<string, any>} */ (summary.details))[triggerType] = result;
            });
            
            return summary;
        }
        
        /**
         * Get constants for external use
         */
        static get TRIGGER_TYPES() {
            return TRIGGER_TYPES;
        }
        
        static get HANDLER_FUNCTIONS() {
            return HANDLER_FUNCTIONS;
        }
        
        static get PROPERTY_KEYS() {
            return PROPERTY_KEYS;
        }
}

// Node.js compatibility
if (typeof module !== 'undefined') {
    module.exports = TriggerManagerCore;
}
