import * as opdCounterService from "./opd-counter.services.js";

export async function getMedicines(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await opdCounterService.getMedicineList(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Medicines fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to fetch medicines",
    });
  }
}
export async function getDoctors(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        error: "Unauthorized",
        message: "Tenant information missing from authenticated user",
      });
    }

    const result = await opdCounterService.getDoctorList(
      request.server.prisma,
      tenantId,
      request.query,
    );
    return reply.code(200).send({
      success: true,
      message: "Doctors fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: "Fetch Failed",
      message: error.message || "Unable to fetch doctors list",
    });
  }
}
export async function getPrescriptionByPatientUpid(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        error: "Unauthorized",
        message: "Tenant information missing from authenticated user",
      });
    }

    const { upid } = request.params;

    const result = await opdCounterService.getPrescriptionMedicinesByPatientUpid(
      request.server.prisma,
      tenantId,
      upid,
    );

    return reply.code(200).send({
      success: true,
      message: "Prescription fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      error: error.statusCode === 404 ? "Not Found" : "Fetch Failed",
      message: error.message || "Unable to fetch prescription details",
    });
  }
}
export async function getPrescriptionById(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        error: "Unauthorized",
        message: "Tenant information missing from authenticated user",
      });
    }

    const { prescriptionId } = request.params;

    const result = await opdCounterService.getPrescriptionMedicinesByPrescriptionId(
      request.server.prisma,
      tenantId,
      prescriptionId,
    );

    return reply.code(200).send({
      success: true,
      message: "Prescription fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      error: error.statusCode === 404 ? "Not Found" : "Fetch Failed",
      message: error.message || "Unable to fetch prescription details",
    });
  }
}