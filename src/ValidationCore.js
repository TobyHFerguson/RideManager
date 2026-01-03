// @ts-check
/// <reference path="./gas-globals.d.ts" />

if (typeof require !== 'undefined') {
    var dates = require('./common/dates');
}

/**
 * @typedef {InstanceType<typeof RowCore>} RowCoreInstance
 * @typedef {import('./Externals').RWGPS} RWGPS
 */

/**
 * @typedef {Object} ValidationResult
 * @property {string[]} errors - Blocking errors
 * @property {string[]} warnings - Non-blocking warnings
 */

/**
 * Pure validation logic (no GAS dependencies)
 * All methods return validation results without side effects
 */
class ValidationCore {
    /**
     * Validate rows for scheduling operation
     * @param {RowCoreInstance[]} rows - Rows to validate
     * @param {Object} options - Validation options
     * @param {string[]} options.groupNames - Available group names
     * @param {(routeURL: string) => {user_id: number}} options.getRoute - Function to fetch route
     * @param {number} options.clubUserId - SCCCC user ID
     * @param {(rideName: string, groupNames: string[]) => boolean} options.managedEventName - Check if event name is managed
     * @param {(startDate: any) => Date} options.convertDate - Date conversion function
     * @returns {Map<RowCoreInstance, ValidationResult>}
     */
    static validateForScheduling(rows, options) {
            const validationMap = new Map();
            
            rows.forEach(row => {
                const errors = [];
                const warnings = [];
                
                // Error checks
                const unmanagedError = ValidationCore.isUnmanagedRide(row, options.managedEventName, options.groupNames);
                if (unmanagedError) errors.push(unmanagedError);
                
                if (ValidationCore.isScheduled(row)) {
                    errors.push('This ride has already been scheduled');
                }
                
                const dateError = ValidationCore.validateStartDate(row, options.convertDate);
                if (dateError) errors.push(dateError);
                
                const timeError = ValidationCore.validateStartTime(row, options.convertDate);
                if (timeError) errors.push(timeError);
                
                const groupError = ValidationCore.validateGroup(row, options.groupNames);
                if (groupError) errors.push(groupError);
                
                const badRouteError = ValidationCore.isBadRoute(row, options.getRoute);
                if (badRouteError) errors.push(badRouteError);
                
                const foreignRouteError = ValidationCore.isForeignRoute(row, options.getRoute, options.clubUserId);
                if (foreignRouteError) errors.push(foreignRouteError);
                
                // Warning checks (only if no errors - don't clutter output)
                if (errors.length === 0) {
                    const leaderWarning = ValidationCore.validateRideLeader(row);
                    if (leaderWarning) warnings.push(leaderWarning);
                    
                    const locationWarning = ValidationCore.validateLocation(row);
                    if (locationWarning) warnings.push(locationWarning);
                    
                    const addressWarning = ValidationCore.validateAddress(row);
                    if (addressWarning) warnings.push(addressWarning);
                }
                
                validationMap.set(row, { errors, warnings });
            });
            
            return validationMap;
    }

    /**
     * Validate rows for cancellation operation
     * @param {RowCoreInstance[]} rows - Rows to validate
     * @param {Object} options - Validation options
     * @param {string[]} options.groupNames - Available group names
     * @param {(rideName: string, groupNames: string[]) => boolean} options.managedEventName - Check if event name is managed
     * @returns {Map<RowCoreInstance, ValidationResult>}
     */
    static validateForCancellation(rows, options) {
            const validationMap = new Map();
            
            rows.forEach(row => {
                const errors = [];
                const warnings = [];
                
                if (ValidationCore.isCancelled(row)) {
                    errors.push('Operation not permitted on cancelled ride');
                }
                
                if (!ValidationCore.isScheduled(row)) {
                    errors.push('Ride has not been scheduled');
                }
                
                const unmanagedError = ValidationCore.isUnmanagedRide(row, options.managedEventName, options.groupNames);
                if (unmanagedError) errors.push(unmanagedError);
                
                validationMap.set(row, { errors, warnings });
            });
            
            return validationMap;
    }

