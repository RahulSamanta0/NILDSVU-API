/**
 * Diet Plans Controller
 * 
 * Purpose:
 * - Handles HTTP requests for diet plan management
 * - Validates input and formats responses
 */

import * as dietPlansService from './diet-plans.service.js';

/**
 * Get dashboard statistics
 * GET /api/diet-plans/stats
 */
export const getDashboardStats = async (request, reply) => {
    try {
        const tenantId = BigInt(request.user?.tenant_id || 1);

        const stats = await dietPlansService.getDashboardStats(
            request.server.prisma,
            tenantId
        );

        return reply.code(200).send({
            success: true,
            data: stats
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Server Error',
            message: 'Unable to fetch dashboard stats'
        });
    }
};

/**
 * Get all diet plans with pagination and status filter
 * GET /api/diet-plans
 */
export const getDietPlans = async (request, reply) => {
    try {
        const tenantId = BigInt(request.user?.tenant_id || 1);
        
        const filters = {
            page: parseInt(request.query.page) || 1,
            limit: parseInt(request.query.limit) || 10,
            status: request.query.status // all, approved, modified, cancelled
        };

        const result = await dietPlansService.getDietPlans(
            request.server.prisma,
            tenantId,
            filters
        );

        return reply.code(200).send({
            success: true,
            ...result
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Server Error',
            message: 'Unable to fetch diet plans'
        });
    }
};

/**
 * Get a specific diet plan by ID
 * GET /api/diet-plans/:id
 */
export const getDietPlanById = async (request, reply) => {
    try {
        const { id } = request.params;
        const tenantId = BigInt(request.user?.tenant_id || 1);

        const plan = await dietPlansService.getDietPlanById(
            request.server.prisma,
            id,
            tenantId
        );

        if (!plan) {
            return reply.code(404).send({
                success: false,
                error: 'Not Found',
                message: 'Diet plan not found'
            });
        }

        return reply.code(200).send({
            success: true,
            data: plan
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Server Error',
            message: 'Unable to fetch diet plan details'
        });
    }
};

/**
 * Approve a diet plan
 * POST /api/diet-plans/:id/approve
 */
export const approveDietPlan = async (request, reply) => {
    try {
        const { id } = request.params;
        const tenantId = BigInt(request.user?.tenant_id || 1);
        const approvedBy = BigInt(request.user?.user_id || 1);

        const plan = await dietPlansService.approveDietPlan(
            request.server.prisma,
            id,
            tenantId,
            approvedBy
        );

        if (!plan) {
            return reply.code(404).send({
                success: false,
                error: 'Not Found',
                message: 'Diet plan not found or cannot be approved'
            });
        }

        return reply.code(200).send({
            success: true,
            message: 'Diet plan approved successfully',
            data: plan
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Server Error',
            message: 'Unable to approve diet plan'
        });
    }
};

/**
 * Modify a diet plan
 * PUT /api/diet-plans/:id
 */
export const modifyDietPlan = async (request, reply) => {
    try {
        const { id } = request.params;
        const updateData = request.body;
        const tenantId = BigInt(request.user?.tenant_id || 1);

        const plan = await dietPlansService.modifyDietPlan(
            request.server.prisma,
            id,
            updateData,
            tenantId
        );

        if (!plan) {
            return reply.code(404).send({
                success: false,
                error: 'Not Found',
                message: 'Diet plan not found or cannot be modified'
            });
        }

        return reply.code(200).send({
            success: true,
            message: 'Diet plan modified successfully',
            data: plan
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Server Error',
            message: 'Unable to modify diet plan'
        });
    }
};

/**
 * Cancel a diet plan
 * POST /api/diet-plans/:id/cancel
 */
export const cancelDietPlan = async (request, reply) => {
    try {
        const { id } = request.params;
        const { reason } = request.body;
        const tenantId = BigInt(request.user?.tenant_id || 1);
        const cancelledBy = BigInt(request.user?.user_id || 1);

        if (!reason) {
            return reply.code(400).send({
                success: false,
                error: 'Bad Request',
                message: 'Cancellation reason is required'
            });
        }

        const plan = await dietPlansService.cancelDietPlan(
            request.server.prisma,
            id,
            reason,
            tenantId,
            cancelledBy
        );

        if (!plan) {
            return reply.code(404).send({
                success: false,
                error: 'Not Found',
                message: 'Diet plan not found or already cancelled'
            });
        }

        return reply.code(200).send({
            success: true,
            message: 'Diet plan cancelled successfully',
            data: plan
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Server Error',
            message: 'Unable to cancel diet plan'
        });
    }
};

/**
 * Get status statistics based on view mode
 * GET /api/diet-plans/status-stats
 */
export const getStatusStats = async (request, reply) => {
    try {
        const tenantId = BigInt(request.user?.tenant_id || 1);
        const { view } = request.query;

        if (!view || !['daily', 'monthly'].includes(view)) {
            return reply.code(400).send({
                success: false,
                error: 'Bad Request',
                message: 'View parameter is required and must be either "daily" or "monthly"'
            });
        }

        const stats = await dietPlansService.getStatusStats(
            request.server.prisma,
            tenantId,
            view
        );

        return reply.code(200).send({
            success: true,
            data: stats
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Server Error',
            message: 'Unable to fetch status statistics'
        });
    }
};

/**
 * Get diet plan history with filters
 * GET /api/diet-plans/history
 */
export const getDietPlanHistory = async (request, reply) => {
    try {
        const tenantId = BigInt(request.user?.tenant_id || 1);
        const { tab, view, ward, meal, dietType, search } = request.query;

        if (!tab || !['all', 'approved', 'modified', 'cancelled'].includes(tab)) {
            return reply.code(400).send({
                success: false,
                error: 'Bad Request',
                message: 'Tab parameter is required and must be one of: all, approved, modified, cancelled'
            });
        }

        if (!view || !['daily', 'monthly'].includes(view)) {
            return reply.code(400).send({
                success: false,
                error: 'Bad Request',
                message: 'View parameter is required and must be either "daily" or "monthly"'
            });
        }

        const filters = {
            tab,
            view,
            ward,
            meal,
            dietType,
            search
        };

        const history = await dietPlansService.getDietPlanHistory(
            request.server.prisma,
            tenantId,
            filters
        );

        return reply.code(200).send({
            success: true,
            data: history
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Server Error',
            message: 'Unable to fetch diet plan history'
        });
    }
};
