/**
 * Departments Schema
 * 
 * Purpose: Fastify JSON schemas for department CRUD operations
 */

export const createDepartmentSchema = {
    body: {
        type: 'object',
        required: ['department_name'],
        properties: {
            department_name: { type: 'string', maxLength: 100 },
            department_type: { type: 'string', maxLength: 50 },
            head_of_department: { type: 'integer' },
            contact_number: { type: 'string', maxLength: 20 },
            facility_id: { type: 'integer' }
        }
    },
    response: {
        201: {
            type: 'object',
            properties: {
                department_id: { type: 'integer' },
                department_name: { type: 'string' },
                department_code: { type: 'string' },
                department_type: { type: 'string' },
                head_of_department: { type: 'integer' },
                contact_number: { type: 'string' },
                is_active: { type: 'boolean' },
                created_at: { type: 'string' }
            }
        }
    }
};

export const listDepartmentsSchema = {
    querystring: {
        type: 'object',
        properties: {
            is_active: { type: 'boolean' },
            department_type: { type: 'string' }
        }
    },
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    department_id: { type: 'integer' },
                    department_name: { type: 'string' },
                    department_code: { type: 'string' },
                    department_type: { type: 'string' },
                    head_of_department: { type: 'integer' },
                    head_name: { type: 'string' },
                    contact_number: { type: 'string' },
                    is_active: { type: 'boolean' },
                    created_at: { type: 'string' }
                }
            }
        }
    }
};

export const getDepartmentSchema = {
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
                department_id: { type: 'integer' },
                department_name: { type: 'string' },
                department_code: { type: 'string' },
                department_type: { type: 'string' },
                head_of_department: { type: 'integer' },
                head_name: { type: 'string' },
                contact_number: { type: 'string' },
                facility_id: { type: 'integer' },
                is_active: { type: 'boolean' },
                created_at: { type: 'string' }
            }
        }
    }
};

export const updateDepartmentSchema = {
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
            department_name: { type: 'string', maxLength: 100 },
            department_code: { type: 'string', maxLength: 50 },
            department_type: { type: 'string', maxLength: 50 },
            head_of_department: { type: 'integer' },
            contact_number: { type: 'string', maxLength: 20 },
            is_active: { type: 'boolean' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                department_id: { type: 'integer' },
                department_name: { type: 'string' },
                department_code: { type: 'string' },
                is_active: { type: 'boolean' }
            }
        }
    }
};

export const deleteDepartmentSchema = {
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
                message: { type: 'string' },
                department_id: { type: 'integer' }
            }
        }
    }
};
