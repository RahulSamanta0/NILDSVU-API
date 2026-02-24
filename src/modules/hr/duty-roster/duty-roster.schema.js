/**
 * Duty Roster Schema
 */

const rosterBaseFields = {
    staff_id: { type: 'integer' },
    duty_date: { type: 'string', format: 'date' },
    shift_type: { type: 'string', maxLength: 50 },
    start_time: { type: 'string' },
    end_time: { type: 'string' },
    department_id: { type: 'integer' },
    is_available: { type: 'boolean' },
    remarks: { type: 'string' }
};

export const createDutyRosterSchema = {
    body: {
        type: 'object',
        required: ['staff_id', 'duty_date', 'start_time', 'end_time'],
        properties: rosterBaseFields
    }
};

export const bulkCreateDutyRosterSchema = {
    body: {
        type: 'object',
        required: ['entries'],
        properties: {
            entries: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['staff_id', 'duty_date', 'start_time', 'end_time'],
                    properties: rosterBaseFields
                }
            }
        }
    }
};

export const listDutyRosterSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100 },
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' },
            department_id: { type: 'integer' },
            staff_id: { type: 'integer' },
            is_available: { type: 'boolean' }
        }
    }
};

export const updateDutyRosterSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    },
    body: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
            duty_date: { type: 'string', format: 'date' },
            shift_type: { type: 'string', maxLength: 50 },
            start_time: { type: 'string' },
            end_time: { type: 'string' },
            department_id: { type: 'integer' },
            is_available: { type: 'boolean' },
            remarks: { type: 'string' }
        }
    }
};

export const toggleDutyRosterAvailabilitySchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    },
    body: {
        type: 'object',
        required: ['is_available'],
        properties: {
            is_available: { type: 'boolean' }
        }
    }
};
