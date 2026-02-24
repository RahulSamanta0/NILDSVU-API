/**
 * Reports Controller
 *
 * Purpose: Request handlers for store & procurement reports
 */

import * as reportService from './reports.service.js';

export async function getGRNRegister(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const data = await reportService.getGRNRegister(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(data);
    } catch (error) {
        request.log.error(error, 'Error generating GRN register');
        return reply.code(500).send({ error: 'Failed to generate GRN register', message: error.message });
    }
}

export async function getExpiryReport(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const data = await reportService.getExpiryReport(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(data);
    } catch (error) {
        request.log.error(error, 'Error generating expiry report');
        return reply.code(500).send({ error: 'Failed to generate expiry report', message: error.message });
    }
}

export async function getReorderReport(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const data = await reportService.getReorderReport(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(data);
    } catch (error) {
        request.log.error(error, 'Error generating reorder report');
        return reply.code(500).send({ error: 'Failed to generate reorder report', message: error.message });
    }
}

export async function getPurchaseSummary(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const data = await reportService.getPurchaseSummary(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(data);
    } catch (error) {
        request.log.error(error, 'Error generating purchase summary');
        return reply.code(500).send({ error: 'Failed to generate purchase summary', message: error.message });
    }
}

export async function getStockLedger(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const data = await reportService.getStockLedger(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(data);
    } catch (error) {
        request.log.error(error, 'Error generating stock ledger');
        if (error.message === 'ITEM_ID_REQUIRED')
            return reply.code(400).send({ error: 'item_id query param is required', message: error.message });
        return reply.code(500).send({ error: 'Failed to generate stock ledger', message: error.message });
    }
}