    /**
     * Validate rows for update operation
     * @param {RowCoreInstance[]} rows - Rows to validate
     * @param {Object} options - Validation options
     * @param {string[]} options.groupNames - Available group names
     * @param {(routeURL: string) => {user_id: number}} options.getRoute - Function to fetch route
     * @param {number} options.clubUserId - SCCCC user ID
     * @param {(rideName: string, groupNames: string[]) => boolean} options.managedEventName - Check if event name is managed
     * @param {(startDate: any) => Date} options.convertDate - Date conversion function
     * @returns {Map<RowCoreInstance, ValidationResult>}
     */
    static validateForUpdate(rows, options) {
            const validationMap = new Map();
            
            rows.forEach(row => {
                const errors = [];
                const warnings = [];
                
                // Error checks
                if (!ValidationCore.isScheduled(row)) {
                    errors.push('Ride has not been scheduled');
                }
                
                const unmanagedError = ValidationCore.isUnmanagedRide(row, options.managedEventName, options.groupNames);
                if (unmanagedError) errors.push(unmanagedError);
                
                const dateError = ValidationCore.validateStartDate(row, options.convertDate);
                if (dateError) errors.push(dateError);
                
                const timeError = ValidationCore.validateStartTime(row, options.convertDate);
                if (timeError) errors.push(timeError);
                
                const groupError = ValidationCore.validateGroup(row, options.groupNames);
                if (groupError) errors.push(groupError);
                
                const badRouteError = ValidationCore.isBadRoute(row, options.getRoute);
                if (badRouteError) errors.push(badRouteError);
                
                const foreignRouteError = ValidationCore.isForeignRoute(row, options.getRoute, options.clubUserId);
                if (foreignRouteError) errors.push(foreignRouteError);
                
                // Warning checks (only if no errors)
                if (errors.length === 0) {
                    const leaderWarning = ValidationCore.validateRideLeader(row);
                    if (leaderWarning) warnings.push(leaderWarning);
                    
                    const locationWarning = ValidationCore.validateLocation(row);
                    if (locationWarning) warnings.push(locationWarning);
                    
                    const addressWarning = ValidationCore.validateAddress(row);
                    if (addressWarning) warnings.push(addressWarning);
                }
                
                validationMap.set(row, { errors, warnings });
            });
            
            return validationMap;
    }

    /**
     * Validate rows for reinstatement operation
     * @param {RowCoreInstance[]} rows - Rows to validate
     * @param {Object} options - Validation options
     * @param {string[]} options.groupNames - Available group names
     * @param {(rideName: string, groupNames: string[]) => boolean} options.managedEventName - Check if event name is managed
     * @returns {Map<RowCoreInstance, ValidationResult>}
     */
    static validateForReinstatement(rows, options) {
            const validationMap = new Map();
            
            rows.forEach(row => {
                const errors = [];
                const warnings = [];
                
                if (!ValidationCore.isCancelled(row)) {
                    errors.push('Operation not permitted when ride is not cancelled');
                }
                
                const unmanagedError = ValidationCore.isUnmanagedRide(row, options.managedEventName, options.groupNames);
                if (unmanagedError) errors.push(unmanagedError);
                
                validationMap.set(row, { errors, warnings });
            });
            
            return validationMap;
    }

    /**
     * Validate rows for unscheduling operation
     * @param {RowCoreInstance[]} rows - Rows to validate
     * @param {Object} options - Validation options
     * @param {string[]} options.groupNames - Available group names
     * @param {(rideName: string, groupNames: string[]) => boolean} options.managedEventName - Check if event name is managed
     * @returns {Map<RowCoreInstance, ValidationResult>}
     */
    static validateForUnschedule(rows, options) {
            const validationMap = new Map();
            
            rows.forEach(row => {
                const errors = [];
                const warnings = [];
                
                if (!ValidationCore.isScheduled(row)) {
                    errors.push('Ride has not been scheduled');
                }
                
                const unmanagedError = ValidationCore.isUnmanagedRide(row, options.managedEventName, options.groupNames);
                if (unmanagedError) errors.push(unmanagedError);
                
                validationMap.set(row, { errors, warnings });
            });
            
            return validationMap;
    }

