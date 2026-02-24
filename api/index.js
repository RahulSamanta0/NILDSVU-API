import Fastify from 'fastify';
import dotenv from 'dotenv';

dotenv.config();

// --- Lazy initialization to catch startup errors clearly ---
let app = null;
let appReady = false;
let initError = null;

async function buildApp() {
    const { default: cors } = await import('@fastify/cors');
    const { default: helmet } = await import('@fastify/helmet');
    const { default: errorHandler } = await import('../src/utils/errorHandler.js');
    const { default: dbPlugin } = await import('../src/plugins/database.js');
    const { default: prismaPlugin } = await import('../src/plugins/prisma.js');
    const { default: authPlugin } = await import('../src/plugins/auth.js');
    const { default: bcrypt } = await import('fastify-bcrypt');
    const { default: registerRoutes } = await import('../src/globalroutes.js');

    const fastify = Fastify({ logger: true });

    // Register Plugins
    fastify.register(helmet);
    fastify.register(cors, {
        origin: (origin, cb) => {
            const allowedOrigins = [
                'http://localhost:3000',
                'http://127.0.0.1:3000',
                'http://localhost:5173',
                'http://127.0.0.1:5173',
                'https://nild-api.vercel.app',
                /\.vercel\.app$/
            ];

            if (!origin) { cb(null, true); return; }

            const isAllowed = allowedOrigins.some(allowed =>
                typeof allowed === 'string' ? origin === allowed : allowed.test(origin)
            );

            isAllowed ? cb(null, true) : cb(new Error('Not allowed by CORS'), false);
        },
        credentials: true
    });

    fastify.register(dbPlugin);
    fastify.register(prismaPlugin);
    fastify.register(authPlugin);
    fastify.register(bcrypt, { saltWorkFactor: 12 });

    fastify.setErrorHandler(errorHandler);

    // Health Check
    fastify.get('/health', async (request, reply) => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // All API Routes
    fastify.register(registerRoutes, { prefix: '/api' });

    return fastify;
}

async function initApp() {
    if (appReady) return;
    if (initError) throw initError;

    try {
        console.log('🚀 Initializing Fastify app...');
        app = await buildApp();
        await app.ready();
        appReady = true;
        console.log('✅ App initialized successfully');
    } catch (err) {
        initError = err;
        console.error('❌ App initialization failed:', err.message);
        console.error('Stack:', err.stack);
        throw err;
    }
}

export default async (req, res) => {
    try {
        await initApp();

        const response = await app.inject({
            method: req.method,
            url: req.url,
            headers: req.headers,
            payload: req,
        });

        res.statusCode = response.statusCode;
        if (response.headers) {
            Object.entries(response.headers).forEach(([key, value]) => {
                res.setHeader(key, value);
            });
        }
        res.end(response.rawPayload);

    } catch (err) {
        console.error('❌ Fatal handler error:', err.message);
        console.error('Stack:', err.stack);
        res.statusCode = 500;
        res.end(JSON.stringify({
            error: 'Internal Server Error',
            message: err.message,
            // Show stack in non-production for debugging
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
        }));
    }
};
