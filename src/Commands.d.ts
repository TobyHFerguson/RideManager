/**
 * Commands - Frozen command objects for menu operations
 * 
 * Type definitions for all command functions.
 * Each command validates rows and delegates to RideManager for execution.
 */

import Row from './Row';

/**
 * RWGPS API wrapper instance
 */
interface RWGPS {
    // Add RWGPS methods as needed
}

/**
 * Command functions for ride management operations
 * 
 * All commands follow the pattern:
 * 1. Validate rows using rowCheck functions
 * 2. Show user confirmation dialog if warnings exist
 * 3. Delegate to RideManager for actual operation
 * 4. Handle results and notifications
 */
interface Commands {
    /**
     * Cancel selected rides on RWGPS
     * 
     * Error checks: cancelled, unscheduled
     * 
     * @param rows - Array of Row instances to cancel
     * @param rwgps - RWGPS API instance
     * @param force - Skip confirmation dialog if true
     */
    cancelSelectedRidesWithCreds(rows: Row[], rwgps: RWGPS, force?: boolean): void;

    /**
     * Import selected routes from RWGPS to club ownership
     * 
     * Error checks: routeInaccessibleOrOwnedByClub
     * 
     * @param rows - Array of Row instances with routes to import
     * @param rwgps - RWGPS API instance
     * @param force - Skip confirmation dialog if true
     */
    importSelectedRoutesWithCredentials(rows: Row[], rwgps: RWGPS, force?: boolean): void;

    /**
     * Link selected route URLs (validate and format)
     * 
     * Error checks: badRoute
     * 
     * @param rows - Array of Row instances with routes to link
     * @param rwgps - RWGPS API instance
     * @param force - Skip confirmation dialog if true
     */
    linkSelectedRouteUrlsWithCredentials(rows: Row[], rwgps: RWGPS, force?: boolean): void;

    /**
     * Reinstate cancelled rides on RWGPS
     * 
     * Error checks: notCancelled
     * 
     * @param rows - Array of Row instances to reinstate
     * @param rwgps - RWGPS API instance
     * @param force - Skip confirmation dialog if true
     */
    reinstateSelectedRidesWithCreds(rows: Row[], rwgps: RWGPS, force?: boolean): void;

    /**
     * Schedule selected rides on RWGPS and Google Calendar
     * 
     * Error checks: unmanagedRide, scheduled, noStartDate, noStartTime, noGroup, badRoute, foreignRoute
     * Warning checks: noRideLeader, noLocation, noAddress, inappropiateGroup
     * 
     * @param rows - Array of Row instances to schedule
     * @param rwgps - RWGPS API instance
     * @param force - Skip confirmation dialog if true
     */
    scheduleSelectedRidesWithCredentials(rows: Row[], rwgps: RWGPS, force?: boolean): void;

    /**
     * Unschedule selected rides from RWGPS and Google Calendar
     * 
     * Error checks: unscheduled, unmanagedRide
     * 
     * @param rows - Array of Row instances to unschedule
     * @param rwgps - RWGPS API instance
     * @param force - Skip confirmation dialog if true
     */
    unscheduleSelectedRidesWithCreds(rows: Row[], rwgps: RWGPS, force?: boolean): void;

    /**
     * Update rider counts from RWGPS for recent rides
     * 
     * Automatically loads rows younger than 1 day ago.
     * Does not use the provided rows parameter.
     * 
     * @param rows - Ignored (rows are loaded internally)
     * @param rwgps - RWGPS API instance
     * @param force - Skip confirmation dialog if true
     */
    updateRiderCountWithCreds(rows: Row[], rwgps: RWGPS, force?: boolean): void;

    /**
     * Update selected rides on RWGPS and Google Calendar
     * 
     * Error checks: cancelled, unscheduled, unmanagedRide, noStartDate, noStartTime, noGroup, badRoute, foreignRoute
     * Warning checks: noRideLeader, noLocation, noAddress, inappropiateGroup
     * 
     * @param rows - Array of Row instances to update
     * @param rwgps - RWGPS API instance
     * @param force - Skip confirmation dialog if true
     */
    updateSelectedRidesWithCredentials(rows: Row[], rwgps: RWGPS, force?: boolean): void;
}

/**
 * Frozen command object with all command functions
 */
declare const Commands: Readonly<Commands>;

export default Commands;
