/**
 * Diet Plans Routes
 * 
 * Purpose:
 * - Defines all diet plan management endpoints
 */

import * as dietPlansController from './diet-plans.controller.js';
import * as dietPlansSchema from './diet-plans.schema.js';

export default async function dietPlansRoutes(fastify, options) {
    
    // GET /api/diet-plans/status-stats - Status statistics
    fastify.get('/status-stats', {
        preHandler: [fastify.authenticate],
        schema: {
            querystring: dietPlansSchema.statusStatsQuerySchema
        }
    }, dietPlansController.getStatusStats);

    // GET /api/diet-plans/history - Diet plan history
    fastify.get('/history', {
        preHandler: [fastify.authenticate],
        schema: {
            querystring: dietPlansSchema.historyQuerySchema
        }
    }, dietPlansController.getDietPlanHistory);

    // GET /api/diet-plans/stats - Dashboard statistics
    fastify.get('/stats', {
        preHandler: [fastify.authenticate],
        schema: {
            response: {
                200: dietPlansSchema.statsResponseSchema
            }
        }
    }, dietPlansController.getDashboardStats);

    // GET /api/diet-plans - List all diet plans with filters
    fastify.get('/', {
        preHandler: [fastify.authenticate],
        schema: {
            querystring: dietPlansSchema.getDietPlansQuerySchema
        }
    }, dietPlansController.getDietPlans);

    // GET /api/diet-plans/:id - Get specific diet plan details
    fastify.get('/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            params: dietPlansSchema.idParamSchema
        }
    }, dietPlansController.getDietPlanById);

    // POST /api/diet-plans/:id/approve - Approve a diet plan
    fastify.post('/:id/approve', {
        preHandler: [fastify.authenticate],
        schema: {
            params: dietPlansSchema.idParamSchema
        }
    }, dietPlansController.approveDietPlan);

    // PUT /api/diet-plans/:id - Modify a diet plan
    fastify.put('/:id', {
        preHandler: [fastify.authenticate],
        schema: {
            params: dietPlansSchema.idParamSchema,
            body: dietPlansSchema.modifyDietPlanSchema
        }
    }, dietPlansController.modifyDietPlan);

    // POST /api/diet-plans/:id/cancel - Cancel a diet plan
    fastify.post('/:id/cancel', {
        preHandler: [fastify.authenticate],
        schema: {
            params: dietPlansSchema.idParamSchema,
            body: dietPlansSchema.cancelDietPlanSchema
        }
    }, dietPlansController.cancelDietPlan);
}
