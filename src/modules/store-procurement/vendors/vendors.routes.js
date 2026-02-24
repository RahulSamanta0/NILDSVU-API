/**
 * Vendors Routes
 *
 * Purpose:
 * - REST API endpoints for store vendor management
 * - Handles vendor master data and pricing lists
 */

import * as vendorController from './vendors.controller.js';
import * as vendorSchema from './vendors.schema.js';

export default async function vendorRoutes(fastify, opts) {
    // Create vendor
    fastify.post('/', { schema: vendorSchema.createVendorSchema }, async (request, reply) => {
        return vendorController.createVendor(request, reply);
    });

    // List vendors
    fastify.get('/', { schema: vendorSchema.listVendorsSchema }, async (request, reply) => {
        return vendorController.listVendors(request, reply);
    });

    // Get vendor by ID (with price list)
    fastify.get('/:id', { schema: vendorSchema.getVendorSchema }, async (request, reply) => {
        return vendorController.getVendor(request, reply);
    });

    // Update vendor
    fastify.post('/:id/update', { schema: vendorSchema.updateVendorSchema }, async (request, reply) => {
        return vendorController.updateVendor(request, reply);
    });

    // Soft delete vendor
    fastify.post('/:id/delete', { schema: vendorSchema.deleteVendorSchema }, async (request, reply) => {
        return vendorController.deleteVendor(request, reply);
    });

    // Upsert vendor price list
    fastify.post('/:id/items', { schema: vendorSchema.upsertVendorItemsSchema }, async (request, reply) => {
        return vendorController.upsertVendorItems(request, reply);
    });
}
