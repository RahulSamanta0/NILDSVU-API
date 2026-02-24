import * as purchaseInventoryController from "./purchase-inventory.controller.js";
import * as purchaseInventorySchema from "./purchase-inventory.schema.js";

export default async function purchaseInventoryRoutes(fastify) {
  fastify.get("/purchase-orders", {
    schema: purchaseInventorySchema.getPurchaseOrdersSchema,
    onRequest: [fastify.authenticate],
    handler: purchaseInventoryController.getPurchaseOrders,
  });

  fastify.post("/purchase-orders", {
    schema: purchaseInventorySchema.createPurchaseOrderSchema,
    onRequest: [fastify.authenticate],
    handler: purchaseInventoryController.createPurchaseOrder,
  });

  fastify.get("/purchase-orders/pending", {
    schema: purchaseInventorySchema.getPendingPurchaseOrdersSchema,
    onRequest: [fastify.authenticate],
    handler: purchaseInventoryController.getPendingPurchaseOrders,
  });

  fastify.get("/purchase-orders/receipt-details", {
    schema: purchaseInventorySchema.getPoReceiptDetailsSchema,
    onRequest: [fastify.authenticate],
    handler: purchaseInventoryController.getPoReceiptDetails,
  });

  fastify.get("/purchase-orders/suppliers", {
    schema: purchaseInventorySchema.getSuppliersForFilterSchema,
    onRequest: [fastify.authenticate],
    handler: purchaseInventoryController.getSuppliersForFilter,
  });

  fastify.get("/grn", {
    schema: purchaseInventorySchema.getGrnListSchema,
    onRequest: [fastify.authenticate],
    handler: purchaseInventoryController.getGrnList,
  });

  fastify.get("/suppliers/directory", {
    schema: purchaseInventorySchema.getSupplierDirectorySchema,
    onRequest: [fastify.authenticate],
    handler: purchaseInventoryController.getSupplierDirectory,
  });

  fastify.get("/returns-damaged", {
    schema: purchaseInventorySchema.getReturnsDamagedListSchema,
    onRequest: [fastify.authenticate],
    handler: purchaseInventoryController.getReturnsDamagedList,
  });

  fastify.get("/stock-items", {
    schema: purchaseInventorySchema.getPurchaseStockItemsSchema,
    onRequest: [fastify.authenticate],
    handler: purchaseInventoryController.getPurchaseStockItems,
  });

  fastify.post("/grn/confirm-receipt", {
    schema: purchaseInventorySchema.confirmPoReceiptSchema,
    onRequest: [fastify.authenticate],
    handler: purchaseInventoryController.confirmPoReceipt,
  });
}
