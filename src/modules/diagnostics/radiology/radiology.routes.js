/**
 * Radiology Routes
 *
 * Purpose:
 * - Defines API endpoints for the Radiology module
 */
import RadiologyController from './radiology.controller.js';
import * as schemas from './radiology.schema.js';

export default async function radiologyRoutes(fastify, opts) {
    const controller = new RadiologyController(fastify);

    // ── Studies Master CRUD ────────────────────────────
    fastify.post('/studies', {
        schema: schemas.createStudySchema,
        onRequest: [fastify.authenticate],
        handler: controller.createStudy
    });

    fastify.get('/studies', {
        schema: schemas.listStudiesSchema,
        onRequest: [fastify.authenticate],
        handler: controller.listStudies
    });

    fastify.put('/studies/:studyId', {
        schema: schemas.updateStudySchema,
        onRequest: [fastify.authenticate],
        handler: controller.updateStudy
    });

    // ── Order CRUD ─────────────────────────────────────
    fastify.post('/orders', {
        schema: schemas.createOrderSchema,
        onRequest: [fastify.authenticate],
        handler: controller.createOrder
    });

    fastify.get('/orders', {
        schema: schemas.listOrdersSchema,
        onRequest: [fastify.authenticate],
        handler: controller.listOrders
    });

    // Patient history (must be before /:orderId)
    fastify.get('/orders/patient/:patientId', {
        schema: schemas.getPatientHistorySchema,
        onRequest: [fastify.authenticate],
        handler: controller.getPatientHistory
    });

    fastify.get('/orders/:orderId', {
        schema: schemas.getOrderByIdSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getOrderById
    });

    fastify.post('/orders/:orderId/cancel', {
        schema: schemas.cancelOrderSchema,
        onRequest: [fastify.authenticate],
        handler: controller.cancelOrder
    });

    // ── Reports ────────────────────────────────────────
    fastify.post('/reports', {
        schema: schemas.updateReportSchema,
        onRequest: [fastify.authenticate],
        handler: controller.updateReport
    });

    // ── Dashboard ──────────────────────────────────────
    fastify.get('/stats', {
        schema: schemas.getDashboardStatsSchema,
        handler: controller.getDashboardStats
    });
}
