/**
 * Beds Routes
 * 
 * Purpose: Define REST API endpoints for bed management
 * Note: Uses only POST and GET methods (no PUT/DELETE)
 */

import * as bedController from './beds.controller.js';
import * as bedSchema from './beds.schema.js';

export default async function bedRoutes(fastify, opts) {

    // Create new bed
    fastify.post('/', {
        schema: bedSchema.createBedSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return bedController.createBed(request, reply);
        }
    });

    // List all beds
    fastify.get('/', {
        schema: bedSchema.listBedsSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return bedController.listBeds(request, reply);
        }
    });

    // Get bed by ID
    fastify.get('/:id', {
        schema: bedSchema.getBedSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return bedController.getBed(request, reply);
        }
    });

    // Update bed (POST instead of PUT)
    fastify.post('/:id/update', {
        schema: bedSchema.updateBedSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return bedController.updateBed(request, reply);
        }
    });

    fastify.put('/:id', {
        schema: bedSchema.updateBedSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return bedController.updateBed(request, reply);
        }
    });

    fastify.patch('/:id', {
        schema: bedSchema.updateBedSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return bedController.updateBed(request, reply);
        }
    });

    // Delete bed (POST instead of DELETE)
    fastify.post('/:id/delete', {
        schema: bedSchema.deleteBedSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return bedController.deleteBed(request, reply);
        }
    });

    fastify.delete('/:id', {
        schema: bedSchema.deleteBedSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return bedController.deleteBed(request, reply);
        }
    });
}
