import * as vendorLogsService from './vendor-logs.service.js';

/**
 * Get all vendor logs
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function getAllVendorLogs(request, reply) {
  try {
    const prisma = request.server.prisma;
    const user = request.user;

    const logs = await vendorLogsService.getAllVendorLogs(prisma, user);

    return reply.code(200).send({
      success: true,
      data: logs,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message || 'Failed to fetch vendor logs',
    });
  }
};

/**
 * Checkout vendor
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function checkoutVendor(request, reply) {
  try {
    const prisma = request.server.prisma;
    const user = request.user;
    const { passNumber } = request.params;

    const updatedEntry = await vendorLogsService.checkoutVendor(prisma, user, passNumber);

    return reply.code(200).send({
      success: true,
      message: 'Vendor checked out successfully',
      data: updatedEntry,
    });
  } catch (error) {
    request.log.error(error);
    
    // Handle specific error cases
    if (error.message === 'Vendor entry not found') {
      return reply.code(404).send({
        success: false,
        error: error.message,
      });
    }
    
    if (error.message === 'Unauthorized access to vendor entry') {
      return reply.code(403).send({
        success: false,
        error: error.message,
      });
    }
    
    if (error.message === 'Vendor already checked out') {
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }

    return reply.code(500).send({
      success: false,
      error: error.message || 'Failed to checkout vendor',
    });
  }
};

/**
 * Get vendor dashboard statistics
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function getVendorDashboardStats(request, reply) {
  try {
    const prisma = request.server.prisma;
    const user = request.user;

    const stats = await vendorLogsService.getVendorDashboardStats(prisma, user);

    return reply.code(200).send({
      success: true,
      data: stats,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      success: false,
      error: error.message || 'Failed to fetch vendor statistics',
    });
  }
};


