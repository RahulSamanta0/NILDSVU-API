/**
 * Doctor Admin Reports Schema
 */

const dateRangeQuery = {
    type: 'object',
    properties: {
        from_date: { type: 'string', format: 'date' },
        to_date: { type: 'string', format: 'date' },
        department_id: { type: 'integer' }
    }
};

export const allDoctorsOverviewSchema = {
    querystring: dateRangeQuery
};

export const doctorWiseReportSchema = {
    querystring: {
        type: 'object',
        properties: {
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' },
            department_id: { type: 'integer' },
            doctor_ref: { type: 'string' },
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100 }
        }
    }
};

export const doctorPatientsReportSchema = {
    params: {
        type: 'object',
        required: ['doctor_ref'],
        properties: {
            doctor_ref: { type: 'string', minLength: 1 }
        }
    },
    querystring: {
        type: 'object',
        properties: {
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' },
            search: { type: 'string' },
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100 }
        }
    }
};

export const followUpDueReportSchema = {
    querystring: {
        type: 'object',
        properties: {
            doctor_ref: { type: 'string' },
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' },
            days: { type: 'integer', minimum: 1, maximum: 365 }
        }
    }
};

export const departmentWorkloadSchema = {
    querystring: dateRangeQuery
};

export const waitTimeSummarySchema = {
    querystring: dateRangeQuery
};

export const revenueLinkedActivitySchema = {
    querystring: dateRangeQuery
};

export const patientMixSchema = {
    querystring: dateRangeQuery
};

export const doctorCalendarSummarySchema = {
    params: {
        type: 'object',
        required: ['doctor_ref'],
        properties: {
            doctor_ref: { type: 'string', minLength: 1 }
        }
    },
    querystring: {
        type: 'object',
        properties: {
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' },
            view: { type: 'string', enum: ['daily', 'weekly'] }
        }
    }
};

export const doctorSlotEffectivenessSchema = {
    params: {
        type: 'object',
        required: ['doctor_ref'],
        properties: {
            doctor_ref: { type: 'string', minLength: 1 }
        }
    },
    querystring: {
        type: 'object',
        properties: {
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' }
        }
    }
};

export const doctorLeaveImpactSchema = {
    params: {
        type: 'object',
        required: ['doctor_ref'],
        properties: {
            doctor_ref: { type: 'string', minLength: 1 }
        }
    },
    querystring: {
        type: 'object',
        properties: {
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' }
        }
    }
};

export const chronicRepeatPatientsSchema = {
    querystring: {
        type: 'object',
        properties: {
            doctor_ref: { type: 'string' },
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' },
            min_visits: { type: 'integer', minimum: 2, maximum: 100 }
        }
    }
};

export const referralHandoverSchema = {
    querystring: {
        type: 'object',
        properties: {
            doctor_ref: { type: 'string' },
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' },
            handover_days: { type: 'integer', minimum: 1, maximum: 30 }
        }
    }
};

export const highRiskFollowUpSchema = {
    querystring: {
        type: 'object',
        properties: {
            doctor_ref: { type: 'string' },
            missed_days_threshold: { type: 'integer', minimum: 1, maximum: 365 },
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' }
        }
    }
};
