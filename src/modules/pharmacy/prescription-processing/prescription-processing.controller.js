import * as prescriptionProcessingService from "./prescription-processing.services.js";

export async function getPrescriptionProcessingList(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await prescriptionProcessingService.getPrescriptionProcessingList(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Prescription processing list fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Failed to fetch prescription processing list",
    });
  }
}

export async function getPrescriptionProcessingStatusCounts(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const data =
      await prescriptionProcessingService.getPrescriptionProcessingStatusCounts(
        request.server.prisma,
        tenantId,
      );

    return reply.code(200).send({
      success: true,
      message: "Prescription status counts fetched successfully",
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch prescription status counts",
    });
  }
}

export async function getPrescriptionDetailsById(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const data = await prescriptionProcessingService.getPrescriptionDetailsById(
      request.server.prisma,
      tenantId,
      request.body.prescriptionId,
    );

    return reply.code(200).send({
      success: true,
      message: "Prescription details fetched successfully",
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch prescription details",
    });
  }
}

export async function updatePrescriptionDecision(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    const actionByUserId = request.user?.user_id;

    if (!tenantId || !actionByUserId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant/user not found in token",
      });
    }

    const data = await prescriptionProcessingService.updatePrescriptionDecision(
      request.server.prisma,
      tenantId,
      request.body.prescriptionId,
      request.body.decision,
      actionByUserId,
      request.body.approvedBy,
      request.body.rejectedBy,
    );

    return reply.code(200).send({
      success: true,
      message: "Prescription decision updated successfully",
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to update prescription decision",
    });
  }
}
