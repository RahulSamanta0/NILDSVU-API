/**
 * Reception Routes
 *
 * Purpose:
 * - Defines API endpoints for patient registration
 * - Registers routes with Fastify
 * - Applies schemas for validation
 * - Maps routes to controllers
 */

import * as controller from './registration.controller.js';
import * as schema from './registration.schema.js';

/**
 * Reception routes plugin
 * Registers all patient registration related routes
 */
export default async function receptionRoutes(fastify, opts) {

    // Register a new patient
    fastify.post('/patients', {
        schema: schema.registerPatientSchema,
        onRequest: [fastify.authenticate],
        handler: controller.registerPatient
    });

    // Get all patients with filtering (must come before /:id to avoid route conflict)
    fastify.get('/patients', {
        schema: schema.getAllPatientsSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getAllPatients
    });

    // Get patient by ID or UPID (auto-detects which one)
    // Accepts: numeric ID (e.g., "123") or UPID (e.g., "NILD-20260212-OPD-0001")
    fastify.get('/patients/:id', {
        schema: schema.getPatientByIdSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getPatientById
    });

    // Update patient information
    fastify.put('/patients/:id', {
        schema: schema.updatePatientSchema,
        onRequest: [fastify.authenticate],
        handler: controller.updatePatient
    });
}
