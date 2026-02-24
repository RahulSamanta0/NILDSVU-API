const dateQuery = {
    type: 'object',
    properties: {
        date: { type: 'string', format: 'date' }
    }
};

export const metricsSummarySchema = {
    querystring: dateQuery
};

export const metricsAttentionSchema = {
    querystring: dateQuery
};

export const attendanceTrendSchema = {
    querystring: {
        type: 'object',
        properties: {
            days: { type: 'integer', minimum: 3, maximum: 30 }
        }
    }
};

export const hiringComparisonSchema = {
    querystring: {
        type: 'object',
        properties: {
            year: { type: 'integer', minimum: 2000, maximum: 9999 }
        }
    }
};

export const performanceDistributionSchema = {
    querystring: {
        type: 'object',
        properties: {
            days: { type: 'integer', minimum: 7, maximum: 120 }
        }
    }
};

export const listManagersSchema = {
    querystring: {
        type: 'object',
        properties: {
            search: { type: 'string', maxLength: 100 },
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100 }
        }
    }
};

export const getManagerSchema = {
    params: {
        type: 'object',
        required: ['managerId'],
        properties: {
            managerId: { type: 'integer' }
        }
    }
};

export const listManagerStaffSchema = {
    params: {
        type: 'object',
        required: ['managerId'],
        properties: {
            managerId: { type: 'integer' }
        }
    },
    querystring: {
        type: 'object',
        properties: {
            search: { type: 'string', maxLength: 100 },
            status: { type: 'string', enum: ['Active', 'On Leave', 'Probation'] },
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100 }
        }
    }
};

export const createManagerSchema = {
    body: {
        type: 'object',
        required: ['username', 'email', 'password', 'first_name', 'last_name'],
        properties: {
            username: { type: 'string', minLength: 3, maxLength: 100 },
            email: { type: 'string', format: 'email', maxLength: 255 },
            password: { type: 'string', minLength: 8, maxLength: 100 },
            first_name: { type: 'string', minLength: 1, maxLength: 100 },
            last_name: { type: 'string', minLength: 1, maxLength: 100 },
            facility_id: { type: 'integer' },
            department_id: { type: 'integer' },
            designation: { type: 'string', maxLength: 100 },
            specialization: { type: 'string', maxLength: 255 },
            qualification: { type: 'string', maxLength: 255 },
            registration_number: { type: 'string', maxLength: 100 },
            contact_number: { type: 'string', maxLength: 20 },
            emergency_contact: { type: 'string', maxLength: 20 },
            date_of_joining: { type: 'string', format: 'date' },
            photo_url: { type: 'string', maxLength: 500 },
            room_number: { type: 'string', maxLength: 50 },
            current_status: { type: 'string', maxLength: 50 },
            is_active: { type: 'boolean' }
        }
    }
};

export const deleteManagerSchema = {
    params: {
        type: 'object',
        required: ['managerId'],
        properties: {
            managerId: { type: 'integer' }
        }
    }
};

export const getStaffSchema = {
    params: {
        type: 'object',
        required: ['staffId'],
        properties: {
            staffId: { type: 'integer' }
        }
    }
};

export const addStaffDocumentSchema = {
    params: {
        type: 'object',
        required: ['staffId'],
        properties: {
            staffId: { type: 'integer' }
        }
    },
    body: {
        type: 'object',
        required: ['document_type', 'file_url', 'file_name'],
        properties: {
            document_type: { type: 'string', maxLength: 100 },
            file_url: { type: 'string', maxLength: 500 },
            file_name: { type: 'string', maxLength: 255 },
            file_size: { type: 'integer' }
        }
    }
};

export const listStaffDocumentsSchema = {
    params: {
        type: 'object',
        required: ['staffId'],
        properties: {
            staffId: { type: 'integer' }
        }
    }
};

export const updateStaffDocumentSchema = {
    params: {
        type: 'object',
        required: ['staffId', 'documentId'],
        properties: {
            staffId: { type: 'integer' },
            documentId: { type: 'integer' }
        }
    },
    body: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
            document_type: { type: 'string', maxLength: 100 },
            file_url: { type: 'string', maxLength: 500 },
            file_name: { type: 'string', maxLength: 255 },
            file_size: { type: ['integer', 'null'] }
        }
    }
};

export const deleteStaffDocumentSchema = {
    params: {
        type: 'object',
        required: ['staffId', 'documentId'],
        properties: {
            staffId: { type: 'integer' },
            documentId: { type: 'integer' }
        }
    }
};
