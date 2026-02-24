/**
 * Staff Master Routes
 *
 * Purpose: Define REST API endpoints for staff request submissions and listing
 */

import * as staffMasterController from './staff-master.controller.js';
import * as staffMasterSchema from './staff-master.schema.js';

export default async function staffMasterRoutes(fastify, opts) {

    fastify.post('/requests', {
        schema: staffMasterSchema.submitStaffRequestSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return staffMasterController.submitStaffRequest(request, reply);
        }
    });

    fastify.get('/requests', {
        schema: staffMasterSchema.listStaffRequestsSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return staffMasterController.listStaffRequests(request, reply);
        }
    });

    fastify.get('/staff', {
        schema: staffMasterSchema.listAllStaffSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return staffMasterController.listAllStaff(request, reply);
        }
    });

    fastify.get('/staff/:id', {
        schema: staffMasterSchema.getStaffDetailsSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return staffMasterController.getStaffDetails(request, reply);
        }
    });

    fastify.post('/staff/:id/update', {
        schema: staffMasterSchema.updateStaffDetailsSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return staffMasterController.updateStaffDetails(request, reply);
        }
    });

    fastify.put('/staff/:id', {
        schema: staffMasterSchema.updateStaffDetailsSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return staffMasterController.updateStaffDetails(request, reply);
        }
    });

    fastify.patch('/staff/:id', {
        schema: staffMasterSchema.updateStaffDetailsSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return staffMasterController.updateStaffDetails(request, reply);
        }
    });

    fastify.post('/requests/:id/documents', {
        schema: staffMasterSchema.addStaffRequestDocumentSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return staffMasterController.addStaffRequestDocument(request, reply);
        }
    });

    fastify.get('/requests/:id/documents', {
        schema: staffMasterSchema.listStaffRequestDocumentsSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return staffMasterController.listStaffRequestDocuments(request, reply);
        }
    });
}
