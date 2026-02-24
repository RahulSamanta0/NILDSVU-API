/**
 * Payroll Controller
 */

import * as payrollService from './payroll.service.js';

function handleError(request, reply, error, fallbackMessage) {
    request.log.error(error, fallbackMessage);

    const notFoundErrors = new Set([
        'SALARY_COMPONENT_NOT_FOUND',
        'STAFF_PROFILE_NOT_FOUND',
        'SALARY_PROFILE_NOT_FOUND',
        'PAYROLL_CYCLE_NOT_FOUND',
        'PAYROLL_RUN_NOT_FOUND',
        'PAYSLIP_NOT_FOUND'
    ]);

    const badRequestErrors = new Set([
        'PAYROLL_RUN_ALREADY_EXISTS',
        'PAYROLL_RUN_NOT_IN_DRAFT'
    ]);

    if (notFoundErrors.has(error.message)) {
        return reply.code(404).send({ error: 'Not found', message: error.message });
    }

    if (badRequestErrors.has(error.message)) {
        return reply.code(400).send({ error: 'Invalid request', message: error.message });
    }

    return reply.code(500).send({ error: fallbackMessage, message: error.message });
}

function getContext(request) {
    return {
        tenantId: request.user?.tenant_id,
        userId: request.user?.user_id
    };
}

export async function createSalaryComponent(request, reply) {
    try {
        const { tenantId } = getContext(request);
        const result = await payrollService.createSalaryComponent(request.server.prisma, tenantId, request.body);
        return reply.code(201).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to create salary component');
    }
}

export async function listSalaryComponents(request, reply) {
    try {
        const { tenantId } = getContext(request);
        const result = await payrollService.listSalaryComponents(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch salary components');
    }
}

export async function updateSalaryComponent(request, reply) {
    try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const result = await payrollService.updateSalaryComponent(request.server.prisma, tenantId, id, request.body);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to update salary component');
    }
}

export async function createStaffSalaryProfile(request, reply) {
    try {
        const { tenantId } = getContext(request);
        const result = await payrollService.createStaffSalaryProfile(request.server.prisma, tenantId, request.body);
        return reply.code(201).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to create staff salary profile');
    }
}

export async function listStaffSalaryProfiles(request, reply) {
    try {
        const { tenantId } = getContext(request);
        const result = await payrollService.listStaffSalaryProfiles(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch staff salary profiles');
    }
}

export async function getStaffSalaryProfile(request, reply) {
    try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const result = await payrollService.getStaffSalaryProfile(request.server.prisma, tenantId, id);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch staff salary profile');
    }
}

export async function createPayrollCycle(request, reply) {
    try {
        const { tenantId, userId } = getContext(request);
        const result = await payrollService.createPayrollCycle(request.server.prisma, tenantId, userId, request.body);
        return reply.code(201).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to create payroll cycle');
    }
}

export async function listPayrollCycles(request, reply) {
    try {
        const { tenantId } = getContext(request);
        const result = await payrollService.listPayrollCycles(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch payroll cycles');
    }
}

export async function updatePayrollCycleStatus(request, reply) {
    try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const result = await payrollService.updatePayrollCycleStatus(
            request.server.prisma,
            tenantId,
            id,
            request.body.status
        );
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to update payroll cycle status');
    }
}

export async function previewPayrollRun(request, reply) {
    try {
        const { tenantId } = getContext(request);
        const result = await payrollService.previewPayrollRun(request.server.prisma, tenantId, request.body.cycle_id);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to preview payroll run');
    }
}

export async function generatePayrollRun(request, reply) {
    try {
        const { tenantId, userId } = getContext(request);
        const result = await payrollService.generatePayrollRun(
            request.server.prisma,
            tenantId,
            userId,
            request.body.cycle_id
        );
        return reply.code(201).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to generate payroll run');
    }
}

export async function finalizePayrollRun(request, reply) {
    try {
        const { tenantId, userId } = getContext(request);
        const { id } = request.params;
        const result = await payrollService.finalizePayrollRun(request.server.prisma, tenantId, id, userId);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to finalize payroll run');
    }
}

export async function listPayrollRuns(request, reply) {
    try {
        const { tenantId } = getContext(request);
        const result = await payrollService.listPayrollRuns(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch payroll runs');
    }
}

export async function getPayrollRun(request, reply) {
    try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const result = await payrollService.getPayrollRun(request.server.prisma, tenantId, id);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch payroll run');
    }
}

export async function listPayslips(request, reply) {
    try {
        const { tenantId } = getContext(request);
        const result = await payrollService.listPayslips(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch payslips');
    }
}

export async function getPayslip(request, reply) {
    try {
        const { tenantId } = getContext(request);
        const { id } = request.params;
        const result = await payrollService.getPayslip(request.server.prisma, tenantId, id);
        return reply.code(200).send(result);
    } catch (error) {
        return handleError(request, reply, error, 'Failed to fetch payslip');
    }
}
