/**
 * Doctor Admin Exception Reports Routes
 */

import * as exceptionReportsController from './exception-reports.controller.js';
import * as exceptionReportsSchema from './exception-reports.schema.js';

export default async function exceptionReportsRoutes(fastify, opts) {
    fastify.get('/overview', {
        schema: exceptionReportsSchema.exceptionOverviewSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.getExceptionReportsOverview(request, reply);
        }
    });

    fastify.get('/critical-lab-values-not-reviewed/doctors', {
        schema: exceptionReportsSchema.exceptionDoctorSelectorSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.getCriticalLabDoctorCards(request, reply);
        }
    });

    fastify.get('/critical-lab-values-not-reviewed', {
        schema: exceptionReportsSchema.criticalLabListSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.getCriticalLabValuesNotReviewed(request, reply);
        }
    });

    fastify.get('/critical-lab-values-not-reviewed/:test_item_id', {
        schema: exceptionReportsSchema.criticalLabDetailSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.getCriticalLabValueDetail(request, reply);
        }
    });

    fastify.post('/critical-lab-values-not-reviewed/:test_item_id/review', {
        schema: exceptionReportsSchema.criticalLabMarkReviewedSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.markCriticalLabReviewed(request, reply);
        }
    });

    fastify.get('/delayed-diagnostic-results/doctors', {
        schema: exceptionReportsSchema.exceptionDoctorSelectorSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.getDelayedDiagnosticsDoctorCards(request, reply);
        }
    });

    fastify.get('/delayed-diagnostic-results', {
        schema: exceptionReportsSchema.delayedDiagnosticsListSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.getDelayedDiagnosticResults(request, reply);
        }
    });

    fastify.get('/delayed-diagnostic-results/:source/:item_id', {
        schema: exceptionReportsSchema.delayedDiagnosticsDetailSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.getDelayedDiagnosticDetail(request, reply);
        }
    });

    fastify.post('/delayed-diagnostic-results/:source/:item_id/escalate', {
        schema: exceptionReportsSchema.delayedDiagnosticsEscalateSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.escalateDelayedDiagnostic(request, reply);
        }
    });

    fastify.get('/high-risk-patients-without-recent-review/doctors', {
        schema: exceptionReportsSchema.exceptionDoctorSelectorSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.getHighRiskDoctorCards(request, reply);
        }
    });

    fastify.get('/high-risk-patients-without-recent-review', {
        schema: exceptionReportsSchema.highRiskWithoutReviewSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.getHighRiskPatientsWithoutRecentReview(request, reply);
        }
    });

    fastify.get('/missed-follow-ups/doctors', {
        schema: exceptionReportsSchema.exceptionDoctorSelectorSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.getMissedFollowUpDoctorCards(request, reply);
        }
    });

    fastify.get('/missed-follow-ups', {
        schema: exceptionReportsSchema.missedFollowUpsListSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.getMissedFollowUps(request, reply);
        }
    });

    fastify.get('/pending-rehab-sessions/therapists', {
        schema: exceptionReportsSchema.pendingRehabTherapistSelectorSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.getPendingRehabTherapistCards(request, reply);
        }
    });

    fastify.get('/pending-rehab-sessions', {
        schema: exceptionReportsSchema.pendingRehabSessionsListSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return exceptionReportsController.getPendingRehabSessions(request, reply);
        }
    });
}