        /**
         * Validate rows for route import operation
         * @param {RowCoreInstance[]} rows - Rows to validate
         * @param {Object} options - Validation options
         * @param {(routeURL: string, muteHttpExceptions: boolean) => {getResponseCode: () => number, getContentText: () => string}} options.fetchUrl - Function to fetch URL
         * @param {number} options.clubUserId - SCCCC user ID
         * @returns {Map<RowCoreInstance, ValidationResult>}
         */
    static validateForRouteImport(rows, options) {
            const validationMap = new Map();
            
            rows.forEach(row => {
                const errors = [];
                const warnings = [];
                
                const routeError = ValidationCore.isRouteInaccessibleOrOwnedByClub(row, options.fetchUrl, options.clubUserId);
                if (routeError) errors.push(routeError);
                
                validationMap.set(row, { errors, warnings });
            });
            
            return validationMap;
    }

        // ========== Pure Validation Helpers ==========

    /**
     * Check if row is scheduled
     * @param {RowCoreInstance} row
     * @returns {boolean}
     */
    static isScheduled(row) {
            return !!row.rideURL;
    }

    /**
     * Check if row is cancelled
     * @param {RowCoreInstance} row
     * @returns {boolean}
     */
    static isCancelled(row) {
            return row.rideName.toLowerCase().startsWith('cancelled');
    }

        /**
         * Check if ride is unmanaged
         * @param {RowCoreInstance} row
         * @param {(rideName: string, groupNames: string[]) => boolean} managedEventName
         * @param {string[]} groupNames
         * @returns {string|undefined}
         */
    static isUnmanagedRide(row, managedEventName, groupNames) {
            if (!managedEventName(row.rideName, groupNames)) {
                return "Ride is unmanaged";
            }
            return undefined;
    }

    /**
     * Validate start date
     * @param {RowCoreInstance} row
     * @param {(date: any) => Date} convertDate
     * @returns {string|undefined}
     */
    static validateStartDate(row, convertDate) {
            if (!row.startDate || convertDate(row.startDate).toString() === "Invalid Date") {
                return `Invalid row.startDate: "${row.startDate} ${convertDate(row.startDate)}"`;
            }
            return undefined;
    }

    /**
     * Validate start time
     * @param {RowCoreInstance} row
     * @param {(time: any) => Date} convertDate
     * @returns {string|undefined}
     */
    static validateStartTime(row, convertDate) {
            if (!row.startTime || convertDate(row.startTime).toString() === "Invalid Date") {
                return `Invalid row.startTime: "${row.startTime} ${convertDate(row.startTime)}"`;
            }
            return undefined;
    }

    /**
     * Validate group
     * @param {RowCoreInstance} row
     * @param {string[]} groupNames
     * @returns {string|undefined}
     */
    static validateGroup(row, groupNames) {
            if (!row.group) return "Group column is empty";
            if (!groupNames.includes(row.group)) {
                return `Unknown group: '${row.group}'. Expected one of ${groupNames.join(', ')}`;
            }
            return undefined;
    }

        /**
         * Check if route is bad (cannot be fetched)
         * @param {RowCoreInstance} row
         * @param {(routeURL: string) => {user_id: number}} getRoute
         * @returns {string|undefined}
         */
    static isBadRoute(row, getRoute) {
            try {
                getRoute(row.routeURL);
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                return err.message;
            }
            return undefined;
    }

    /**
     * Check if route is foreign (not owned by club)
     * @param {RowCoreInstance} row
     * @param {(routeURL: string) => {user_id: number}} getRoute
     * @param {number} clubUserId
     * @returns {string|undefined}
     */
    static isForeignRoute(row, getRoute, clubUserId) {
            try {
                const route = getRoute(row.routeURL);
                if (route.user_id !== clubUserId) {
                    return 'Route is not owned by SCCCC';
                }
            } catch (e) {
                const err = e instanceof Error ? e : new Error(String(e));
                return err.message;
            }
            return undefined;
    }

