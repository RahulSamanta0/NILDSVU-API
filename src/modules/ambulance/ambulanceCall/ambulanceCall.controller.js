import * as ambulanceCallService from "./ambulanceCall.services.js";

export async function getAmbulanceDashboardCounts(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await ambulanceCallService.getAmbulanceDashboardCounts(
      request.server.prisma,
      tenantId,
    );

    return reply.code(200).send({
      success: true,
      message: "Ambulance dashboard counts fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch dashboard counts",
    });
  }
}

export async function cancelAmbulanceCall(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    const userId = request.user?.user_id || null;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await ambulanceCallService.cancelAmbulanceCall(
      request.server.prisma,
      tenantId,
      userId,
      request.body,
    );

    return reply.code(200).send({
      success: true,
      message: "Ambulance call cancelled successfully",
      data: result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to cancel ambulance call",
    });
  }
}

export async function assignAmbulance(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    const userId = request.user?.user_id || null;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await ambulanceCallService.assignAmbulance(
      request.server.prisma,
      tenantId,
      userId,
      request.body,
    );

    return reply.code(201).send({
      success: true,
      message: "Ambulance and driver assigned successfully",
      data: result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to assign ambulance and driver",
    });
  }
}

export async function getAvailableDrivers(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await ambulanceCallService.getAvailableDrivers(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Available drivers fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch available drivers",
    });
  }
}

export async function getAvailableAmbulances(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await ambulanceCallService.getAvailableAmbulances(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Available ambulances fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch available ambulances",
    });
  }
}

export async function listAmbulanceCalls(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await ambulanceCallService.listAmbulanceCalls(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Ambulance calls fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch ambulance calls",
    });
  }
}
