import Fastify from 'fastify';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import errorHandler from './utils/errorHandler.js';
import dbPlugin from './plugins/database.js';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import bcrypt from 'fastify-bcrypt';
import registerRoutes from './globalroutes.js';


dotenv.config();

const app = Fastify({
    logger: {
        transport: {
            target: '@fastify/one-line-logger'
        }
    }
});

// Register Plugins
app.register(helmet); // Security Headers
app.register(cors, {
    origin: (origin, cb) => {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            'https://nild-api.vercel.app',
            /\.vercel\.app$/  // Allow all Vercel preview deployments
        ];

        if (!origin) {
            cb(null, true);
            return;
        }

        // Check if origin matches any allowed pattern
        const isAllowed = allowedOrigins.some(allowed => {
            if (typeof allowed === 'string') {
                return origin === allowed;
            }
            return allowed.test(origin);
        });

        if (isAllowed) {
            cb(null, true);
            return;
        }

        cb(new Error('Not allowed by CORS'), false);
    },
    credentials: true
});   // CORS - Allow selected origins with credentials
app.register(dbPlugin); // Database Connection
app.register(prismaPlugin); // Prisma ORM
app.register(authPlugin); // JWT Auth
app.register(bcrypt, { saltWorkFactor: 12 }); // Password Hashing





// Global Error Handler
app.setErrorHandler(errorHandler);

// Health Check Endpoint (for Docker)
app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register All Routes (every module route is prefixed with /api)
app.register(registerRoutes, { prefix: '/api' });

// Trigger restart for .env changes

const start = async () => {
    try {
        app.listen({ port: process.env.PORT || 3000 });
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

start();
