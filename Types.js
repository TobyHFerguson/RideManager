/**
 * @class Schedule
 */

/**
 * @typedef {Object} Row
 * @property {Schedule} schedule - The parent Schedule instance.
 * @property {GoogleAppsScript.Spreadsheet.Range} range - The range object for the row.
 * @property {number} offset - The offset within the range.
 * @property {Array} values - The values for the row.
 * @property {Array} formulas - The formulas for the row.
 * @property {number} rowNum - The row number in the sheet.
 * @property {function(): Date} StartDate - Gets the start date for the row.
 * @property {function(): Date} StartTime - Gets the start time for the row.
 * @property {function(): Date} EndTime - Gets the end time for the row.
 * @property {function(): string} Group - Gets the group for the row.
 * @property {function(): string} RouteName - Gets the route name for the row.
 * @property {function(): string} RouteURL - Gets the route URL for the row.
 * @property {function(): string[]} RideLeaders - Gets the ride leaders for the row.
 * @property {function(): string} RideName - Gets the ride name for the row.
 * @property {function(): string} RideURL - Gets the ride URL for the row.
 * @property {function(): string} GoogleEventId - Gets the Google Event ID for the row.
 * @property {function(string): void} set GoogleEventId - Sets the Google Event ID for the row.
 * @property {function(): string} Location - Gets the location for the row.
 * @property {function(): string} Address - Gets the address for the row.
 * @property {function(boolean): Row} highlightRideLeader - Highlights the ride leader cell.
 * @property {function(string, string): void} setRideLink - Sets the ride link formula.
 * @property {function(): void} deleteRideLink - Deletes the ride link formula.
 * @property {function(string, string): void} setRouteLink - Sets the route link formula.
 * @property {function(): Row} linkRouteURL - Resolves and links the route name and URL.
 * @property {function(): void} restoreRideLink - Restores the ride link formula.
 */
