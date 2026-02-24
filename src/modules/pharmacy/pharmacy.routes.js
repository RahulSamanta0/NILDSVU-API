import prescriptionProcessingRoutes from "./prescription-processing/prescription-processing.routes.js";
import stockManagementRoutes from "./stock-management/stock-management.routes.js";
import opdCounterRoutes from "./opd-counter/opd-counter.routes.js";
import purchaseInventoryRoutes from "./purchase-inventory/purchase-inventory.routes.js";

export default async function pharmacyRoutes(fastify) {
  await fastify.register(prescriptionProcessingRoutes);
  await fastify.register(stockManagementRoutes);
  await fastify.register(opdCounterRoutes);
  await fastify.register(purchaseInventoryRoutes);
}
