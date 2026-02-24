/**
 * Doctor Admin Exception Reports Schema
 */

const pagingQuery = {
    page: { type: 'integer', minimum: 1 },
    pageSize: { type: 'integer', minimum: 1, maximum: 200 },
    search: { type: 'string' }
};

export const exceptionOverviewSchema = {
    querystring: {
        type: 'object',
        properties: {
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' }
        }
    }
};

export const exceptionDoctorSelectorSchema = {
    querystring: {
        type: 'object',
        properties: {
            search: { type: 'string' }
        }
    }
};

export const criticalLabListSchema = {
    querystring: {
        type: 'object',
        properties: {
            doctor_ref: { type: 'string' },
            category: { type: 'string' },
            urgency: { type: 'string', enum: ['immediate', 'urgent', 'high'] },
            ...pagingQuery
        }
    }
};

export const criticalLabDetailSchema = {
    params: {
        type: 'object',
        required: ['test_item_id'],
        properties: {
            test_item_id: { type: 'integer', minimum: 1 }
        }
    }
};

export const criticalLabMarkReviewedSchema = {
    params: {
        type: 'object',
        required: ['test_item_id'],
        properties: {
            test_item_id: { type: 'integer', minimum: 1 }
        }
    }
};

export const delayedDiagnosticsListSchema = {
    querystring: {
        type: 'object',
        properties: {
            doctor_ref: { type: 'string' },
            test_type: { type: 'string', enum: ['lab', 'radiology'] },
            priority: { type: 'string', enum: ['normal', 'urgent', 'stat'] },
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' },
            ...pagingQuery
        }
    }
};

export const delayedDiagnosticsDetailSchema = {
    params: {
        type: 'object',
        required: ['source', 'item_id'],
        properties: {
            source: { type: 'string', enum: ['lab', 'radiology'] },
            item_id: { type: 'integer', minimum: 1 }
        }
    }
};

export const delayedDiagnosticsEscalateSchema = {
    params: {
        type: 'object',
        required: ['source', 'item_id'],
        properties: {
            source: { type: 'string', enum: ['lab', 'radiology'] },
            item_id: { type: 'integer', minimum: 1 }
        }
    },
    body: {
        type: 'object',
        properties: {
            notes: { type: 'string', maxLength: 1000 }
        }
    }
};

export const highRiskWithoutReviewSchema = {
    querystring: {
        type: 'object',
        properties: {
            doctor_ref: { type: 'string' },
            risk_category: { type: 'string' },
            risk_level: { type: 'string', enum: ['moderate', 'high', 'critical'] },
            days_since_review: { type: 'string', enum: ['30+', '45+', '60+'] },
            ...pagingQuery
        }
    }
};

export const missedFollowUpsListSchema = {
    querystring: {
        type: 'object',
        properties: {
            doctor_ref: { type: 'string' },
            appointment_type: { type: 'string' },
            contact_status: { type: 'string' },
            ...pagingQuery
        }
    }
};

export const pendingRehabTherapistSelectorSchema = {
    querystring: {
        type: 'object',
        properties: {
            search: { type: 'string' }
        }
    }
};

export const pendingRehabSessionsListSchema = {
    querystring: {
        type: 'object',
        properties: {
            therapist_id: { type: 'integer', minimum: 1 },
            therapy_type: { type: 'string' },
            status: { type: 'string' },
            ...pagingQuery
        }
    }
};
