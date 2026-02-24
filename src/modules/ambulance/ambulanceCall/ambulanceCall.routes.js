import * as ambulanceCallController from "./ambulanceCall.controller.js";
import * as ambulanceCallSchema from "./ambulanceCall.schema.js";

export default async function ambulanceCallRoutes(fastify) {
  fastify.get("/calls/dashboard-counts", {
    schema: ambulanceCallSchema.getAmbulanceDashboardCountsSchema,
    onRequest: [fastify.authenticate],
    handler: ambulanceCallController.getAmbulanceDashboardCounts,
  });

  fastify.post("/calls/cancel", {
    schema: ambulanceCallSchema.cancelAmbulanceCallSchema,
    onRequest: [fastify.authenticate],
    handler: ambulanceCallController.cancelAmbulanceCall,
  });

  fastify.post("/calls/assign", {
    schema: ambulanceCallSchema.assignAmbulanceSchema,
    onRequest: [fastify.authenticate],
    handler: ambulanceCallController.assignAmbulance,
  });

  fastify.get("/calls/available-drivers", {
    schema: ambulanceCallSchema.getAvailableDriversSchema,
    onRequest: [fastify.authenticate],
    handler: ambulanceCallController.getAvailableDrivers,
  });

  fastify.get("/calls/available-ambulances", {
    schema: ambulanceCallSchema.getAvailableAmbulancesSchema,
    onRequest: [fastify.authenticate],
    handler: ambulanceCallController.getAvailableAmbulances,
  });

  fastify.get("/calls", {
    schema: ambulanceCallSchema.listAmbulanceCallsSchema,
    onRequest: [fastify.authenticate],
    handler: ambulanceCallController.listAmbulanceCalls,
  });
}
