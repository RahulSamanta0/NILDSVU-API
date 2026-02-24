/**
 * Doctor Schedule Management Schemas
 */

const scheduleBaseFields = {
    doctor_id: { type: 'integer' },
    doctor_ref: { type: 'string', minLength: 1, maxLength: 50 },
    duty_date: { type: 'string', format: 'date' },
    start_time: { type: 'string', format: 'date-time' },
    end_time: { type: 'string', format: 'date-time' },
    shift_type: { type: 'string', enum: ['morning', 'afternoon', 'night'] },
    schedule_type: { type: 'string', enum: ['opd', 'ipd'] },
    department_id: { type: 'integer' },
    slot_duration_minutes: { type: 'integer', minimum: 5, maximum: 240 },
    max_patients: { type: 'integer', minimum: 1, maximum: 200 },
    ward_rounds: { type: 'integer', minimum: 1, maximum: 20 },
    consultation_mode: { type: 'string', maxLength: 50 },
    is_available: { type: 'boolean' },
    notes: { type: 'string' }
};

export const createScheduleSchema = {
    body: {
        type: 'object',
        required: ['duty_date', 'start_time', 'end_time', 'schedule_type'],
        anyOf: [
            { required: ['doctor_id'] },
            { required: ['doctor_ref'] }
        ],
        additionalProperties: false,
        properties: scheduleBaseFields
    }
};

export const bulkCreateScheduleSchema = {
    body: {
        type: 'object',
        required: ['entries'],
        additionalProperties: false,
        properties: {
            entries: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['duty_date', 'start_time', 'end_time', 'schedule_type'],
                    anyOf: [
                        { required: ['doctor_id'] },
                        { required: ['doctor_ref'] }
                    ],
                    additionalProperties: false,
                    properties: scheduleBaseFields
                }
            }
        }
    }
};

export const listScheduleSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100 },
            doctor_id: { type: 'integer' },
            doctor_ref: { type: 'string' },
            department_id: { type: 'integer' },
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' },
            schedule_type: { type: 'string', enum: ['opd', 'ipd'] },
            is_available: { type: 'boolean' }
        }
    }
};

export const getDoctorAvailabilitySchema = {
    params: {
        type: 'object',
        required: ['doctor_id'],
        properties: {
            doctor_id: {
                oneOf: [
                    { type: 'integer' },
                    { type: 'string' }
                ]
            }
        }
    },
    querystring: {
        type: 'object',
        required: ['duty_date'],
        properties: {
            duty_date: { type: 'string', format: 'date' },
            schedule_type: { type: 'string', enum: ['opd', 'ipd'] }
        }
    }
};

export const updateScheduleSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    },
    body: {
        type: 'object',
        minProperties: 1,
        allOf: [
            {
                if: {
                    anyOf: [
                        { required: ['doctor_id'] },
                        { required: ['doctor_ref'] }
                    ]
                },
                then: {
                    anyOf: [
                        { required: ['doctor_id'] },
                        { required: ['doctor_ref'] }
                    ]
                }
            }
        ],
        additionalProperties: false,
        properties: scheduleBaseFields
    }
};

export const toggleScheduleAvailabilitySchema = {
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
        additionalProperties: false,
        properties: {
            is_available: { type: 'boolean' }
        }
    }
};

export const deleteScheduleSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    }
};
