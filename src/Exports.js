// @ts-check
if (typeof require !== 'undefined') {
    const {RWGPS, RWGPSService} = require('./Externals')
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
    get UIHelper() {
        return UIHelper;
    },
    get ValidationCore() {
        return ValidationCore;
    },
    get GoogleEventCore() {
        return GoogleEventCore;
    },
    get RideCoordinator() {
        return RideCoordinator;
    },
    get RideManager() {
        return RideManager;
    },
    get RideManagerCore() {
        return RideManagerCore;
    },
    get UserLogger() {
        return UserLogger;
    },
    get UserLoggerCore() {
        return UserLoggerCore;
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
    },
    get RWGPSClient() {
        return RWGPSClient;
    },
    get RWGPSClientCore() {
        return RWGPSClientCore;
    },
    get GroupLogoManager() {
        return GroupLogoManager;
    }
};


