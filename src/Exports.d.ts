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
import HyperlinkUtils from './HyperlinkUtils';
import UIManager from './UIManager';
import RideManager from './RideManager';
import UserLogger from './UserLogger';
import SCCCCEvent from './SCCCCEvent';
import EventFactory from './EventFactory';
import RetryQueue from './RetryQueue';
import RetryQueueCore from './RetryQueueCore';
import AnnouncementCore from './AnnouncementCore';
import GoogleCalendarManager from './GoogleCalendarManager';
import Groups from './Groups';
import Globals from './Globals';
import CacheManager from './CacheManager';
import TriggerManager from './TriggerManager';
import TriggerManagerCore from './TriggerManagerCore';
import * as dates from './common/dates';

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
    /** HyperlinkUtils module */
    readonly HyperlinkUtils: typeof HyperlinkUtils;
    /** UIManager module */
    readonly UIManager: typeof UIManager;
    /** RideManager module */
    readonly RideManager: typeof RideManager;
    /** UserLogger module */
    readonly UserLogger: typeof UserLogger;
    /** SCCCCEvent class */
    readonly SCCCCEvent: typeof SCCCCEvent;
    /** EventFactory module */
    readonly EventFactory: typeof EventFactory;
    /** RetryQueue class */
    readonly RetryQueue: typeof RetryQueue;
    /** RetryQueueCore class */
    readonly RetryQueueCore: typeof RetryQueueCore;
    /** AnnouncementCore module */
    readonly AnnouncementCore: typeof AnnouncementCore;
    /** GoogleCalendarManager class */
    readonly GoogleCalendarManager: typeof GoogleCalendarManager;
    /** Groups module */
    readonly Groups: typeof Groups;
    /** Globals module */
    readonly Globals: typeof Globals;
    /** CacheManager module */
    readonly CacheManager: typeof CacheManager;
    /** TriggerManager class */
    readonly TriggerManager: typeof TriggerManager;
    /** TriggerManagerCore class */
    readonly TriggerManagerCore: typeof TriggerManagerCore;
    /** dates utility module */
    readonly dates: typeof dates;
}

declare const Exports: ExportsNamespace;

export default Exports;
