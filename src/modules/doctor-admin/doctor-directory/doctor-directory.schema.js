/**
 * Doctor Directory Schema
 *
 * Purpose: Fastify JSON schemas for doctor directory management
 */

const listResponseSchema = {
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
                    doctor_id: { type: 'string' },
                    full_name: { type: 'string' },
                    first_name: { type: 'string' },
                    last_name: { type: 'string' },
                    email: { type: 'string' },
                    username: { type: 'string' },
                    phone: { type: 'string' },
                    designation: { type: 'string' },
                    specialization: { type: 'string' },
                    department_id: { type: 'integer' },
                    department_name: { type: 'string' },
                    qualification: { type: 'string' },
                    registration_number: { type: 'string' },
                    date_of_joining: { type: 'string' },
                    experience_years: { type: 'integer' },
                    status: { type: 'string' },
                    is_active: { type: 'boolean' },
                    role_code: { type: 'string' },
                    role_name: { type: 'string' },
                    image_url: { type: 'string' },
                    documents: { type: 'array', items: { type: 'string' } },
                    document_files: { type: 'object' },
                    request_status: { type: 'string' },
                    created_at: { type: 'string' }
                }
            }
        }
    }
};

export const listDoctorsSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100 },
            search: { type: 'string' },
            department_id: { type: 'integer' },
            specialization: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive', 'on_leave'] }
        }
    },
    response: {
        200: listResponseSchema
    }
};

export const getDoctorSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string' }
        }
    },
    response: {
        200: listResponseSchema.properties.data.items
    }
};

export const updateDoctorSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string' }
        }
    },
    body: {
        type: 'object',
        properties: {
            employee_code: { type: 'string' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            designation: { type: 'string' },
            department_id: { type: 'integer' },
            specialization: { type: 'string' },
            qualification: { type: 'string' },
            registration_number: { type: 'string' },
            date_of_joining: { type: 'string' },
            experience_years: { type: 'integer', minimum: 0, maximum: 60 },
            contact_number: { type: 'string' },
            photo_url: { type: 'string' },
            current_status: { type: 'string' },
            is_active: { type: 'boolean' },
            email: { type: 'string' },
            username: { type: 'string' }
        }
    },
    response: {
        200: listResponseSchema.properties.data.items
    }
};

