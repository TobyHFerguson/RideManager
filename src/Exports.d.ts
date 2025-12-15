/**
 * Exports - Centralized module exports using lazy property getters
 * 
 * Type definitions for the Exports object that provides access to all modules.
 * Based on: https://ramblings.mcpher.com/gassnippets2/exports/
 * 
 * Getters execute at access time (not definition time), handling loading order issues.
 */

import MenuFunctions from './MenuFunctions';
import Commands from './Commands';
import ScheduleAdapter from './ScheduleAdapter';
import Row from './Row';
import RouteColumnEditor from './RouteColumnEditor';
import ActionSelector from './ActionSelector';
import HyperlinkUtils from './HyperlinkUtils';
import UIManager from './UIManager';
import RideManager from './RideManager';
import UserLogger from './UserLogger';
import Event from './Event';
import EventFactory from './EventFactory';
import RetryQueue from './RetryQueue';
import RetryQueueCore from './RetryQueueCore';
import GoogleCalendarManager from './GoogleCalendarManager';
import Groups from './Groups';
import Globals from './Globals';
import CacheManager from './CacheManager'

/**
 * Centralized exports object
 * 
 * Provides lazy property getters for all modules, handling arbitrary file load order.
 * Access modules via properties, not function calls: `Exports.Commands` not `Exports.getCommands()`
 * 
 * @example
 * ```javascript
 * const command = Exports.Commands.scheduleSelectedRidesWithCredentials;
 * const adapter = new Exports.ScheduleAdapter();
 * const result = Exports.ActionSelector.determineNextAction(state, true);
 * ```
 */
interface ExportsNamespace {
    /** MenuFunctions module */
    readonly MenuFunctions: typeof MenuFunctions;
    /** Commands module */
    readonly Commands: typeof Commands;
    /** ScheduleAdapter class */
    readonly ScheduleAdapter: typeof ScheduleAdapter;
    /** Row class */
    readonly Row: typeof Row;
    /** RouteColumnEditor module */
    readonly RouteColumnEditor: typeof RouteColumnEditor;
    /** ActionSelector module */
    readonly ActionSelector: typeof ActionSelector;
    /** HyperlinkUtils module */
    readonly HyperlinkUtils: typeof HyperlinkUtils;
    /** UIManager module */
    readonly UIManager: typeof UIManager;
    /** RideManager module */
    readonly RideManager: typeof RideManager;
    /** UserLogger module */
    readonly UserLogger: typeof UserLogger;
    /** Event class */
    readonly Event: typeof Event;
    /** EventFactory module */
    readonly EventFactory: typeof EventFactory;
    /** RetryQueue class */
    readonly RetryQueue: typeof RetryQueue;
    /** RetryQueueCore class */
    readonly RetryQueueCore: typeof RetryQueueCore;
    /** GoogleCalendarManager class */
    readonly GoogleCalendarManager: typeof GoogleCalendarManager;
    /** Groups module */
    readonly Groups: typeof Groups;
    /** Globals module */
    readonly Globals: typeof Globals;
    /** CacheManager module */
    readonly CacheManager: typeof CacheManager;
}

declare const Exports: ExportsNamespace;

export default Exports;
