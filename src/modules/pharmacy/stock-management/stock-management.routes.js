import * as stockManagementController from "./stock-management.controller.js";
import * as stockManagementSchema from "./stock-management.schema.js";

export default async function stockManagementRoutes(fastify) {
  fastify.post("/stock/purchase-orders", {
    schema: stockManagementSchema.createPurchaseOrderSchema,
    onRequest: [fastify.authenticate],
    handler: stockManagementController.createPurchaseOrder,
  });

  fastify.get("/stock/status-counts", {
    schema: stockManagementSchema.getStockStatusCountsSchema,
    onRequest: [fastify.authenticate],
    handler: stockManagementController.getStockStatusCounts,
  });

  fastify.get("/stock/inventory", {
    schema: stockManagementSchema.getStockInventoryListSchema,
    onRequest: [fastify.authenticate],
    handler: stockManagementController.getStockInventoryList,
  });

  fastify.post("/stock/update-quantity", {
    schema: stockManagementSchema.updateExistingMedicineQuantitySchema,
    onRequest: [fastify.authenticate],
    handler: stockManagementController.updateExistingMedicineQuantity,
  });
}
