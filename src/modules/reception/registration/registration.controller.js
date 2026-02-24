/**
 * Reception Controller
 * 
 * Purpose:
 * - Contains request handlers
 * - Coordinates between routes and services
 * - Handles request/response transformation
 * - Minimal business logic (delegates to services)
 */

import * as receptionService from './registration.service.js';

/**
 * Register a new patient
 * POST /api/patients
 */
export const registerPatient = async (request, reply) => {
    try {
        // Extract tenant_id from authenticated user context
        // TODO: Replace with actual JWT extraction once auth plugin is configured
        const tenantId = BigInt(request.body.tenantId || 1);  // Temporary fallback

        const patientData = request.body;

        // Call service to register patient
        const newPatient = await receptionService.registerPatient(
            request.server.prisma,
            patientData,
            tenantId
        );

        // Convert BigInt to string for JSON serialization
        const response = {
            ...newPatient,
            patient_id: newPatient.patient_id.toString(),
            tenant_id: newPatient.tenant_id.toString(),
            facility_id: newPatient.facility_id?.toString() || null
        };

        return reply.code(201).send(response);

    } catch (error) {
        request.log.error(error);

        // Handle unique constraint violations
        if (error.code === 'P2002') {
            return reply.code(409).send({
                error: 'Duplicate Entry',
                message: `A patient with this ${error.meta?.target?.[0] || 'value'} already exists.`
            });
        }

        return reply.code(500).send({
            error: 'Registration Failed',
            message: 'Unable to register patient. Please try again.'
        });
    }
};

/**
 * Get patient by ID or UPID (auto-detects)
 * GET /api/patients/:id
 * 
 * Accepts either:
 * - Numeric patient_id (e.g., "123")
 * - UPID string (e.g., "NILD-20260212-OPD-0001")
 */
export const getPatientById = async (request, reply) => {
    try {
        const identifier = request.params.id;
        const tenantId = BigInt(1);  // TODO: Extract from JWT

        const patient = await receptionService.getPatientById(
            request.server.prisma,
            identifier,
            tenantId
        );

        if (!patient) {
            return reply.code(404).send({
                error: 'Not Found',
                message: 'Patient not found'
            });
        }

        // Convert BigInt to string
        const response = {
            ...patient,
            patient_id: patient.patient_id.toString(),
            tenant_id: patient.tenant_id.toString(),
            facility_id: patient.facility_id?.toString() || null
        };

        return reply.send(response);

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            error: 'Server Error',
            message: 'Unable to retrieve patient information'
        });
    }
};

/**
 * Get all patients with optional filters
 * GET /api/patients
 */
export const getAllPatients = async (request, reply) => {
    try {
        const filters = request.query;
        const tenantId = BigInt(1);  // TODO: Extract from JWT

        const result = await receptionService.getAllPatients(
            request.server.prisma,
            filters,
            tenantId
        );

        // Convert BigInt to string in patients array (including nested relations)
        const patients = result.patients.map(p => ({
            ...p,
            patient_id: p.patient_id.toString(),
            tenant_id: p.tenant_id?.toString(),
            facility_id: p.facility_id?.toString() || null,
            patient_disabilities: (p.patient_disabilities || []).map(d => ({
                ...d,
                disability_id: d.disability_id.toString(),
                tenant_id: d.tenant_id.toString(),
                patient_id: d.patient_id.toString()
            })),
            patient_allergies: (p.patient_allergies || []).map(a => ({
                ...a,
                allergy_id: a.allergy_id.toString(),
                tenant_id: a.tenant_id.toString(),
                patient_id: a.patient_id.toString()
            }))
        }));

        return reply.send({
            patients,
            total: result.total
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            error: 'Server Error',
            message: 'Unable to retrieve patients'
        });
    }
};

/**
 * Update patient information
 * PUT /api/patients/:id
 */
export const updatePatient = async (request, reply) => {
    try {
        const patientId = request.params.id;
        const updateData = request.body;
        const tenantId = BigInt(1);  // TODO: Extract from JWT

        const updatedPatient = await receptionService.updatePatient(
            request.server.prisma,
            patientId,
            updateData,
            tenantId
        );

        if (!updatedPatient) {
            return reply.code(404).send({
                error: 'Not Found',
                message: 'Patient not found'
            });
        }

        // Convert BigInt to string
        const response = {
            ...updatedPatient,
            patient_id: updatedPatient.patient_id.toString(),
            tenant_id: updatedPatient.tenant_id.toString()
        };

        return reply.send(response);

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            error: 'Update Failed',
            message: 'Unable to update patient information'
        });
    }
};
