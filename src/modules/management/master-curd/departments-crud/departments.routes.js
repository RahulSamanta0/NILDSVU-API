/**
 * Departments Routes
 * 
 * Purpose: Define REST API endpoints for department management
 * Note: Uses only POST and GET methods (no PUT/DELETE)
 */

import * as departmentController from './departments.controller.js';
import * as departmentSchema from './departments.schema.js';

export default async function departmentRoutes(fastify, opts) {

    // Create new department
    fastify.post('/', {
        schema: departmentSchema.createDepartmentSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return departmentController.createDepartment(request, reply);
        }
    });

    // List all departments
    fastify.get('/', {
        schema: departmentSchema.listDepartmentsSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return departmentController.listDepartments(request, reply);
        }
    });

    // Get department by ID
    fastify.get('/:id', {
        schema: departmentSchema.getDepartmentSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return departmentController.getDepartment(request, reply);
        }
    });

    // Update department (POST instead of PUT)
    fastify.post('/:id/update', {
        schema: departmentSchema.updateDepartmentSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return departmentController.updateDepartment(request, reply);
        }
    });

    fastify.put('/:id', {
        schema: departmentSchema.updateDepartmentSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return departmentController.updateDepartment(request, reply);
        }
    });

    fastify.patch('/:id', {
        schema: departmentSchema.updateDepartmentSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return departmentController.updateDepartment(request, reply);
        }
    });

    // Delete department (POST instead of DELETE)
    fastify.post('/:id/delete', {
        schema: departmentSchema.deleteDepartmentSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return departmentController.deleteDepartment(request, reply);
        }
    });

    fastify.delete('/:id', {
        schema: departmentSchema.deleteDepartmentSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return departmentController.deleteDepartment(request, reply);
        }
    });
}
