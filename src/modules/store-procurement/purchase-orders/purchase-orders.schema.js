/**
 * Purchase Orders Schema
 *
 * Purpose: Fastify JSON schemas for purchase order operations
 */

export const createPOSchema = {
    body: {
        type: 'object',
        required: ['vendor_id', 'items'],
        properties: {
            vendor_id: { type: 'integer' },
            department_id: { type: 'integer' },
            expected_delivery: { type: 'string' },
            payment_terms: { type: 'string', maxLength: 50 },
            notes: { type: 'string' },
            items: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['item_id', 'item_name', 'quantity', 'unit_price'],
                    properties: {
                        item_id: { type: 'integer' },
                        item_name: { type: 'string', maxLength: 255 },
                        quantity: { type: 'integer', minimum: 1 },
                        unit: { type: 'string', maxLength: 50 },
                        unit_price: { type: 'number', minimum: 0 }
                    }
                }
            }
        }
    }
};

export const listPOsSchema = {
    querystring: {
        type: 'object',
        properties: {
            status: { type: 'string' },
            vendor_id: { type: 'integer' },
            from: { type: 'string' },
            to: { type: 'string' }
        }
    }
};

export const getPOSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    }
};

export const updatePOSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    },
    body: {
        type: 'object',
        properties: {
            expected_delivery: { type: 'string' },
            payment_terms: { type: 'string', maxLength: 50 },
            notes: { type: 'string' }
        }
    }
};

export const approvePOSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    }
};

export const cancelPOSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    },
    body: {
        type: 'object',
        properties: {
            cancellation_reason: { type: 'string' }
        }
    }
};
