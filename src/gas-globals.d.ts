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
import type CommandsNamespace from './Commands';
import type rowCheckNamespace from './rowCheck';
import type RideManagerNamespace from './RideManager';
import type RideManagerCore from './RideManagerCore';
import type UIManagerNamespace from './UIManager';
import type AnnouncementCoreNamespace from './AnnouncementCore';
import type RWGPSMembersAdapterClass from './RWGPSMembersAdapter';
import type RWGPSMembersCoreNamespace from './RWGPSMembersCore';

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
    
    // Objects/Namespaces - singleton instances or frozen objects
    const MenuFunctions: MenuFunctionsType;
    const Exports: ExportsType; // This is the interface, not typeof
    const EventFactory: typeof EventFactoryNamespace;
    const Commands: typeof CommandsNamespace;
    const rowCheck: typeof rowCheckNamespace;
    const RideManager: typeof RideManagerNamespace;
    const RideManagerCore: typeof RideManagerCore;
    const UIManager: typeof UIManagerNamespace;
    const AnnouncementCore: typeof AnnouncementCoreNamespace;
    const RWGPSMembersCore: typeof RWGPSMembersCoreNamespace;
    
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
