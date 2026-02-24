/**
 * Authentication Controllers
 * 
 * Purpose:
 * - Handle HTTP requests and responses
 * - Call service layer for business logic
 * - Format responses and handle errors
 */

import * as service from './authstaff.service.js';

/**
 * Register a new staff member
 * POST /auth/register
 */
export async function register(request, reply) {
    try {
        const user = await service.registerStaff(
            request.server.prisma,
            request.server.bcrypt,
            request.body
        );

        return reply.code(201).send({
            success: true,
            message: 'Staff registered successfully',
            data: user
        });
    } catch (error) {
        request.log.error(error);

        // Handle specific errors
        if (error.message === 'TENANT_NOT_FOUND') {
            return reply.code(404).send({
                success: false,
                error: 'Tenant Not Found',
                message: 'The specified tenant does not exist'
            });
        }

        if (error.message === 'TENANT_INACTIVE') {
            return reply.code(403).send({
                success: false,
                error: 'Tenant Inactive',
                message: 'The specified tenant is not active'
            });
        }

        if (error.message === 'ROLE_NOT_FOUND') {
            return reply.code(404).send({
                success: false,
                error: 'Role Not Found',
                message: 'The specified role does not exist or is not active'
            });
        }

        if (error.message === 'USERNAME_EXISTS') {
            return reply.code(409).send({
                success: false,
                error: 'Username Exists',
                message: 'Username already exists for this tenant'
            });
        }

        if (error.message === 'EMAIL_EXISTS') {
            return reply.code(409).send({
                success: false,
                error: 'Email Exists',
                message: 'Email already exists for this tenant'
            });
        }

        // Generic error
        return reply.code(500).send({
            success: false,
            error: 'Internal Server Error',
            message: 'An error occurred during registration'
        });
    }
}

/**
 * Login staff member
 * POST /auth/login
 */
export async function login(request, reply) {
    try {
        const result = await service.loginStaff(
            request.server.prisma,
            request.server.bcrypt,
            request.server.jwt,
            request.body
        );

        return reply.code(200).send({
            success: true,
            message: 'Login successful',
            data: result
        });
    } catch (error) {
        request.log.error(error);

        // Handle specific errors
        if (error.message === 'TENANT_NOT_FOUND') {
            return reply.code(404).send({
                success: false,
                error: 'Tenant Not Found',
                message: 'The specified tenant does not exist'
            });
        }

        if (error.message === 'TENANT_INACTIVE') {
            return reply.code(403).send({
                success: false,
                error: 'Tenant Inactive',
                message: 'The specified tenant is not active'
            });
        }

        if (error.message === 'INVALID_CREDENTIALS') {
            return reply.code(401).send({
                success: false,
                error: 'Invalid Credentials',
                message: 'Username/email or password is incorrect'
            });
        }

        if (error.message === 'USER_INACTIVE') {
            return reply.code(403).send({
                success: false,
                error: 'User Inactive',
                message: 'Your account has been deactivated. Please contact administrator.'
            });
        }

        // Generic error
        return reply.code(500).send({
            success: false,
            error: 'Internal Server Error',
            message: 'An error occurred during login'
        });
    }
}

/**
 * Get current user profile
 * GET /auth/profile
 * Protected route - requires JWT token
 */
export async function getProfile(request, reply) {
    try {
        // JWT payload is available in request.user after authentication
        const { user_id, tenant_id } = request.user;

        const user = await service.getUserProfile(
            request.server.prisma,
            user_id,
            tenant_id
        );

        return reply.code(200).send({
            success: true,
            data: user
        });
    } catch (error) {
        request.log.error(error);

        if (error.message === 'USER_NOT_FOUND') {
            return reply.code(404).send({
                success: false,
                error: 'User Not Found',
                message: 'User profile not found'
            });
        }

        return reply.code(500).send({
            success: false,
            error: 'Internal Server Error',
            message: 'An error occurred while fetching profile'
        });
    }
}
