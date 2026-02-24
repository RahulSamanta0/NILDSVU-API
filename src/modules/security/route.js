/**
 * Security Module Routes
 * 
 * Purpose:
 * - Consolidate all security-related routes
 * - Register sub-module routes
 */

import visitorEntryRoutes from './visitor-entry/visitor-entry.routes.js';
import visitorInsiderRoutes from './visitor-insider/visitor-insider.routes.js';
import vendorEntryRoutes from './vendor-entry/vendor-entry.route.js';
import vendorLogsRoutes from './vendor-logs/vendor-logs.routes.js';
import parkingLogsRoutes from './parking-logs/parking-logs.routes.js';

export default async function securityRoutes(fastify, opts) {
    
    // ── Visitor Entry ────────────────────────────────
    fastify.register(visitorEntryRoutes);

    // ── Visitor Insider ──────────────────────────────
    fastify.register(visitorInsiderRoutes);

    // ── Vendor Entry ─────────────────────────────────
    fastify.register(vendorEntryRoutes);

    // ── Vendor Logs ──────────────────────────────────
    fastify.register(vendorLogsRoutes);

    // ── Parking Logs ─────────────────────────────────
    fastify.register(parkingLogsRoutes);
}
