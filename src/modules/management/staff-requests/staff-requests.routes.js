/**
 * Staff Requests Routes
 *
 * Purpose: Define REST API endpoints for management staff request approvals
 */

import * as staffRequestsController from './staff-requests.controller.js';
import * as staffRequestsSchema from './staff-requests.schema.js';

export default async function staffRequestsRoutes(fastify, opts) {

    fastify.get('/', {
        schema: staffRequestsSchema.listStaffRequestsSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return staffRequestsController.listStaffRequests(request, reply);
        }
    });

    fastify.get('/recent', {
        schema: staffRequestsSchema.listRecentStaffRequestsSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return staffRequestsController.listRecentStaffRequests(request, reply);
        }
    });

    fastify.post('/:id/approve', {
        schema: staffRequestsSchema.approveStaffRequestSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return staffRequestsController.approveStaffRequest(request, reply);
        }
    });

    fastify.post('/:id/reject', {
        schema: staffRequestsSchema.rejectStaffRequestSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return staffRequestsController.rejectStaffRequest(request, reply);
        }
    });
}
