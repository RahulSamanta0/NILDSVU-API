/**
 * Duty Roster Controller
 */

import * as dutyRosterService from './duty-roster.service.js';

function handleError(request, reply, error, fallbackMessage) {
    request.log.error(error, fallbackMessage);

    if (error.message === 'STAFF_PROFILE_NOT_FOUND') {
        return reply.code(404).send({ error: 'Staff profile not found', message: error.message });
    }

    if (error.message === 'DEPARTMENT_NOT_FOUND') {
        return reply.code(404).send({ error: 'Department not found', message: error.message });
    }

    if (error.message === 'ROSTER_NOT_FOUND') {
        return reply.code(404).send({ error: 'Duty roster entry not found', message: error.message });
    }

    return reply.code(500).send({ error: fallbackMessage, message: error.message });
}

export async function createDutyRoster(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await dutyRosterService.createDutyRoster(request.server.prisma, tenantId, request.body);
        return reply.code(201).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to create duty roster entry');
    }
}

export async function bulkCreateDutyRoster(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await dutyRosterService.bulkCreateDutyRoster(
            request.server.prisma,
            tenantId,
            request.body.entries
        );
        return reply.code(201).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to bulk create duty roster entries');
    }
}

export async function listDutyRoster(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await dutyRosterService.listDutyRoster(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch duty roster');
    }
}

export async function updateDutyRoster(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;
        const result = await dutyRosterService.updateDutyRoster(request.server.prisma, tenantId, id, request.body);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to update duty roster');
    }
}

export async function toggleDutyRosterAvailability(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;
        const result = await dutyRosterService.toggleDutyRosterAvailability(
            request.server.prisma,
            tenantId,
            id,
            request.body.is_available
        );
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to toggle duty roster availability');
    }
}
