/**
 * Stock Schema
 *
 * Purpose: Fastify JSON schemas for department stock operations
 */

export const listStockSchema = {
    querystring: {
        type: 'object',
        properties: {
            department_id: { type: 'integer' },
            low_stock: { type: 'boolean' },
            item_id: { type: 'integer' }
        }
    }
};

export const getStockSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    }
};

export const reorderListSchema = {
    querystring: {
        type: 'object',
        properties: {
            department_id: { type: 'integer' }
        }
    }
};

export const createReorderPOSchema = {
    body: {
        type: 'object',
        required: ['vendor_id', 'items'],
        properties: {
            vendor_id: { type: 'integer' },
            items: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['item_id', 'quantity', 'unit_price'],
                    properties: {
                        item_id: { type: 'integer' },
                        quantity: { type: 'integer', minimum: 1 },
                        unit_price: { type: 'number', minimum: 0 }
                    }
                }
            }
        }
    }
};
