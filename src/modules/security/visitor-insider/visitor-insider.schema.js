/**
 * Visitor Insider Schemas
 * 
 * Purpose:
 * - Define JSON schemas for request/response validation
 * - Ensure data integrity and type safety
 * - Provide automatic API documentation
 */

// Get All Visitors Schema
export const getAllVisitorsSchema = {
    description: 'Get all visitors with pagination and optional filters',
    tags: ['Security - Visitor Insider'],
    querystring: {
        type: 'object',
        properties: {
            page: {
                type: 'integer',
                minimum: 1,
                default: 1,
                description: 'Page number for pagination'
            },
            limit: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 50,
                description: 'Number of records per page'
            },
            status: {
                type: 'string',
                enum: ['all', 'checkin', 'checkout'],
                default: 'all',
                description: 'Filter by visitor status (all, checkin, checkout)'
            },
            search: {
                type: 'string',
                description: 'Search by visitor name, mobile, or pass number'
            },
            startDate: {
                type: 'string',
                format: 'date-time',
                description: 'Filter by entry time start date (ISO 8601 format)'
            },
            endDate: {
                type: 'string',
                format: 'date-time',
                description: 'Filter by entry time end date (ISO 8601 format)'
            }
        }
    },
    response: {
        200: {
            description: 'Successful response',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            entry_id: { type: 'integer' },
                            visitor_pass_number: { type: 'string' },
                            visitor_name: { type: 'string' },
                            mobile: { type: 'string' },
                            id_type: { type: 'string' },
                            id_number: { type: 'string' },
                            department: { type: 'string' },
                            purpose: { type: 'string' },
                            gate_number: { type: 'string' },
                            entry_time: { type: 'string' },
                            expected_exit_time: { type: 'string' },
                            guard_name: { type: 'string' },
                            status: { type: 'string' },
                            created_at: { type: 'string' }
                        }
                    }
                },
                pagination: {
                    type: 'object',
                    properties: {
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        totalPages: { type: 'integer' },
                        hasNextPage: { type: 'boolean' },
                        hasPrevPage: { type: 'boolean' }
                    }
                }
            }
        }
    }
};

// Get Visitor Statistics Schema
export const getVisitorStatsSchema = {
    description: 'Get visitor statistics by status',
    tags: ['Security - Visitor Insider'],
    response: {
        200: {
            description: 'Successful response',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        totalVisitors: { type: 'integer', description: 'Total number of all visitors' },
                        checkedIn: { type: 'integer', description: 'Number of currently checked-in visitors' },
                        checkedOut: { type: 'integer', description: 'Number of checked-out visitors' }
                    }
                }
            }
        }
    }
};

// Checkout Visitor Schema
export const checkoutVisitorSchema = {
    description: 'Checkout a visitor by pass number',
    tags: ['Security - Visitor Insider'],
    params: {
        type: 'object',
        required: ['passNumber'],
        properties: {
            passNumber: {
                type: 'string',
                description: 'Visitor pass number (e.g., VP-20260220-0001)'
            }
        }
    },
    response: {
        200: {
            description: 'Successful response',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        entry_id: { type: 'integer' },
                        visitor_pass_number: { type: 'string' },
                        visitor_name: { type: 'string' },
                        mobile: { type: 'string' },
                        status: { type: 'string' },
                        entry_time: { type: 'string' },
                        created_at: { type: 'string' }
                    }
                }
            }
        }
    }
};

// Create Revisit Schema
export const createRevisitSchema = {
    description: 'Create a new visit entry based on a previous visit',
    tags: ['Security - Visitor Insider'],
    body: {
        type: 'object',
        required: ['previousPassNumber'],
        properties: {
            previousPassNumber: {
                type: 'string',
                description: 'Previous visitor pass number to copy data from'
            },
            department: {
                type: 'string',
                maxLength: 100,
                description: 'Department to visit (optional, uses previous if not provided)'
            },
            purpose: {
                type: 'string',
                description: 'Purpose of visit (optional, uses previous if not provided)'
            },
            gateNumber: {
                type: 'string',
                maxLength: 50,
                description: 'Gate number for entry (optional, uses previous if not provided)'
            },
            guardName: {
                type: 'string',
                maxLength: 100,
                description: 'Name of the security guard (optional)'
            }
        }
    },
    response: {
        201: {
            description: 'Successful response',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        entry_id: { type: 'integer' },
                        visitor_pass_number: { type: 'string', description: 'Newly generated pass number' },
                        visitor_name: { type: 'string' },
                        mobile: { type: 'string' },
                        id_type: { type: 'string' },
                        id_number: { type: 'string' },
                        department: { type: 'string' },
                        purpose: { type: 'string' },
                        gate_number: { type: 'string' },
                        entry_time: { type: 'string' },
                        guard_name: { type: 'string' },
                        status: { type: 'string' },
                        created_at: { type: 'string' }
                    }
                }
            }
        }
    }
};

// Get Visitor Dashboard Statistics Schema
export const getVisitorDashboardStatsSchema = {
    description: 'Get visitor dashboard statistics including total inside, average duration, overstaying count, and alerts',
    tags: ['Security - Visitor Insider'],
    response: {
        200: {
            description: 'Successful response',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        totalInside: { type: 'integer', description: 'Total number of visitors currently inside' },
                        avgDuration: { type: 'string', description: 'Average duration of stay (e.g., "2h 30m")' },
                        overstaying: { type: 'integer', description: 'Number of visitors overstaying (> 4 hours)' },
                        flaggedAlerts: { type: 'integer', description: 'Number of flagged alerts (> 8 hours + security incidents)' }
                    }
                }
            }
        }
    }
};
