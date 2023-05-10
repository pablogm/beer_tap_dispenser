const express = require('express');
const router = express.Router();
const { DispenserManager, DispenserState } = require('../managers/dispenserManager');
const messages = require('../constants/messages');

// Initialize DispenserManager instance
const dispenserManager = new DispenserManager();

// Base endpoint to check if the API is working
router.get('/', (req, res) => {
    res.json({ message: messages.API_WORKING });
});

// Endpoint to create a new dispenser
// Requires 'flow_volume' in the request body
// Returns the created dispenser's id and flow_volume
router.post('/dispenser', (req, res) => {
    try {
        const { flow_volume } = req.body;

        if (!flow_volume) {
            return res.status(400).json({ error: messages.FLOW_VOLUME_REQUIRED });
        }

        if (typeof flow_volume !== 'number') {
            return res.status(400).json({ error: messages.FLOW_VOLUME_MUST_BE_NUMBER });
        }

        if (flow_volume <= 0) {
            return res.status(400).json({ error: messages.FLOW_VOLUME_POSITIVE });
        }

        const dispenser = dispenserManager.createDispenser(flow_volume);
        res.status(200).json({ id: dispenser.id, flow_volume: dispenser.flow_volume });
    } catch (error) {
        if (error.message === messages.INVALID_FLOW) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: messages.INTERNAL_SERVER_ERROR });
        }
    }
});

// Endpoint to update the status of a dispenser
// Requires 'id' as a URL parameter and 'status' and 'updated_at' in the request body
// Returns the dispenser's updated status and 'updated_at' timestamp
router.put('/dispenser/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { status, updated_at } = req.body;

        if (!status || !updated_at) {
            return res.status(400).json({ error: messages.STATUS_UPDATED_AT_FIELDS_REQUIRED });
        }

        const result = dispenserManager.changeDispenserStatus(id, status, new Date(updated_at));

        if (!result.success) {
            return res.status(409).json({ message: messages.DISPENSER_ALREADY_IN_DESIRED_STATE });
        }

        return res.status(202).send();
    } catch (error) {
        if (error.message === messages.INVALID_DISPENSER_STATUS) {
            res.status(400).json({ error: error.message });
        } else if (error.message === messages.INVALID_DATE_FORMAT) {
            res.status(400).json({ error: error.message });
        } else if (error.message === messages.DISPENSER_NOT_FOUND) {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: messages.INTERNAL_SERVER_ERROR });
        }
    }
});

// Endpoint to get the spending history of a dispenser
// Requires 'id' as a URL parameter
// Returns the total amount spent and an array of statusChange objects
router.get('/dispenser/:id/spending', (req, res) => {
    try {
        const { id } = req.params;
        const spending = dispenserManager.getSpending(id);
        res.status(200).json(spending);
    } catch (error) {
        if (error.message === messages.DISPENSER_NOT_FOUND) {
            res.status(404).json({ error: error.message });
        } else if (error.message === messages.INVALID_DISPENSER_STATUS) {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ error: messages.INTERNAL_SERVER_ERROR });
        }
    }
});

module.exports = router;
