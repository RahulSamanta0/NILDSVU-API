import Fastify from 'fastify';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

// ─── Build App ───────────────────────────────────────────────────────────────
async function buildApp() {
    const { default: cors } = await import('@fastify/cors');
    const { default: helmet } = await import('@fastify/helmet');
    const { default: errorHandler } = await import('./utils/errorHandler.js');
    const { default: dbPlugin } = await import('./plugins/database.js');
    const { default: prismaPlugin } = await import('./plugins/prisma.js');
    const { default: authPlugin } = await import('./plugins/auth.js');
    const { default: bcrypt } = await import('fastify-bcrypt');
    const { default: registerRoutes } = await import('./globalroutes.js');

    const app = Fastify({
        logger: {
            transport: {
                target: '@fastify/one-line-logger'
            }
        }
    });

    // ── Plugins ──────────────────────────────────────────────────────────────
    app.register(helmet);
    app.register(cors, {
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

    app.register(dbPlugin);
    app.register(prismaPlugin);
    app.register(authPlugin);
    app.register(bcrypt, { saltWorkFactor: 12 });

    // ── Error Handler ─────────────────────────────────────────────────────────
    app.setErrorHandler(errorHandler);

    // ── Health Check ──────────────────────────────────────────────────────────
    app.get('/health', async (request, reply) => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });

    // ── Routes ────────────────────────────────────────────────────────────────
    app.register(registerRoutes, { prefix: '/api' });

    return app;
}

// ─── Serverless Handler (used by Vercel via api/index.js) ─────────────────────
let app = null;
let appReady = false;
let initError = null;

async function initApp() {
    if (appReady) return;
    if (initError) throw initError;

    try {
        console.log('🚀 Initializing app...');
        app = await buildApp();
        await app.ready();
        appReady = true;
        console.log('✅ App ready');
    } catch (err) {
        initError = err;
        console.error('❌ App initialization failed:', err.message);
        console.error(err.stack);
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
        console.error('❌ Handler error:', err.message);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
    }
};

// ─── Local Dev Server (only runs when executed directly: npm run dev) ─────────
const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
    const start = async () => {
        try {
            const localApp = await buildApp();
            await localApp.listen({ port: process.env.PORT || 5000, host: '0.0.0.0' });
        } catch (err) {
            console.error('❌ Failed to start server:', err);
            process.exit(1);
        }
    };
    start();
}
