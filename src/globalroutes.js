/**
 * Global Routes Configuration
 *
 *
 * Purpose:
 * - Centralizes all module route registrations
 * - Keeps app.js clean and focused on server configuration
 * - Uses static imports for better error tracing & IDE support
 * - Groups routes by domain prefix
 */

import authRoutes from './modules/auth/authstaff.routes.js';
import receptionRoutes from './modules/reception/routes.js';
import managementRoutes from './modules/management/routes.js';
import rehabilitationRoutes from './modules/rehabitation/route.js';
import doctorAdminRoutes from './modules/doctor-admin/routes.js';
import hrRoutes from './modules/hr/routes.js';
import diagnosticsRoutes from './modules/diagnostics/routes.js';
import doctorOpdRoutes from "./modules/doctor/opd/doctorOpd.routes.js";
import dieticianRoutes from './modules/dietician/route.js';
import pharmacyRoutes from "./modules/pharmacy/pharmacy.routes.js";
import securityRoutes from './modules/security/route.js';
import ambulanceRoutes from "./modules/ambulance/ambulance.routes.js";
import storeProcurementRoutes from './modules/store-procurement/routes.js';



export default async function globalRoutes(fastify, opts) {

    // ── Auth ─────────────────────────────────────────
    fastify.register(authRoutes);

    // ── Reception ────────────────────────────────────
    await fastify.register(receptionRoutes);

    // ── Management ───────────────────────────────────
    await fastify.register(managementRoutes, { prefix: '/management' });

    // ── Store & Procurement ──────────────────────────
    await fastify.register(storeProcurementRoutes, { prefix: '/store' });

    // ── Rehabilitation ───────────────────────────────
    fastify.register(rehabilitationRoutes, { prefix: '/rehabilitation' });

    // ── Doctor Admin ─────────────────────────────────
    fastify.register(doctorAdminRoutes, { prefix: '/doctor-admin' });

    // ── HR ───────────────────────────────────────────
    fastify.register(hrRoutes, { prefix: '/hr' });

    // ── Diagnostics ──────────────────────────────────
    fastify.register(diagnosticsRoutes, { prefix: '/diagnostics' });

    // ── Doctor OPD ─────────────────────────────────────
    fastify.register(doctorOpdRoutes, { prefix: '/doctor-opd' });
    // ── Pharmacy ───────────────────────────────────────
    fastify.register(pharmacyRoutes, { prefix: '/pharmacy' });
    // ── Ambulance ─────────────────────────────────────
    fastify.register(ambulanceRoutes, { prefix: '/ambulance' });

    // ── Dietician ──────────────────────────────────────
    fastify.register(dieticianRoutes, { prefix: '/dietician' });

    // ── Security ───────────────────────────────────────
    fastify.register(securityRoutes);
}
