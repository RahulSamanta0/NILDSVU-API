import * as purchaseInventoryService from "./purchase-inventory.services.js";

export async function getPurchaseOrders(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await purchaseInventoryService.getPurchaseOrdersList(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Purchase orders fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch purchase orders",
    });
  }
}

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

    const data = await purchaseInventoryService.createPurchaseOrder(
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

export async function getSuppliersForFilter(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await purchaseInventoryService.getSupplierFilterList(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Suppliers fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch suppliers",
    });
  }
}

export async function getPendingPurchaseOrders(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await purchaseInventoryService.getPendingPurchaseOrdersList(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Pending purchase orders fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch pending purchase orders",
    });
  }
}

export async function getPoReceiptDetails(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const data = await purchaseInventoryService.getPoReceiptDetails(
      request.server.prisma,
      tenantId,
      request.query.poNumber,
    );

    return reply.code(200).send({
      success: true,
      message: "PO receipt details fetched successfully",
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch PO receipt details",
    });
  }
}

export async function getGrnList(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await purchaseInventoryService.getGrnList(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "GRN list fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch GRN list",
    });
  }
}

export async function getSupplierDirectory(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await purchaseInventoryService.getSupplierDirectoryList(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Supplier directory fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch supplier directory",
    });
  }
}

export async function getReturnsDamagedList(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await purchaseInventoryService.getReturnsDamagedList(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Returns and damaged list fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch returns and damaged list",
    });
  }
}

export async function getPurchaseStockItems(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const result = await purchaseInventoryService.getPurchaseStockItemsList(
      request.server.prisma,
      tenantId,
      request.query,
    );

    return reply.code(200).send({
      success: true,
      message: "Stock items fetched successfully",
      ...result,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to fetch stock items",
    });
  }
}

export async function confirmPoReceipt(request, reply) {
  try {
    const tenantId = request.user?.tenant_id;

    if (!tenantId) {
      return reply.code(401).send({
        success: false,
        message: "Unauthorized: tenant not found in token",
      });
    }

    const data = await purchaseInventoryService.confirmPoReceipt(
      request.server.prisma,
      tenantId,
      request.body,
    );

    return reply.code(201).send({
      success: true,
      message: "Receipt confirmed successfully",
      data,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(error.statusCode || 500).send({
      success: false,
      message: error.message || "Unable to confirm receipt",
    });
  }
}
