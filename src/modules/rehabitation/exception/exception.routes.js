import { 
    getExceptionReportsHandler, 
    resolveExceptionHandler
} from './exception.controller.js';
import { 
    getExceptionReportsSchema, 
    resolveExceptionSchema
} from './exception.shema.js';

/**
 * Exception Reports Routes
 * Defines routes for exception reporting in rehabilitation management
 * 
 * Base path: /api/rehabilitation/exceptions
 */
export default async function exceptionReportsRoutes(fastify, options) {
    // Get exception reports
    // GET /api/rehabilitation/exceptions
    fastify.get('/', {
        schema: getExceptionReportsSchema,
        onRequest: [fastify.authenticate],
        handler: getExceptionReportsHandler
    });

    // Mark exception as resolved
    // PUT /api/rehabilitation/exceptions/:id/resolve
    fastify.put('/:id/resolve', {
        schema: resolveExceptionSchema,
        onRequest: [fastify.authenticate],
        handler: resolveExceptionHandler
    });
}
