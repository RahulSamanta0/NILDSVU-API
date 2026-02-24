import * as hrController from './hr.controller.js';
import * as hrSchema from './hr.schema.js';

export default async function managementHrRoutes(fastify, opts) {
    fastify.get('/metrics/summary', {
        schema: hrSchema.metricsSummarySchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.getMetricsSummary(request, reply);
        }
    });

    fastify.get('/metrics/attention', {
        schema: hrSchema.metricsAttentionSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.getMetricsAttention(request, reply);
        }
    });

    fastify.get('/analytics/attendance-trend', {
        schema: hrSchema.attendanceTrendSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.getAttendanceTrend(request, reply);
        }
    });

    fastify.get('/analytics/hiring-comparison', {
        schema: hrSchema.hiringComparisonSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.getHiringComparison(request, reply);
        }
    });

    fastify.get('/analytics/performance-distribution', {
        schema: hrSchema.performanceDistributionSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.getPerformanceDistribution(request, reply);
        }
    });

    fastify.get('/managers', {
        schema: hrSchema.listManagersSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.listManagers(request, reply);
        }
    });

    fastify.get('/managers/:managerId', {
        schema: hrSchema.getManagerSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.getManager(request, reply);
        }
    });

    fastify.get('/managers/:managerId/staff', {
        schema: hrSchema.listManagerStaffSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.listManagerStaff(request, reply);
        }
    });

    fastify.post('/managers', {
        schema: hrSchema.createManagerSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.createManager(request, reply);
        }
    });

    fastify.delete('/managers/:managerId', {
        schema: hrSchema.deleteManagerSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.deleteManager(request, reply);
        }
    });

    fastify.get('/staff/:staffId', {
        schema: hrSchema.getStaffSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.getStaff(request, reply);
        }
    });

    fastify.post('/staff/:staffId/documents', {
        schema: hrSchema.addStaffDocumentSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.addStaffDocument(request, reply);
        }
    });

    fastify.get('/staff/:staffId/documents', {
        schema: hrSchema.listStaffDocumentsSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.listStaffDocuments(request, reply);
        }
    });

    fastify.put('/staff/:staffId/documents/:documentId', {
        schema: hrSchema.updateStaffDocumentSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.updateStaffDocument(request, reply);
        }
    });

    fastify.patch('/staff/:staffId/documents/:documentId', {
        schema: hrSchema.updateStaffDocumentSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.updateStaffDocument(request, reply);
        }
    });

    fastify.delete('/staff/:staffId/documents/:documentId', {
        schema: hrSchema.deleteStaffDocumentSchema,
        onRequest: [fastify.authenticate],
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return hrController.deleteStaffDocument(request, reply);
        }
    });
}
