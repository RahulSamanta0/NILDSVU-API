/**
 * Diet Entry Controller
 * 
 * Purpose:
 * - Contains request handlers for diet entry operations
 * - Coordinates between routes and services
 * - Handles request/response transformation
 * - Minimal business logic (delegates to services)
 */

import * as dietEntryService from './diet-entry.service.js';

/**
 * Get patient details by UPID (for auto-fill)
 * GET /api/patients/:upid
 */
export const getPatientByUPID = async (request, reply) => {
    try {
        const { upid } = request.params;
        
        // Extract tenant_id from authenticated user JWT
        const tenantId = BigInt(request.user?.tenant_id || 1);

        const patientDetails = await dietEntryService.getPatientByUPID(
            request.server.prisma,
            upid,
            tenantId
        );

        if (!patientDetails) {
            return reply.code(404).send({
                success: false,
                error: 'Not Found',
                message: 'Patient ID not found'
            });
        }

        return reply.send({
            success: true,
            data: patientDetails
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Server Error',
            message: 'Error connecting to server'
        });
    }
};

/**
 * Create a new diet entry
 * POST /api/diet-charts
 */
export const createDietEntry = async (request, reply) => {
    try {
        const entryData = request.body;
        
        // Extract tenant_id and user_id from authenticated user JWT
        const tenantId = BigInt(request.user?.tenant_id || 1);
        const createdBy = BigInt(request.user?.user_id || 1);

        const newEntry = await dietEntryService.createDietEntry(
            request.server.prisma,
            entryData,
            tenantId,
            createdBy
        );

        // Convert BigInt to string for JSON serialization
        const response = {
            success: true,
            message: 'Diet chart submitted successfully',
            data: {
                ...newEntry,
                entry_id: newEntry.entry_id.toString(),
                tenant_id: newEntry.tenant_id.toString(),
                patient_id: newEntry.patient_id.toString(),
                created_by: newEntry.created_by.toString()
            }
        };

        return reply.code(201).send(response);

    } catch (error) {
        request.log.error(error);

        if (error.message === 'Patient not found') {
            return reply.code(404).send({
                success: false,
                error: 'Not Found',
                message: 'Patient not found'
            });
        }

        return reply.code(500).send({
            success: false,
            error: 'Server Error',
            message: 'Unable to create diet entry',
            details: error.message // Add error details for debugging
        });
    }
};

/**
 * Get all diet entries for a patient
 * GET /api/diet-charts/patient/:upid
 */
export const getDietEntriesByPatient = async (request, reply) => {
    try {
        const { upid } = request.params;
        const tenantId = BigInt(request.user?.tenant_id || 1);

        const entries = await dietEntryService.getDietEntriesByPatient(
            request.server.prisma,
            upid,
            tenantId
        );

        // Convert BigInt to string
        const formattedEntries = entries.map(entry => ({
            ...entry,
            entry_id: entry.entry_id.toString(),
            tenant_id: entry.tenant_id.toString(),
            patient_id: entry.patient_id.toString(),
            created_by: entry.created_by.toString()
        }));

        return reply.send({
            success: true,
            data: formattedEntries
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Server Error',
            message: 'Unable to retrieve diet entries'
        });
    }
};

/**
 * Get a specific diet entry by ID
 * GET /api/diet-charts/:id
 */
export const getDietEntryById = async (request, reply) => {
    try {
        const { id } = request.params;
        const tenantId = BigInt(request.user?.tenant_id || 1);

        const entry = await dietEntryService.getDietEntryById(
            request.server.prisma,
            id,
            tenantId
        );

        if (!entry) {
            return reply.code(404).send({
                success: false,
                error: 'Not Found',
                message: 'Diet entry not found'
            });
        }

        // Convert BigInt to string
        const response = {
            success: true,
            data: {
                ...entry,
                entry_id: entry.entry_id.toString(),
                tenant_id: entry.tenant_id.toString(),
                patient_id: entry.patient_id.toString(),
                created_by: entry.created_by.toString()
            }
        };

        return reply.send(response);

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Server Error',
            message: 'Unable to retrieve diet entry'
        });
    }
};

/**
 * Update a diet entry
 * PUT /api/diet-charts/:id
 */
export const updateDietEntry = async (request, reply) => {
    try {
        const { id } = request.params;
        const updateData = request.body;
        const tenantId = BigInt(request.user?.tenant_id || 1);

        const updatedEntry = await dietEntryService.updateDietEntry(
            request.server.prisma,
            id,
            updateData,
            tenantId
        );

        if (!updatedEntry) {
            return reply.code(404).send({
                success: false,
                error: 'Not Found',
                message: 'Diet entry not found'
            });
        }

        // Convert BigInt to string
        const response = {
            success: true,
            message: 'Diet entry updated successfully',
            data: {
                ...updatedEntry,
                entry_id: updatedEntry.entry_id.toString(),
                tenant_id: updatedEntry.tenant_id.toString(),
                patient_id: updatedEntry.patient_id.toString(),
                created_by: updatedEntry.created_by.toString()
            }
        };

        return reply.send(response);

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Server Error',
            message: 'Unable to update diet entry'
        });
    }
};

/**
 * Delete a diet entry
 * DELETE /api/diet-charts/:id
 */
export const deleteDietEntry = async (request, reply) => {
    try {
        const { id } = request.params;
        const tenantId = BigInt(request.user?.tenant_id || 1);

        const deleted = await dietEntryService.deleteDietEntry(
            request.server.prisma,
            id,
            tenantId
        );

        if (!deleted) {
            return reply.code(404).send({
                success: false,
                error: 'Not Found',
                message: 'Diet entry not found'
            });
        }

        return reply.send({
            success: true,
            message: 'Diet entry deleted successfully'
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            success: false,
            error: 'Server Error',
            message: 'Unable to delete diet entry'
        });
    }
};
