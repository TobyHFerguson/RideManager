/**
 * Tests for TriggerManagerCore - Pure JavaScript trigger management logic
 * 
 * Goal: 100% code coverage
 */

const TriggerManagerCore = require('../../src/TriggerManagerCore');

describe('TriggerManagerCore', () => {
    
    describe('Constants', () => {
        it('should export TRIGGER_TYPES', () => {
            expect(TriggerManagerCore.TRIGGER_TYPES).toBeDefined();
            expect(TriggerManagerCore.TRIGGER_TYPES.ON_OPEN).toBe('onOpen');
            expect(TriggerManagerCore.TRIGGER_TYPES.ON_EDIT).toBe('onEdit');
            expect(TriggerManagerCore.TRIGGER_TYPES.DAILY_ANNOUNCEMENT).toBe('dailyAnnouncement');
            expect(TriggerManagerCore.TRIGGER_TYPES.ANNOUNCEMENT_SCHEDULED).toBe('announcementScheduled');
        });
        
        it('should export HANDLER_FUNCTIONS', () => {
            expect(TriggerManagerCore.HANDLER_FUNCTIONS).toBeDefined();
            expect(TriggerManagerCore.HANDLER_FUNCTIONS.onOpen).toBe('onOpen');
            expect(TriggerManagerCore.HANDLER_FUNCTIONS.onEdit).toBe('editHandler');
        });
        
        it('should export PROPERTY_KEYS', () => {
            expect(TriggerManagerCore.PROPERTY_KEYS).toBeDefined();
            expect(TriggerManagerCore.PROPERTY_KEYS.ON_OPEN_TRIGGER_ID).toBe('ON_OPEN_TRIGGER_ID');
        });
    });
    
    describe('getTriggerConfig', () => {
        it('should return config for onOpen trigger', () => {
            const config = TriggerManagerCore.getTriggerConfig('onOpen');
            expect(config.handlerFunction).toBe('onOpen');
            expect(config.triggerType).toBe('onOpen');
            expect(config.isInstallable).toBe(true);
            expect(config.propertyKey).toBe('ON_OPEN_TRIGGER_ID');
        });
        
        it('should return config for onEdit trigger', () => {
            const config = TriggerManagerCore.getTriggerConfig('onEdit');
            expect(config.handlerFunction).toBe('editHandler');
            expect(config.triggerType).toBe('onEdit');
            expect(config.isInstallable).toBe(true);
            expect(config.propertyKey).toBe('ON_EDIT_TRIGGER_ID');
        });
        
        it('should return config for daily announcement trigger', () => {
            const config = TriggerManagerCore.getTriggerConfig('dailyAnnouncement');
            expect(config.handlerFunction).toBe('dailyAnnouncementCheck');
            expect(config.isInstallable).toBe(true);
            expect(config.propertyKey).toBe('DAILY_ANNOUNCEMENT_TRIGGER_ID');
            expect(config.schedule).toEqual({ type: 'daily', hour: 2 });
        });
        
        it('should return config for scheduled announcement trigger', () => {
            const config = TriggerManagerCore.getTriggerConfig('announcementScheduled');
            expect(config.handlerFunction).toBe('announcementTrigger');
            expect(config.isInstallable).toBe(true);
            expect(config.propertyKey).toBe('ANNOUNCEMENT_TRIGGER_ID');
            expect(config.timePropertyKey).toBe('ANNOUNCEMENT_NEXT_TRIGGER_TIME');
            expect(config.schedule).toEqual({ type: 'at', time: null });
        });
        
        it('should return config for daily RWGPS members trigger', () => {
            const config = TriggerManagerCore.getTriggerConfig('dailyRWGPSMembersDownload');
            expect(config.handlerFunction).toBe('dailyRWGPSMembersDownload');
            expect(config.isInstallable).toBe(true);
            expect(config.propertyKey).toBe('DAILY_RWGPS_MEMBERS_TRIGGER_ID');
            expect(config.schedule).toEqual({ type: 'daily', hour: 2 });
        });
        
        it('should throw error for unknown trigger type', () => {
            expect(() => {
                TriggerManagerCore.getTriggerConfig('unknownTrigger');
            }).toThrow('Unknown trigger type: unknownTrigger');
        });
    });
    
    describe('getBackstopTriggers', () => {
        it('should return array of backstop trigger types', () => {
            const backstops = TriggerManagerCore.getBackstopTriggers();
            expect(Array.isArray(backstops)).toBe(true);
            expect(backstops).toContain('dailyAnnouncement');
            expect(backstops).toContain('dailyRWGPSMembersDownload');
            expect(backstops.length).toBe(2);
        });
    });
    
    describe('getAllInstallableTriggers', () => {
        it('should return array of all installable trigger types', () => {
            const installable = TriggerManagerCore.getAllInstallableTriggers();
            expect(Array.isArray(installable)).toBe(true);
            expect(installable).toContain('onOpen');
            expect(installable).toContain('onEdit');
            expect(installable).toContain('dailyAnnouncement');
            expect(installable).toContain('dailyRWGPSMembersDownload');
            // announcementScheduled is NOT installable - it's scheduled dynamically
            expect(installable).not.toContain('announcementScheduled'); 
            expect(installable.length).toBe(4);
        });
    });
    
    describe('getScheduledTriggers', () => {
        it('should return array of scheduled trigger types', () => {
            const scheduled = TriggerManagerCore.getScheduledTriggers();
            expect(Array.isArray(scheduled)).toBe(true);
            expect(scheduled).toContain('announcementScheduled');
            expect(scheduled.length).toBe(1);
        });
    });
    
    describe('shouldScheduleTrigger', () => {
        it('should schedule when no current time', () => {
            const result = TriggerManagerCore.shouldScheduleTrigger(
                'announcementScheduled',
                null,
                Date.now()
            );
            expect(result.shouldSchedule).toBe(true);
            expect(result.reason).toBe('No trigger currently exists');
        });
        
        it('should schedule when scheduledTime is undefined', () => {
            const result = TriggerManagerCore.shouldScheduleTrigger(
                'announcementScheduled',
                undefined,
                Date.now()
            );
            expect(result.shouldSchedule).toBe(true);
            expect(result.reason).toBe('No trigger currently exists');
        });
        
        it('should not schedule when time unchanged (idempotent)', () => {
            const time = Date.now();
            const result = TriggerManagerCore.shouldScheduleTrigger(
                'announcementScheduled',
                time,
                time
            );
            expect(result.shouldSchedule).toBe(false);
            expect(result.reason).toBe('Trigger already scheduled for this time');
        });
        
        it('should reschedule when time changed', () => {
            const oldTime = Date.now();
            const newTime = oldTime + 3600000; // +1 hour
            const result = TriggerManagerCore.shouldScheduleTrigger(
                'announcementScheduled',
                oldTime,
                newTime
            );
            expect(result.shouldSchedule).toBe(true);
            expect(result.reason).toContain('Time changed from');
        });
        
        it('should not schedule trigger type without time support', () => {
            const result = TriggerManagerCore.shouldScheduleTrigger(
                'dailyAnnouncement',
                null,
                Date.now()
            );
            expect(result.shouldSchedule).toBe(false);
            expect(result.reason).toBe('Trigger type does not support scheduling');
        });
    });
    
    describe('shouldRemoveTrigger', () => {
        it('should remove scheduled trigger when no work pending', () => {
            const result = TriggerManagerCore.shouldRemoveTrigger(
                'announcementScheduled',
                false
            );
            expect(result.shouldRemove).toBe(true);
            expect(result.reason).toBe('No pending work for scheduled trigger');
        });
        
        it('should not remove scheduled trigger when work pending', () => {
            const result = TriggerManagerCore.shouldRemoveTrigger(
                'announcementScheduled',
                true
            );
            expect(result.shouldRemove).toBe(false);
            expect(result.reason).toBe('Work still pending');
        });
        
        it('should not remove backstop trigger even without work', () => {
            const result = TriggerManagerCore.shouldRemoveTrigger(
                'dailyAnnouncement',
                false
            );
            expect(result.shouldRemove).toBe(false);
            expect(result.reason).toBe('Backstop triggers are permanent');
        });
        
        it('should not remove backstop trigger with work', () => {
            const result = TriggerManagerCore.shouldRemoveTrigger(
                'dailyAnnouncement',
                true
            );
            expect(result.shouldRemove).toBe(false);
            expect(result.reason).toBe('Backstop triggers are permanent');
        });
        
        it('should not remove onOpen trigger', () => {
            const result = TriggerManagerCore.shouldRemoveTrigger(
                'onOpen',
                false
            );
            expect(result.shouldRemove).toBe(false);
            expect(result.reason).toBe('Backstop triggers are permanent');
        });
    });
    
    describe('validateTriggerInstallation', () => {
        it('should validate when current user is owner', () => {
            const result = TriggerManagerCore.validateTriggerInstallation(
                'owner@example.com',
                'owner@example.com'
            );
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });
        
        it('should reject when current user is not owner', () => {
            const result = TriggerManagerCore.validateTriggerInstallation(
                'user@example.com',
                'owner@example.com'
            );
            expect(result.valid).toBe(false);
            expect(result.error).toContain('Only the spreadsheet owner');
            expect(result.error).toContain('owner@example.com');
            expect(result.error).toContain('user@example.com');
        });
        
        it('should reject when current user email not provided', () => {
            const result = TriggerManagerCore.validateTriggerInstallation(
                '',
                'owner@example.com'
            );
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Current user email not provided');
        });
        
        it('should reject when current user email is null', () => {
            const result = TriggerManagerCore.validateTriggerInstallation(
                null,
                'owner@example.com'
            );
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Current user email not provided');
        });
        
        it('should reject when owner email not available', () => {
            const result = TriggerManagerCore.validateTriggerInstallation(
                'user@example.com',
                ''
            );
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Owner email not available');
        });
        
        it('should reject when owner email is null', () => {
            const result = TriggerManagerCore.validateTriggerInstallation(
                'user@example.com',
                null
            );
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Owner email not available');
        });
    });
    
    describe('buildInstallationSummary', () => {
        it('should summarize all successful installations', () => {
            const results = {
                onOpen: { success: true, existed: false },
                onEdit: { success: true, existed: false },
                dailyAnnouncement: { success: true, existed: false }
            };
            const summary = TriggerManagerCore.buildInstallationSummary(results);
            expect(summary.installed).toBe(3);
            expect(summary.existed).toBe(0);
            expect(summary.failed).toBe(0);
            expect(summary.details).toEqual(results);
        });
        
        it('should summarize mix of installed and existed', () => {
            const results = {
                onOpen: { success: true, existed: true },
                onEdit: { success: true, existed: false },
                dailyAnnouncement: { success: true, existed: true }
            };
            const summary = TriggerManagerCore.buildInstallationSummary(results);
            expect(summary.installed).toBe(1);
            expect(summary.existed).toBe(2);
            expect(summary.failed).toBe(0);
        });
        
        it('should summarize failures', () => {
            const results = {
                onOpen: { success: false, error: 'Failed to create' },
                onEdit: { success: true, existed: false }
            };
            const summary = TriggerManagerCore.buildInstallationSummary(results);
            expect(summary.installed).toBe(1);
            expect(summary.existed).toBe(0);
            expect(summary.failed).toBe(1);
        });
        
        it('should handle empty results', () => {
            const results = {};
            const summary = TriggerManagerCore.buildInstallationSummary(results);
            expect(summary.installed).toBe(0);
            expect(summary.existed).toBe(0);
            expect(summary.failed).toBe(0);
            expect(summary.details).toEqual({});
        });
    });
});
