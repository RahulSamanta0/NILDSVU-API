/**
 * Items Controller
 *
 * Purpose:
 * - Request handlers for inventory item operations
 * - Maps HTTP requests to item service logic
 */

import * as itemService from './items.service.js';

export async function createItem(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const item = await itemService.createItem(request.server.prisma, tenantId, request.body);
        return reply.code(201).send(item);
    } catch (error) {
        request.log.error(error, 'Error creating item');
        if (error.message === 'ITEM_CODE_EXISTS') {
            return reply.code(409).send({ error: 'Item code already exists', message: error.message });
        }
        return reply.code(500).send({ error: 'Failed to create item', message: error.message });
    }
}

export async function listItems(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const items = await itemService.listItems(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(items);
    } catch (error) {
        request.log.error(error, 'Error listing items');
        return reply.code(500).send({ error: 'Failed to fetch items', message: error.message });
    }
}

export async function getItem(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const { id } = request.params;
        const item = await itemService.getItemById(request.server.prisma, tenantId, id);
        return reply.code(200).send(item);
    } catch (error) {
        request.log.error(error, 'Error fetching item');
        if (error.message === 'ITEM_NOT_FOUND') {
            return reply.code(404).send({ error: 'Item not found', message: error.message });
        }
        return reply.code(500).send({ error: 'Failed to fetch item', message: error.message });
    }
}

export async function updateItem(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const { id } = request.params;
        const item = await itemService.updateItem(request.server.prisma, tenantId, id, request.body);
        return reply.code(200).send(item);
    } catch (error) {
        request.log.error(error, 'Error updating item');
        if (error.message === 'ITEM_NOT_FOUND') {
            return reply.code(404).send({ error: 'Item not found', message: error.message });
        }
        return reply.code(500).send({ error: 'Failed to update item', message: error.message });
    }
}
