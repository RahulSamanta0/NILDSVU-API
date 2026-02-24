/**
 * Items Routes
 *
 * Purpose:
 * - REST API endpoints for inventory item management
 * - Handles product master, listings, and stock visibility
 */

import * as itemController from './items.controller.js';
import * as itemSchema from './items.schema.js';

export default async function itemRoutes(fastify, opts) {
    // Create new item
    fastify.post('/', { schema: itemSchema.createItemSchema }, async (request, reply) => {
        return itemController.createItem(request, reply);
    });

    // List items
    fastify.get('/', { schema: itemSchema.listItemsSchema }, async (request, reply) => {
        return itemController.listItems(request, reply);
    });

    // Get item by ID
    fastify.get('/:id', { schema: itemSchema.getItemSchema }, async (request, reply) => {
        return itemController.getItem(request, reply);
    });

    // Update item
    fastify.post('/:id/update', { schema: itemSchema.updateItemSchema }, async (request, reply) => {
        return itemController.updateItem(request, reply);
    });
}
