/**
 * Lab Routes
 *
 * Purpose:
 * - Defines API endpoints for the Laboratory module
 */
import LabController from './lab.controller.js';
import * as schemas from './lab.schema.js';

export default async function labRoutes(fastify, opts) {
    const controller = new LabController(fastify);

    // ── Test Master CRUD ───────────────────────────────
    fastify.post('/tests', {
        schema: schemas.createLabTestSchema,
        onRequest: [fastify.authenticate],
        handler: controller.createLabTest
    });

    fastify.get('/tests', {
        schema: schemas.listLabTestsSchema,
        onRequest: [fastify.authenticate],
        handler: controller.listLabTests
    });

    fastify.put('/tests/:testId', {
        schema: schemas.updateLabTestSchema,
        onRequest: [fastify.authenticate],
        handler: controller.updateLabTest
    });

    // ── Order CRUD ─────────────────────────────────────
    fastify.post('/orders', {
        schema: schemas.createLabOrderSchema,
        onRequest: [fastify.authenticate],
        handler: controller.createLabOrder
    });

    fastify.get('/orders', {
        schema: schemas.listLabOrdersSchema,
        onRequest: [fastify.authenticate],
        handler: controller.listLabOrders
    });

    // Patient lab history (must be before /:orderId)
    fastify.get('/orders/patient/:patientId', {
        schema: schemas.getPatientLabHistorySchema,
        onRequest: [fastify.authenticate],
        handler: controller.getPatientLabHistory
    });

    fastify.get('/orders/:orderId', {
        schema: schemas.getLabOrderByIdSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getLabOrderById
    });

    fastify.post('/orders/:orderId/collect', {
        schema: schemas.collectSampleSchema,
        onRequest: [fastify.authenticate],
        handler: controller.collectSample
    });

    fastify.post('/orders/:orderId/cancel', {
        schema: schemas.cancelLabOrderSchema,
        onRequest: [fastify.authenticate],
        handler: controller.cancelLabOrder
    });

    // ── Dashboard ──────────────────────────────────────
    fastify.get('/stats', {
        schema: schemas.getDashboardStatsSchema
    }, controller.getDashboardStats);

    fastify.get('/samples/pending', {
        schema: schemas.getPendingSamplesSchema
    }, controller.getPendingSamples);

    fastify.get('/charts/collection', {
        schema: schemas.getCollectionTrendSchema
    }, controller.getCollectionTrend);

    fastify.get('/charts/processing', {
        schema: schemas.getProcessingLoadSchema
    }, controller.getProcessingLoad);

    // ── Sample Rejection ──────────────────────────────
    fastify.post('/orders/:orderId/reject', {
        schema: schemas.rejectSampleSchema,
        onRequest: [fastify.authenticate],
        handler: controller.rejectSample
    });

    // ── Sample Collection Lists ──────────────────────
    fastify.get('/samples/collected', {
        schema: schemas.getCollectedSamplesSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getCollectedSamples
    });

    fastify.get('/samples/rejected', {
        schema: schemas.getRejectedSamplesSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getRejectedSamples
    });

    // ── Individual Test Result Entry ────────────────────
    fastify.get('/items/pending-entry', {
        schema: schemas.getPendingResultEntrySchema,
        onRequest: [fastify.authenticate],
        handler: controller.getPendingResultEntry
    });

    fastify.post('/items/:testItemId/result', {
        schema: schemas.enterTestResultSchema,
        onRequest: [fastify.authenticate],
        handler: controller.enterTestResult
    });

    // ── Critical Result Acknowledgement ──────────────
    fastify.post('/items/:testItemId/acknowledge-critical', {
        schema: schemas.acknowledgeCriticalSchema,
        onRequest: [fastify.authenticate],
        handler: controller.acknowledgeCritical
    });

    // ── Reports ────────────────────────────────────────
    fastify.post('/reports', {
        schema: schemas.updateReportSchema,
        onRequest: [fastify.authenticate],
        handler: controller.updateReport
    });

    fastify.get('/reports/sample-collection', {
        schema: schemas.getReportSampleCollectionSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getReportSampleCollection
    });

    fastify.get('/reports/processing-log', {
        schema: schemas.getReportProcessingLogSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getReportProcessingLog
    });

    fastify.get('/reports/result-entry', {
        schema: schemas.getReportResultEntrySchema,
        onRequest: [fastify.authenticate],
        handler: controller.getReportResultEntry
    });

    fastify.get('/reports/rejections', {
        schema: schemas.getReportRejectionsSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getReportRejections
    });

    // ── Exception Reports ────────────────────────────
    fastify.get('/exceptions/delayed-tests', {
        schema: schemas.getExceptionDelayedTestsSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getExceptionDelayedTests
    });

    fastify.get('/exceptions/not-collected', {
        schema: schemas.getExceptionNotCollectedSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getExceptionNotCollected
    });

    fastify.get('/exceptions/not-processed', {
        schema: schemas.getExceptionNotProcessedSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getExceptionNotProcessed
    });

    fastify.get('/exceptions/unverified', {
        schema: schemas.getExceptionUnverifiedSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getExceptionUnverified
    });

    fastify.get('/exceptions/critical-unacknowledged', {
        schema: schemas.getExceptionCriticalUnacknowledgedSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getExceptionCriticalUnacknowledged
    });
}
