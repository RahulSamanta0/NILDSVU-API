import * as tripLogsService from "./tripLogs.services.js";

export async function listTripLogs(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await tripLogsService.listTripLogs(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Trip logs fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch trip logs",
    });
  }
}

export async function getTripDashboard(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const data = await tripLogsService.getTripLogsDashboard(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Trip dashboard fetched successfully",
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch trip dashboard",
    });
  }
}
