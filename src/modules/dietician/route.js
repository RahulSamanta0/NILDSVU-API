/**
 * Dietician Module Routes Aggregator
 *
 * Purpose:
 * - Consolidates all dietician-related module routes
 * - Provides single entry point for dietician domain
 * - Keeps globalroutes.js clean
 */

import dietEntryRoutes from './diet-entry/diet-entry.route.js';
import dietPlansRoutes from './diet-plans/diet-plans.route.js';

export default async function dieticianRoutes(fastify, opts) {

    // ── Diet Entry Management ──────────────────────────
    await fastify.register(dietEntryRoutes);

    // ── Diet Plans Management ──────────────────────────
    await fastify.register(dietPlansRoutes, { prefix: '/diet-plans' });

    // Add new dietician module routes above this line
}
