/**
 * gas-globals.d.ts - Ambient declarations for Google Apps Script runtime globals
 * 
 * In GAS, all .js files are concatenated into a single global scope.
 * Variables declared with 'var' at top level become global variables.
 * This file declares those globals as ambient types for TypeScript checking.
 * 
 * DO NOT IMPORT - These are ambient declarations available everywhere in src/
 */

// Import the actual types we need
import type ScheduleAdapterClass from './ScheduleAdapter';
import type RowCoreClass from './RowCore';
import type { MenuFunctions as MenuFunctionsType } from './MenuFunctions';
import type RouteColumnEditorClass from './RouteColumnEditor';
import type AnnouncementManagerClass from './AnnouncementManager';
import type TriggerManagerClass from './TriggerManager';
import type ExportsType from './Exports';
import type { GlobalsObject } from './Globals';
import type { Externals as ExternalsType } from './Externals';
import type SCCCCEventClass from './SCCCCEvent';
import type EventFactoryNamespace from './EventFactory';
import type RideManagerNamespace from './RideManager';
import type RideManagerCoreClass from './RideManagerCore';
import type AnnouncementCoreClass from './AnnouncementCore';
import type RWGPSMembersAdapterClass from './RWGPSMembersAdapter';
import type RWGPSMembersCoreClass from './RWGPSMembersCore';
import type ValidationCoreClass from './ValidationCore';
import type UIHelperClass from './UIHelper';
import type RideCoordinatorClass from './RideCoordinator';
import type UserLoggerCoreClass from './UserLoggerCore';
import type UserLoggerType from './UserLogger';
import type * as GoogleEventCoreModule from './GoogleEventCore';

// Declare all module exports as global variables for GAS runtime
// In GAS, all .js files are concatenated, so 'var' declarations become globals

declare global {
    // Classes - use 'typeof' to get the constructor type (can use 'new')
    const ScheduleAdapter: typeof ScheduleAdapterClass;
    const RowCore: typeof RowCoreClass;
    const RouteColumnEditor: typeof RouteColumnEditorClass;
    const AnnouncementManager: typeof AnnouncementManagerClass;
    const TriggerManager: typeof TriggerManagerClass;
    const SCCCCEvent: typeof SCCCCEventClass;
    const RWGPSMembersAdapter: typeof RWGPSMembersAdapterClass;
    const ValidationCore: typeof ValidationCoreClass;
    const UIHelper: typeof UIHelperClass;
    const UserLoggerCore: typeof UserLoggerCoreClass;
    const GoogleEventCore: typeof GoogleEventCoreModule;
    
    // Objects/Namespaces - singleton instances or frozen objects
    const MenuFunctions: MenuFunctionsType;
    const Exports: ExportsType; // This is the interface, not typeof
    const EventFactory: typeof EventFactoryNamespace;
    const RideManager: typeof RideManagerNamespace;
    const RideManagerCore: typeof RideManagerCoreClass;
    const AnnouncementCore: typeof AnnouncementCoreClass;
    const RWGPSMembersCore: typeof RWGPSMembersCoreClass;
    const RideCoordinator: typeof RideCoordinatorClass;
    const UserLogger: typeof UserLoggerType;
    
    // External libraries available in GAS runtime
    const RWGPSLib: typeof import('./Externals').RWGPSLib;
    const RWGPSLib12: typeof import('./Externals').RWGPSLib;
    const RWGPSLib13: typeof import('./Externals').RWGPSLib;
    const bmPreFiddler: any; // Third-party library
    const dates: typeof import('./common/dates');
    
    // GAS built-in services (already typed by @types/google-apps-script)
    // But we reference them here for completeness
    // SpreadsheetApp, PropertiesService, CalendarApp, UrlFetchApp, etc.
    
    // Utility functions that are global in GAS
    function getRoute(url: string, readThrough?: boolean): any;
    function getGlobals(): GlobalsObject;
    function getExternals(): ExternalsType;
    function getAppVersion(): string;
    function getGroupNames(): string[];
    function getGroupSpecs(): any;
}

export {};
