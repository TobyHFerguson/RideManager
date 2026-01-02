// @ts-check
if (typeof require !== 'undefined') {
    const {RWGPS, RWGPSService} = require('./Externals')
    const Commands = require('./Commands')
    modules.export = Exports;
}

/**
 * Centralized exports using property getters for lazy loading
 * Based on: https://ramblings.mcpher.com/gassnippets2/exports/
 * 
 * Getters execute at access time (not definition time), so they naturally
 * handle loading order issues - the referenced module will be available
 * when you access it, regardless of file load order.
 */
var Exports = {
    get MenuFunctions() {
        return MenuFunctions;
    },
    get Commands() {
        return Commands;
    },
    get ScheduleAdapter() {
        return ScheduleAdapter;
    },
    get RowCore() {
        return RowCore;
    },
    get RouteColumnEditor() {
        return RouteColumnEditor;
    },
    get HyperlinkUtils() {
        return HyperlinkUtils;
    },
    get UIManager() {
        return UIManager;
    },
    get RideManager() {
        return RideManager;
    },
    get UserLogger() {
        return UserLogger;
    },
    get SCCCCEvent() {
        return SCCCCEvent;
    },
    get EventFactory() {
        return EventFactory;
    },
    get AnnouncementManager() {
        return AnnouncementManager;
    },
    get AnnouncementCore() {
        return AnnouncementCore;
    },
    get GoogleCalendarManager() {
        return GoogleCalendarManager;
    },
    get TriggerManager() {
        return TriggerManager;
    },
    get Groups() {
        return Groups;
    },
    get Globals() {
        return Globals;
    },
    get CacheManager() {
        return CacheManager;
    },
    get TriggerManager() {
        return TriggerManager;
    },
    get TriggerManagerCore() {
        return TriggerManagerCore;
    },
    get dates() {
        return dates;
    },
    get RWGPSMembersCore() {
        return RWGPSMembersCore;
    },
    get RWGPSMembersAdapter() {
        return RWGPSMembersAdapter;
    }
};


