const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const messages = require('../constants/messages');
const { calculateTotalSpent } = require('../utils/utils');

// Define possible states for a dispenser
const DispenserState = {
    OPEN: 'open',
    CLOSE: 'close',
};

// DispenserManager class to manage dispenser objects
class DispenserManager {
    // Constructor initializes three containers:
    // - dispensers: an array to hold all dispenser objects
    // - statusChanges: a map where the key is the dispenser id and the value is an array of statusChange objects
    // - totalSpentPerDispenser: a map where the key is the dispenser id and the value is the total amount spent
    constructor() {
        this.dispensers = [];
        this.statusChanges = new Map();
        this.totalSpentPerDispenser = new Map();
    }

    /**
     * Creates a new dispenser with the given flow volume.
     *
     * @param {Number} flow_volume - The flow volume of the dispenser. This should be a positive number.
     * @returns {Object} The created dispenser. The dispenser has an id, flow volume, state, and updated_at properties.
     * - id: A unique identifier for the dispenser.
     * - flow_volume: The flow volume of the dispenser.
     * - state: The state of the dispenser. Initial state is 'close'.
     * - updated_at: The date and time when the dispenser was last updated. Initially, this is the creation time.
     *
     * @throws {Error} If the flow volume is not a positive number.
     */
    createDispenser(flow_volume) {
        if (typeof flow_volume !== 'number' || flow_volume <= 0) {
            throw new Error(messages.INVALID_FLOW);
        }

        const dispenser = {
            id: uuidv4(), // Generate a unique ID for each dispenser
            flow_volume,
            state: DispenserState.CLOSE, // Initial state is 'close'
            updated_at: new Date(),
        };

        this.dispensers.push(dispenser);
        return dispenser;
    }

    /**
     * Changes the status of a specific dispenser.
     *
     * @param {string} id - The UUID of the dispenser to change the status of.
     * @param {string} state - The new state of the dispenser. This should be either 'open' or 'close'.
     * @param {Date} updatedAt - The timestamp when the dispenser's state was changed.
     *
     * @returns {Object} The result of the operation. The result contains a 'success' field which is true if the operation 
     *                   was successful and false otherwise. If the operation was successful, the 'dispenser' field will contain 
     *                   the updated dispenser. If the operation was not successful, the 'message' field will contain a message 
     *                   explaining why the operation was not successful.
     *
     * @throws {Error} Throws an error if the dispenser with the given id doesn't exist, if the state is not valid, 
     *                 if the date format is not valid, if updatedAt is not greater than dispenser's opened_at when closing, 
     *                 or if updatedAt is not greater than the dispenser's last closed_at when opening.
     */
    changeDispenserStatus(id, state, updatedAt) {
        const dispenser = this.dispensers.find((dispenser) => dispenser.id === id);
        if (!dispenser) {
            throw new Error(messages.DISPENSER_NOT_FOUND);
        }

        // Check if the status is valid
        if (state !== DispenserState.OPEN && state !== DispenserState.CLOSE) {
            throw new Error(messages.INVALID_DISPENSER_STATUS);
        }

        // Check if the timestamp is valid
        if (isNaN(Date.parse(updatedAt))) {
            throw new Error(messages.INVALID_DATE_FORMAT);
        }

        if (dispenser.state === state) {
            return { success: false, message: messages.DISPENSER_ALREADY_IN_DESIRED_STATE };
        }

        dispenser.state = state;
        dispenser.updated_at = updatedAt;

        const statusChanges = this.statusChanges.get(id);

        // Handle status change
        // If the new status is 'open', create a new statusChange object and add it to the statusChanges map
        // If the new status is 'close', update the last statusChange object and calculate the total amount spent
        // Add the total amount spent to totalSpentPerDispenser map
        // Note: The spending is calculated only when the dispenser is closed to improve performance
        if (state === DispenserState.OPEN) {
            const statusChange = {
                opened_at: updatedAt,
                closed_at: null,
                flow_volume: dispenser.flow_volume,
                total_spent: null,
            };

            if (statusChanges) {
                const lastStatusChange = statusChanges[statusChanges.length - 1];

                if (lastStatusChange && new Date(updatedAt) <= new Date(lastStatusChange.closed_at)) {
                    throw new Error(messages.INVALID_DATE_ORDER);
                }

                this.statusChanges.get(id).push(statusChange);
            } else {
                this.statusChanges.set(id, [statusChange]);
            }
        } else if (state === DispenserState.CLOSE) {
            if (statusChanges) {
                const lastStatusChange = statusChanges[statusChanges.length - 1];

                if (lastStatusChange && new Date(updatedAt) <= new Date(lastStatusChange.opened_at)) {
                    throw new Error(messages.INVALID_DATE_ORDER);
                }

                // We calculate the spending once its closed. 
                // It's more efficient than doing the calculation on `getSpending` for each single item.
                lastStatusChange.closed_at = updatedAt;
                lastStatusChange.total_spent = calculateTotalSpent(lastStatusChange.opened_at, updatedAt, lastStatusChange.flow_volume);

                // Update total spent per dispenser
                this.updateTotalSpentPerDispenser(id, lastStatusChange.total_spent);
            }
        }

        return { success: true, dispenser };
    }

    /**
     * Fetches the total earnings on a specific dispenser.
     *
     * @param {string} id - The UUID of the dispenser for which the spending is to be fetched.
     *
     * @returns {Object} An object containing the total earnings by the dispenser and 
     *                   a list of all usage periods for the dispenser. Each usage period contains the 
     *                   opening and closing timestamps, the flow volume, and the total spent during that period.
     *                   If the dispenser is currently open, the total spent for the current period is 
     *                   calculated up to the current time.
     *
     * @throws {Error} Throws an error if the dispenser with the given id doesn't exist.
     */
    getSpending(id) {
        const dispenser = this.dispensers.find((dispenser) => dispenser.id === id);
        if (!dispenser) {
            throw new Error(messages.DISPENSER_NOT_FOUND);
        }

        if (!this.statusChanges.get(id)) {
            return {
                amount: 0,
                usages: []
            };
        }

        const spending = this.statusChanges.get(id);

        const lastStatusChange = spending[spending.length - 1];

        if (!lastStatusChange.closed_at) {
            lastStatusChange.total_spent = calculateTotalSpent(lastStatusChange.opened_at, new Date(), lastStatusChange.flow_volume);

            // Update total spent per dispenser
            this.updateTotalSpentPerDispenser(id, lastStatusChange.total_spent);
        }

        return {
            amount: this.totalSpentPerDispenser.get(id) || 0,
            usages: spending
        };
    }

    updateTotalSpentPerDispenser(id, spentAmount) {
        const total = this.totalSpentPerDispenser.get(id) || 0;
        this.totalSpentPerDispenser.set(id, total + spentAmount);
    }
}

module.exports = { DispenserManager, DispenserState };
