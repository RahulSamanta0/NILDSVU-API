import * as vendorLogsController from './vendor-logs.controller.js';
import vendorLogsSchema from './vendor-logs.schema.js';

export default async function vendorLogsRoutes(fastify, options) {
  // GET /security/vendor-logs - Get all vendor logs
  fastify.get(
    '/security/vendor-logs',
    {
      preHandler: [fastify.authenticate],
      schema: vendorLogsSchema.getAllVendorLogsSchema,
    },
    vendorLogsController.getAllVendorLogs
  );

  // GET /security/vendor-logs/dashboard-stats - Get dashboard statistics
  fastify.get(
    '/security/vendor-logs/dashboard-stats',
    {
      preHandler: [fastify.authenticate],
      schema: vendorLogsSchema.getVendorDashboardStatsSchema,
    },
    vendorLogsController.getVendorDashboardStats
  );

  // PUT /security/vendor-logs/checkout/:passNumber - Checkout vendor
  fastify.put(
    '/security/vendor-logs/checkout/:passNumber',
    {
      preHandler: [fastify.authenticate],
      schema: vendorLogsSchema.checkoutVendorSchema,
    },
    vendorLogsController.checkoutVendor
  );
}

