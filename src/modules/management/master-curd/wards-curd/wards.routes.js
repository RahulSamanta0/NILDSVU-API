/**
 * Wards Routes
 * 
 * Purpose: Define REST API endpoints for ward management
 * Note: Uses only POST and GET methods (no PUT/DELETE)
 */

import * as wardController from './wards.controller.js';
import * as wardSchema from './wards.schema.js';

export default async function wardRoutes(fastify, opts) {

    // Create new ward
    fastify.post('/', {
        schema: wardSchema.createWardSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return wardController.createWard(request, reply);
        }
    });

    // List all wards
    fastify.get('/', {
        schema: wardSchema.listWardsSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return wardController.listWards(request, reply);
        }
    });

    // Get ward by ID
    fastify.get('/:id', {
        schema: wardSchema.getWardSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return wardController.getWard(request, reply);
        }
    });

    // Update ward (POST instead of PUT)
    fastify.post('/:id/update', {
        schema: wardSchema.updateWardSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return wardController.updateWard(request, reply);
        }
    });

    fastify.put('/:id', {
        schema: wardSchema.updateWardSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return wardController.updateWard(request, reply);
        }
    });

    fastify.patch('/:id', {
        schema: wardSchema.updateWardSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return wardController.updateWard(request, reply);
        }
    });

    // Delete ward (POST instead of DELETE)
    fastify.post('/:id/delete', {
        schema: wardSchema.deleteWardSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return wardController.deleteWard(request, reply);
        }
    });

    fastify.delete('/:id', {
        schema: wardSchema.deleteWardSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return wardController.deleteWard(request, reply);
        }
    });
}
