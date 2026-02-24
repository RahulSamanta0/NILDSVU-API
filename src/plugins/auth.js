import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import dotenv from 'dotenv';

dotenv.config();

async function authPlugin(fastify, options) {
    // Register JWT with configurable options
    fastify.register(fastifyJwt, {
        secret: process.env.JWT_SECRET || 'supersecret',
        sign: {
            expiresIn: process.env.JWT_EXPIRATION || '24h', // Default 24 hours
        },
    });

    // Decorator to verify JWT tokens (for protecting routes)
    fastify.decorate('authenticate', async function (request, reply) {
        try {
            await request.jwtVerify();

            const tenantId = request.user?.tenant_id;
            const userId = request.user?.user_id;

            if (tenantId === undefined || tenantId === null || userId === undefined || userId === null) {
                return reply.code(401).send({
                    error: 'Unauthorized',
                    message: 'Invalid token context'
                });
            }
        } catch (err) {
            reply.code(401).send({
                error: 'Unauthorized',
                message: 'Invalid or expired token',
                details: err.message
            });
        }
    });

    // Helper decorator to sign tokens easily
    fastify.decorate('signToken', function (payload, options = {}) {
        return fastify.jwt.sign(payload, options);
    });

    // Helper decorator to authorize a set of role codes
    fastify.decorate('authorizeRoles', function (allowedRoles = []) {
        return async function (request, reply) {
            const roleCode = request.user?.role_code;
            const normalizedRole = typeof roleCode === 'string' ? roleCode.toLowerCase() : null;
            const normalizedAllowed = allowedRoles
                .filter(role => typeof role === 'string')
                .map(role => role.toLowerCase());

            if (!normalizedRole || !normalizedAllowed.includes(normalizedRole)) {
                return reply.code(403).send({
                    error: 'Forbidden',
                    message: 'Insufficient role for this resource'
                });
            }
        };
    });

    // Helper decorator to verify tokens manually
    fastify.decorate('verifyToken', async function (token) {
        try {
            return await fastify.jwt.verify(token);
        } catch (err) {
            throw new Error('Invalid or expired token');
        }
    });
}

export default fp(authPlugin);
