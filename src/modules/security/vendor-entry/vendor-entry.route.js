/**
 * Vendor Entry Routes
 * 
 * Purpose:
 * - Define API endpoints for vendor entry management
 * - Register routes with Fastify
 * - Apply schemas for validation
 * - Map routes to controllers
 */

import * as controller from './vendor-entry.controller.js';
import * as schema from './vendor-entry.schema.js';

/**
 * Vendor Entry routes plugin
 * Registers all vendor entry related routes
 */
export default async function vendorEntryRoutes(fastify, opts) {
    
    // Create a new vendor entry
    // POST /security/vendor-entry
    // Requires authentication - tenant_id is auto-extracted from JWT token
    fastify.post('/security/vendor-entry', {
        onRequest: [fastify.authenticate],
        schema: schema.createVendorEntrySchema,
        handler: controller.createVendorEntry
    });
}
