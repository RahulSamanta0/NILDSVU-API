/**
 * GRN Schema
 *
 * Purpose: Fastify JSON schemas for Goods Receipt Note operations
 */

export const createGRNSchema = {
    body: {
        type: 'object',
        required: ['items'],
        properties: {
            po_id: { type: 'integer' },
            vendor_id: { type: 'integer' },
            department_id: { type: 'integer' },
            received_date: { type: 'string' },
            invoice_number: { type: 'string', maxLength: 100 },
            invoice_date: { type: 'string' },
            invoice_amount: { type: 'number' },
            notes: { type: 'string' },
            items: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['item_id', 'item_name', 'received_qty'],
                    properties: {
                        item_id: { type: 'integer' },
                        item_name: { type: 'string', maxLength: 255 },
                        ordered_qty: { type: 'integer' },
                        received_qty: { type: 'integer', minimum: 1 },
                        free_qty: { type: 'integer' },
                        rejected_qty: { type: 'integer' },
                        unit: { type: 'string', maxLength: 50 },
                        batch_number: { type: 'string', maxLength: 100 },
                        expiry_date: { type: 'string' },
                        unit_price: { type: 'number' }
                    }
                }
            }
        }
    }
};

export const listGRNsSchema = {
    querystring: {
        type: 'object',
        properties: {
            status: { type: 'string' },
            vendor_id: { type: 'integer' },
            po_id: { type: 'integer' },
            from: { type: 'string' },
            to: { type: 'string' }
        }
    }
};

export const getGRNSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    }
};

export const verifyGRNSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    },
    body: {
        type: 'object',
        properties: {
            notes: { type: 'string' }
        }
    }
};
