import * as hrService from './hr.service.js';

function handleKnownErrors(reply, error) {
    if (error.message === 'MANAGER_NOT_FOUND') {
        return reply.code(404).send({ error: 'Manager not found', message: error.message });
    }

    if (error.message === 'STAFF_NOT_FOUND') {
        return reply.code(404).send({ error: 'Staff not found', message: error.message });
    }

    if (error.message === 'STAFF_PROFILE_NOT_FOUND') {
        return reply.code(404).send({ error: 'Staff profile not found', message: error.message });
    }

    if (error.message === 'HR_ROLE_NOT_FOUND') {
        return reply.code(404).send({ error: 'HR role not found', message: error.message });
    }

    if (error.message === 'USER_NOT_FOUND') {
        return reply.code(404).send({ error: 'User not found', message: error.message });
    }

    if (error.message === 'DEPARTMENT_NOT_FOUND') {
        return reply.code(404).send({ error: 'Department not found', message: error.message });
    }

    if (error.message === 'SELF_DELETE_NOT_ALLOWED') {
        return reply.code(400).send({ error: 'Self delete not allowed', message: error.message });
    }

    if (error.message === 'USERNAME_EXISTS') {
        return reply.code(409).send({ error: 'Username already exists', message: error.message });
    }

    if (error.message === 'EMAIL_EXISTS') {
        return reply.code(409).send({ error: 'Email already exists', message: error.message });
    }

    if (error.message === 'ROLE_NOT_FOUND' || error.message === 'TENANT_NOT_FOUND' || error.message === 'TENANT_INACTIVE') {
        return reply.code(400).send({ error: 'Invalid manager provisioning context', message: error.message });
    }

    if (error.message === 'DOCUMENT_NOT_FOUND') {
        return reply.code(404).send({ error: 'Document not found', message: error.message });
    }

    if (error.message === 'NO_UPDATABLE_FIELDS') {
        return reply.code(400).send({ error: 'No updatable fields provided', message: error.message });
    }

    return null;
}

export async function getMetricsSummary(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await hrService.getMetricsSummary(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching HR summary metrics');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to fetch HR summary metrics', message: error.message });
    }
}

export async function getMetricsAttention(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await hrService.getMetricsAttention(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching HR attention metrics');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to fetch HR attention metrics', message: error.message });
    }
}

export async function getAttendanceTrend(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await hrService.getAttendanceTrend(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching HR attendance trend');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to fetch HR attendance trend', message: error.message });
    }
}

export async function getHiringComparison(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await hrService.getHiringComparison(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching HR hiring comparison');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to fetch HR hiring comparison', message: error.message });
    }
}

export async function getPerformanceDistribution(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await hrService.getPerformanceDistribution(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching HR performance distribution');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to fetch HR performance distribution', message: error.message });
    }
}

export async function listManagers(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const result = await hrService.listManagers(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching HR managers');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to fetch HR managers', message: error.message });
    }
}

export async function getManager(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { managerId } = request.params;

        const result = await hrService.getManager(request.server.prisma, tenantId, managerId);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching HR manager details');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to fetch HR manager details', message: error.message });
    }
}

export async function listManagerStaff(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { managerId } = request.params;

        const result = await hrService.listManagerStaff(request.server.prisma, tenantId, managerId, request.query);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching manager staff list');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to fetch manager staff list', message: error.message });
    }
}

export async function createManager(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const creatorId = request.user?.user_id || null;

        const result = await hrService.createManager(
            request.server.prisma,
            request.server.bcrypt,
            tenantId,
            creatorId,
            request.body
        );

        return reply.code(201).send(result);
    } catch (error) {
        request.log.error(error, 'Error creating HR manager');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to create HR manager', message: error.message });
    }
}

export async function deleteManager(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const requesterId = request.user?.user_id || null;
        const { managerId } = request.params;

        const result = await hrService.deleteManager(request.server.prisma, tenantId, requesterId, managerId);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error deleting HR manager');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to delete HR manager', message: error.message });
    }
}

export async function getStaff(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { staffId } = request.params;

        const result = await hrService.getStaff(request.server.prisma, tenantId, staffId);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching staff details');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to fetch staff details', message: error.message });
    }
}

export async function addStaffDocument(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { staffId } = request.params;

        const result = await hrService.addStaffDocument(request.server.prisma, tenantId, staffId, request.body);
        return reply.code(201).send(result);
    } catch (error) {
        request.log.error(error, 'Error adding staff document');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to add staff document', message: error.message });
    }
}

export async function listStaffDocuments(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { staffId } = request.params;

        const result = await hrService.listStaffDocuments(request.server.prisma, tenantId, staffId);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching staff documents');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to fetch staff documents', message: error.message });
    }
}

export async function updateStaffDocument(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { staffId, documentId } = request.params;

        const result = await hrService.updateStaffDocument(request.server.prisma, tenantId, staffId, documentId, request.body);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error updating staff document');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to update staff document', message: error.message });
    }
}

export async function deleteStaffDocument(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;
        const { staffId, documentId } = request.params;

        const result = await hrService.deleteStaffDocument(request.server.prisma, tenantId, staffId, documentId);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error deleting staff document');
        const handled = handleKnownErrors(reply, error);
        if (handled) return handled;
        return reply.code(500).send({ error: 'Failed to delete staff document', message: error.message });
    }
}
