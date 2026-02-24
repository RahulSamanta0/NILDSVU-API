/**
 * Reports Routes
 *
 * Purpose:
 * - REST API endpoints for store & procurement reports
 * - Provides historical data analysis and stock ledgers
 */

import * as reportController from './reports.controller.js';
import * as reportSchema from './reports.schema.js';

export default async function reportsRoutes(fastify, opts) {
    // GRN Register
    fastify.get('/grn-register', { schema: reportSchema.grnRegisterSchema }, async (request, reply) => {
        return reportController.getGRNRegister(request, reply);
    });

    // Expiry Report
    fastify.get('/expiry-report', { schema: reportSchema.expiryReportSchema }, async (request, reply) => {
        return reportController.getExpiryReport(request, reply);
    });

    // Reorder Report
    fastify.get('/reorder-report', { schema: reportSchema.reorderReportSchema }, async (request, reply) => {
        return reportController.getReorderReport(request, reply);
    });

    // Purchase Summary
    fastify.get('/purchase-summary', { schema: reportSchema.purchaseSummarySchema }, async (request, reply) => {
        return reportController.getPurchaseSummary(request, reply);
    });

    // Stock Ledger
    fastify.get('/stock-ledger', { schema: reportSchema.stockLedgerSchema }, async (request, reply) => {
        return reportController.getStockLedger(request, reply);
    });
}
