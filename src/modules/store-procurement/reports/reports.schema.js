/**
 * Reports Schema
 *
 * Purpose: Fastify JSON schemas for store & procurement report endpoints
 */

export const grnRegisterSchema = {
    querystring: {
        type: 'object',
        properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            vendor_id: { type: 'integer' }
        }
    }
};

export const expiryReportSchema = {
    querystring: {
        type: 'object',
        properties: {
            days: { type: 'integer', default: 30 }
        }
    }
};

export const reorderReportSchema = {
    querystring: {
        type: 'object',
        properties: {
            department_id: { type: 'integer' }
        }
    }
};

export const purchaseSummarySchema = {
    querystring: {
        type: 'object',
        properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            vendor_id: { type: 'integer' },
            department_id: { type: 'integer' }
        }
    }
};

export const stockLedgerSchema = {
    querystring: {
        type: 'object',
        required: ['item_id'],
        properties: {
            item_id: { type: 'integer' },
            from: { type: 'string' },
            to: { type: 'string' }
        }
    }
};
