/**
 * Diet Entry Routes
 *
 * Purpose:
 * - Defines API endpoints for diet entry management
 * - Registers routes with Fastify
 * - Applies schemas for validation
 * - Maps routes to controllers
 */

import * as controller from './diet-entry.controller.js';
import * as schema from './diet-entry.schema.js';

/**
 * Diet entry routes plugin
 * Registers all diet entry related routes
 */
export default async function dietEntryRoutes(fastify, opts) {

    // Get patient details by UPID (for auto-fill)
    fastify.get('/patients/:upid', {
        schema: schema.getPatientByUPIDSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getPatientByUPID
    });

    // Create a new diet entry
    fastify.post('/diet-charts', {
        schema: schema.createDietEntrySchema,
        onRequest: [fastify.authenticate],
        handler: controller.createDietEntry
    });

    // Get all diet entries for a patient
    fastify.get('/diet-charts/patient/:upid', {
        schema: schema.getDietEntriesByPatientSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getDietEntriesByPatient
    });

    // Get a specific diet entry by ID
    fastify.get('/diet-charts/:id', {
        schema: schema.getDietEntryByIdSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getDietEntryById
    });

    // Update a diet entry
    fastify.put('/diet-charts/:id', {
        schema: schema.updateDietEntrySchema,
        onRequest: [fastify.authenticate],
        handler: controller.updateDietEntry
    });

    // Delete a diet entry
    fastify.delete('/diet-charts/:id', {
        schema: schema.deleteDietEntrySchema,
        onRequest: [fastify.authenticate],
        handler: controller.deleteDietEntry
    });
}
