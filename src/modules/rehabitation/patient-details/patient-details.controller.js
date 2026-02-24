import { getRehabilitationEntriesBySection, getAllPatientsWithRehabEntries } from './patient-details.service.js';

/**
 * Patient Details Controller
 * Handles HTTP requests for retrieving patient rehabilitation details organized by sections
 */

// Fix for BigInt serialization
BigInt.prototype.toJSON = function () {
    return this.toString();
};

/**
 * Handler for getting rehabilitation entries organized by sections for a specific patient
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function getRehabilitationSectionsHandler(request, reply) {
    const { patientId } = request.params;

    try {
        const sections = await getRehabilitationEntriesBySection(request.server, patientId);

        return reply.code(200).send({
            status: 'success',
            data: sections
        });
    } catch (error) {
        request.log.error(error);
        
        if (error.message === 'Patient not found') {
            return reply.code(404).send({
                status: 'error',
                message: 'Patient not found'
            });
        }

        return reply.code(500).send({
            status: 'error',
            message: 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * Handler for getting all patients with rehabilitation entries organized by sections
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function getAllPatientsHandler(request, reply) {
    try {
        const result = await getAllPatientsWithRehabEntries(request.server);

        return reply.code(200).send({
            status: 'success',
            data: result
        });
    } catch (error) {
        request.log.error(error);
        
        return reply.code(500).send({
            status: 'error',
            message: 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
