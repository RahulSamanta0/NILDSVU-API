import { 
    getExceptionReports, 
    resolveException
} from './exception.service.js';

/**
 * Exception Reports Controller
 * Handles HTTP requests for exception reports in rehabilitation management
 */

// Fix for BigInt serialization
BigInt.prototype.toJSON = function () {
    return this.toString();
};

/**
 * Handler for getting exception reports
 * GET /api/reports/exceptions
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function getExceptionReportsHandler(request, reply) {
    try {
        const result = await getExceptionReports(request.server, {}, request.user);

        return reply.code(200).send({
            status: 'success',
            ...result
        });
    } catch (error) {
        request.log.error(error);
        
        return reply.code(500).send({
            status: 'error',
            message: 'Failed to fetch exception reports',
            details: error.message
        });
    }
}

/**
 * Handler for resolving an exception
 * PUT /api/reports/exceptions/:id/resolve
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function resolveExceptionHandler(request, reply) {
    try {
        const { id } = request.params;
        const result = await resolveException(request.server, id, request.body, request.user);

        return reply.code(200).send({
            status: 'success',
            message: 'Exception marked as resolved',
            data: result
        });
    } catch (error) {
        request.log.error(error);
        
        if (error.message === 'Invalid exception ID format') {
            return reply.code(400).send({
                status: 'error',
                message: error.message
            });
        }
        
        return reply.code(500).send({
            status: 'error',
            message: 'Failed to resolve exception',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
