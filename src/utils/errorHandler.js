import { HttpError } from './customErrors.js';

const errorHandler = (error, request, reply) => {
    console.error(error);

    // Handle custom HttpError instances
    if (error instanceof HttpError) {
        return reply.status(error.status).send({
            success: false,
            error: error.error,
            message: error.message,
        });
    }

    // Handle Fastify validation errors
    if (error.validation) {
        return reply.status(400).send({
            success: false,
            error: 'Validation Error',
            message: error.message,
            details: error.validation,
        });
    }

    // Default error handling
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    reply.status(statusCode).send({
        success: false,
        error: message,
    });
};

export default errorHandler;
