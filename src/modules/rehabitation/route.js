/**
 * Rehabilitation Module Routes
 * 
 * Purpose:
 * - Consolidates all rehabilitation-related routes
 * - Organizes routes into logical sub-modules:
 *   - dataentry: Create and update rehabilitation entries
 *   - patient-details: Retrieve patient rehabilitation data organized by sections
 *   - progress-report: Generate progress reports and patient lists
 *   - exception: Exception reports and dashboard statistics
 */

import rehabilitationDataEntryRoutes from './dataentry/rehabitation.route.js';
import patientDetailsRoutes from './patient-details/patient-details.route.js';
import progressReportRoutes from './progress-report/progress-report.route.js';
import exceptionReportsRoutes from './exception/exception.routes.js';

export default async function rehabilitationRoutes(fastify, options) {
    // Register data entry routes (POST/PUT operations)
    await fastify.register(rehabilitationDataEntryRoutes);
    
    // Register patient details routes (GET operations)
    await fastify.register(patientDetailsRoutes);
    
    // Register progress report routes (GET operations)
    await fastify.register(progressReportRoutes);
    
    // Register exception reports routes (GET/PATCH operations)
    await fastify.register(exceptionReportsRoutes, { prefix: '/exceptions' });
}
