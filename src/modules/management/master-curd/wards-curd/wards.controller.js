/**
 * Wards Controllers
 * 
 * Purpose: Request handlers for ward CRUD operations
 */

import * as wardService from './wards.service.js';

/**
 * POST /wards
 */
export async function createWard(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;

        const ward = await wardService.createWard(
            request.server.prisma,
            tenantId,
            request.body
        );

        return reply.code(201).send(ward);
    } catch (error) {
        request.log.error(error, 'Error creating ward');

        if (error.message === 'WARD_CODE_EXISTS') {
            return reply.code(409).send({
                error: 'Ward code already exists',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to create ward',
            message: error.message
        });
    }
}

/**
 * GET /wards
 */
export async function listWards(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;

        const wards = await wardService.listWards(
            request.server.prisma,
            tenantId,
            request.query
        );

        return reply.code(200).send(wards);
    } catch (error) {
        request.log.error(error, 'Error fetching wards');
        return reply.code(500).send({
            error: 'Failed to fetch wards',
            message: error.message
        });
    }
}

/**
 * GET /wards/:id
 */
export async function getWard(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const ward = await wardService.getWardById(
            request.server.prisma,
            tenantId,
            id
        );

        return reply.code(200).send(ward);
    } catch (error) {
        request.log.error(error, 'Error fetching ward');

        if (error.message === 'WARD_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Ward not found',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to fetch ward',
            message: error.message
        });
    }
}

/**
 * POST /wards/:id/update
 */
export async function updateWard(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const ward = await wardService.updateWard(
            request.server.prisma,
            tenantId,
            id,
            request.body
        );

        return reply.code(200).send(ward);
    } catch (error) {
        request.log.error(error, 'Error updating ward');

        if (error.message === 'WARD_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Ward not found',
                message: error.message
            });
        }

        if (error.message === 'WARD_CODE_EXISTS') {
            return reply.code(409).send({
                error: 'Ward code already exists',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to update ward',
            message: error.message
        });
    }
}

/**
 * POST /wards/:id/delete
 */
export async function deleteWard(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const result = await wardService.deleteWard(
            request.server.prisma,
            tenantId,
            id
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error deleting ward');

        if (error.message === 'WARD_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Ward not found',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to delete ward',
            message: error.message
        });
    }
}
