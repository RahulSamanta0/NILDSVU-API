/**
 * GRN Routes
 *
 * Purpose:
 * - REST API endpoints for Goods Receipt Note management
 * - Handles goods receipt, verification, and automated stock updates
 */

import * as grnController from './grn.controller.js';
import * as grnSchema from './grn.schema.js';

export default async function grnRoutes(fastify, opts) {
    // Create GRN (Draft)
    fastify.post('/', { schema: grnSchema.createGRNSchema }, async (request, reply) => {
        return grnController.createGRN(request, reply);
    });

    // List GRNs
    fastify.get('/', { schema: grnSchema.listGRNsSchema }, async (request, reply) => {
        return grnController.listGRNs(request, reply);
    });

    // Get GRN details
    fastify.get('/:id', { schema: grnSchema.getGRNSchema }, async (request, reply) => {
        return grnController.getGRN(request, reply);
    });

    // Verify/Post GRN
    fastify.post('/:id/verify', { schema: grnSchema.verifyGRNSchema }, async (request, reply) => {
        return grnController.verifyGRN(request, reply);
    });
}
