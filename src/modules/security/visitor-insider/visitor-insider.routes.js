/**
 * Visitor Insider Routes
 * 
 * Purpose:
 * - Define API endpoints for visitor insider operations
 * - Register routes with Fastify
 * - Apply schemas for validation
 * - Map routes to controllers
 */

import * as controller from './visitor-insider.controller.js';
import * as schema from './visitor-insider.schema.js';

/**
 * Visitor Insider routes plugin
 * Registers all visitor insider related routes
 */
export default async function visitorInsiderRoutes(fastify, opts) {
    
    // Get visitor statistics
    // GET /security/visitors/stats
    // Requires authentication - tenant_id is auto-extracted from JWT token
    fastify.get('/security/visitors/stats', {
        onRequest: [fastify.authenticate],
        schema: schema.getVisitorStatsSchema,
        handler: controller.getVisitorStats
    });

    // Get visitor dashboard statistics
    // GET /security/visitors/dashboard-stats
    // Requires authentication - tenant_id is auto-extracted from JWT token
    fastify.get('/security/visitors/dashboard-stats', {
        onRequest: [fastify.authenticate],
        schema: schema.getVisitorDashboardStatsSchema,
        handler: controller.getVisitorDashboardStats
    });

    // Get all visitors with pagination and filters
    // GET /security/visitors
    // Requires authentication - tenant_id is auto-extracted from JWT token
    fastify.get('/security/visitors', {
        onRequest: [fastify.authenticate],
        schema: schema.getAllVisitorsSchema,
        handler: controller.getAllVisitors
    });

    // Checkout a visitor
    // PUT /security/visitors/checkout/:passNumber
    // Requires authentication - tenant_id is auto-extracted from JWT token
    fastify.put('/security/visitors/checkout/:passNumber', {
        onRequest: [fastify.authenticate],
        schema: schema.checkoutVisitorSchema,
        handler: controller.checkoutVisitor
    });

    // Create a revisit entry
    // POST /security/visitors/revisit
    // Requires authentication - tenant_id is auto-extracted from JWT token
    fastify.post('/security/visitors/revisit', {
        onRequest: [fastify.authenticate],
        schema: schema.createRevisitSchema,
        handler: controller.createRevisit
    });
}
