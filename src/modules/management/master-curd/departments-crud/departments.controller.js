/**
 * Departments Controllers
 * 
 * Purpose: Request handlers for department CRUD operations
 */

import * as departmentService from './departments.service.js';

/**
 * POST /departments
 */
export async function createDepartment(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;

        const department = await departmentService.createDepartment(
            request.server.prisma,
            tenantId,
            request.body
        );

        return reply.code(201).send(department);
    } catch (error) {
        request.log.error(error, 'Error creating department');

        if (error.message === 'DEPARTMENT_CODE_EXISTS') {
            return reply.code(409).send({
                error: 'Department code already exists',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to create department',
            message: error.message
        });
    }
}

/**
 * GET /departments
 */
export async function listDepartments(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;

        const departments = await departmentService.listDepartments(
            request.server.prisma,
            tenantId,
            request.query
        );

        return reply.code(200).send(departments);
    } catch (error) {
        request.log.error(error, 'Error fetching departments');
        return reply.code(500).send({
            error: 'Failed to fetch departments',
            message: error.message
        });
    }
}

/**
 * GET /departments/:id
 */
export async function getDepartment(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const department = await departmentService.getDepartmentById(
            request.server.prisma,
            tenantId,
            id
        );

        return reply.code(200).send(department);
    } catch (error) {
        request.log.error(error, 'Error fetching department');

        if (error.message === 'DEPARTMENT_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Department not found',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to fetch department',
            message: error.message
        });
    }
}

/**
 * POST /:id/update
 */
export async function updateDepartment(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const department = await departmentService.updateDepartment(
            request.server.prisma,
            tenantId,
            id,
            request.body
        );

        return reply.code(200).send(department);
    } catch (error) {
        request.log.error(error, 'Error updating department');

        if (error.message === 'DEPARTMENT_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Department not found',
                message: error.message
            });
        }

        if (error.message === 'DEPARTMENT_CODE_EXISTS') {
            return reply.code(409).send({
                error: 'Department code already exists',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to update department',
            message: error.message
        });
    }
}

/**
 * POST /:id/delete
 */
export async function deleteDepartment(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const result = await departmentService.deleteDepartment(
            request.server.prisma,
            tenantId,
            id
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error deleting department');

        if (error.message === 'DEPARTMENT_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Department not found',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to delete department',
            message: error.message
        });
    }
}
