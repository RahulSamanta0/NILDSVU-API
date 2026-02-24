/**
 * OPD Control Center Controllers
 *
 * Purpose: Request handlers for OPD control center snapshot APIs
 */

import * as opdControlService from './opd-control.service.js';

/**
 * GET /opd-control/metrics
 */
export async function getMetrics(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;

        const metrics = await opdControlService.getMetrics(
            request.server.prisma,
            tenantId,
            request.query
        );

        return reply.code(200).send(metrics);
    } catch (error) {
        request.log.error(error, 'Error fetching OPD metrics');
        return reply.code(500).send({
            error: 'Failed to fetch OPD metrics',
            message: error.message
        });
    }
}

/**
 * GET /opd-control/departments
 */
export async function listDepartmentStatus(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;

        const departments = await opdControlService.listDepartmentStatus(
            request.server.prisma,
            tenantId,
            request.query
        );

        return reply.code(200).send(departments);
    } catch (error) {
        request.log.error(error, 'Error fetching department status');
        return reply.code(500).send({
            error: 'Failed to fetch department status',
            message: error.message
        });
    }
}

/**
 * GET /opd-control/doctors
 */
export async function listDoctors(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;

        const doctors = await opdControlService.listDoctors(
            request.server.prisma,
            tenantId,
            request.query
        );

        return reply.code(200).send(doctors);
    } catch (error) {
        request.log.error(error, 'Error fetching doctor queue list');
        return reply.code(500).send({
            error: 'Failed to fetch doctors',
            message: error.message
        });
    }
}

/**
 * GET /opd-control/departments/:id/doctors
 */
export async function listDepartmentDoctors(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const doctors = await opdControlService.listDepartmentDoctors(
            request.server.prisma,
            tenantId,
            id,
            request.query
        );

        return reply.code(200).send(doctors);
    } catch (error) {
        request.log.error(error, 'Error fetching department doctors');
        return reply.code(500).send({
            error: 'Failed to fetch department doctors',
            message: error.message
        });
    }
}

/**
 * GET /opd-control/doctors/:id/examined
 */
export async function listDoctorExamined(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const patients = await opdControlService.listDoctorExamined(
            request.server.prisma,
            tenantId,
            id,
            request.query
        );

        return reply.code(200).send(patients);
    } catch (error) {
        request.log.error(error, 'Error fetching doctor examined list');
        return reply.code(500).send({
            error: 'Failed to fetch examined patients',
            message: error.message
        });
    }
}
