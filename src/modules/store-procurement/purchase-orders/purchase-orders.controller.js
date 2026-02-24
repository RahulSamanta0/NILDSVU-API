/**
 * Purchase Orders Controller
 *
 * Purpose:
 * - Request handlers for purchase order operations
 * - Manages PO lifecycle requests from creation to cancellation
 */

import * as poService from './purchase-orders.service.js';

export async function createPO(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const userId = request.user?.user_id || null;
        const po = await poService.createPO(request.server.prisma, tenantId, userId, request.body);
        return reply.code(201).send(po);
    } catch (error) {
        request.log.error(error, 'Error creating purchase order');
        if (error.message === 'VENDOR_NOT_FOUND')
            return reply.code(404).send({ error: 'Vendor not found or inactive', message: error.message });
        return reply.code(500).send({ error: 'Failed to create purchase order', message: error.message });
    }
}

export async function listPOs(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const pos = await poService.listPOs(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(pos);
    } catch (error) {
        request.log.error(error, 'Error listing purchase orders');
        return reply.code(500).send({ error: 'Failed to fetch purchase orders', message: error.message });
    }
}

export async function getPO(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const { id } = request.params;
        const po = await poService.getPOById(request.server.prisma, tenantId, id);
        return reply.code(200).send(po);
    } catch (error) {
        request.log.error(error, 'Error fetching purchase order');
        if (error.message === 'PO_NOT_FOUND')
            return reply.code(404).send({ error: 'Purchase order not found', message: error.message });
        return reply.code(500).send({ error: 'Failed to fetch purchase order', message: error.message });
    }
}

export async function updatePO(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const { id } = request.params;
        const result = await poService.updatePO(request.server.prisma, tenantId, id, request.body);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error updating purchase order');
        if (error.message === 'PO_NOT_FOUND')
            return reply.code(404).send({ error: 'Purchase order not found', message: error.message });
        if (error.message === 'PO_CANNOT_BE_UPDATED')
            return reply.code(409).send({ error: 'Only pending/approved orders can be updated', message: error.message });
        return reply.code(500).send({ error: 'Failed to update purchase order', message: error.message });
    }
}

export async function approvePO(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const userId = request.user?.user_id || null;
        const { id } = request.params;
        const result = await poService.approvePO(request.server.prisma, tenantId, userId, id);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error approving purchase order');
        if (error.message === 'PO_NOT_FOUND')
            return reply.code(404).send({ error: 'Purchase order not found', message: error.message });
        if (error.message === 'PO_NOT_PENDING')
            return reply.code(409).send({ error: 'Only pending orders can be approved', message: error.message });
        return reply.code(500).send({ error: 'Failed to approve purchase order', message: error.message });
    }
}

export async function cancelPO(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const userId = request.user?.user_id || null;
        const { id } = request.params;
        const result = await poService.cancelPO(
            request.server.prisma, tenantId, userId, id, request.body?.cancellation_reason
        );
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error cancelling purchase order');
        if (error.message === 'PO_NOT_FOUND')
            return reply.code(404).send({ error: 'Purchase order not found', message: error.message });
        if (error.message === 'PO_CANNOT_BE_CANCELLED')
            return reply.code(409).send({ error: 'This order cannot be cancelled', message: error.message });
        return reply.code(500).send({ error: 'Failed to cancel purchase order', message: error.message });
    }
}
