/**
 * Reception Module Routes Aggregator
 *
 * Purpose:
 * - Consolidates all reception-related module routes
 * - Provides single entry point for reception domain
 * - Keeps globalroutes.js clean
 */
import registrationRoutes from './registration/registration.routes.js';
import emergencyRoutes from './emergency/emergency.routes.js';
import appointmentsRoutes from './appointments/appointments.routes.js';

export default async function receptionRoutes(fastify, opts) {

    // ── Patient Registration ──────────────────────────
    await fastify.register(registrationRoutes);

    // ── Emergency Registration ────────────────────────
    await fastify.register(emergencyRoutes);

    // ── Appointments ──────────────────────────────────
    await fastify.register(appointmentsRoutes);

    // Add new reception module routes above this line
}
