/**
 * Wards Schema
 * 
 * Purpose: Fastify JSON schemas for ward CRUD operations
 */

// POST /wards - Create Ward
export const createWardSchema = {
    body: {
        type: 'object',
        required: ['ward_name', 'ward_code'],
        properties: {
            ward_name: { type: 'string', maxLength: 100 },
            ward_code: { type: 'string', maxLength: 50 },
            ward_type: { type: 'string', maxLength: 50 },
            floor_number: { type: 'integer' },
            total_beds: { type: 'integer' },
            available_beds: { type: 'integer' },
            facility_id: { type: 'integer' }
        }
    },
    response: {
        201: {
            type: 'object',
            properties: {
                ward_id: { type: 'integer' },
                ward_name: { type: 'string' },
                ward_code: { type: 'string' },
                ward_type: { type: 'string' },
                floor_number: { type: 'integer' },
                total_beds: { type: 'integer' },
                available_beds: { type: 'integer' },
                facility_id: { type: 'integer' },
                is_active: { type: 'boolean' },
                created_at: { type: 'string' }
            }
        }
    }
};

// GET /wards - List All Wards
export const listWardsSchema = {
    querystring: {
        type: 'object',
        properties: {
            is_active: { type: 'boolean' },
            ward_type: { type: 'string' },
            facility_id: { type: 'integer' }
        }
    },
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    ward_id: { type: 'integer' },
                    ward_name: { type: 'string' },
                    ward_code: { type: 'string' },
                    ward_type: { type: 'string' },
                    floor_number: { type: 'integer' },
                    total_beds: { type: 'integer' },
                    available_beds: { type: 'integer' },
                    facility_id: { type: 'integer' },
                    is_active: { type: 'boolean' },
                    created_at: { type: 'string' }
                }
            }
        }
    }
};

// GET /wards/:id - Get Ward by ID
export const getWardSchema = {
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
                ward_id: { type: 'integer' },
                ward_name: { type: 'string' },
                ward_code: { type: 'string' },
                ward_type: { type: 'string' },
                floor_number: { type: 'integer' },
                total_beds: { type: 'integer' },
                available_beds: { type: 'integer' },
                facility_id: { type: 'integer' },
                is_active: { type: 'boolean' },
                created_at: { type: 'string' }
            }
        }
    }
};

// POST /wards/:id/update - Update Ward
export const updateWardSchema = {
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
            ward_name: { type: 'string', maxLength: 100 },
            ward_code: { type: 'string', maxLength: 50 },
            ward_type: { type: 'string', maxLength: 50 },
            floor_number: { type: 'integer' },
            total_beds: { type: 'integer' },
            available_beds: { type: 'integer' },
            facility_id: { type: 'integer' },
            is_active: { type: 'boolean' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                ward_id: { type: 'integer' },
                ward_name: { type: 'string' },
                ward_code: { type: 'string' },
                is_active: { type: 'boolean' }
            }
        }
    }
};

// POST /wards/:id/delete - Delete Ward (Soft Delete)
export const deleteWardSchema = {
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
                ward_id: { type: 'integer' }
            }
        }
    }
};
