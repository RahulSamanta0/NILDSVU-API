import * as parkingLogsService from './parking-logs.service.js';

/**
 * Create new parking entry
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function createParkingEntry(request, reply) {
  try {
    const prisma = request.server.prisma;
    const user = request.user;
    const data = request.body;

    const newEntry = await parkingLogsService.createParkingEntry(prisma, user, data);

    return reply.code(201).send({
      success: true,
      message: 'Vehicle entry created successfully',
      data: newEntry,
    });
  } catch (error) {
    request.log.error(error);
    
    // Handle validation errors
    if (error.message.includes('Missing required fields')) {
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }

    return reply.code(500).send({
      success: false,
      error: error.message || 'Failed to create parking entry',
    });
  }
}

/**
 * Get all parked vehicles
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function getAllParkedVehicles(request, reply) {
  try {
    const prisma = request.server.prisma;
    const user = request.user;

    const parkedVehicles = await parkingLogsService.getAllParkedVehicles(prisma, user);

    return reply.code(200).send({
      success: true,
      data: parkedVehicles,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message || 'Failed to fetch parked vehicles',
    });
  }
}

/**
 * Get parking dashboard statistics
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function getParkingStats(request, reply) {
  try {
    const prisma = request.server.prisma;
    const user = request.user;

    const stats = await parkingLogsService.getParkingStats(prisma, user);

    return reply.code(200).send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message || 'Failed to fetch parking statistics',
    });
  }
}
