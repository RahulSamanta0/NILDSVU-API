/**
 * Indents Schema
 *
 * Purpose: Fastify JSON schemas for indent request operations
 */

export const createIndentSchema = {
    body: {
        type: 'object',
        required: ['items'],
        properties: {
            department_id: { type: 'integer' },
            required_by: { type: 'string' },
            priority: { type: 'string', enum: ['normal', 'urgent', 'emergency'] },
            remarks: { type: 'string' },
            items: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['item_name', 'quantity'],
                    properties: {
                        item_id: { type: 'integer' },
                        item_name: { type: 'string', maxLength: 255 },
                        quantity: { type: 'integer', minimum: 1 },
                        unit: { type: 'string', maxLength: 50 },
                        remarks: { type: 'string' }
                    }
                }
            }
        }
    }
};

export const listIndentsSchema = {
    querystring: {
        type: 'object',
        properties: {
            status: { type: 'string' },
            department_id: { type: 'integer' },
            from: { type: 'string' },
            to: { type: 'string' }
        }
    }
};

export const getIndentSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    }
};

export const approveIndentSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    }
};

export const rejectIndentSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    },
    body: {
        type: 'object',
        properties: {
            rejection_note: { type: 'string' }
        }
    }
};

export const updateIndentSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    },
    body: {
        type: 'object',
        properties: {
            department_id: { type: 'integer' },
            required_by: { type: 'string' },
            priority: { type: 'string', enum: ['normal', 'urgent', 'emergency'] },
            remarks: { type: 'string' },
            items: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['item_name', 'quantity'],
                    properties: {
                        item_id: { type: 'integer' },
                        item_name: { type: 'string', maxLength: 255 },
                        quantity: { type: 'integer', minimum: 1 },
                        unit: { type: 'string', maxLength: 50 },
                        remarks: { type: 'string' }
                    }
                }
            }
        }
    }
};
