/**
 * OPD Control Center Routes
 *
 * Purpose: Define REST API endpoints for OPD control center snapshots
 */

import * as opdControlController from './opd-control.controller.js';
import * as opdControlSchema from './opd-control.schema.js';

export default async function opdControlRoutes(fastify, opts) {

    fastify.get('/metrics', {
        schema: opdControlSchema.metricsSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return opdControlController.getMetrics(request, reply);
        }
    });

    fastify.get('/departments', {
        schema: opdControlSchema.departmentsSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return opdControlController.listDepartmentStatus(request, reply);
        }
    });

    fastify.get('/doctors', {
        schema: opdControlSchema.doctorsSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return opdControlController.listDoctors(request, reply);
        }
    });

    fastify.get('/departments/:id/doctors', {
        schema: opdControlSchema.departmentDoctorsSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return opdControlController.listDepartmentDoctors(request, reply);
        }
    });

    fastify.get('/doctors/:id/examined', {
        schema: opdControlSchema.doctorExaminedSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return opdControlController.listDoctorExamined(request, reply);
        }
    });
}
