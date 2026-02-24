/**
 * Diagnostics Module Routes
 *
 * Purpose:
 * - Aggregates all diagnostics related routes (lab, radiology, etc.)
 */
import labRoutes from './lab/lab.routes.js';
import radiologyRoutes from './radiology/radiology.routes.js';

export default async function diagnosticsRoutes(fastify, opts) {
    // ── Lab ──────────────────────────────────────────
    await fastify.register(labRoutes, { prefix: '/lab' });

    // ── Radiology ───────────────────────────────────
    await fastify.register(radiologyRoutes, { prefix: '/radiology' });
}
