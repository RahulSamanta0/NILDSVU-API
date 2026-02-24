/**
 * Management Module Routes Aggregator
 * 
 * Purpose:
 * - Consolidates all management-related module routes
 * - Provides single entry point for management domain
 * - Keeps globalroutes.js clean
 */
import departmentsRoutes from './master-curd/departments-crud/departments.routes.js';
import wardsRoutes from './master-curd/wards-curd/wards.routes.js';
import bedsRoutes from './master-curd/beds-curd/beds.routes.js';
import opdControlRoutes from './opd-controll-center/opd-control.routes.js';
import staffRequestsRoutes from './staff-requests/staff-requests.routes.js';
import hrRoutes from './hr/hr.routes.js';

export default async function managementRoutes(fastify, opts) {

    // Enforce management access on all management routes
    fastify.addHook('onRequest', async (request, reply) => {
        await fastify.authenticate(request, reply);
        if (reply.sent) return;
        await fastify.authorizeRoles(['admin', 'management'])(request, reply);
    });

    // ── OPD Management ───────────────────────────────

    await fastify.register(departmentsRoutes, { prefix: '/departments' });
    await fastify.register(departmentsRoutes, { prefix: '/opd-departments' });

    // ── Ward Management ──────────────────────────────
    await fastify.register(wardsRoutes, { prefix: '/wards' });
    await fastify.register(bedsRoutes, { prefix: '/beds' });

    // ── OPD Control Center ──────────────────────────
    await fastify.register(opdControlRoutes, { prefix: '/opd-control' });

    // ── Staff Approvals ────────────────────────────
    await fastify.register(staffRequestsRoutes, { prefix: '/staff-approvals' });

    // ── HR Management ──────────────────────────────

    await fastify.register(hrRoutes, { prefix: '/hr' });

    // Add new management module routes above this line
}
