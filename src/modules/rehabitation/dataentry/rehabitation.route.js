import { createRehabilitationEntryHandler, updateRehabilitationEntryHandler, getRehabilitationEntriesByPatientHandler } from './rehabitation.controller.js';
import { createRehabilitationEntrySchema, updateRehabilitationEntrySchema, getRehabilitationEntriesByPatientSchema } from './rehabitation.schema.js';

/**
 * Rehabilitation Data Entry Routes
 * Defines routes for creating and updating rehabilitation entries
 */
async function rehabilitationDataEntryRoutes(fastify, options) {
    // Create rehabilitation entry
    fastify.post('/entry', {
        schema: createRehabilitationEntrySchema,
        onRequest: [fastify.authenticate],
        handler: createRehabilitationEntryHandler
    });

    // Update rehabilitation entry
    fastify.put('/entry/:entryId', {
        schema: updateRehabilitationEntrySchema,
        onRequest: [fastify.authenticate],
        handler: updateRehabilitationEntryHandler
    });

    // Get rehabilitation entries by patient UPID
    fastify.get('/patient/:upid', {
        schema: getRehabilitationEntriesByPatientSchema,
        onRequest: [fastify.authenticate],
        handler: getRehabilitationEntriesByPatientHandler
    });
}

export default rehabilitationDataEntryRoutes;
