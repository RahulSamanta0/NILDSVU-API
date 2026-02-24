/**
 * Leave Management Controller
 */

import * as leaveManagementService from './leave-management.service.js';

function handleError(request, reply, error, fallbackMessage) {
    request.log.error(error, fallbackMessage);

    if (error.message === 'STAFF_PROFILE_NOT_FOUND') {
        return reply.code(404).send({ error: 'Staff profile not found', message: error.message });
    }

    if (error.message === 'INVALID_LEAVE_DATE_RANGE') {
        return reply.code(400).send({ error: 'Invalid leave date range', message: error.message });
    }

    if (error.message === 'OVERLAPPING_LEAVE_REQUEST') {
        return reply.code(409).send({ error: 'Overlapping leave request exists', message: error.message });
    }

    if (error.message === 'LEAVE_REQUEST_NOT_FOUND') {
        return reply.code(404).send({ error: 'Leave request not found', message: error.message });
    }

    if (error.message === 'LEAVE_ALREADY_DECIDED') {
        return reply.code(400).send({ error: 'Leave request already processed', message: error.message });
    }

    return reply.code(500).send({ error: fallbackMessage, message: error.message });
}

export async function createLeaveRequest(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await leaveManagementService.createLeaveRequest(request.server.prisma, tenantId, request.body);
        return reply.code(201).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to create leave request');
    }
}

export async function listLeaveRequests(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await leaveManagementService.listLeaveRequests(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch leave requests');
    }
}

export async function getLeaveRequest(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;
        const result = await leaveManagementService.getLeaveRequest(request.server.prisma, tenantId, id);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch leave request');
    }
}

export async function approveLeaveRequest(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const reviewerUserId = request.user?.user_id;
        const { id } = request.params;

        const result = await leaveManagementService.approveLeaveRequest(
            request.server.prisma,
            tenantId,
            id,
            reviewerUserId,
            request.body?.remarks
        );

        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to approve leave request');
    }
}

export async function rejectLeaveRequest(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const reviewerUserId = request.user?.user_id;
        const { id } = request.params;

        const result = await leaveManagementService.rejectLeaveRequest(
            request.server.prisma,
            tenantId,
            id,
            reviewerUserId,
            request.body?.remarks
        );

        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to reject leave request');
    }
}

export async function leaveSummary(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await leaveManagementService.leaveSummary(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch leave summary');
    }
}
