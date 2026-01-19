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
// Pattern: import type ModuleName from './ModuleName'
// All modules now follow IIFE pattern: var ModuleName = (function() { class ModuleName { ... } return ModuleName; })()
import type AnnouncementCore from './AnnouncementCore';
import type AnnouncementManager from './AnnouncementManager';
import type CacheManager from './CacheManager';
import type EventFactory from './EventFactory';
import type Exports from './Exports';
import type { Externals as ExternalsType } from './Externals';
import type Globals from './Globals';
import type { GlobalsObject } from './Globals';
import type GoogleEventCore from './GoogleEventCore';
import type GroupLogoManager from './GroupLogoManager';
import type Groups from './Groups';
import type HyperlinkUtils from './HyperlinkUtils';
import type { MenuFunctions as MenuFunctionsType } from './MenuFunctions';
import type RideCoordinator from './RideCoordinator';
import type RideManager from './RideManager';
import type RideManagerCore from './RideManagerCore';
import type RouteColumnEditor from './RouteColumnEditor';
import type RowCore from './RowCore';
import type CredentialManager from './rwgpslib/CredentialManager';
import type RWGPSAdapter from './rwgpslib/RWGPSAdapter';
import type RWGPSClient from './rwgpslib/RWGPSClient';
import type RWGPSClientCore from './rwgpslib/RWGPSClientCore';
import type RWGPSClientFactory from './rwgpslib/RWGPSClientFactory';
import type RWGPSCore from './rwgpslib/RWGPSCore';
import type RWGPSMembersAdapter from './RWGPSMembersAdapter';
import type RWGPSMembersCore from './RWGPSMembersCore';
import type SCCCCEvent from './SCCCCEvent';
import type ScheduleAdapter from './ScheduleAdapter';
import type TriggerManager from './TriggerManager';
import type TriggerManagerCore from './TriggerManagerCore';
import type UIHelper from './UIHelper';
import type UserLogger from './UserLogger';
import type UserLoggerCore from './UserLoggerCore';
import type ValidationCore from './ValidationCore';

// Declare all module exports as global variables for GAS runtime
// In GAS, all .js files are concatenated, so 'var' declarations become globals

declare global {
    // Classes - use 'typeof' to get the constructor type (can use 'new')
    const ScheduleAdapter: typeof ScheduleAdapter;
    const RowCore: typeof RowCore;
    const RouteColumnEditor: typeof RouteColumnEditor;
    const AnnouncementManager: typeof AnnouncementManager;
    const TriggerManager: typeof TriggerManager;
    const TriggerManagerCore: typeof TriggerManagerCore;
    const SCCCCEvent: typeof SCCCCEvent;
    const RWGPSMembersAdapter: typeof RWGPSMembersAdapter;
    const RWGPSMembersCore: typeof RWGPSMembersCore;
    const ValidationCore: typeof ValidationCore;
    const UIHelper: typeof UIHelper;
    const UserLoggerCore: typeof UserLoggerCore;
    const GoogleEventCore: typeof GoogleEventCore;
    const HyperlinkUtils: typeof HyperlinkUtils;
    const CacheManager: typeof CacheManager;
    const Groups: typeof Groups;
    const Globals: typeof Globals;
    
    // Objects/Namespaces and Adapters
    const MenuFunctions: MenuFunctionsType;
    const Exports: Exports;
    const EventFactory: typeof EventFactory;
    const RideManager: typeof RideManager;
    const RideManagerCore: typeof RideManagerCore;
    const AnnouncementCore: typeof AnnouncementCore;
    const RideCoordinator: typeof RideCoordinator;
    const UserLogger: typeof UserLogger;
    const GroupLogoManager: typeof GroupLogoManager;
    const CredentialManager: typeof CredentialManager;
    const RWGPSClient: typeof RWGPSClient;
    const RWGPSClientCore: typeof RWGPSClientCore;
    const RWGPSClientFactory: typeof RWGPSClientFactory;
    const RWGPSCore: typeof RWGPSCore;
    const RWGPSAdapter: typeof RWGPSAdapter;
    
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

export { };


