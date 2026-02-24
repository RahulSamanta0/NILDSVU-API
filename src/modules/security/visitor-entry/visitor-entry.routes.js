/**
 * Visitor Entry Routes
 * 
 * Purpose:
 * - Define API endpoints for visitor entry management
 * - Register routes with Fastify
 * - Apply schemas for validation
 * - Map routes to controllers
 */

import * as controller from './visitor-entry.controller.js';
import * as schema from './visitor-entry.schema.js';

/**
 * Visitor Entry routes plugin
 * Registers all visitor entry related routes
 */
export default async function visitorEntryRoutes(fastify, opts) {
    
    // Create a new visitor entry
    // POST /security/visitor-entry
    // Requires authentication - tenant_id is auto-extracted from JWT token
    fastify.post('/security/visitor-entry', {
        onRequest: [fastify.authenticate],
        schema: schema.createVisitorEntrySchema,
        handler: controller.createVisitorEntry
    });
}
