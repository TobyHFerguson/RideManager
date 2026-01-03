/// <reference path="./gas-globals.d.ts" />

import type { RWGPS } from './Externals';

/**
 * Orchestration layer for ride operations
 */
declare namespace RideCoordinator {
    /**
     * Schedule rides operation
     */
    function scheduleRides(
        rows: InstanceType<typeof RowCore>[],
        rwgps: RWGPS,
        adapter: InstanceType<typeof ScheduleAdapter>,
        force?: boolean
    ): void;

    /**
     * Cancel rides operation
     */
    function cancelRides(
        rows: InstanceType<typeof RowCore>[],
        rwgps: RWGPS,
        adapter: InstanceType<typeof ScheduleAdapter>,
        force?: boolean
    ): void;

    /**
     * Update rides operation
     */
    function updateRides(
        rows: InstanceType<typeof RowCore>[],
        rwgps: RWGPS,
        adapter: InstanceType<typeof ScheduleAdapter>,
        force?: boolean
    ): void;

    /**
     * Reinstate rides operation
     */
    function reinstateRides(
        rows: InstanceType<typeof RowCore>[],
        rwgps: RWGPS,
        adapter: InstanceType<typeof ScheduleAdapter>,
        force?: boolean
    ): void;

    /**
     * Unschedule rides operation
     */
    function unscheduleRides(
        rows: InstanceType<typeof RowCore>[],
        rwgps: RWGPS,
        adapter: InstanceType<typeof ScheduleAdapter>,
        force?: boolean
    ): void;

    /**
     * Import routes operation
     */
    function importRoutes(
        rows: InstanceType<typeof RowCore>[],
        rwgps: RWGPS,
        adapter: InstanceType<typeof ScheduleAdapter>,
        force?: boolean
    ): void;
}

export default RideCoordinator;