        /**
         * Check if route is inaccessible or owned by club (for import operation)
         * @param {RowCoreInstance} row
         * @param {(url: string, muteHttpExceptions: boolean) => {getResponseCode: () => number, getContentText: () => string}} fetchUrl
         * @param {number} clubUserId
         * @returns {string|undefined}
         */
    static isRouteInaccessibleOrOwnedByClub(row, fetchUrl, clubUserId) {
            const url = row.routeURL ? row.routeURL : row.routeName;
            if (!url) {
                return `No Route URL in row ${row.rowNum}. Are you sure you've selected the right row?`;
            }
            try {
                const response = fetchUrl(url + ".json", true); // Use mute to handle errors gracefully
                
                switch (response.getResponseCode()) {
                    case 200:
                        const route = JSON.parse(response.getContentText());
                        if (route.user_id === clubUserId) {
                            return 'Route is owned by SCCCC';
                        }
                        break;
                    case 403: 
                        return 'Route URL does not have public access';
                    case 404: 
                        return `This route cannot be found on the server`;
                    default: 
                        return "Unknown issue with Route URL";
                }
            } catch (e) {
                console.error("Route URL error: %s", e);
                return "Unknown issue with Route URL - please check it and try again";
            }
            return undefined;
    }

    /**
     * Validate ride leader
     * @param {RowCoreInstance} row
     * @returns {string|undefined}
     */
    static validateRideLeader(row) {
            if (!row.leaders || row.leaders.length === 0) {
                return `No ride leader given`;
            }
            return undefined;
    }

    /**
     * Validate location
     * @param {RowCoreInstance} row
     * @returns {string|undefined}
     */
    static validateLocation(row) {
            if (!row.location || row.location.startsWith('#')) {
                return "Unknown location";
            }
            return undefined;
    }

    /**
     * Validate address
     * @param {RowCoreInstance} row
     * @returns {string|undefined}
     */
    static validateAddress(row) {
            if (!row.address || row.address.startsWith('#')) {
                return "Unknown address";
            }
            return undefined;
    }

        /**
         * Check if route metrics are inappropriate for group
         * @param {string} groupName - Group name
         * @param {number} elevationFeet - Elevation in feet
         * @param {number} distanceMiles - Distance in miles
         * @param {Object.<string, {MIN_ELEVATION_GAIN?: number, MAX_ELEVATION_GAIN?: number, MIN_LENGTH?: number, MAX_LENGTH?: number}>} groupSpecs - Group specifications
         * @returns {string|undefined}
         */
    static inappropriateGroup(groupName, elevationFeet, distanceMiles, groupSpecs) {
            const specs = groupSpecs[groupName];
            if (!specs) return `Unknown group: ${groupName}`;
            
            if (specs.MIN_ELEVATION_GAIN && elevationFeet < specs.MIN_ELEVATION_GAIN) {
                return `Elevation gain (${elevationFeet}') too low for ${groupName} group (must be at least ${specs.MIN_ELEVATION_GAIN}')`;
            }
            if (specs.MAX_ELEVATION_GAIN && elevationFeet > specs.MAX_ELEVATION_GAIN) {
                return `Elevation gain (${elevationFeet}') too great for ${groupName} group (must be no more than ${specs.MAX_ELEVATION_GAIN}')`;
            }
            if (specs.MIN_LENGTH && distanceMiles < specs.MIN_LENGTH) {
                return `Distance (${distanceMiles} miles) too short for ${groupName} group (must be at least ${specs.MIN_LENGTH} miles)`;
            }
            if (specs.MAX_LENGTH && distanceMiles > specs.MAX_LENGTH) {
                return `Distance (${distanceMiles} miles) too long for ${groupName} group (must be no more than ${specs.MAX_LENGTH} miles)`;
            }
            
            return undefined;
    }
}

if (typeof module !== 'undefined') {
    module.exports = ValidationCore;
}
