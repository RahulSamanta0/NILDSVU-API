/**
 * Indents Routes
 *
 * Purpose:
 * - REST API endpoints for indent request management
 * - Handles internal department requests and approval lifecycles
 */

import * as indentController from './indents.controller.js';
import * as indentSchema from './indents.schema.js';

export default async function indentRoutes(fastify, opts) {
    // Create indent
    fastify.post('/', { schema: indentSchema.createIndentSchema }, async (request, reply) => {
        return indentController.createIndent(request, reply);
    });

    // List indents
    fastify.get('/', { schema: indentSchema.listIndentsSchema }, async (request, reply) => {
        return indentController.listIndents(request, reply);
    });

    // Get indent details
    fastify.get('/:id', { schema: indentSchema.getIndentSchema }, async (request, reply) => {
        return indentController.getIndent(request, reply);
    });

    // Approve indent (stock deduction)
    fastify.post('/:id/approve', { schema: indentSchema.approveIndentSchema }, async (request, reply) => {
        return indentController.approveIndent(request, reply);
    });

    // Reject indent
    fastify.post('/:id/reject', { schema: indentSchema.rejectIndentSchema }, async (request, reply) => {
        return indentController.rejectIndent(request, reply);
    });

    // Update pending indent
    fastify.post('/:id/update', { schema: indentSchema.updateIndentSchema }, async (request, reply) => {
        return indentController.updateIndent(request, reply);
    });
}
