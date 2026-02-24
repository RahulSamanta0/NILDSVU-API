import * as tripLogsController from "./tripLogs.controller.js";
import * as tripLogsSchema from "./tripLogs.schema.js";

export default async function tripLogsRoutes(fastify) {
  fastify.get("/trip-logs", {
    schema: tripLogsSchema.listTripLogsSchema,
    onRequest: [fastify.authenticate],
    handler: tripLogsController.listTripLogs,
  });

  fastify.get("/trip-logs/dashboard", {
    schema: tripLogsSchema.getTripDashboardSchema,
    onRequest: [fastify.authenticate],
    handler: tripLogsController.getTripDashboard,
  });
}
