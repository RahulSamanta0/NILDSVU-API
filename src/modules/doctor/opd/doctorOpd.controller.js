/**
 * Doctor OPD Controller
 */

import * as doctorOpdService from "./doctorOpd.services.js";

export async function createPrescription(request, reply) {
  try {
    // Tenant must come from authenticated user
    // console.log("Authenticated user:", request.user);
    if (!request.user?.tenant_id) {
      return reply.code(401).send({
        error: "Unauthorized",
        message: "Tenant information missing from authenticated user",
      });
    }
    const tenantId = BigInt(request.user.tenant_id);

    const fallbackDoctorId = request.user?.user_id
      ? BigInt(request.user.user_id)
      : null;

    // Since schema is strict, no normalization required
    const payload = {
      ...request.body,
    };

    const result = await doctorOpdService.createPrescription(
      request.server.prisma,
      payload,
      tenantId,
      fallbackDoctorId,
    );

    return reply.code(201).send(result);
  } catch (error) {
    request.log.error(error);

    return reply.code(error.statusCode || 500).send({
      error: "Prescription Save Failed",
      message: error.message || "Unable to save prescription",
    });
  }
}

export async function getOpdPatients(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(400).send({
        success: false,
        message: "Tenant ID is required",
      });
    }

    const {
      dateType = "current",
      fromDate,
      toDate,
      type = "all",
      page = 1,
      offset = 10,
    } = request.query;

    const currentPage = Math.max(1, Number(page));
    const pageSize = Math.max(1, Number(offset));

    let startDate = null;
    let endDate = null;

    const getStartAndEnd = (date) => {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);

      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      return { start, end };
    };

    if (dateType === "current") {
      const { start, end } = getStartAndEnd(new Date());
      startDate = start;
      endDate = end;
    } else if (dateType === "previous") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      startDate = null;
      endDate = today; // All records before today
    } else if (dateType === "range") {
      const start = new Date(fromDate);
      const end = new Date(toDate);

      if (isNaN(start) || isNaN(end) || start > end) {
        return reply.code(400).send({
          success: false,
          message: "Invalid date range",
        });
      }

      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      startDate = start;
      endDate = end;
    } else if (dateType === "all") {
      startDate = null;
      endDate = null;
    }

    const result = await doctorOpdService.getOpdPatients(
      request.server.prisma,
      tenantId,
      {
        fromDate: startDate,
        toDate: endDate,
        type,
        page: currentPage,
        offset: pageSize,
      },
    );

    return reply.code(200).send({
      success: true,
      message: "OPD patients fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);

    return reply.code(500).send({
      success: false,
      message: "Failed to fetch OPD patients",
    });
  }
}

export async function getOpdDashboard(request, reply) {
  try {
    const prisma = request.server.prisma;
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      throw new HttpError(401, "Unauthorized", "Invalid tenant");
    }

    const result = await doctorOpdService.getOpdDashboard(
      prisma,
      BigInt(tenantId),
    );

    return reply.code(200).send({
      success: true,
      message: "OPD dashboard fetched successfully",
      data: result ?? {},
    });
  } catch (error) {
    request.log.error(error, "Error fetching OPD dashboard");
    throw error; // Let global error handler format error response
  }
}


export async function getOpdLabTests(request, reply) {
  try {
    const prisma = request.server.prisma;
    const tenant_id = request.user?.tenant_id;

    if (!tenant_id) {
      throw new HttpError(401, "Unauthorized", "Invalid tenant");
    }

    const tests = await doctorOpdService.getLabTests(prisma, tenant_id);

    return reply.code(200).send({
      success: true,
      message: tests.length
        ? "Lab tests fetched successfully"
        : "No lab tests found",
      data: tests,
    });
  } catch (error) {
    request.log.error(error);
    throw error;
  }
}


export async function getOpdVisitHistory(request, reply) {
  try {
    const prisma = request.server.prisma;
    const tenant_id = request.user?.tenant_id;

    if (!tenant_id) {
      throw new HttpError(401, "Unauthorized", "Invalid tenant");
    }

    const { visits, total, totalPages } =
      await doctorOpdService.getVisitHistory(prisma, tenant_id, request.query);

    return reply.code(200).send({
      success: true,
      message: visits.length
        ? "Visit history fetched successfully"
        : "No visit history found",
      data: visits,
      pagination: {
        total,
        page: request.query.page || 1,
        limit: request.query.limit || 10,
        totalPages,
      },
    });
  } catch (error) {
    request.log.error(error);
    throw error;
  }
}

export async function getPatientDetailsByUpid(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(400).send({
        error: "Invalid tenant",
        message: "Tenant ID is required",
      });
    }

    const { upid } = request.params;

    const patient = await doctorOpdService.getPatientDetailsByUpid(
      request.server.prisma,
      tenantId,
      upid,
    );

    return reply.code(200).send(patient);
  } catch (error) {
    request.log.error(error, "Error fetching patient details by UPID");

    return reply.code(error.statusCode || 500).send({
      error:
        error.statusCode === 404 ? "Patient not found" : "Failed to fetch patient details",
      message: error.message || "Unable to fetch patient details",
    });
  }
}

export async function getPatientLabResultsByUpid(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(400).send({
        error: "Invalid tenant",
        message: "Tenant ID is required",
      });
    }

    const { upid } = request.params;

    const result = await doctorOpdService.getPatientLabResultsByUpid(
      request.server.prisma,
      tenantId,
      upid,
    );

    return reply.code(200).send(result);
  } catch (error) {
    request.log.error(error, "Error fetching patient lab results by UPID");

    return reply.code(error.statusCode || 500).send({
      error: error.statusCode === 404 ? "Patient not found" : "Failed to fetch lab results",
      message: error.message || "Unable to fetch patient lab results",
    });
  }
}

export async function getDiagnosticReportsByUpid(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(400).send({
        error: "Invalid tenant",
        message: "Tenant ID is required",
      });
    }

    const { upid } = request.params;
    const page = Number(request.query?.page || 1);
    const limit = Number(request.query?.limit || 10);

    const result = await doctorOpdService.getDiagnosticReportsByUpid(
      request.server.prisma,
      tenantId,
      upid,
      page,
      limit,
    );

    return reply.code(200).send(result);
  } catch (error) {
    request.log.error(error, "Error fetching diagnostic reports by UPID");

    return reply.code(error.statusCode || 500).send({
      error:
        error.statusCode === 404 ? "Patient not found" : "Failed to fetch diagnostic reports",
      message: error.message || "Unable to fetch diagnostic reports",
    });
  }
}
