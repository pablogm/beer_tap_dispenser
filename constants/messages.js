const messages = {
    API_WORKING: 'API is working',
    FLOW_VOLUME_REQUIRED: 'Flow volume is required',
    FLOW_VOLUME_MUST_BE_NUMBER: 'Flow volume must be a number',
    FLOW_VOLUME_POSITIVE: 'Flow volume must be a positive number',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    STATUS_UPDATED_AT_REQUIRED: 'Status and updated_at fields are required',
    DISPENSER_NOT_FOUND: 'Dispenser not found',
    DISPENSER_STATUS_UPDATED: 'Dispenser status updated',
    DISPENSER_ALREADY_IN_DESIRED_STATE: 'Dispenser already in the desired state',
    STATUS_UPDATED_AT_FIELDS_REQUIRED: 'Status and updated_at fields are required',
    DISPENSER_STATUS_UPDATED: 'Dispenser status updated',
    INVALID_DISPENSER_STATUS: 'Invalid dispenser state. Status must be either "open" or "close".',
    INVALID_DATE_FORMAT: 'Invalid date format. Please use the ISO 8601 format.',
    INVALID_DATE_ORDER: 'closed_at must be greater than opened_at and opened_at must be greater than the previous closed_at',
    INVALID_FLOW: 'Flow volume should be a positive number.',
};

module.exports = messages;
