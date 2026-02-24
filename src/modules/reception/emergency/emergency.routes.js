/**
 * Emergency Registration Routes
 *
 * Defines API endpoints for emergency patient registration.
 * All routes prefixed with /emergency via globalroutes.
 */

import * as controller from './emergency.controller.js';
import * as schema from './emergency.schema.js';

export default async function emergencyRoutes(fastify, opts) {

    // Register a new emergency patient
    fastify.post('/emergency', {
        schema: schema.registerEmergencySchema,
        onRequest: [fastify.authenticate],
        handler: controller.registerEmergency
    });

    // Get all emergency cases with filtering
    fastify.get('/emergency', {
        schema: schema.getAllEmergenciesSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getAllEmergencies
    });

    // Get emergency case by ID or case number
    fastify.get('/emergency/:id', {
        schema: schema.getEmergencyByIdSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getEmergencyById
    });

    // Update emergency case
    fastify.put('/emergency/:id', {
        schema: schema.updateEmergencySchema,
        onRequest: [fastify.authenticate],
        handler: controller.updateEmergency
    });
}
