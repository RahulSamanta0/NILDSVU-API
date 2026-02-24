/**
 * Stock Routes
 *
 * Purpose:
 * - REST API endpoints for department stock management
 * - Handles stock visibility, reorder levels, and automated PO generation
 */

import * as stockController from './stock.controller.js';
import * as stockSchema from './stock.schema.js';

export default async function stockRoutes(fastify, opts) {
    // List department stock
    fastify.get('/', { schema: stockSchema.listStockSchema }, async (request, reply) => {
        return stockController.listStock(request, reply);
    });

    // Get items requiring reorder
    fastify.get('/reorder-list', { schema: stockSchema.reorderListSchema }, async (request, reply) => {
        return stockController.getReorderList(request, reply);
    });

    // Get specific stock item detail
    fastify.get('/:id', { schema: stockSchema.getStockSchema }, async (request, reply) => {
        return stockController.getStock(request, reply);
    });

    // Auto-generate reorder PO
    fastify.post('/reorder', { schema: stockSchema.createReorderPOSchema }, async (request, reply) => {
        return stockController.createReorderPO(request, reply);
    });
}
