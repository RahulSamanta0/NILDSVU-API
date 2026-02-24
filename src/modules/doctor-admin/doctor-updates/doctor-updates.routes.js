/**
 * Doctor Admin Routes
 *
 * Purpose: Define endpoints for doctor-related pending staff requests
 */

import * as doctorUpdatesController from './doctor-updates.controller.js';
import * as doctorUpdatesSchema from './doctor-updates.schema.js';

export default async function doctorUpdatesRoutes(fastify, opts) {
    fastify.get('/pending', {
        schema: doctorUpdatesSchema.listPendingDoctorStaffSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return doctorUpdatesController.listPendingDoctorStaff(request, reply);
        }
    });
}
