/**
 * Doctor Schedule Management Routes
 */

import * as scheduleController from './schedule-management.controller.js';
import * as scheduleSchema from './schedule-management.schema.js';

export default async function scheduleManagementRoutes(fastify, opts) {
    fastify.post('/create', {
        schema: scheduleSchema.createScheduleSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return scheduleController.createSchedule(request, reply);
        }
    });

    fastify.post('/bulk-create', {
        schema: scheduleSchema.bulkCreateScheduleSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return scheduleController.bulkCreateSchedules(request, reply);
        }
    });

    fastify.get('/', {
        schema: scheduleSchema.listScheduleSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return scheduleController.listSchedules(request, reply);
        }
    });

    fastify.get('/doctor/:doctor_id/availability', {
        schema: scheduleSchema.getDoctorAvailabilitySchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return scheduleController.getDoctorAvailability(request, reply);
        }
    });

    fastify.post('/:id/update', {
        schema: scheduleSchema.updateScheduleSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return scheduleController.updateSchedule(request, reply);
        }
    });

    fastify.post('/:id/toggle-availability', {
        schema: scheduleSchema.toggleScheduleAvailabilitySchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return scheduleController.toggleScheduleAvailability(request, reply);
        }
    });

    fastify.delete('/:id', {
        schema: scheduleSchema.deleteScheduleSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return scheduleController.deleteSchedule(request, reply);
        }
    });
}
