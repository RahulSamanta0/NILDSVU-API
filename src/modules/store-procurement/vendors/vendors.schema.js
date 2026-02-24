/**
 * Vendors Schema
 *
 * Purpose: Fastify JSON schemas for store vendor CRUD operations
 */

// POST /store/vendors - Create Vendor
export const createVendorSchema = {
    body: {
        type: 'object',
        required: ['vendor_code', 'vendor_name'],
        properties: {
            vendor_code: { type: 'string', maxLength: 50 },
            vendor_name: { type: 'string', maxLength: 255 },
            contact_person: { type: 'string', maxLength: 100 },
            email: { type: 'string', maxLength: 255 },
            phone_primary: { type: 'string', maxLength: 20 },
            phone_secondary: { type: 'string', maxLength: 20 },
            address: { type: 'string' },
            gst_number: { type: 'string', maxLength: 20 },
            pan_number: { type: 'string', maxLength: 20 },
            payment_terms: { type: 'string', maxLength: 50 },
            department_id: { type: 'integer' },
            is_active: { type: 'boolean' }
        }
    }
};

// GET /store/vendors - List Vendors
export const listVendorsSchema = {
    querystring: {
        type: 'object',
        properties: {
            is_active: { type: 'boolean' },
            department_id: { type: 'integer' },
            search: { type: 'string' }
        }
    }
};

// GET /store/vendors/:id - Get Vendor by ID
export const getVendorSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    }
};

// POST /store/vendors/:id/update - Update Vendor
export const updateVendorSchema = {
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
            vendor_name: { type: 'string', maxLength: 255 },
            contact_person: { type: 'string', maxLength: 100 },
            email: { type: 'string', maxLength: 255 },
            phone_primary: { type: 'string', maxLength: 20 },
            phone_secondary: { type: 'string', maxLength: 20 },
            address: { type: 'string' },
            gst_number: { type: 'string', maxLength: 20 },
            pan_number: { type: 'string', maxLength: 20 },
            payment_terms: { type: 'string', maxLength: 50 },
            department_id: { type: 'integer' },
            is_active: { type: 'boolean' }
        }
    }
};

// POST /store/vendors/:id/delete - Soft Delete Vendor
export const deleteVendorSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    }
};

// POST /store/vendors/:id/items - Upsert Vendor Price List
export const upsertVendorItemsSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    },
    body: {
        type: 'object',
        required: ['items'],
        properties: {
            items: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['item_id', 'quoted_price'],
                    properties: {
                        item_id: { type: 'integer' },
                        quoted_price: { type: 'number' },
                        lead_time_days: { type: 'integer' },
                        is_preferred: { type: 'boolean' },
                        is_active: { type: 'boolean' }
                    }
                }
            }
        }
    }
};
