/**
 * Duty Roster Routes
 */

import * as dutyRosterController from './duty-roster.controller.js';
import * as dutyRosterSchema from './duty-roster.schema.js';

export default async function dutyRosterRoutes(fastify, opts) {
    fastify.post('/create', {
        schema: dutyRosterSchema.createDutyRosterSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return dutyRosterController.createDutyRoster(request, reply);
        }
    });

    fastify.post('/bulk-create', {
        schema: dutyRosterSchema.bulkCreateDutyRosterSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return dutyRosterController.bulkCreateDutyRoster(request, reply);
        }
    });

    fastify.get('/', {
        schema: dutyRosterSchema.listDutyRosterSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return dutyRosterController.listDutyRoster(request, reply);
        }
    });

    fastify.post('/:id/update', {
        schema: dutyRosterSchema.updateDutyRosterSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return dutyRosterController.updateDutyRoster(request, reply);
        }
    });

    fastify.post('/:id/toggle-availability', {
        schema: dutyRosterSchema.toggleDutyRosterAvailabilitySchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return dutyRosterController.toggleDutyRosterAvailability(request, reply);
        }
    });
}
