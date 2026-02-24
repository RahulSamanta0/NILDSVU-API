import Fastify from 'fastify';
import dotenv from 'dotenv';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import errorHandler from '../src/utils/errorHandler.js';
import dbPlugin from '../src/plugins/database.js';
import prismaPlugin from '../src/plugins/prisma.js';
import authPlugin from '../src/plugins/auth.js';
import bcrypt from 'fastify-bcrypt';
import registerRoutes from '../src/globalroutes.js';

dotenv.config();

const app = Fastify({
    logger: true
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
});

app.register(dbPlugin); // Database Connection
app.register(prismaPlugin); // Prisma ORM
app.register(authPlugin); // JWT Auth
app.register(bcrypt, { saltWorkFactor: 12 }); // Password Hashing

// Global Error Handler
app.setErrorHandler(errorHandler);

// Health Check Endpoint
app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register All Routes (every module route is prefixed with /api)
app.register(registerRoutes, { prefix: '/api' });

// Serverless handler for Vercel
export default async (req, res) => {
    await app.ready();
    app.server.emit('request', req, res);
};
