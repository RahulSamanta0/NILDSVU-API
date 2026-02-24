import * as vehicalStatusController from "./vehicalStatus.controller.js";
import * as vehicalStatusSchema from "./vehicalStatus.schema.js";

export default async function vehicalStatusRoutes(fastify) {
  fastify.get("/vehicle-status/vehicle-types", {
    schema: vehicalStatusSchema.getVehicleTypesSchema,
    onRequest: [fastify.authenticate],
    handler: vehicalStatusController.getVehicleTypes,
  });

  fastify.get("/vehicle-status/status-types", {
    schema: vehicalStatusSchema.getStatusTypesSchema,
    onRequest: [fastify.authenticate],
    handler: vehicalStatusController.getStatusTypes,
  });

  fastify.get("/vehicle-status/dashboard", {
    schema: vehicalStatusSchema.getVehicleDashboardSchema,
    onRequest: [fastify.authenticate],
    handler: vehicalStatusController.getVehicleDashboard,
  });

  fastify.get("/vehicle-status/inventory", {
    schema: vehicalStatusSchema.getAmbulanceInventorySchema,
    onRequest: [fastify.authenticate],
    handler: vehicalStatusController.getAmbulanceInventory,
  });

  fastify.post("/new/ambulances", {
    schema: vehicalStatusSchema.createAmbulanceSchema,
    onRequest: [fastify.authenticate],
    handler: vehicalStatusController.createAmbulance,
  });

  fastify.post("/vehicle-status/update", {
    schema: vehicalStatusSchema.updateAmbulanceStatusSchema,
    onRequest: [fastify.authenticate],
    handler: vehicalStatusController.updateAmbulanceStatus,
  });
}
