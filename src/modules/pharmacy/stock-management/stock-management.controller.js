import * as stockManagementService from "./stock-management.services.js";

export async function createPurchaseOrder(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;
    const userId = request.user?.user_id;

    if (!tenantId || !userId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant or user not found in token",
      });
    }

    const data = await stockManagementService.createPurchaseOrder(
      request.server.prisma,
      tenantId,
      userId,
      request.body,
    );

    return reply.code(201).send({
      success: true,
      message: "Purchase order created successfully",
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to create purchase order",
    });
  }
}

export async function updateExistingMedicineQuantity(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const data = await stockManagementService.updateExistingMedicineQuantity(
      request.server.prisma,
      tenantId,
      request.body,
    );

    return reply.code(200).send({
      success: true,
      message: "Medicine quantity updated successfully",
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to update medicine quantity",
    });
  }
}

export async function getStockInventoryList(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await stockManagementService.getStockInventoryList(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Stock inventory fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch stock inventory",
    });
  }
}

export async function getStockStatusCounts(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const data = await stockManagementService.getStockStatusCounts(
      request.server.prisma,
      tenantId,
    );

    return reply.code(200).send({
      success: true,
      message: "Stock status counts fetched successfully",
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch stock status counts",
    });
  }
}
