// @ts-check

/**
 * ActionSelector - Determine next action based on row state (DTRT - Do The Right Thing)
 * 
 * Pure JavaScript logic for determining what action to take when a row is edited.
 * No GAS dependencies - just state evaluation.
 */

/**
 * Action types that can be taken
 * @typedef {'schedule' | 'update' | 'none'} Action
 */

/**
 * Determine what action should be taken for a row
 * @param {Object} rowState - State of the row
 * @param {boolean} rowState.isScheduled - Whether ride is scheduled
 * @param {boolean} rowState.isPlanned - Whether ride is planned (has date, group, route)
 * @param {boolean} dtrtEnabled - Whether DTRT mode is enabled
 * @returns {{action: Action, message: string|null}} Action to take and optional message
 */
function determineNextAction(rowState, dtrtEnabled) {
    if (!dtrtEnabled) {
        return { action: 'none', message: null };
    }

    if (rowState.isScheduled) {
        return { 
            action: 'update', 
            message: 'Ride updated.' 
        };
    }

    if (rowState.isPlanned) {
        return { 
            action: 'schedule', 
            message: 'Ride scheduled.' 
        };
    }

    return { action: 'none', message: null };
}

// Export for GAS (global)
var ActionSelector = {
    determineNextAction: determineNextAction
};

// Export for testing
if (typeof module !== 'undefined') {
    module.exports = ActionSelector;
}
