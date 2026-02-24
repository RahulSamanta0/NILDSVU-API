/**
 * Indents Controller
 *
 * Purpose: Request handlers for indent request operations
 */

import * as indentService from './indents.service.js';

export async function createIndent(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const userId = request.user?.user_id || null;
        const indent = await indentService.createIndent(request.server.prisma, tenantId, userId, request.body);
        return reply.code(201).send(indent);
    } catch (error) {
        request.log.error(error, 'Error creating indent');
        return reply.code(500).send({ error: 'Failed to create indent', message: error.message });
    }
}

export async function listIndents(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const indents = await indentService.listIndents(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(indents);
    } catch (error) {
        request.log.error(error, 'Error listing indents');
        return reply.code(500).send({ error: 'Failed to fetch indents', message: error.message });
    }
}

export async function getIndent(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const { id } = request.params;
        const indent = await indentService.getIndentById(request.server.prisma, tenantId, id);
        return reply.code(200).send(indent);
    } catch (error) {
        request.log.error(error, 'Error fetching indent');
        if (error.message === 'INDENT_NOT_FOUND')
            return reply.code(404).send({ error: 'Indent not found', message: error.message });
        return reply.code(500).send({ error: 'Failed to fetch indent', message: error.message });
    }
}

export async function approveIndent(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const userId = request.user?.user_id || null;
        const { id } = request.params;
        const result = await indentService.approveIndent(request.server.prisma, tenantId, userId, id);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error approving indent');
        if (error.message === 'INDENT_NOT_FOUND')
            return reply.code(404).send({ error: 'Indent not found', message: error.message });
        if (error.message === 'INDENT_NOT_PENDING')
            return reply.code(409).send({ error: 'Indent is not in pending status', message: error.message });
        return reply.code(500).send({ error: 'Failed to approve indent', message: error.message });
    }
}

export async function rejectIndent(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const userId = request.user?.user_id || null;
        const { id } = request.params;
        const result = await indentService.rejectIndent(
            request.server.prisma, tenantId, userId, id, request.body?.rejection_note
        );
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error rejecting indent');
        if (error.message === 'INDENT_NOT_FOUND')
            return reply.code(404).send({ error: 'Indent not found', message: error.message });
        if (error.message === 'INDENT_NOT_PENDING')
            return reply.code(409).send({ error: 'Indent is not in pending status', message: error.message });
        return reply.code(500).send({ error: 'Failed to reject indent', message: error.message });
    }
}

export async function updateIndent(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const { id } = request.params;
        const result = await indentService.updateIndent(request.server.prisma, tenantId, id, request.body);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error updating indent');
        if (error.message === 'INDENT_NOT_FOUND')
            return reply.code(404).send({ error: 'Indent not found', message: error.message });
        if (error.message === 'INDENT_NOT_PENDING')
            return reply.code(409).send({ error: 'Only pending indents can be updated', message: error.message });
        return reply.code(500).send({ error: 'Failed to update indent', message: error.message });
    }
}
