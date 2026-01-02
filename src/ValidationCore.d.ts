/// <reference path="./gas-globals.d.ts" />

/**
 * Validation result
 */
export interface ValidationResult {
    errors: string[];
    warnings: string[];
}

/**
 * Validation options for scheduling
 */
export interface ValidationOptionsBase {
    groupNames: string[];
    managedEventName: (rideName: string, groupNames: string[]) => boolean;
}

/**
 * Validation options for operations requiring route access
 */
export interface ValidationOptionsWithRoute extends ValidationOptionsBase {
    getRoute: (routeURL: string) => { user_id: number };
    clubUserId: number;
    convertDate: (date: any) => Date;
}

/**
 * Validation options for route import
 */
export interface ValidationOptionsImport {
    fetchUrl: (url: string, muteHttpExceptions: boolean) => {
        getResponseCode: () => number;
        getContentText: () => string;
    };
    clubUserId: number;
}

/**
 * Group specifications
 */
export interface GroupSpecs {
    [groupName: string]: {
        MIN_ELEVATION_GAIN?: number;
        MAX_ELEVATION_GAIN?: number;
        MIN_LENGTH?: number;
        MAX_LENGTH?: number;
    };
}

/**
 * Pure validation logic module (no GAS dependencies)
 */
declare namespace ValidationCore {
    /**
     * Validate rows for scheduling operation
     */
    function validateForScheduling(
        rows: InstanceType<typeof RowCore>[],
        options: ValidationOptionsWithRoute
    ): Map<InstanceType<typeof RowCore>, ValidationResult>;

    /**
     * Validate rows for cancellation operation
     */
    function validateForCancellation(
        rows: InstanceType<typeof RowCore>[],
        options: ValidationOptionsBase
    ): Map<InstanceType<typeof RowCore>, ValidationResult>;

    /**
     * Validate rows for update operation
     */
    function validateForUpdate(
        rows: InstanceType<typeof RowCore>[],
        options: ValidationOptionsWithRoute
    ): Map<InstanceType<typeof RowCore>, ValidationResult>;

    /**
     * Validate rows for reinstatement operation
     */
    function validateForReinstatement(
        rows: InstanceType<typeof RowCore>[],
        options: ValidationOptionsBase
    ): Map<InstanceType<typeof RowCore>, ValidationResult>;

    /**
     * Validate rows for unscheduling operation
     */
    function validateForUnschedule(
        rows: InstanceType<typeof RowCore>[],
        options: ValidationOptionsBase
    ): Map<InstanceType<typeof RowCore>, ValidationResult>;

    /**
     * Validate rows for route import operation
     */
    function validateForRouteImport(
        rows: InstanceType<typeof RowCore>[],
        options: ValidationOptionsImport
    ): Map<InstanceType<typeof RowCore>, ValidationResult>;

    /**
     * Check if ride is scheduled
     */
    function isScheduled(row: InstanceType<typeof RowCore>): boolean;

    /**
     * Check if ride is cancelled
     */
    function isCancelled(row: InstanceType<typeof RowCore>): boolean;

    /**
     * Check if ride is unmanaged
     */
    function isUnmanagedRide(
        row: InstanceType<typeof RowCore>,
        managedEventName: (rideName: string, groupNames: string[]) => boolean,
        groupNames: string[]
    ): string | undefined;

    /**
     * Validate start date
     */
    function validateStartDate(
        row: InstanceType<typeof RowCore>,
        convertDate: (date: any) => Date
    ): string | undefined;

    /**
     * Validate start time
     */
    function validateStartTime(
        row: InstanceType<typeof RowCore>,
        convertDate: (time: any) => Date
    ): string | undefined;

    /**
     * Validate group
     */
    function validateGroup(
        row: InstanceType<typeof RowCore>,
        groupNames: string[]
    ): string | undefined;

    /**
     * Check if route is bad (cannot be fetched)
     */
    function isBadRoute(
        row: InstanceType<typeof RowCore>,
        getRoute: (routeURL: string) => { user_id: number }
    ): string | undefined;

    /**
     * Check if route is foreign (not owned by club)
     */
    function isForeignRoute(
        row: InstanceType<typeof RowCore>,
        getRoute: (routeURL: string) => { user_id: number },
        clubUserId: number
    ): string | undefined;

    /**
     * Check if route is inaccessible or owned by club (for import operation)
     */
    function isRouteInaccessibleOrOwnedByClub(
        row: InstanceType<typeof RowCore>,
        fetchUrl: (url: string, muteHttpExceptions: boolean) => {
            getResponseCode: () => number;
            getContentText: () => string;
        },
        clubUserId: number
    ): string | undefined;

    /**
     * Validate ride leader
     */
    function validateRideLeader(row: InstanceType<typeof RowCore>): string | undefined;

    /**
     * Validate location
     */
    function validateLocation(row: InstanceType<typeof RowCore>): string | undefined;

    /**
     * Validate address
     */
    function validateAddress(row: InstanceType<typeof RowCore>): string | undefined;

    /**
     * Check if route metrics are inappropriate for group
     */
    function inappropriateGroup(
        groupName: string,
        elevationFeet: number,
        distanceMiles: number,
        groupSpecs: GroupSpecs
    ): string | undefined;
}

export default ValidationCore;
