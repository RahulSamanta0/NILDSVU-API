import * as opdConunterController from "./opd-counter.controller.js";
import * as opdConunterSchema from "./opd-counter.schema.js";

export default async function opdCounterRoutes(fastify) {
  fastify.get("/medicines", {
    schema: opdConunterSchema.getMedicinesSchema,
    onRequest: [fastify.authenticate],
    handler: opdConunterController.getMedicines,
  });

  fastify.get("/doctors", {
    schema: opdConunterSchema.getDoctorsSchema,
    onRequest: [fastify.authenticate],
    handler: opdConunterController.getDoctors,
  });

  fastify.get("/prescriptions/patient/:upid", {
    schema: opdConunterSchema.getPrescriptionByPatientUpidSchema,
    onRequest: [fastify.authenticate],
    handler: opdConunterController.getPrescriptionByPatientUpid,
  });

  fastify.get("/prescriptions/:prescriptionId", {
    schema: opdConunterSchema.getPrescriptionByIdSchema,
    onRequest: [fastify.authenticate],
    handler: opdConunterController.getPrescriptionById,
  });
}
