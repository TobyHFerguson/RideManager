/// <reference path="./gas-globals.d.ts" />

import type { RWGPS } from './Externals';

/**
 * Orchestration layer for ride operations
 */
declare class RideCoordinator {
    /**
     * Schedule rides operation
     */
    static scheduleRides(
        rows: InstanceType<typeof RowCore>[],
        rwgps: RWGPS,
        adapter: InstanceType<typeof ScheduleAdapter>,
        force?: boolean
    ): void;

    /**
     * Cancel rides operation
     */
    static cancelRides(
        rows: InstanceType<typeof RowCore>[],
        rwgps: RWGPS,
        adapter: InstanceType<typeof ScheduleAdapter>,
        force?: boolean
    ): void;

    /**
     * Update rides operation
     */
    static updateRides(
        rows: InstanceType<typeof RowCore>[],
        rwgps: RWGPS,
        adapter: InstanceType<typeof ScheduleAdapter>,
        force?: boolean
    ): void;

    /**
     * Reinstate rides operation
     */
    static reinstateRides(
        rows: InstanceType<typeof RowCore>[],
        rwgps: RWGPS,
        adapter: InstanceType<typeof ScheduleAdapter>,
        force?: boolean
    ): void;

    /**
     * Unschedule rides operation
     */
    static unscheduleRides(
        rows: InstanceType<typeof RowCore>[],
        rwgps: RWGPS,
        adapter: InstanceType<typeof ScheduleAdapter>,
        force?: boolean
    ): void;

    /**
     * Import routes operation
     */
    static importRoutes(
        rows: InstanceType<typeof RowCore>[],
        rwgps: RWGPS,
        adapter: InstanceType<typeof ScheduleAdapter>,
        force?: boolean
    ): void;
}

export default RideCoordinator;
