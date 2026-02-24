/**
 * Staff Requests Schema
 *
 * Purpose: Fastify JSON schemas for management staff request approvals
 */

const paginationSchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', minimum: 1 },
        pageSize: { type: 'integer', minimum: 1, maximum: 100 },
        status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
        department_id: { type: 'integer' }
    }
};

export const listStaffRequestsSchema = {
    querystring: {
        ...paginationSchema
    },
    response: {
        200: {
            type: 'object',
            properties: {
                page: { type: 'integer' },
                pageSize: { type: 'integer' },
                total: { type: 'integer' },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            profile_id: { type: 'integer' },
                            user_id: { type: 'integer' },
                            employee_code: { type: 'string' },
                            full_name: { type: 'string' },
                            designation: { type: 'string' },
                            department_id: { type: 'integer' },
                            department_name: { type: 'string' },
                            specialization: { type: 'string' },
                            contact_number: { type: 'string' },
                            request_status: { type: 'string' },
                            request_type: { type: 'string' },
                            submitted_by: { type: 'integer' },
                            reviewed_by: { type: 'integer' },
                            reviewed_at: { type: 'string' },
                            request_notes: { type: 'string' },
                            created_at: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
};

export const listRecentStaffRequestsSchema = {
    querystring: {
        type: 'object',
        required: ['status'],
        properties: {
            status: { type: 'string', enum: ['approved', 'rejected'] },
            limit: { type: 'integer', minimum: 1, maximum: 100 }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                total: { type: 'integer' },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            profile_id: { type: 'integer' },
                            user_id: { type: 'integer' },
                            employee_code: { type: 'string' },
                            full_name: { type: 'string' },
                            designation: { type: 'string' },
                            department_id: { type: 'integer' },
                            department_name: { type: 'string' },
                            specialization: { type: 'string' },
                            contact_number: { type: 'string' },
                            request_status: { type: 'string' },
                            request_type: { type: 'string' },
                            submitted_by: { type: 'integer' },
                            reviewed_by: { type: 'integer' },
                            reviewed_at: { type: 'string' },
                            request_notes: { type: 'string' },
                            created_at: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
};

export const approveStaffRequestSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                profile_id: { type: 'integer' },
                request_status: { type: 'string' },
                reviewed_by: { type: 'integer' },
                reviewed_at: { type: 'string' }
            }
        }
    }
};

export const rejectStaffRequestSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    },
    body: {
        type: 'object',
        properties: {
            request_notes: { type: 'string', maxLength: 2000 }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                profile_id: { type: 'integer' },
                request_status: { type: 'string' },
                reviewed_by: { type: 'integer' },
                reviewed_at: { type: 'string' },
                request_notes: { type: 'string' }
            }
        }
    }
};
