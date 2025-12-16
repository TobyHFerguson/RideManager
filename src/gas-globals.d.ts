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
import type { MenuFunctions as MenuFunctionsType } from './MenuFunctions';
import type RouteColumnEditorClass from './RouteColumnEditor';
import type ActionSelectorClass from './ActionSelector';
import type AnnouncementManagerClass from './AnnouncementManager';
import type RetryQueueClass from './RetryQueue';
import type TriggerManagerClass from './TriggerManager';
import type ExportsType from './Exports';
import type GlobalsType from './Globals';
import type { Externals as ExternalsType } from './Externals';

// Declare all module exports as global variables for GAS runtime
// In GAS, all .js files are concatenated, so 'var' declarations become globals

declare global {
    // Classes - use 'typeof' to get the constructor type (can use 'new')
    const ScheduleAdapter: typeof ScheduleAdapterClass;
    const RouteColumnEditor: typeof RouteColumnEditorClass;
    const ActionSelector: typeof ActionSelectorClass;
    const AnnouncementManager: typeof AnnouncementManagerClass;
    const RetryQueue: typeof RetryQueueClass;
    const TriggerManager: typeof TriggerManagerClass;
    
    // Objects - don't use 'typeof', they're singleton instances
    const MenuFunctions: MenuFunctionsType;
    const Exports: typeof ExportsType;
    
    // Utility functions that are global in GAS
    function getRoute(url: string, readThrough?: boolean): any;
    function getGlobals(): typeof GlobalsType;
    function getExternals(): ExternalsType;
    function getAppVersion(): string;
}

export {};
