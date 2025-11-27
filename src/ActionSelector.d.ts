/**
 * ActionSelector - Determine next action based on row state (DTRT - Do The Right Thing)
 * 
 * Type definitions for action selection logic.
 * Pure JavaScript with no GAS dependencies.
 */

/**
 * Action types that can be taken on a row
 */
export type Action = 'schedule' | 'update' | 'none';

/**
 * State of a schedule row for action determination
 */
export interface RowState {
    /** Whether the ride has been scheduled (has RideURL) */
    isScheduled: boolean;
    /** Whether the ride is planned (has StartDate, Group, and RouteURL) */
    isPlanned: boolean;
}

/**
 * Result of action determination
 */
export interface ActionResult {
    /** The action to take */
    action: Action;
    /** Optional message to display to user */
    message: string | null;
}

/**
 * Determine what action should be taken for a row
 * 
 * Logic:
 * - If DTRT disabled: 'none'
 * - If scheduled: 'update' (modify existing ride)
 * - If planned but not scheduled: 'schedule' (create new ride)
 * - Otherwise: 'none'
 * 
 * @param rowState - State of the row (isScheduled, isPlanned)
 * @param dtrtEnabled - Whether DTRT (Do The Right Thing) mode is enabled
 * @returns Action to take and optional message
 * 
 * @example
 * ```javascript
 * const rowState = {
 *   isScheduled: false,
 *   isPlanned: true  // has date, group, route
 * };
 * const result = determineNextAction(rowState, true);
 * console.log(result.action);  // "schedule"
 * console.log(result.message); // "Ride scheduled."
 * ```
 */
declare function determineNextAction(rowState: RowState, dtrtEnabled: boolean): ActionResult;

/**
 * ActionSelector namespace
 */
interface ActionSelectorNamespace {
    determineNextAction: typeof determineNextAction;
}

declare const ActionSelector: ActionSelectorNamespace;

export default ActionSelector;
export { determineNextAction };
