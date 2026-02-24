import * as vehicalStatusService from "./vehicalStatus.services.js";

export async function getVehicleTypes(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await vehicalStatusService.getVehicleTypeList(
      request.server.prisma,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Vehicle types fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch vehicle types",
    });
  }
}

export async function getStatusTypes(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await vehicalStatusService.getStatusTypeList(
      request.server.prisma,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Status types fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch status types",
    });
  }
}

export async function getAmbulanceStatusCounts(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const data = await vehicalStatusService.getAmbulanceStatusCounts(
      request.server.prisma,
      tenantId,
    );

    return reply.code(200).send({
      success: true,
      message: "Ambulance status counts fetched successfully",
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch ambulance status counts",
    });
  }
}

export async function getFleetUtilizationDaily(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const data = await vehicalStatusService.getFleetUtilizationDaily(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Fleet utilization fetched successfully",
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch fleet utilization",
    });
  }
}

export async function getVehicleDashboard(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const [counts, fleetUtilization] = await Promise.all([
      vehicalStatusService.getAmbulanceStatusCounts(request.server.prisma, tenantId),
      vehicalStatusService.getFleetUtilizationDaily(
        request.server.prisma,
        tenantId,
        request.query,
      ),
    ]);

    return reply.code(200).send({
      success: true,
      message: "Vehicle dashboard fetched successfully",
      data: {
        counts,
        fleetUtilization,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch vehicle dashboard",
    });
  }
}

export async function getAmbulanceInventory(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await vehicalStatusService.getAmbulanceInventoryList(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Ambulance inventory fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch ambulance inventory",
    });
  }
}

export async function createAmbulance(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    const userId = request.user?.user_id;
    const facilityId = request.user?.facility_id ?? null;

    if (!tenantId || !userId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant or user not found in token",
      });
    }

    const data = await vehicalStatusService.createAmbulance(
      request.server.prisma,
      tenantId,
      userId,
      facilityId,
      request.body,
    );

    return reply.code(201).send({
      success: true,
      message: "Ambulance created successfully",
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to create ambulance",
    });
  }
}

export async function updateAmbulanceStatus(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    const userId = request.user?.user_id;

    if (!tenantId || !userId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant or user not found in token",
      });
    }

    const data = await vehicalStatusService.updateAmbulanceStatus(
      request.server.prisma,
      tenantId,
      userId,
      request.body,
    );

    return reply.code(201).send({
      success: true,
      message: "Ambulance status updated successfully",
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to update ambulance status",
    });
  }
}
