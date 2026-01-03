/**
 * triggers - GAS event handlers and menu functions
 * 
 * Type definitions for spreadsheet triggers and menu operations.
 * Primary entry points for user interactions with the add-on.
 */

/**
 * Called when spreadsheet is opened
 * Creates menu, stores formulas, initializes globals
 */
declare function onOpen(): void;

/**
 * Create the "Ride Schedulers" menu
 * @private
 */
declare function createMenu_(): void;

/**
 * Show alert dialog
 * @private
 * @param message - Message to display
 */
declare function alert_(message: string): void;

/**
 * Schedule selected rides (menu function)
 * @private
 */
declare function scheduleSelectedRides_(): void;

/**
 * Update selected rides (menu function)
 * @private
 */
declare function updateSelectedRides_(): void;

/**
 * Cancel selected rides (menu function)
 * @private
 */
declare function cancelSelectedRides_(): void;

/**
 * Reinstate selected rides (menu function)
 * @private
 */
declare function reinstateSelectedRides_(): void;

/**
 * Unschedule selected rides (menu function)
 * @private
 */
declare function unscheduleSelectedRides_(): void;

/**
 * Import selected routes (menu function)
 * @private
 */
declare function importSelectedRoutes_(): void;

/**
 * Link selected route URLs (menu function)
 * @private
 */
declare function linkSelectedRouteUrls_(): void;

/**
 * Show app version (menu function)
 * @private
 */
declare function showAppVersion_(): void;

/**
 * Initialize global configuration
 * @private
 */
declare function initializeGlobals(): void;

/**
 * Initialize group cache
 * @private
 */
declare function initializeGroupCache(): void;

export {
    onOpen,
    initializeGlobals,
    initializeGroupCache
};
