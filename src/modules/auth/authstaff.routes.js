/**
 * Authentication Routes
 * 
 * Purpose:
 * - Define API endpoints for authentication
 * - Register routes with Fastify
 * - Apply schemas for validation
 * - Map routes to controllers
 */

import * as controller from './authstaff.controller.js';
import * as schema from './authstaff.schema.js';

/**
 * Authentication routes plugin
 * Registers all auth-related routes
 */
export default async function authRoutes(fastify, opts) {
    
    // Register a new staff member
    // POST /auth/register
    fastify.post('/auth/register', {
        schema: schema.registerSchema,
        handler: controller.register
    });

    // Login with credentials
    // POST /auth/login
    fastify.post('/auth/login', {
        schema: schema.loginSchema,
        handler: controller.login
    });

    // Get current user profile (protected route)
    // GET /auth/profile
    fastify.get('/auth/profile', {
        schema: schema.getProfileSchema,
        onRequest: [fastify.authenticate], // Require JWT authentication
        handler: controller.getProfile
    });
}
