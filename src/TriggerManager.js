// @ts-check
/// <reference path="./UserLogger.d.ts" />
/**
 * TriggerManager - Centralized trigger management for ALL project triggers
 * 
 * Thin GAS adapter around TriggerManagerCore (pure JavaScript, fully tested).
 * All business logic is in TriggerManagerCore.
 * This layer only handles GAS APIs: ScriptApp, PropertiesService, etc.
 * 
 * Manages:
 * - onOpen trigger (installable, runs as owner)
 * - onEdit trigger (installable, runs as owner)
 * - Daily backstop triggers (announcements)
 * - Scheduled triggers (specific announcement times)
 * 
 * All operations are idempotent and log to User Activity Log.
 * Uses document properties for coordination between triggers.
 */

// Node.js compatibility
if (typeof require !== 'undefined') {
    var TriggerManagerCore = require('./TriggerManagerCore');
}

var TriggerManager = (function() {
    
    class TriggerManager {
        constructor() {
            this.docProps = PropertiesService.getDocumentProperties();
            this.core = TriggerManagerCore;
        }
        
        /**
         * Check if current user is the spreadsheet owner
         * @returns {boolean}
         */
        isOwner() {
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            const owner = ss.getOwner();
            const currentUser = Session.getEffectiveUser().getEmail();
            return owner && currentUser === owner.getEmail();
        }
        
        /**
         * Ensure current user is owner, throw error if not
         * @throws {Error} If current user is not the owner
         */
        requireOwner() {
            if (!this.isOwner()) {
                const owner = SpreadsheetApp.getActiveSpreadsheet().getOwner()?.getEmail() || 'unknown';
                throw new Error(`Only the spreadsheet owner (${owner}) can manage triggers. Current user: ${Session.getEffectiveUser().getEmail()}`);
            }
        }
        
        /**
         * Install all required triggers (onOpen, onEdit, daily backstops)
         * Idempotent: Safe to call multiple times
         * Owner-only operation
         * 
         * @returns {Object} Installation result with summary
         */
        installAllTriggers() {
            this.requireOwner();
            
            const results = {};
            
            try {
                // Install all installable triggers
                const triggerTypes = this.core.getAllInstallableTriggers();
                
                triggerTypes.forEach(triggerType => {
                    try {
                        const result = this._ensureTrigger(triggerType);
                        results[triggerType] = { success: true, ...result };
                    } catch (error) {
                        results[triggerType] = { 
                            success: false, 
                            error: error.message 
                        };
                        console.error(`TriggerManager: Failed to install ${triggerType}:`, error);
                    }
                });
                
                // Build summary using core logic
                const summary = this.core.buildInstallationSummary(results);
                summary.success = summary.failed === 0;
                
                // Log successful installation
                UserLogger.log(
                    'INSTALL_TRIGGERS',
                    `Installed ${summary.installed} trigger(s), ${summary.existed} existed`,
                    summary
                );
                
                console.log('TriggerManager: Installation complete', summary);
                
                // Run daily backstop functions immediately to process any pending work
                try {
                    console.log('TriggerManager: Running daily backstop functions immediately');
                    
                    // Run announcement check
                    if (typeof dailyAnnouncementCheck === 'function') {
                        dailyAnnouncementCheck();
                        console.log('TriggerManager: Completed dailyAnnouncementCheck');
                    }
                    
                    // Run RWGPS members sync
                    if (typeof dailyRWGPSMembersDownload === 'function') {
                        dailyRWGPSMembersDownload();
                        console.log('TriggerManager: Completed dailyRWGPSMembersDownload');
                    }
                } catch (backstopError) {
                    // Log but don't fail installation if backstop functions error
                    console.warn('TriggerManager: Error running backstop functions:', backstopError);
                }
                
                return summary;
                
            } catch (error) {
                UserLogger.log(
                    'INSTALL_TRIGGERS_ERROR',
                    'Failed to install triggers',
                    { error: error.message, stack: error.stack }
                );
                
                console.error('TriggerManager: Error installing triggers:', error);
                throw error;
            }
        }
        
        /**
         * Remove all triggers (both daily backstops and scheduled triggers)
         * Idempotent: Safe to call multiple times
         * Owner-only operation
         * 
         * @returns {Object} Removal result with deletion counts
         */
        removeAllTriggers() {
            this.requireOwner();
            
            const result = {
                success: true,
                deletedCount: 0,
                errors: []
            };
            
            try {
                // Delete all triggers by handler function name
                const allTriggerTypes = [
                    ...this.core.getAllInstallableTriggers(),
                    ...this.core.getScheduledTriggers()
                ];
                
                allTriggerTypes.forEach(triggerType => {
                    const config = this.core.getTriggerConfig(triggerType);
                    const count = this._deleteTriggersByHandlerName(config.handlerFunction);
                    result.deletedCount += count;
                });
                
                // Clear all document properties
                Object.values(this.core.PROPERTY_KEYS).forEach(key => {
                    this.docProps.deleteProperty(key);
                });
                
                // Log successful removal
                UserLogger.log(
                    'REMOVE_TRIGGERS',
                    `Removed ${result.deletedCount} trigger(s)`,
                    { deletedCount: result.deletedCount }
                );
                
                console.log(`TriggerManager: Removed ${result.deletedCount} trigger(s)`);
                
            } catch (error) {
                result.success = false;
                result.errors.push(error.message);
                
                UserLogger.log(
                    'REMOVE_TRIGGERS_ERROR',
                    'Failed to remove triggers',
                    { error: error.message, stack: error.stack }
                );
                
                console.error('TriggerManager: Error removing triggers:', error);
                throw error;
            }
            
            return result;
        }
        
        /**
         * Schedule the next announcement trigger for a specific time
         * Idempotent: If trigger already exists for same time, does nothing
         * Owner-only operation
         * 
         * @param {Date|number} sendTime - When the announcement should be sent (Date or timestamp)
         * @returns {Object} {created: boolean, triggerId: string}
         */
        scheduleAnnouncementTrigger(sendTime) {
            return this._scheduleTimedTrigger(
                this.core.TRIGGER_TYPES.ANNOUNCEMENT_SCHEDULED,
                sendTime,
                'SCHEDULE_ANNOUNCEMENT_TRIGGER'
            );
        }
        
        
        /**
         * Generic method to schedule a timed trigger
         * Queries actual triggers from ScriptApp (no caching)
         * @private
         */
        _scheduleTimedTrigger(triggerType, time, logAction) {
            this.requireOwner();
            
            const config = this.core.getTriggerConfig(triggerType);
            const timestamp = time instanceof Date ? time.getTime() : time;
            
            // Query actual trigger from ScriptApp (no cache)
            const existingTrigger = this._findTriggerByFunction(config.handlerFunction);
            const existingTime = existingTrigger ? this._getTriggerTime(existingTrigger) : null;
            
            // Use core logic to determine if scheduling needed
            // Note: existingTime will be -1 if trigger exists but time can't be queried
            // We treat this as "trigger exists for unknown time" and check if it's the same
            const decision = this.core.shouldScheduleTrigger(
                triggerType,
                existingTime === -1 ? timestamp : existingTime, // If marker, assume same time
                timestamp
            );
            
            if (!decision.shouldSchedule) {
                const triggerId = existingTrigger ? existingTrigger.getUniqueId() : null;
                console.log(`TriggerManager: ${triggerType} - ${decision.reason}`);
                return { created: false, triggerId };
            }
            
            // Delete old trigger if exists
            if (existingTrigger) {
                try {
                    ScriptApp.deleteTrigger(existingTrigger);
                    console.log(`TriggerManager: Deleted old ${config.handlerFunction} trigger`);
                } catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    console.warn(`TriggerManager: Could not delete old trigger: ${err.message}`);
                }
            }
            
            // Create new trigger
            const trigger = ScriptApp.newTrigger(config.handlerFunction)
                .timeBased()
                .at(new Date(timestamp))
                .create();
            
            const triggerId = trigger.getUniqueId();
            
            UserLogger.log(
                logAction,
                `Scheduled ${triggerType} for ${new Date(timestamp).toLocaleString()}`,
                { triggerType, time: timestamp, triggerId }
            );
            
            console.log(`TriggerManager: Created ${triggerType} trigger ${triggerId} for ${new Date(timestamp)}`);
            return { created: true, triggerId };
        }
        
        /**
         * Remove the scheduled announcement trigger
         * Idempotent: Safe to call even if trigger doesn't exist
         * Owner-only operation
         */
        removeAnnouncementTrigger() {
            return this._removeScheduledTrigger(
                this.core.TRIGGER_TYPES.ANNOUNCEMENT_SCHEDULED,
                'REMOVE_ANNOUNCEMENT_TRIGGER'
            );
        }
        
        /**
         * Generic method to remove a scheduled trigger
         * Queries and deletes actual trigger (no cache management)
         * @private
         */
        _removeScheduledTrigger(triggerType, logAction) {
            this.requireOwner();
            
            const config = this.core.getTriggerConfig(triggerType);
            const existingTrigger = this._findTriggerByFunction(config.handlerFunction);
            
            if (existingTrigger) {
                try {
                    ScriptApp.deleteTrigger(existingTrigger);
                    
                    UserLogger.log(
                        logAction,
                        `Removed ${triggerType} trigger`,
                        { triggerType }
                    );
                    
                    console.log(`TriggerManager: Removed ${triggerType} trigger`);
                } catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    console.error(`TriggerManager: Error removing ${triggerType} trigger: ${err.message}`);
                    throw err;
                }
            } else {
                console.log(`TriggerManager: No ${triggerType} trigger to remove`);
            }
        }
        
        // ========== PRIVATE HELPER METHODS ==========
        
        /**
         * Find an existing trigger by handler function name
         * Queries actual triggers from ScriptApp (no caching)
         * @private
         * @param {string} handlerFunction - Function name (e.g., 'announcementTrigger')
         * @returns {GoogleAppsScript.Script.Trigger|null} The trigger or null if not found
         */
        _findTriggerByFunction(handlerFunction) {
            const allTriggers = ScriptApp.getProjectTriggers();
            return allTriggers.find(t => t.getHandlerFunction() === handlerFunction) || null;
        }
        
        /**
         * Get the trigger time from a time-based trigger
         * @private
         * @param {GoogleAppsScript.Script.Trigger} trigger - The trigger
         * @returns {number|null} Timestamp in milliseconds, or null if not a time-based trigger
         */
        _getTriggerTime(trigger) {
            try {
                const triggerSource = trigger.getTriggerSource();
                if (triggerSource !== ScriptApp.TriggerSource.CLOCK) {
                    return null;
                }
                
                // For time-based triggers, we need to check the event type
                const eventType = trigger.getEventType();
                if (eventType === ScriptApp.EventType.CLOCK) {
                    // Unfortunately, GAS doesn't provide a direct way to get the scheduled time
                    // We can only get it when the trigger fires (from the event object)
                    // For now, we'll have to work around this limitation
                    // The trigger exists, so we return a marker value
                    return -1; // Marker: trigger exists but time unknown
                }
                return null;
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.warn(`TriggerManager: Could not get trigger time: ${err.message}`);
                return null;
            }
        }
        
        /**
         * Ensure a trigger exists (universal method for all trigger types)
         * Idempotent: Creates only if missing
         * @private
         * @param {string} triggerType - Trigger type from TriggerManagerCore.TRIGGER_TYPES
         * @returns {Object} {installed: boolean, existed: boolean, triggerId: string}
         */
        _ensureTrigger(triggerType) {
            const config = this.core.getTriggerConfig(triggerType);
            const existingId = this.docProps.getProperty(config.propertyKey);
            
            if (existingId) {
                // Check if trigger still exists
                const triggers = ScriptApp.getProjectTriggers();
                const exists = triggers.some(t => t.getUniqueId() === existingId);
                
                if (exists) {
                    console.log(`TriggerManager: ${triggerType} trigger already exists (${existingId})`);
                    return { installed: false, existed: true, triggerId: existingId };
                }
            }
            
            // Create new trigger based on type
            let triggerBuilder;
            
            if (triggerType === this.core.TRIGGER_TYPES.ON_OPEN) {
                triggerBuilder = ScriptApp.newTrigger(config.handlerFunction)
                    .forSpreadsheet(SpreadsheetApp.getActive())
                    .onOpen();
            } else if (triggerType === this.core.TRIGGER_TYPES.ON_EDIT) {
                triggerBuilder = ScriptApp.newTrigger(config.handlerFunction)
                    .forSpreadsheet(SpreadsheetApp.getActive())
                    .onEdit();
            } else if (config.schedule && config.schedule.type === 'daily') {
                triggerBuilder = ScriptApp.newTrigger(config.handlerFunction)
                    .timeBased()
                    .atHour(config.schedule.hour)
                    .everyDays(1);
            } else {
                throw new Error(`Cannot create trigger for type: ${triggerType} (use schedule methods for 'at' triggers)`);
            }
            
            const trigger = triggerBuilder.create();
            const triggerId = trigger.getUniqueId();
            this.docProps.setProperty(config.propertyKey, triggerId);
            
            console.log(`TriggerManager: Created ${triggerType} trigger ${triggerId}`);
            return { installed: true, existed: false, triggerId };
        }
        
        /**
         * Delete a scheduled trigger by property key
         * @private
         * @returns {boolean} True if trigger was deleted
         */
        _deleteScheduledTrigger(propKey, handlerName) {
            const triggerId = this.docProps.getProperty(propKey);
            
            if (!triggerId) {
                return false;
            }
            
            const triggers = ScriptApp.getProjectTriggers();
            const trigger = triggers.find(t => t.getUniqueId() === triggerId);
            
            if (trigger) {
                ScriptApp.deleteTrigger(trigger);
                console.log(`TriggerManager: Deleted trigger ${triggerId} (${handlerName})`);
                return true;
            }
            
            return false;
        }
        
        /**
         * Delete all triggers by handler function name
         * @private
         * @returns {number} Number of triggers deleted
         */
        _deleteTriggersByHandlerName(handlerName) {
            const triggers = ScriptApp.getProjectTriggers();
            let count = 0;
            
            triggers.forEach(trigger => {
                if (trigger.getHandlerFunction() === handlerName) {
                    ScriptApp.deleteTrigger(trigger);
                    count++;
                }
            });
            
            if (count > 0) {
                console.log(`TriggerManager: Deleted ${count} trigger(s) with handler ${handlerName}`);
            }
            
            return count;
        }
    }
    
    return TriggerManager;
})();

// Node.js compatibility
if (typeof module !== 'undefined') {
    module.exports = TriggerManager;
}
