/**
 * Authentication Schemas
 * 
 * Purpose:
 * - Define JSON schemas for request/response validation
 * - Ensure data integrity and type safety
 * - Provide automatic API documentation
 */

// Registration Schema
export const registerSchema = {
    description: 'Register a new staff member',
    tags: ['Authentication'],
    body: {
        type: 'object',
        required: ['tenant_id', 'username', 'email', 'password', 'role_id'],
        properties: {
            tenant_id: { 
                type: 'integer',
                minimum: 1,
                description: 'Tenant/Organization ID'
            },
            username: { 
                type: 'string',
                minLength: 3,
                maxLength: 100,
                description: 'Unique username for login'
            },
            email: { 
                type: 'string',
                format: 'email',
                maxLength: 255,
                description: 'Staff email address'
            },
            password: { 
                type: 'string',
                minLength: 8,
                maxLength: 100,
                description: 'Password (min 8 characters)'
            },
            role_id: { 
                type: 'integer',
                minimum: 1,
                description: 'Role ID (employee_id will be auto-generated based on role)'
            },
            facility_id: { 
                type: 'integer',
                minimum: 1,
                description: 'Facility ID (optional)'
            }
        }
    },
    response: {
        201: {
            description: 'Staff registered successfully',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        user_id: { type: 'integer' },
                        tenant_id: { type: 'integer' },
                        username: { type: 'string' },
                        email: { type: 'string' },
                        employee_id: { type: 'string' },
                        facility_id: { type: 'integer' },
                        is_active: { type: 'boolean' },
                        created_at: { type: 'string' }
                    }
                }
            }
        },
        400: {
            description: 'Bad request - validation error',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                message: { type: 'string' }
            }
        },
        409: {
            description: 'Conflict - username or email already exists',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                message: { type: 'string' }
            }
        }
    }
};

// Login Schema
export const loginSchema = {
    description: 'Login with username/email and password',
    tags: ['Authentication'],
    body: {
        type: 'object',
        required: ['tenant_id', 'identifier', 'password'],
        properties: {
            tenant_id: { 
                type: 'integer',
                minimum: 1,
                description: 'Tenant/Organization ID'
            },
            identifier: { 
                type: 'string',
                minLength: 3,
                description: 'Username or email'
            },
            password: { 
                type: 'string',
                minLength: 1,
                description: 'User password'
            }
        }
    },
    response: {
        200: {
            description: 'Login successful',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        token: { type: 'string', description: 'JWT access token' },
                        user: {
                            type: 'object',
                            properties: {
                                user_id: { type: 'integer' },
                                tenant_id: { type: 'integer' },
                                username: { type: 'string' },
                                email: { type: 'string' },
                                employee_id: { type: 'string' },
                                facility_id: { type: ['integer', 'null'] },
                                is_active: { type: 'boolean' },
                                is_verified: { type: 'boolean' },
                                last_login_at: { type: ['string', 'null'] },
                                role: {
                                    type: ['object', 'null'],
                                    properties: {
                                        role_id: { type: 'integer' },
                                        role_name: { type: 'string' },
                                        role_code: { type: 'string' },
                                        description: { type: ['string', 'null'] }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        401: {
            description: 'Unauthorized - invalid credentials',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                message: { type: 'string' }
            }
        },
        404: {
            description: 'Tenant not found',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                message: { type: 'string' }
            }
        }
    }
};

// Get Profile Schema (Protected Route)
export const getProfileSchema = {
    description: 'Get current authenticated user profile',
    tags: ['Authentication'],
    security: [{ bearerAuth: [] }],
    response: {
        200: {
            description: 'Profile retrieved successfully',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        user_id: { type: 'integer' },
                        tenant_id: { type: 'integer' },
                        username: { type: 'string' },
                        email: { type: 'string' },
                        employee_id: { type: 'string' },
                        facility_id: { type: 'integer' },
                        is_active: { type: 'boolean' },
                        is_verified: { type: 'boolean' },
                        last_login_at: { type: 'string' }
                    }
                }
            }
        },
        401: {
            description: 'Unauthorized - invalid or missing token',
            type: 'object',
            properties: {
                error: { type: 'string' },
                message: { type: 'string' }
            }
        }
    }
};
