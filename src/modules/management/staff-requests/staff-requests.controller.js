/**
 * Staff Requests Controllers
 *
 * Purpose: Request handlers for management approval of staff requests
 */

import * as staffRequestsService from './staff-requests.service.js';

/**
 * GET /management/staff-approvals
 */
export async function listStaffRequests(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;

        const result = await staffRequestsService.listStaffRequests(
            request.server.prisma,
            tenantId,
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
 * GET /management/staff-approvals/recent
 */
export async function listRecentStaffRequests(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;

        const result = await staffRequestsService.listRecentStaffRequests(
            request.server.prisma,
            tenantId,
            request.query
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching recent staff requests');
        return reply.code(500).send({
            error: 'Failed to fetch recent staff requests',
            message: error.message
        });
    }
}

/**
 * POST /management/staff-approvals/:id/approve
 */
export async function approveStaffRequest(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const reviewerId = request.user?.user_id || null;
        const { id } = request.params;

        const result = await staffRequestsService.approveStaffRequest(
            request.server.prisma,
            tenantId,
            reviewerId,
            id
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error approving staff request');

        if (error.message === 'STAFF_PROFILE_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Staff profile not found',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to approve staff request',
            message: error.message
        });
    }
}

/**
 * POST /management/staff-approvals/:id/reject
 */
export async function rejectStaffRequest(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const reviewerId = request.user?.user_id || null;
        const { id } = request.params;

        const result = await staffRequestsService.rejectStaffRequest(
            request.server.prisma,
            tenantId,
            reviewerId,
            id,
            request.body
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error rejecting staff request');

        if (error.message === 'STAFF_PROFILE_NOT_FOUND') {
            return reply.code(404).send({
                error: 'Staff profile not found',
                message: error.message
            });
        }

        return reply.code(500).send({
            error: 'Failed to reject staff request',
            message: error.message
        });
    }
}
