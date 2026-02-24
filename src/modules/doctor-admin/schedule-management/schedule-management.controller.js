/**
 * Doctor Schedule Management Controller
 */

import * as scheduleService from './schedule-management.service.js';

function handleError(request, reply, error, fallbackMessage) {
    request.log.error(error, fallbackMessage);

    if (error.message === 'DOCTOR_NOT_FOUND') {
        return reply.code(404).send({ error: 'Doctor not found', message: error.message });
    }

    if (error.message === 'DEPARTMENT_NOT_FOUND') {
        return reply.code(404).send({ error: 'Department not found', message: error.message });
    }

    if (error.message === 'SCHEDULE_NOT_FOUND') {
        return reply.code(404).send({ error: 'Schedule not found', message: error.message });
    }

    if (error.message === 'SCHEDULE_CONFLICT') {
        return reply.code(409).send({ error: 'Schedule conflict detected', message: error.message });
    }

    if (error.message === 'INVALID_TIME_RANGE') {
        return reply.code(400).send({ error: 'Invalid time range', message: error.message });
    }

    if (error.message === 'INVALID_SLOT_DURATION') {
        return reply.code(400).send({ error: 'Invalid slot duration', message: error.message });
    }

    return reply.code(500).send({ error: fallbackMessage, message: error.message });
}

export async function createSchedule(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await scheduleService.createSchedule(request.server.prisma, tenantId, request.body);
        return reply.code(201).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to create doctor schedule');
    }
}

export async function bulkCreateSchedules(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await scheduleService.bulkCreateSchedules(
            request.server.prisma,
            tenantId,
            request.body.entries
        );
        return reply.code(201).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to bulk create doctor schedules');
    }
}

export async function listSchedules(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await scheduleService.listSchedules(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch doctor schedules');
    }
}

export async function getDoctorAvailability(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { doctor_id } = request.params;
        const { duty_date, schedule_type } = request.query;

        const result = await scheduleService.getDoctorAvailability(
            request.server.prisma,
            tenantId,
            doctor_id,
            duty_date,
            schedule_type
        );

        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch doctor availability');
    }
}

export async function updateSchedule(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;
        const result = await scheduleService.updateSchedule(request.server.prisma, tenantId, id, request.body);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to update doctor schedule');
    }
}

export async function toggleScheduleAvailability(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;
        const result = await scheduleService.toggleScheduleAvailability(
            request.server.prisma,
            tenantId,
            id,
            request.body.is_available
        );
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to toggle schedule availability');
    }
}

export async function deleteSchedule(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;
        const result = await scheduleService.deleteSchedule(request.server.prisma, tenantId, id);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to delete doctor schedule');
    }
}
