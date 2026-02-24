/**
 * Store & Procurement Routes Aggregator
 *
 * Purpose:
 * - Centralizes all store & procurement sub-module route registrations
 * - Keeps management routes.js clean and focused
 * - Uses static imports for better error tracing & IDE support
 * - Groups routes by domain prefix
 */

import vendorRoutes from './vendors/vendors.routes.js';
import itemRoutes from './items/items.routes.js';
import indentRoutes from './indents/indents.routes.js';
import purchaseOrderRoutes from './purchase-orders/purchase-orders.routes.js';
import grnRoutes from './grn/grn.routes.js';
import stockRoutes from './stock/stock.routes.js';
import reportsRoutes from './reports/reports.routes.js';

export default async function storeProcurementRoutes(fastify, opts) {

    // Enforce access control on all store & procurement routes
    fastify.addHook('onRequest', async (request, reply) => {
        await fastify.authenticate(request, reply);
        if (reply.sent) return;
        // Allow store-specific roles as well as admin/management
        await fastify.authorizeRoles(['admin', 'management', 'store'])(request, reply);
    });

    // ── Vendor Management ───────────────────────────────
    await fastify.register(vendorRoutes, { prefix: '/vendors' });

    // ── Inventory Items ─────────────────────────────────
    await fastify.register(itemRoutes, { prefix: '/items' });

    // ── Indent Requests ─────────────────────────────────
    await fastify.register(indentRoutes, { prefix: '/indents' });

    // ── Purchase Orders ─────────────────────────────────
    await fastify.register(purchaseOrderRoutes, { prefix: '/purchase-orders' });

    // ── Goods Receipt Notes ─────────────────────────────
    await fastify.register(grnRoutes, { prefix: '/grn' });

    // ── Department Stock ────────────────────────────────
    await fastify.register(stockRoutes, { prefix: '/stock' });

    // ── Reports ─────────────────────────────────────────
    await fastify.register(reportsRoutes, { prefix: '/reports' });
}
