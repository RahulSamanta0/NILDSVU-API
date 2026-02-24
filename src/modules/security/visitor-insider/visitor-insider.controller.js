/**
 * Visitor Insider Controllers
 * 
 * Purpose:
 * - Handle HTTP requests and responses for visitor insider
 * - Fetch all visitors with pagination
 * - Provide visitor statistics
 */

import * as service from './visitor-insider.service.js';

/**
 * Get all visitors with pagination and filters
 * GET /security/visitors
 */
export async function getAllVisitors(request, reply) {
    try {
        const { page, limit, status, search, startDate, endDate } = request.query;

        const result = await service.getAllVisitors(
            request.server.prisma,
            request.user,
            { page, limit, status, search, startDate, endDate }
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error);
        console.error('Get All Visitors Error:', error);

        return reply.code(500).send({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch visitors',
            details: error.message
        });
    }
}

/**
 * Get visitor statistics
 * GET /security/visitors/stats
 */
export async function getVisitorStats(request, reply) {
    try {
        const stats = await service.getVisitorStats(
            request.server.prisma,
            request.user
        );

        return reply.code(200).send({
            success: true,
            data: stats
        });
    } catch (error) {
        request.log.error(error);
        console.error('Get Visitor Stats Error:', error);

        return reply.code(500).send({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch visitor statistics',
            details: error.message
        });
    }
}

/**
 * Checkout a visitor
 * PUT /security/visitors/checkout/:passNumber
 */
export async function checkoutVisitor(request, reply) {
    try {
        const { passNumber } = request.params;

        const visitor = await service.checkoutVisitor(
            request.server.prisma,
            request.user,
            passNumber
        );

        return reply.code(200).send({
            success: true,
            message: 'Visitor checked out successfully',
            data: visitor
        });
    } catch (error) {
        request.log.error(error);
        console.error('Checkout Visitor Error:', error);

        if (error.message === 'VISITOR_NOT_FOUND') {
            return reply.code(404).send({
                success: false,
                error: 'Not Found',
                message: 'Visitor not found with the given pass number'
            });
        }

        if (error.message === 'ALREADY_CHECKED_OUT') {
            return reply.code(400).send({
                success: false,
                error: 'Bad Request',
                message: 'Visitor has already been checked out'
            });
        }

        return reply.code(500).send({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to checkout visitor',
            details: error.message
        });
    }
}

/**
 * Create a revisit entry
 * POST /security/visitors/revisit
 */
export async function createRevisit(request, reply) {
    try {
        const visitor = await service.createRevisit(
            request.server.prisma,
            request.user,
            request.body
        );

        return reply.code(201).send({
            success: true,
            message: 'Revisit entry created successfully',
            data: visitor
        });
    } catch (error) {
        request.log.error(error);
        console.error('Create Revisit Error:', error);

        if (error.message === 'PREVIOUS_VISIT_NOT_FOUND') {
            return reply.code(404).send({
                success: false,
                error: 'Not Found',
                message: 'Previous visit not found with the given pass number'
            });
        }

        return reply.code(500).send({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to create revisit entry',
            details: error.message
        });
    }
}

/**
 * Get visitor dashboard statistics
 * GET /security/visitors/dashboard-stats
 */
export async function getVisitorDashboardStats(request, reply) {
    try {
        const stats = await service.getVisitorDashboardStats(
            request.server.prisma,
            request.user
        );

        return reply.code(200).send({
            success: true,
            data: stats
        });
    } catch (error) {
        request.log.error(error);
        console.error('Get Dashboard Stats Error:', error);

        return reply.code(500).send({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch dashboard statistics',
            details: error.message
        });
    }
}
