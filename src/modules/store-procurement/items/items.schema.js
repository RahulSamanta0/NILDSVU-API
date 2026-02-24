/**
 * Items Schema
 *
 * Purpose: Fastify JSON schemas for inventory items CRUD
 */

export const createItemSchema = {
    body: {
        type: 'object',
        required: ['item_code', 'item_name'],
        properties: {
            item_code: { type: 'string', maxLength: 50 },
            item_name: { type: 'string', maxLength: 255 },
            category_id: { type: 'integer' },
            description: { type: 'string' },
            unit_of_measure: { type: 'string', maxLength: 50 },
            reorder_level: { type: 'integer' },
            unit_price: { type: 'number' },
            is_active: { type: 'boolean' }
        }
    }
};

export const listItemsSchema = {
    querystring: {
        type: 'object',
        properties: {
            category_id: { type: 'integer' },
            search: { type: 'string' },
            low_stock: { type: 'boolean' },
            is_active: { type: 'boolean' }
        }
    }
};

export const getItemSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    }
};

export const updateItemSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    },
    body: {
        type: 'object',
        properties: {
            item_name: { type: 'string', maxLength: 255 },
            category_id: { type: 'integer' },
            description: { type: 'string' },
            unit_of_measure: { type: 'string', maxLength: 50 },
            reorder_level: { type: 'integer' },
            unit_price: { type: 'number' },
            is_active: { type: 'boolean' }
        }
    }
};
