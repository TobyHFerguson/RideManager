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
declare class ValidationCore {
    /**
     * Validate rows for scheduling operation
     */
    static validateForScheduling(
        rows: InstanceType<typeof RowCore>[],
        options: ValidationOptionsWithRoute
    ): Map<InstanceType<typeof RowCore>, ValidationResult>;

    /**
     * Validate rows for cancellation operation
     */
    static validateForCancellation(
        rows: InstanceType<typeof RowCore>[],
        options: ValidationOptionsBase
    ): Map<InstanceType<typeof RowCore>, ValidationResult>;

    /**
     * Validate rows for update operation
     */
    static validateForUpdate(
        rows: InstanceType<typeof RowCore>[],
        options: ValidationOptionsWithRoute
    ): Map<InstanceType<typeof RowCore>, ValidationResult>;

    /**
     * Validate rows for reinstatement operation
     */
    static validateForReinstatement(
        rows: InstanceType<typeof RowCore>[],
        options: ValidationOptionsBase
    ): Map<InstanceType<typeof RowCore>, ValidationResult>;

    /**
     * Validate rows for unscheduling operation
     */
    static validateForUnschedule(
        rows: InstanceType<typeof RowCore>[],
        options: ValidationOptionsBase
    ): Map<InstanceType<typeof RowCore>, ValidationResult>;

    /**
     * Validate rows for route import operation
     */
    static validateForRouteImport(
        rows: InstanceType<typeof RowCore>[],
        options: ValidationOptionsImport
    ): Map<InstanceType<typeof RowCore>, ValidationResult>;

    /**
     * Check if ride is scheduled
     */
    static isScheduled(row: InstanceType<typeof RowCore>): boolean;

    /**
     * Check if ride is cancelled
     */
    static isCancelled(row: InstanceType<typeof RowCore>): boolean;

    /**
     * Check if ride is unmanaged
     */
    static isUnmanagedRide(
        row: InstanceType<typeof RowCore>,
        managedEventName: (rideName: string, groupNames: string[]) => boolean,
        groupNames: string[]
    ): string | undefined;

    /**
     * Validate start date
     */
    static validateStartDate(
        row: InstanceType<typeof RowCore>,
        convertDate: (date: any) => Date
    ): string | undefined;

    /**
     * Validate start time
     */
    static validateStartTime(
        row: InstanceType<typeof RowCore>,
        convertDate: (time: any) => Date
    ): string | undefined;

    /**
     * Validate group
     */
    static validateGroup(
        row: InstanceType<typeof RowCore>,
        groupNames: string[]
    ): string | undefined;

    /**
     * Check if route is bad (cannot be fetched)
     */
    static isBadRoute(
        row: InstanceType<typeof RowCore>,
        getRoute: (routeURL: string) => { user_id: number }
    ): string | undefined;

    /**
     * Check if route is foreign (not owned by club)
     */
    static isForeignRoute(
        row: InstanceType<typeof RowCore>,
        getRoute: (routeURL: string) => { user_id: number },
        clubUserId: number
    ): string | undefined;

    /**
     * Check if route is inaccessible or owned by club (for import operation)
     */
    static isRouteInaccessibleOrOwnedByClub(
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
    static validateRideLeader(row: InstanceType<typeof RowCore>): string | undefined;

    /**
     * Validate location
     */
    static validateLocation(row: InstanceType<typeof RowCore>): string | undefined;

    /**
     * Validate address
     */
    static validateAddress(row: InstanceType<typeof RowCore>): string | undefined;

    /**
     * Check if route metrics are inappropriate for group
     */
    static inappropriateGroup(
        groupName: string,
        elevationFeet: number,
        distanceMiles: number,
        groupSpecs: GroupSpecs
    ): string | undefined;
}

export default ValidationCore;
