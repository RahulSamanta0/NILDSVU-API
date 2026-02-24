import * as prescriptionProcessingController from "./prescription-processing.controller.js";
import * as prescriptionProcessingSchema from "./prescription-processing.schema.js";

export default async function prescriptionProcessingRoutes(fastify) {
  fastify.post("/prescriptions/decision", {
    schema: prescriptionProcessingSchema.updatePrescriptionDecisionSchema,
    onRequest: [fastify.authenticate],
    handler: prescriptionProcessingController.updatePrescriptionDecision,
  });

  fastify.post("/prescriptions/details", {
    schema: prescriptionProcessingSchema.getPrescriptionDetailsByIdSchema,
    onRequest: [fastify.authenticate],
    handler: prescriptionProcessingController.getPrescriptionDetailsById,
  });


  fastify.get(
    "/prescriptions/processing/status-counts",
    {
      schema:
        prescriptionProcessingSchema.getPrescriptionProcessingStatusCountsSchema,
      preHandler: [fastify.authenticate],
    },
    prescriptionProcessingController.getPrescriptionProcessingStatusCounts,
  );

  fastify.get(
    "/prescriptions/processing",
    {
      schema: prescriptionProcessingSchema.getPrescriptionProcessingListSchema,
      preHandler: [fastify.authenticate],
    },
    prescriptionProcessingController.getPrescriptionProcessingList,
  );
}
