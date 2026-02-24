/**
 * Leave Management Schema
 */

export const listLeaveRequestsSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100 },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
            staff_id: { type: 'integer' },
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' }
        }
    }
};

export const createLeaveRequestSchema = {
    body: {
        type: 'object',
        required: ['staff_id', 'leave_type', 'start_date', 'end_date'],
        additionalProperties: false,
        properties: {
            staff_id: { type: 'integer' },
            leave_type: { type: 'string', maxLength: 50 },
            start_date: { type: 'string', format: 'date' },
            end_date: { type: 'string', format: 'date' },
            reason: { type: 'string' }
        }
    }
};

export const getLeaveRequestSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    }
};

const leaveDecisionBody = {
    type: 'object',
    properties: {
        remarks: { type: 'string' }
    }
};

export const approveLeaveRequestSchema = {
    params: getLeaveRequestSchema.params,
    body: leaveDecisionBody
};

export const rejectLeaveRequestSchema = {
    params: getLeaveRequestSchema.params,
    body: leaveDecisionBody
};

export const leaveSummarySchema = {
    querystring: {
        type: 'object',
        properties: {
            staff_id: { type: 'integer' },
            year: { type: 'integer', minimum: 2000, maximum: 2100 }
        }
    }
};
