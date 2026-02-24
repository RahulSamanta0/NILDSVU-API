/**
 * GRN Controller
 *
 * Purpose: Request handlers for Goods Receipt Note operations
 */

import * as grnService from './grn.service.js';

export async function createGRN(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const userId = request.user?.user_id || null;
        const grn = await grnService.createGRN(request.server.prisma, tenantId, userId, request.body);
        return reply.code(201).send(grn);
    } catch (error) {
        request.log.error(error, 'Error creating GRN');
        if (error.message === 'PO_NOT_FOUND')
            return reply.code(404).send({ error: 'Purchase order not found', message: error.message });
        return reply.code(500).send({ error: 'Failed to create GRN', message: error.message });
    }
}

export async function listGRNs(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const grns = await grnService.listGRNs(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(grns);
    } catch (error) {
        request.log.error(error, 'Error listing GRNs');
        return reply.code(500).send({ error: 'Failed to fetch GRNs', message: error.message });
    }
}

export async function getGRN(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const { id } = request.params;
        const grn = await grnService.getGRNById(request.server.prisma, tenantId, id);
        return reply.code(200).send(grn);
    } catch (error) {
        request.log.error(error, 'Error fetching GRN');
        if (error.message === 'GRN_NOT_FOUND')
            return reply.code(404).send({ error: 'GRN not found', message: error.message });
        return reply.code(500).send({ error: 'Failed to fetch GRN', message: error.message });
    }
}

export async function verifyGRN(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const userId = request.user?.user_id || null;
        const { id } = request.params;
        const result = await grnService.verifyGRN(
            request.server.prisma, tenantId, userId, id, request.body?.notes
        );
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error verifying GRN');
        if (error.message === 'GRN_NOT_FOUND')
            return reply.code(404).send({ error: 'GRN not found', message: error.message });
        if (error.message === 'GRN_ALREADY_PROCESSED')
            return reply.code(409).send({ error: 'GRN has already been processed', message: error.message });
        return reply.code(500).send({ error: 'Failed to verify GRN', message: error.message });
    }
}
