/**
 * Doctor Admin Exception Reports Controller
 */

import * as exceptionReportsService from './exception-reports.service.js';

function handleError(request, reply, error, fallbackMessage) {
    request.log.error(error, fallbackMessage);

    if (error.message === 'DOCTOR_NOT_FOUND') {
        return reply.code(404).send({ error: 'Doctor not found', message: error.message });
    }

    if (error.message === 'RESULT_NOT_FOUND' || error.message === 'ORDER_ITEM_NOT_FOUND') {
        return reply.code(404).send({ error: 'Record not found', message: error.message });
    }

    if (error.message === 'INVALID_SOURCE') {
        return reply.code(400).send({ error: 'Invalid source', message: error.message });
    }

    return reply.code(500).send({ error: fallbackMessage, message: error.message });
}

export async function getExceptionReportsOverview(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await exceptionReportsService.getExceptionReportsOverview(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch exception reports overview');
    }
}

export async function getCriticalLabDoctorCards(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await exceptionReportsService.getCriticalLabDoctorCards(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch critical lab doctor cards');
    }
}

export async function getCriticalLabValuesNotReviewed(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await exceptionReportsService.getCriticalLabValuesNotReviewed(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch critical lab values not reviewed');
    }
}

export async function getCriticalLabValueDetail(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await exceptionReportsService.getCriticalLabValueDetail(
            request.server.prisma,
            tenantId,
            request.params.test_item_id
        );
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch critical lab value detail');
    }
}

export async function markCriticalLabReviewed(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const actorUserId = request.user?.user_id;
        const result = await exceptionReportsService.markCriticalLabReviewed(
            request.server.prisma,
            tenantId,
            request.params.test_item_id,
            actorUserId
        );
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to mark critical lab as reviewed');
    }
}

export async function getDelayedDiagnosticsDoctorCards(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await exceptionReportsService.getDelayedDiagnosticsDoctorCards(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch delayed diagnostic doctor cards');
    }
}

export async function getDelayedDiagnosticResults(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await exceptionReportsService.getDelayedDiagnosticResults(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch delayed diagnostic results');
    }
}

export async function getDelayedDiagnosticDetail(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await exceptionReportsService.getDelayedDiagnosticDetail(
            request.server.prisma,
            tenantId,
            request.params.source,
            request.params.item_id
        );
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch delayed diagnostic detail');
    }
}

export async function escalateDelayedDiagnostic(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const actorUserId = request.user?.user_id;
        const result = await exceptionReportsService.escalateDelayedDiagnostic(
            request.server.prisma,
            tenantId,
            request.params.source,
            request.params.item_id,
            actorUserId,
            request.body?.notes
        );
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to escalate delayed diagnostic');
    }
}

export async function getHighRiskDoctorCards(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await exceptionReportsService.getHighRiskDoctorCards(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch high risk doctor cards');
    }
}

export async function getHighRiskPatientsWithoutRecentReview(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await exceptionReportsService.getHighRiskPatientsWithoutRecentReview(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch high risk patients without recent review');
    }
}

export async function getMissedFollowUpDoctorCards(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await exceptionReportsService.getMissedFollowUpDoctorCards(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch missed follow-up doctor cards');
    }
}

export async function getMissedFollowUps(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await exceptionReportsService.getMissedFollowUps(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch missed follow-ups');
    }
}

export async function getPendingRehabTherapistCards(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await exceptionReportsService.getPendingRehabTherapistCards(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch pending rehab therapist cards');
    }
}

export async function getPendingRehabSessions(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await exceptionReportsService.getPendingRehabSessions(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch pending rehab sessions');
    }
}
