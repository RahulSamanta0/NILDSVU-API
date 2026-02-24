import { createRehabilitationEntry, updateRehabilitationEntry, getRehabilitationEntriesByPatient } from './rehabitation.service.js';

/**
 * Rehabilitation Data Entry Controller
 * Handles HTTP requests for creating and updating rehabilitation entries
 */

// Fix for BigInt serialization
BigInt.prototype.toJSON = function () {
    return this.toString();
};

/**
 * Handler for creating a new rehabilitation entry
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function createRehabilitationEntryHandler(request, reply) {
    try {
        const newEntry = await createRehabilitationEntry(request.server, request.body, request.user);

        return reply.code(201).send({
            status: 'success',
            message: 'Rehabilitation entry created successfully',
            data: {
                entry_id: newEntry.entry_id.toString()
            }
        });
    } catch (error) {
        request.log.error(error);
        
        if (error.message === 'Patient not found') {
            return reply.code(404).send({
                status: 'error',
                message: 'Patient not found'
            });
        }

        // Handle Prisma validation errors
        if (error.code === 'P2000') {
            return reply.code(400).send({
                status: 'error',
                message: 'Validation error: One or more fields exceed maximum length',
                details: error.meta?.column_name ? `Field '${error.meta.column_name}' is too long` : error.message
            });
        }

        if (error.code === 'P2002') {
            return reply.code(409).send({
                status: 'error',
                message: 'Duplicate entry conflict',
                details: error.meta?.target ? `Duplicate value for: ${error.meta.target.join(', ')}` : error.message
            });
        }

        if (error.code === 'P2003') {
            return reply.code(400).send({
                status: 'error',
                message: 'Invalid reference: Related record not found',
                details: error.meta?.field_name || error.message
            });
        }

        return reply.code(500).send({
            status: 'error',
            message: 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            code: process.env.NODE_ENV === 'development' ? error.code : undefined
        });
    }
}

/**
 * Handler for updating a rehabilitation entry
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function updateRehabilitationEntryHandler(request, reply) {
    const { entryId } = request.params;

    try {
        const updatedEntry = await updateRehabilitationEntry(request.server, entryId, request.body, request.user);

        return reply.code(200).send({
            status: 'success',
            message: 'Rehabilitation entry updated successfully',
            data: {
                entry_id: updatedEntry.entry_id.toString(),
                patient: {
                    upid: updatedEntry.patients.upid,
                    name: `${updatedEntry.patients.first_name} ${updatedEntry.patients.last_name || ''}`.trim()
                },
                therapist: updatedEntry.users ? {
                    name: updatedEntry.users.staff_profiles 
                        ? `${updatedEntry.users.staff_profiles.first_name} ${updatedEntry.users.staff_profiles.last_name}`
                        : updatedEntry.users.username
                } : null,
                updated_at: updatedEntry.updated_at
            }
        });
    } catch (error) {
        request.log.error(error);
        
        if (error.message === 'Rehabilitation entry not found') {
            return reply.code(404).send({
                status: 'error',
                message: 'Rehabilitation entry not found'
            });
        }

        // Handle Prisma validation errors
        if (error.code === 'P2000') {
            // Value too long for column
            return reply.code(400).send({
                status: 'error',
                message: 'Validation error: One or more fields exceed maximum length',
                details: error.meta?.column_name ? `Field '${error.meta.column_name}' is too long` : error.message
            });
        }

        if (error.code === 'P2002') {
            // Unique constraint violation
            return reply.code(409).send({
                status: 'error',
                message: 'Duplicate entry conflict',
                details: error.meta?.target ? `Duplicate value for: ${error.meta.target.join(', ')}` : error.message
            });
        }

        if (error.code === 'P2003') {
            // Foreign key constraint violation
            return reply.code(400).send({
                status: 'error',
                message: 'Invalid reference: Related record not found',
                details: error.meta?.field_name || error.message
            });
        }

        // Return more detailed error for debugging
        return reply.code(500).send({
            status: 'error',
            message: 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            code: process.env.NODE_ENV === 'development' ? error.code : undefined
        });
    }
}

/**
 * Handler for getting rehabilitation entries by patient UPID
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function getRehabilitationEntriesByPatientHandler(request, reply) {
    const { upid } = request.params;
    const { tenant_id } = request.user;

    try {
        const result = await getRehabilitationEntriesByPatient(request.server, upid, tenant_id);

        return reply.code(200).send({
            status: 'success',
            data: result
        });
    } catch (error) {
        request.log.error(error);
        
        if (error.message === 'Patient not found') {
            return reply.code(404).send({
                status: 'error',
                message: 'Patient not found with the provided UPID'
            });
        }

        return reply.code(500).send({
            status: 'error',
            message: 'Internal Server Error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}
