/**
 * Progress Report Controller
 * 
 * Purpose:
 * - Handle HTTP requests for rehabilitation progress reports
 * - Get all patients with rehabilitation entries
 * - Get detailed progress report for specific patient
 * - Update progress scores and session data
 */

import { getAllPatientsWithRehabEntries, getPatientProgressReport, updateProgressReport } from './progress-report.service.js';

/**
 * Get all patients with rehabilitation entries
 */
export async function getAllPatientsHandler(request, reply) {
    try {
        const user = request.user;
        const result = await getAllPatientsWithRehabEntries(this, user);
        
        return reply.code(200).send({
            success: true,
            message: 'Patients retrieved successfully',
            data: result
        });
    } catch (error) {
        console.error('Error fetching patients:', error);
        
        const response = {
            success: false,
            message: 'Failed to retrieve patients',
            error: error.message
        };

        // Add detailed error info in development
        if (process.env.NODE_ENV === 'development') {
            response.details = {
                stack: error.stack,
                code: error.code
            };
        }

        return reply.code(500).send(response);
    }
}

/**
 * Get detailed progress report for a specific patient
 */
export async function getPatientProgressHandler(request, reply) {
    try {
        const { patientId } = request.params;
        const user = request.user;
        
        const result = await getPatientProgressReport(this, patientId, user);
        
        if (!result) {
            return reply.code(404).send({
                success: false,
                message: `Patient with UPID '${patientId}' not found`
            });
        }

        return reply.code(200).send({
            success: true,
            message: 'Progress report retrieved successfully',
            data: result
        });
    } catch (error) {
        console.error('Error fetching progress report:', error);
        
        const response = {
            success: false,
            message: 'Failed to retrieve progress report',
            error: error.message
        };

        // Add detailed error info in development
        if (process.env.NODE_ENV === 'development') {
            response.details = {
                stack: error.stack,
                code: error.code
            };
        }

        return reply.code(500).send(response);
    }
}

/**
 * Update progress report for a specific rehabilitation entry
 */
export async function updateProgressReportHandler(request, reply) {
    try {
        const { entry_id } = request.params;
        const user = request.user;
        const updateData = request.body;
        
        const result = await updateProgressReport(this, entry_id, updateData, user);
        
        if (!result) {
            return reply.code(404).send({
                success: false,
                message: `Rehabilitation entry with ID '${entry_id}' not found`
            });
        }

        return reply.code(200).send({
            success: true,
            message: 'Progress report updated successfully',
            data: result
        });
    } catch (error) {
        console.error('Error updating progress report:', error);
        
        const response = {
            success: false,
            message: 'Failed to update progress report',
            error: error.message
        };

        // Add detailed error info in development
        if (process.env.NODE_ENV === 'development') {
            response.details = {
                stack: error.stack,
                code: error.code
            };
        }

        return reply.code(error.statusCode || 500).send(response);
    }
}
