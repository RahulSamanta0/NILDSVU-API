/**
 * Beds Controllers
 * 
 * Purpose: Request handlers for bed CRUD operations
 */

import * as bedService from './beds.service.js';

/**
 * POST /beds
 */
export async function createBed(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;

        const bed = await bedService.createBed(
            request.server.prisma,
            tenantId,
            request.body
        );

        return reply.code(201).send(bed);
    } catch (error) {
        request.log.error(error, 'Error creating bed');

        if (error.message === 'WARD_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Ward not found',
                message: error.message
            });
        }

        if (error.message === 'BED_NUMBER_EXISTS') {
            return reply.code(409).send({
                error: 'Bed number already exists in this ward',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to create bed',
            message: error.message
        });
    }
}

/**
 * GET /beds
 */
export async function listBeds(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;

        const beds = await bedService.listBeds(
            request.server.prisma,
            tenantId,
            request.query
        );

        return reply.code(200).send(beds);
    } catch (error) {
        request.log.error(error, 'Error fetching beds');
        return reply.code(500).send({
            error: 'Failed to fetch beds',
            message: error.message
        });
    }
}

/**
 * GET /beds/:id
 */
export async function getBed(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const bed = await bedService.getBedById(
            request.server.prisma,
            tenantId,
            id
        );

        return reply.code(200).send(bed);
    } catch (error) {
        request.log.error(error, 'Error fetching bed');

        if (error.message === 'BED_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Bed not found',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to fetch bed',
            message: error.message
        });
    }
}

/**
 * POST /beds/:id/update
 */
export async function updateBed(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const bed = await bedService.updateBed(
            request.server.prisma,
            tenantId,
            id,
            request.body
        );

        return reply.code(200).send(bed);
    } catch (error) {
        request.log.error(error, 'Error updating bed');

        if (error.message === 'BED_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Bed not found',
                message: error.message
            });
        }

        if (error.message === 'WARD_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Ward not found',
                message: error.message
            });
        }

        if (error.message === 'BED_NUMBER_EXISTS') {
            return reply.code(409).send({
                error: 'Bed number already exists in this ward',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to update bed',
            message: error.message
        });
    }
}

/**
 * POST /beds/:id/delete
 */
export async function deleteBed(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const result = await bedService.deleteBed(
            request.server.prisma,
            tenantId,
            id
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error deleting bed');

        if (error.message === 'BED_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Bed not found',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to delete bed',
            message: error.message
        });
    }
}
