import fp from 'fastify-plugin';
import fastifyPostgres from '@fastify/postgres';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

/**
 * Get PostgreSQL connection pool with unlimited connections
 * @returns {Pool} PostgreSQL connection pool instance
 */
function getPool() {
    const poolConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        
        // SSL configuration for AWS RDS
        ssl: process.env.DB_SSL === 'true' ? {
            rejectUnauthorized: false
        } : false,
    };

    const pool = new Pool(poolConfig);

    // Handle pool errors
    pool.on('error', (err, client) => {
        console.error('❌ Unexpected error on idle client', err);
    });

    pool.on('connect', () => {
        console.log('🔗 New client connected to the pool');
    });

    pool.on('remove', () => {
        console.log('🔌 Client removed from the pool');
    });

    return pool;
}

async function dbPlugin(fastify, options) {
    // Register fastify-postgres with connection parameters
    // Using getPool for unlimited connections
    fastify.register(fastifyPostgres, {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        
        // SSL configuration
        ssl: process.env.DB_SSL === 'true' ? {
            rejectUnauthorized: false
        } : false,
    });

    // Verify database connection
    fastify.addHook('onReady', async () => {
        try {
            const result = await fastify.pg.query('SELECT NOW() as current_time, version() as pg_version');
            console.log('✅ Database connected successfully to PostgreSQL');
            console.log(`📅 Server time: ${result.rows[0].current_time}`);
            console.log(`🗄️  PostgreSQL version: ${result.rows[0].pg_version.split(',')[0]}`);
            
            // Log pool statistics
            const pool = fastify.pg.pool;
            console.log(`📊 Pool stats - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
        } catch (err) {
            console.error('❌ Database connection failed:');
            console.error(`   Error: ${err.message}`);
            console.error(`   Code: ${err.code || 'N/A'}`);
            console.error(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
            console.error(`   Database: ${process.env.DB_NAME}`);
            console.error(`   User: ${process.env.DB_USER}`);
            console.error('⚠️  App will continue running without database connection');
            // Don't throw - allow app to start even if DB is unavailable
        }
    });

    // Graceful shutdown
    fastify.addHook('onClose', async (instance) => {
        try {
            await fastify.pg.pool.end();
            console.log('🛑 Database pool closed gracefully');
        } catch (err) {
            console.error('❌ Error closing database pool:', err.message);
        }
    });

    // Decorate fastify with getPool for direct access if needed
    fastify.decorate('getPool', getPool);
}

export default fp(dbPlugin);
export { getPool };
