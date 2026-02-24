/**
 * Attendance Controller
 */

import * as attendanceService from './attendance.service.js';

function handleError(request, reply, error, fallbackMessage) {
    request.log.error(error, fallbackMessage);

    if (error.message === 'STAFF_PROFILE_NOT_FOUND') {
        return reply.code(404).send({ error: 'Staff profile not found', message: error.message });
    }

    if (error.message === 'DUTY_ROSTER_NOT_FOUND') {
        return reply.code(404).send({ error: 'Duty roster not found', message: error.message });
    }

    if (error.message === 'ROSTER_STAFF_MISMATCH' || error.message === 'ROSTER_DATE_MISMATCH') {
        return reply.code(400).send({ error: 'Roster validation failed', message: error.message });
    }

    if (error.message === 'INVALID_CHECKIN_CHECKOUT' || error.message === 'INVALID_DATE_RANGE') {
        return reply.code(400).send({ error: 'Invalid attendance input', message: error.message });
    }

    return reply.code(500).send({ error: fallbackMessage, message: error.message });
}

export async function upsertAttendanceRecord(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const userId = request.user?.user_id || null;
        const result = await attendanceService.upsertAttendanceRecord(
            request.server.prisma,
            tenantId,
            userId,
            request.body
        );
        return reply.code(201).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to upsert attendance record');
    }
}

export async function bulkUpsertAttendanceRecords(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const userId = request.user?.user_id || null;
        const result = await attendanceService.bulkUpsertAttendanceRecords(
            request.server.prisma,
            tenantId,
            userId,
            request.body.records
        );
        return reply.code(201).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to bulk upsert attendance records');
    }
}

export async function listAttendanceRecords(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await attendanceService.listAttendanceRecords(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch attendance records');
    }
}

export async function autoMarkAttendanceForDate(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const userId = request.user?.user_id || null;
        const result = await attendanceService.autoMarkAttendanceForDate(
            request.server.prisma,
            tenantId,
            userId,
            request.body.date
        );
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to auto mark attendance for date');
    }
}

export async function attendanceSummary(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await attendanceService.attendanceSummary(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch attendance summary');
    }
}

export async function attendanceByStaff(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { id } = request.params;

        const result = await attendanceService.attendanceByStaff(
            request.server.prisma,
            tenantId,
            id,
            request.query
        );

        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch staff attendance');
    }
}
