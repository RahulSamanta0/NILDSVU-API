/**
 * Stock Controller
 *
 * Purpose:
 * - Request handlers for department stock operations
 * - Provides visibility into item stock levels and reorder alerts
 */

import * as stockService from './stock.service.js';

export async function listStock(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const stocks = await stockService.listStock(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(stocks);
    } catch (error) {
        request.log.error(error, 'Error listing stock');
        return reply.code(500).send({ error: 'Failed to fetch stock', message: error.message });
    }
}

export async function getStock(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const { id } = request.params;
        const stock = await stockService.getStockById(request.server.prisma, tenantId, id);
        return reply.code(200).send(stock);
    } catch (error) {
        request.log.error(error, 'Error fetching stock');
        if (error.message === 'STOCK_NOT_FOUND')
            return reply.code(404).send({ error: 'Stock record not found', message: error.message });
        return reply.code(500).send({ error: 'Failed to fetch stock', message: error.message });
    }
}

export async function getReorderList(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const list = await stockService.getReorderList(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(list);
    } catch (error) {
        request.log.error(error, 'Error fetching reorder list');
        return reply.code(500).send({ error: 'Failed to fetch reorder list', message: error.message });
    }
}

export async function createReorderPO(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const userId = request.user?.user_id || null;
        const po = await stockService.createReorderPO(request.server.prisma, tenantId, userId, request.body);
        return reply.code(201).send(po);
    } catch (error) {
        request.log.error(error, 'Error creating reorder PO');
        return reply.code(500).send({ error: 'Failed to create reorder purchase order', message: error.message });
    }
}
