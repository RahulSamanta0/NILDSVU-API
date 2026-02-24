/**
 * Diet Plans Validation Schemas
 * 
 * Purpose:
 * - Defines JSON schemas for request/response validation
 */

// Query parameters schema for GET /api/diet-plans
export const getDietPlansQuerySchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', minimum: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
        status: { type: 'string', enum: ['all', 'approved', 'modified', 'cancelled'] }
    }
};

// Response schema for stats endpoint
export const statsResponseSchema = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        data: {
            type: 'object',
            properties: {
                totalNew: { type: 'integer' },
                urgent: { type: 'integer' },
                high: { type: 'integer' },
                normal: { type: 'integer' }
            }
        }
    }
};

// Request body schema for modify diet plan
export const modifyDietPlanSchema = {
    type: 'object',
    properties: {
        dietType: { type: 'string' },
        notes: { type: 'string' }
    },
    additionalProperties: false
};

// Request body schema for cancel diet plan
export const cancelDietPlanSchema = {
    type: 'object',
    properties: {
        reason: { type: 'string', minLength: 1 }
    },
    required: ['reason'],
    additionalProperties: false
};

// ID parameter schema
export const idParamSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', pattern: '^[0-9]+$' }
    },
    required: ['id']
};

// Query parameters for status stats
export const statusStatsQuerySchema = {
    type: 'object',
    properties: {
        view: { type: 'string', enum: ['daily', 'monthly'] }
    },
    required: ['view']
};

// Query parameters for history
export const historyQuerySchema = {
    type: 'object',
    properties: {
        tab: { type: 'string', enum: ['all', 'approved', 'modified', 'cancelled'] },
        view: { type: 'string', enum: ['daily', 'monthly'] },
        ward: { type: 'string' },
        meal: { type: 'string' },
        dietType: { type: 'string' },
        search: { type: 'string' }
    },
    required: ['tab', 'view']
};

