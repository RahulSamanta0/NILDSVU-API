/**
 * Leave Management Routes
 */

import * as leaveManagementController from './leave-management.controller.js';
import * as leaveManagementSchema from './leave-management.schema.js';

export default async function leaveManagementRoutes(fastify, opts) {
    fastify.post('/requests', {
        schema: leaveManagementSchema.createLeaveRequestSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return leaveManagementController.createLeaveRequest(request, reply);
        }
    });

    fastify.get('/requests', {
        schema: leaveManagementSchema.listLeaveRequestsSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return leaveManagementController.listLeaveRequests(request, reply);
        }
    });

    fastify.get('/requests/:id', {
        schema: leaveManagementSchema.getLeaveRequestSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return leaveManagementController.getLeaveRequest(request, reply);
        }
    });

    fastify.post('/requests/:id/approve', {
        schema: leaveManagementSchema.approveLeaveRequestSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return leaveManagementController.approveLeaveRequest(request, reply);
        }
    });

    fastify.post('/requests/:id/reject', {
        schema: leaveManagementSchema.rejectLeaveRequestSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return leaveManagementController.rejectLeaveRequest(request, reply);
        }
    });

    fastify.get('/summary', {
        schema: leaveManagementSchema.leaveSummarySchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return leaveManagementController.leaveSummary(request, reply);
        }
    });
}
