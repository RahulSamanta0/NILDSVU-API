/**
 * Purchase Orders Routes
 *
 * Purpose:
 * - REST API endpoints for purchase order management
 * - Handles PO creation, approval, and cancellation cycles
 */

import * as poController from './purchase-orders.controller.js';
import * as poSchema from './purchase-orders.schema.js';

export default async function purchaseOrderRoutes(fastify, opts) {
    // Create Purchase Order
    fastify.post('/', { schema: poSchema.createPOSchema }, async (request, reply) => {
        return poController.createPO(request, reply);
    });

    // List Purchase Orders
    fastify.get('/', { schema: poSchema.listPOsSchema }, async (request, reply) => {
        return poController.listPOs(request, reply);
    });

    // Get PO details
    fastify.get('/:id', { schema: poSchema.getPOSchema }, async (request, reply) => {
        return poController.getPO(request, reply);
    });

    // Update PO
    fastify.post('/:id/update', { schema: poSchema.updatePOSchema }, async (request, reply) => {
        return poController.updatePO(request, reply);
    });

    // Approve PO
    fastify.post('/:id/approve', { schema: poSchema.approvePOSchema }, async (request, reply) => {
        return poController.approvePO(request, reply);
    });

    // Cancel PO
    fastify.post('/:id/cancel', { schema: poSchema.cancelPOSchema }, async (request, reply) => {
        return poController.cancelPO(request, reply);
    });
}
