/**
 * Doctor Admin Schema
 *
 * Purpose: Fastify JSON schemas for doctor-specific pending staff approvals
 */

export const listPendingDoctorStaffSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100 }
        }
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
                            role_code: { type: 'string' },
                            role_name: { type: 'string' },
                            created_at: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
};
