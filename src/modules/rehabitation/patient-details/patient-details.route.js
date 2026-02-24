import { getRehabilitationSectionsHandler, getAllPatientsHandler } from './patient-details.controller.js';
import { getRehabilitationSectionsSchema, getAllPatientsSchema } from './patient-details.schema.js';

/**
 * Patient Details Routes
 * Defines routes for retrieving patient rehabilitation details organized by sections
 */
async function patientDetailsRoutes(fastify, options) {
    // Get all patients with rehabilitation entries organized by sections
    fastify.get('/patients', {
        schema: getAllPatientsSchema,
        onRequest: [fastify.authenticate],
        handler: getAllPatientsHandler
    });

    // Get rehabilitation entries for a specific patient organized by sections
    fastify.get('/patient/:patientId/sections', {
        schema: getRehabilitationSectionsSchema,
        onRequest: [fastify.authenticate],
        handler: getRehabilitationSectionsHandler
    });
}

export default patientDetailsRoutes;
