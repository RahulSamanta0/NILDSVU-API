/**
 * Staff Master Controllers
 *
 * Purpose: Request handlers for staff request submissions and staff master reads
 */

import * as staffMasterService from './staff-master.service.js';

/**
 * POST /hr/staff-master/requests
 */
export async function submitStaffRequest(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const submittedBy = request.user?.user_id || null;

        const result = await staffMasterService.submitStaffRequest(
            request.server.prisma,
            request.server.bcrypt,
            tenantId,
            submittedBy,
            request.body
        );

        return reply.code(201).send(result);
    } catch (error) {
        request.log.error(error, 'Error submitting staff request');

        if (error.message === 'USER_NOT_FOUND') {
            return reply.code(404).send({
                error: 'User not found',
                message: error.message
            });
        }

        if (error.message === 'DEPARTMENT_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Department not found',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to submit staff request',
            message: error.message
        });
    }
}

/**
 * GET /hr/staff-master/requests
 */
export async function listStaffRequests(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const submittedBy = request.user?.user_id || null;

        const result = await staffMasterService.listStaffRequests(
            request.server.prisma,
            tenantId,
            submittedBy,
            request.query
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching staff requests');
        return reply.code(500).send({
            error: 'Failed to fetch staff requests',
            message: error.message
        });
    }
}

/**
 * GET /hr/staff-master/staff
 */
export async function listAllStaff(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;

        const result = await staffMasterService.listAllStaff(
            request.server.prisma,
            tenantId,
            request.query
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching all staff list');
        return reply.code(500).send({
            error: 'Failed to fetch all staff list',
            message: error.message
        });
    }
}

/**
 * GET /hr/staff-master/staff/:id
 */
export async function getStaffDetails(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const result = await staffMasterService.getStaffDetails(
            request.server.prisma,
            tenantId,
            id
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching staff details');

        if (error.message === 'STAFF_PROFILE_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Staff profile not found',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to fetch staff details',
            message: error.message
        });
    }
}

/**
 * POST /hr/staff-master/staff/:id/update
 */
export async function updateStaffDetails(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const result = await staffMasterService.updateStaffDetails(
            request.server.prisma,
            tenantId,
            id,
            request.body
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error updating staff details');

        if (error.message === 'STAFF_PROFILE_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Staff profile not found',
                message: error.message
            });
        }

        if (error.message === 'DEPARTMENT_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Department not found',
                message: error.message
            });
        }

        if (error.message === 'NO_UPDATABLE_FIELDS' || error.message === 'SENSITIVE_FIELDS_NOT_ALLOWED') {
            return reply.code(400).send({
                error: 'Invalid update payload',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to update staff details',
            message: error.message
        });
    }
}

/**
 * POST /hr/staff-master/requests/:id/documents
 */
export async function addStaffRequestDocument(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const result = await staffMasterService.addStaffRequestDocument(
            request.server.prisma,
            tenantId,
            id,
            request.body
        );

        return reply.code(201).send(result);
    } catch (error) {
        request.log.error(error, 'Error adding staff request document');

        if (error.message === 'STAFF_PROFILE_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Staff profile not found',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to add staff request document',
            message: error.message
        });
    }
}

/**
 * GET /hr/staff-master/requests/:id/documents
 */
export async function listStaffRequestDocuments(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const result = await staffMasterService.listStaffRequestDocuments(
            request.server.prisma,
            tenantId,
            id
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching staff request documents');

        if (error.message === 'STAFF_PROFILE_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Staff profile not found',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to fetch staff request documents',
            message: error.message
        });
    }
}
