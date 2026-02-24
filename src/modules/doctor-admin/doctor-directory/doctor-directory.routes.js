/**
 * Doctor Directory Routes
 *
 * Purpose: Define REST API endpoints for doctor directory management
 */

import * as doctorDirectoryController from './doctor-directory.controller.js';
import * as doctorDirectorySchema from './doctor-directory.schema.js';

export default async function doctorDirectoryRoutes(fastify, opts) {
    fastify.get('/', {
        schema: doctorDirectorySchema.listDoctorsSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return doctorDirectoryController.listDoctors(request, reply);
        }
    });

    fastify.get('/:id', {
        schema: doctorDirectorySchema.getDoctorSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return doctorDirectoryController.getDoctor(request, reply);
        }
    });

    fastify.post('/:id', {
        schema: doctorDirectorySchema.updateDoctorSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return doctorDirectoryController.updateDoctor(request, reply);
        }
    });

    fastify.put('/:id', {
        schema: doctorDirectorySchema.updateDoctorSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return doctorDirectoryController.updateDoctor(request, reply);
        }
    });

    fastify.patch('/:id', {
        schema: doctorDirectorySchema.updateDoctorSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return doctorDirectoryController.updateDoctor(request, reply);
        }
    });

}
