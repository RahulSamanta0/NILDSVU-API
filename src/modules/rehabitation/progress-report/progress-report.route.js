/**
 * Progress Report Routes
 * 
 * Purpose:
 * - Define routes for rehabilitation progress reports
 * - Get all patients with rehabilitation entries
 * - Get detailed progress report for specific patient
 */

import { getAllPatientsHandler, getPatientProgressHandler, updateProgressReportHandler } from './progress-report.controller.js';
import { getAllPatientsSchema, getPatientProgressSchema, updateProgressReportSchema } from './progress-report.schema.js';

export default async function progressReportRoutes(fastify, options) {
    // Get all patients with rehabilitation entries
    fastify.get('/progress/patients', {
        schema: getAllPatientsSchema,
        onRequest: [fastify.authenticate],
        handler: getAllPatientsHandler
    });

    // Get detailed progress report for a specific patient
    fastify.get('/progress/patient/:patientId', {
        schema: getPatientProgressSchema,
        onRequest: [fastify.authenticate],
        handler: getPatientProgressHandler
    });

    // Update progress report for a specific rehabilitation entry
    fastify.put('/rehab/:entry_id', {
        schema: updateProgressReportSchema,
        onRequest: [fastify.authenticate],
        handler: updateProgressReportHandler
    });
}
