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

var TriggerManagerCore = (function() {
    
    // Trigger configuration constants
    const TRIGGER_TYPES = {
        ON_OPEN: 'onOpen',
        ON_EDIT: 'onEdit',
        DAILY_ANNOUNCEMENT: 'dailyAnnouncement',
        ANNOUNCEMENT_SCHEDULED: 'announcementScheduled',
        DAILY_RETRY: 'dailyRetry',
        RETRY_SCHEDULED: 'retryScheduled'
    };
    
    const HANDLER_FUNCTIONS = {
        [TRIGGER_TYPES.ON_OPEN]: 'onOpen',
        [TRIGGER_TYPES.ON_EDIT]: 'editHandler',
        [TRIGGER_TYPES.DAILY_ANNOUNCEMENT]: 'dailyAnnouncementCheck',
        [TRIGGER_TYPES.ANNOUNCEMENT_SCHEDULED]: 'announcementTrigger',
        [TRIGGER_TYPES.DAILY_RETRY]: 'dailyRetryCheck',
        [TRIGGER_TYPES.RETRY_SCHEDULED]: 'retryQueueTrigger'
    };
    
    const PROPERTY_KEYS = {
        ANNOUNCEMENT_NEXT_TRIGGER_TIME: 'ANNOUNCEMENT_NEXT_TRIGGER_TIME',
        ANNOUNCEMENT_TRIGGER_ID: 'ANNOUNCEMENT_TRIGGER_ID',
        RETRY_NEXT_TRIGGER_TIME: 'RETRY_NEXT_TRIGGER_TIME',
        RETRY_TRIGGER_ID: 'RETRY_TRIGGER_ID',
        DAILY_ANNOUNCEMENT_TRIGGER_ID: 'DAILY_ANNOUNCEMENT_TRIGGER_ID',
        DAILY_RETRY_TRIGGER_ID: 'DAILY_RETRY_TRIGGER_ID',
        ON_OPEN_TRIGGER_ID: 'ON_OPEN_TRIGGER_ID',
        ON_EDIT_TRIGGER_ID: 'ON_EDIT_TRIGGER_ID'
    };
    
    class TriggerManagerCore {
        /**
         * Get trigger configuration for a specific type
         * @param {string} triggerType - One of TRIGGER_TYPES values
         * @returns {Object} {handlerFunction: string, propertyKey: string, isInstallable: boolean}
         */
        static getTriggerConfig(triggerType) {
            if (!HANDLER_FUNCTIONS[triggerType]) {
                throw new Error(`Unknown trigger type: ${triggerType}`);
            }
            
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
                    
                case TRIGGER_TYPES.DAILY_RETRY:
                    config.isInstallable = true;
                    config.propertyKey = PROPERTY_KEYS.DAILY_RETRY_TRIGGER_ID;
                    config.schedule = { type: 'daily', hour: 2 };
                    break;
                    
                case TRIGGER_TYPES.RETRY_SCHEDULED:
                    config.isInstallable = true;
                    config.propertyKey = PROPERTY_KEYS.RETRY_TRIGGER_ID;
                    config.timePropertyKey = PROPERTY_KEYS.RETRY_NEXT_TRIGGER_TIME;
                    config.schedule = { type: 'at', time: null }; // Set at runtime
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
                TRIGGER_TYPES.DAILY_RETRY
            ];
        }
        
        /**
         * Get all installable (non-simple) trigger types
         * @returns {string[]} Array of trigger type constants
         */
        static getAllInstallableTriggers() {
            return [
                TRIGGER_TYPES.ON_OPEN,
                TRIGGER_TYPES.ON_EDIT,
                TRIGGER_TYPES.DAILY_ANNOUNCEMENT,
                TRIGGER_TYPES.DAILY_RETRY
            ];
        }
        
        /**
         * Get all scheduled (dynamic) trigger types
         * @returns {string[]} Array of trigger type constants
         */
        static getScheduledTriggers() {
            return [
                TRIGGER_TYPES.ANNOUNCEMENT_SCHEDULED,
                TRIGGER_TYPES.RETRY_SCHEDULED
            ];
        }
        
        /**
         * Check if a trigger should be scheduled based on its current time
         * @param {string} triggerType - Trigger type constant
         * @param {number|null} scheduledTime - Currently scheduled timestamp (or null)
         * @param {number} newTime - New desired timestamp
         * @returns {Object} {shouldSchedule: boolean, reason: string}
         */
        static shouldScheduleTrigger(triggerType, scheduledTime, newTime) {
            const config = this.getTriggerConfig(triggerType);
            
            if (!config.timePropertyKey) {
                return {
                    shouldSchedule: false,
                    reason: 'Trigger type does not support scheduling'
                };
            }
            
            // If no time scheduled, schedule it
            if (scheduledTime === null || scheduledTime === undefined) {
                return {
                    shouldSchedule: true,
                    reason: 'No trigger currently scheduled'
                };
            }
            
            // If same time, don't reschedule (idempotent)
            if (scheduledTime === newTime) {
                return {
                    shouldSchedule: false,
                    reason: 'Trigger already scheduled for this time'
                };
            }
            
            // Different time - need to reschedule
            return {
                shouldSchedule: true,
                reason: `Time changed from ${new Date(scheduledTime).toISOString()} to ${new Date(newTime).toISOString()}`
            };
        }
        
        /**
         * Check if a trigger should be removed
         * @param {string} triggerType - Trigger type constant
         * @param {boolean} hasWork - Whether there is work pending for this trigger
         * @returns {Object} {shouldRemove: boolean, reason: string}
         */
        static shouldRemoveTrigger(triggerType, hasWork) {
            const config = this.getTriggerConfig(triggerType);
            
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
         * @returns {Object} {valid: boolean, error?: string}
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
         * @param {Object} results - Installation results for each trigger type
         * @returns {Object} {installed: number, existed: number, failed: number, details: Object}
         */
        static buildInstallationSummary(results) {
            const summary = {
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
                summary.details[triggerType] = result;
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
    
    return TriggerManagerCore;
})();

// Node.js compatibility
if (typeof module !== 'undefined') {
    module.exports = TriggerManagerCore;
}
