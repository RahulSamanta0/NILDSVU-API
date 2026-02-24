/**
 * Doctor Directory Controllers
 *
 * Purpose: Request handlers for doctor directory management
 */

import * as doctorDirectoryService from './doctor-directory.service.js';

/**
 * GET /doctor-admin/doctor-directory
 */
export async function listDoctors(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;

        const result = await doctorDirectoryService.listDoctors(
            request.server.prisma,
            tenantId,
            request.query
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching doctors directory');
        return reply.code(500).send({
            error: 'Failed to fetch doctors directory',
            message: error.message
        });
    }
}

/**
 * GET /doctor-admin/doctor-directory/:id
 */
export async function getDoctor(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const result = await doctorDirectoryService.getDoctor(
            request.server.prisma,
            tenantId,
            id
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching doctor details');

        if (error.message === 'DOCTOR_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Doctor not found',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to fetch doctor details',
            message: error.message
        });
    }
}

/**
 * PUT /doctor-admin/doctor-directory/:id
 */
export async function updateDoctor(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const result = await doctorDirectoryService.updateDoctor(
            request.server.prisma,
            tenantId,
            id,
            request.body
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error updating doctor details');

        if (error.message === 'DOCTOR_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Doctor not found',
                message: error.message
            });
        }

        if (error.message === 'EMPLOYEE_CODE_EXISTS') {
            return reply.code(409).send({
                error: 'Employee code already exists',
                message: error.message
            });
        }

        if (error.message === 'EMAIL_EXISTS') {
            return reply.code(409).send({
                error: 'Email already exists',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to update doctor details',
            message: error.message
        });
    }
}

