/**
 * Vendor Entry Controllers
 * 
 * Purpose:
 * - Handle HTTP requests and responses
 * - Call service layer for business logic
 * - Format responses and handle errors
 */

import * as service from './vendor-entry.service.js';

/**
 * Create a new vendor entry
 * POST /security/vendor-entry
 */
export async function createVendorEntry(request, reply) {
    try {
        // Auto-extract tenant_id from authenticated user
        const vendor = await service.createVendorEntry(
            request.server.prisma,
            request.body,
            request.user
        );

        return reply.code(201).send({
            success: true,
            message: 'Vendor entry created successfully',
            data: vendor
        });
    } catch (error) {
        request.log.error(error);
        console.error('Vendor Entry Error:', error);

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
            message: 'Failed to create vendor entry',
            details: error.message
        });
    }
}
