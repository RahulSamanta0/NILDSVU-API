/**
 * Doctor Admin Reports Controller
 */

import * as reportsService from './reports.service.js';

function handleError(request, reply, error, fallbackMessage) {
    request.log.error(error, fallbackMessage);

    if (error.message === 'DOCTOR_NOT_FOUND') {
        return reply.code(404).send({ error: 'Doctor not found', message: error.message });
    }

    return reply.code(500).send({ error: fallbackMessage, message: error.message });
}

export async function getAllDoctorsOverview(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await reportsService.getAllDoctorsOverview(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch all doctors overview report');
    }
}

export async function getDoctorWiseReport(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await reportsService.getDoctorWiseReport(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch doctor wise report');
    }
}

export async function getDoctorPatientsReport(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await reportsService.getDoctorPatientsReport(
            request.server.prisma,
            tenantId,
            request.params.doctor_ref,
            request.query
        );
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch doctor patient report');
    }
}

export async function getFollowUpDueReport(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await reportsService.getFollowUpDueReport(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch follow-up due report');
    }
}

export async function getDepartmentWorkload(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await reportsService.getDepartmentWorkload(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch department workload report');
    }
}

export async function getWaitTimeSummary(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await reportsService.getWaitTimeSummary(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch wait time summary report');
    }
}

export async function getRevenueLinkedActivity(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await reportsService.getRevenueLinkedActivity(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch revenue linked activity report');
    }
}

export async function getPatientMixReport(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await reportsService.getPatientMixReport(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch patient mix report');
    }
}

export async function getDoctorCalendarSummary(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await reportsService.getDoctorCalendarSummary(
            request.server.prisma,
            tenantId,
            request.params.doctor_ref,
            request.query
        );
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch doctor calendar summary');
    }
}

export async function getDoctorSlotEffectiveness(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await reportsService.getDoctorSlotEffectiveness(
            request.server.prisma,
            tenantId,
            request.params.doctor_ref,
            request.query
        );
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch doctor slot effectiveness');
    }
}

export async function getDoctorLeaveImpact(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await reportsService.getDoctorLeaveImpact(
            request.server.prisma,
            tenantId,
            request.params.doctor_ref,
            request.query
        );
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch doctor leave impact report');
    }
}

export async function getChronicRepeatPatients(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await reportsService.getChronicRepeatPatients(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch chronic repeat patient report');
    }
}

export async function getReferralHandoverReport(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await reportsService.getReferralHandoverReport(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch referral handover report');
    }
}

export async function getHighRiskFollowUpReport(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await reportsService.getHighRiskFollowUpReport(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch high risk follow-up report');
    }
}
