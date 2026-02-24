/**
 * Visitor Entry Controllers
 * 
 * Purpose:
 * - Handle HTTP requests and responses
 * - Call service layer for business logic
 * - Format responses and handle errors
 */

import * as service from './visitor-entry.service.js';

/**
 * Create a new visitor entry
 * POST /security/visitor-entry
 */
export async function createVisitorEntry(request, reply) {
    try {
        // Auto-extract tenant_id from authenticated user
        const visitor = await service.createVisitorEntry(
            request.server.prisma,
            request.body,
            request.user
        );

        return reply.code(201).send({
            success: true,
            message: 'Visitor entry created successfully',
            data: visitor
        });
    } catch (error) {
        request.log.error(error);
        console.error('Visitor Entry Error:', error); // Additional logging

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

        // Generic error
        return reply.code(500).send({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to create visitor pass',
            details: error.message // Send error details for debugging
        });
    }
}
