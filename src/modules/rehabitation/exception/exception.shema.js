/**
 * Exception Reports Schema Validation
 * Defines JSON schemas for exception reports API endpoints
 */

/**
 * Schema for getting exception reports
 * GET /api/rehabilitation/exceptions
 */
export const getExceptionReportsSchema = {
    description: 'Get exception reports with filtering and pagination',
    tags: ['Exception Reports'],
    querystring: {
        type: 'object',
        properties: {}
    },
    response: {
        200: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'success' },
                summary: {
                    type: 'object',
                    properties: {
                        total: { type: 'integer' },
                        critical: { type: 'integer' },
                        high: { type: 'integer' },
                        medium: { type: 'integer' },
                        low: { type: 'integer' }
                    }
                },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            patientName: { type: 'string' },
                            patientId: { type: 'string' },
                            exceptionType: { type: 'string' },
                            severity: { type: 'string' },
                            dateFlagged: { type: 'string' },
                            therapistName: { type: 'string' },
                            therapistId: { type: 'string' },
                            notes: { type: 'string' },
                            actionTaken: { type: 'boolean' },
                            status: { type: 'string', enum: ['Pending', 'Resolved'] },
                            avatar: { type: 'string' }
                        }
                    }
                }
            }
        },
        500: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'string' }
            }
        }
    }
};

/**
 * Schema for resolving an exception
 * PUT /api/rehabilitation/exceptions/:id/resolve
 */
export const resolveExceptionSchema = {
    description: 'Mark an exception as resolved with action notes',
    tags: ['Exception Reports'],
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { 
                type: 'string', 
                description: 'Exception ID (e.g., EXP-MS-123)' 
            }
        }
    },
    body: {
        type: 'object',
        required: ['actionTaken'],
        properties: {
            actionTaken: { 
                type: 'boolean', 
                description: 'Whether action has been taken' 
            },
            adminNotes: { 
                type: 'string', 
                description: 'Notes about the action taken',
                maxLength: 1000
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'success' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        actionTaken: { type: 'boolean' },
                        adminNotes: { type: 'string' },
                        resolvedBy: { type: 'string' },
                        resolvedAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        },
        400: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                message: { type: 'string' }
            }
        },
        500: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'string' }
            }
        }
    }
};
