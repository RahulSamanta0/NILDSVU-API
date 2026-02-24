/**
 * Vendors Controller
 *
 * Purpose:
 * - Request handlers for store vendor operations
 * - Maps HTTP requests to vendor service functions
 */

import * as vendorService from './vendors.service.js';

export async function createVendor(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const vendor = await vendorService.createVendor(request.server.prisma, tenantId, request.body);
        return reply.code(201).send(vendor);
    } catch (error) {
        request.log.error(error, 'Error creating vendor');
        if (error.message === 'VENDOR_CODE_EXISTS') {
            return reply.code(409).send({ error: 'Vendor code already exists', message: error.message });
        }
        return reply.code(500).send({ error: 'Failed to create vendor', message: error.message });
    }
}

export async function listVendors(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const vendors = await vendorService.listVendors(request.server.prisma, tenantId, request.query);
        return reply.code(200).send(vendors);
    } catch (error) {
        request.log.error(error, 'Error listing vendors');
        return reply.code(500).send({ error: 'Failed to fetch vendors', message: error.message });
    }
}

export async function getVendor(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const { id } = request.params;
        const vendor = await vendorService.getVendorById(request.server.prisma, tenantId, id);
        return reply.code(200).send(vendor);
    } catch (error) {
        request.log.error(error, 'Error fetching vendor');
        if (error.message === 'VENDOR_NOT_FOUND') {
            return reply.code(404).send({ error: 'Vendor not found', message: error.message });
        }
        return reply.code(500).send({ error: 'Failed to fetch vendor', message: error.message });
    }
}

export async function updateVendor(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const { id } = request.params;
        const vendor = await vendorService.updateVendor(request.server.prisma, tenantId, id, request.body);
        return reply.code(200).send(vendor);
    } catch (error) {
        request.log.error(error, 'Error updating vendor');
        if (error.message === 'VENDOR_NOT_FOUND') {
            return reply.code(404).send({ error: 'Vendor not found', message: error.message });
        }
        return reply.code(500).send({ error: 'Failed to update vendor', message: error.message });
    }
}

export async function deleteVendor(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const { id } = request.params;
        const result = await vendorService.deleteVendor(request.server.prisma, tenantId, id);
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error deleting vendor');
        if (error.message === 'VENDOR_NOT_FOUND') {
            return reply.code(404).send({ error: 'Vendor not found', message: error.message });
        }
        return reply.code(500).send({ error: 'Failed to delete vendor', message: error.message });
    }
}

export async function upsertVendorItems(request, reply) {
    try {
        const tenantId = request.user?.tenant_id || 1;
        const { id } = request.params;
        const result = await vendorService.upsertVendorItems(
            request.server.prisma, tenantId, id, request.body.items
        );
        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error upserting vendor items');
        if (error.message === 'VENDOR_NOT_FOUND') {
            return reply.code(404).send({ error: 'Vendor not found', message: error.message });
        }
        return reply.code(500).send({ error: 'Failed to update vendor price list', message: error.message });
    }
}
