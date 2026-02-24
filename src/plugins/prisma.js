import fp from 'fastify-plugin';
import { PrismaClient } from '../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';


/**
 * Prisma Plugin for Fastify
 * Provides Prisma Client instance to all routes via fastify.prisma
 */
async function prismaPlugin(fastify, options) {
    // Create PostgreSQL pool for Prisma adapter
    const pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
    });

    // Create Prisma adapter
    const adapter = new PrismaPg(pool);

    // Create Prisma Client instance with adapter
    const prisma = new PrismaClient({
        adapter,
        log: ['error', 'warn'],
        errorFormat: 'minimal',
    });

    // Decorate Fastify instance with Prisma
    fastify.decorate('prisma', prisma);

    // Test connection on server ready
    fastify.addHook('onReady', async () => {
        try {
            // Test database connection
            await fastify.prisma.$queryRaw`SELECT 1`;
            console.log('✅ Prisma connected successfully to PostgreSQL');
            
            // Log Prisma Client info
            console.log('🔷 Prisma Client initialized and ready');
        } catch (err) {
            console.error('❌ Prisma connection failed:');
            console.error(`   Error: ${err.message}`);
            console.error('⚠️  App will continue running without Prisma');
        }
    });

    // Graceful shutdown - disconnect Prisma
    fastify.addHook('onClose', async (instance) => {
        try {
            await fastify.prisma.$disconnect();
            console.log('🛑 Prisma disconnected gracefully');
        } catch (err) {
            console.error('❌ Error disconnecting Prisma:', err.message);
        }
    });
}

export default fp(prismaPlugin);
