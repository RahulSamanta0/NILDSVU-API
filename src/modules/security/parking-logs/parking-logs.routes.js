import * as parkingLogsController from './parking-logs.controller.js';
import parkingLogsSchema from './parking-logs.schema.js';

export default async function parkingLogsRoutes(fastify, options) {
  // POST /security/parking-logs/entry - Create new parking entry
  fastify.post(
    '/security/parking-logs/entry',
    {
      preHandler: [fastify.authenticate],
      schema: parkingLogsSchema.createParkingEntrySchema,
    },
    parkingLogsController.createParkingEntry
  );

  // GET /security/parking-logs - Get all parked vehicles
  fastify.get(
    '/security/parking-logs',
    {
      preHandler: [fastify.authenticate],
      schema: parkingLogsSchema.getAllParkedVehiclesSchema,
    },
    parkingLogsController.getAllParkedVehicles
  );

  // GET /security/parking-logs/stats - Get parking statistics
  fastify.get(
    '/security/parking-logs/stats',
    {
      preHandler: [fastify.authenticate],
      schema: parkingLogsSchema.getParkingStatsSchema,
    },
    parkingLogsController.getParkingStats
  );
}
