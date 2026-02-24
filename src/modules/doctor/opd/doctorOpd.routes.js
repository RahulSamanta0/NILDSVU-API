/**
 * Doctor OPD Routes
 */

import * as controller from "./doctorOpd.controller.js";
import * as schema from "./doctorOpd.schema.js";

export default async function doctorOpdRoutes(fastify, options) {
  // Save OPD prescription
  fastify.post("/prescriptions", {
    schema: schema.createPrescriptionSchema,
    preHandler: [fastify.authenticate],
    handler: controller.createPrescription,
  });
  // GET opd patients
  fastify.get(
    "/opd-patients",
    {
      schema: schema.getOpdPatientsSchema,
      preHandler: [fastify.authenticate],
    },
    controller.getOpdPatients,
  );

  // GET OPD dashboard data
  fastify.get(
    "/opd-dashboard",
    {
      schema: schema.getOpdDashboardSchema,
      preHandler: [fastify.authenticate], // if using auth
    },
    controller.getOpdDashboard,
  );

  // GET OPD patient details
  fastify.get(
    "/lab-tests",
    {
      schema: schema.getOpdLabTestsSchema,
      preHandler: [fastify.authenticate], // if using auth
    },
    controller.getOpdLabTests,
  );

  // GET OPD patient visit history
  fastify.get(
    "/visit-history",
    {
      schema: schema.getOpdVisitHistorySchema,
      preHandler: [fastify.authenticate], // if using auth
    },
    controller.getOpdVisitHistory,
  );
  // GET patient details by UPID
  fastify.get(
    "/patient/:upid",
    {
      schema: schema.getPatientDetailsByUpidSchema,
      preHandler: [fastify.authenticate],
    },
    controller.getPatientDetailsByUpid,
  );

  // GET patient lab results by UPID
  fastify.get(
    "/patient/:upid/lab-results",
    {
      schema: schema.getPatientLabResultsByUpidSchema,
      preHandler: [fastify.authenticate],
    },
    controller.getPatientLabResultsByUpid,
  );

  // GET patient diagnostic reports by UPID (paginated)
  fastify.get(
    "/patient/:upid/diagnostic-reports",
    {
      schema: schema.getDiagnosticReportsByUpidSchema,
      preHandler: [fastify.authenticate],
    },
    controller.getDiagnosticReportsByUpid,
  );
}
