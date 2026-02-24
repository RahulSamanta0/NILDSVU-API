/**
 * Beds Schema
 * 
 * Purpose: Fastify JSON schemas for bed CRUD operations
 */

// POST /beds - Create Bed
export const createBedSchema = {
    body: {
        type: 'object',
        required: ['ward_id', 'bed_number'],
        properties: {
            ward_id: { type: 'integer' },
            bed_number: { type: 'string', maxLength: 50 },
            bed_type: { type: 'string', maxLength: 50 },
            is_occupied: { type: 'boolean' },
            is_active: { type: 'boolean' }
        }
    },
    response: {
        201: {
            type: 'object',
            properties: {
                bed_id: { type: 'integer' },
                ward_id: { type: 'integer' },
                bed_number: { type: 'string' },
                bed_type: { type: 'string' },
                is_occupied: { type: 'boolean' },
                is_active: { type: 'boolean' },
                created_at: { type: 'string' }
            }
        }
    }
};

// GET /beds - List All Beds
export const listBedsSchema = {
    querystring: {
        type: 'object',
        properties: {
            is_active: { type: 'boolean' },
            is_occupied: { type: 'boolean' },
            ward_id: { type: 'integer' }
        }
    },
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    bed_id: { type: 'integer' },
                    ward_id: { type: 'integer' },
                    ward_code: { type: 'string' },
                    ward_name: { type: 'string' },
                    bed_number: { type: 'string' },
                    bed_type: { type: 'string' },
                    is_occupied: { type: 'boolean' },
                    is_active: { type: 'boolean' },
                    created_at: { type: 'string' }
                }
            }
        }
    }
};

// GET /beds/:id - Get Bed by ID
export const getBedSchema = {
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
                bed_id: { type: 'integer' },
                ward_id: { type: 'integer' },
                ward_code: { type: 'string' },
                ward_name: { type: 'string' },
                bed_number: { type: 'string' },
                bed_type: { type: 'string' },
                is_occupied: { type: 'boolean' },
                is_active: { type: 'boolean' },
                created_at: { type: 'string' }
            }
        }
    }
};

// POST /beds/:id/update - Update Bed
export const updateBedSchema = {
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
            ward_id: { type: 'integer' },
            bed_number: { type: 'string', maxLength: 50 },
            bed_type: { type: 'string', maxLength: 50 },
            is_occupied: { type: 'boolean' },
            is_active: { type: 'boolean' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                bed_id: { type: 'integer' },
                bed_number: { type: 'string' },
                is_active: { type: 'boolean' }
            }
        }
    }
};

// POST /beds/:id/delete - Delete Bed (Soft Delete)
export const deleteBedSchema = {
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
                bed_id: { type: 'integer' }
            }
        }
    }
};
