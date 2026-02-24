import vehicalStatusRoutes from "./vehicalStatus/vehicalStatus.routes.js";
import ambulanceCallRoutes from "./ambulanceCall/ambulanceCall.routes.js";
import tripLogsRoutes from "./tripLogs/tripLogs.routes.js";

export default async function ambulanceRoutes(fastify) {
  await fastify.register(vehicalStatusRoutes);
  await fastify.register(ambulanceCallRoutes);
  await fastify.register(tripLogsRoutes);
};

