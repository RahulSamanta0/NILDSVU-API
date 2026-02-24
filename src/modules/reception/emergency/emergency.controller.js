/**
 * Emergency Registration Controller
 *
 * Request handlers for emergency patient registration.
 * Handles BigInt serialization and error responses.
 */

import * as emergencyService from './emergency.service.js';

/**
 * Register a new emergency patient
 * POST /api/emergency
 */
export const registerEmergency = async (request, reply) => {
    try {
        const tenantId = BigInt(request.body.tenantId || 1);
        const data = request.body;

        const patient = await emergencyService.registerEmergency(
            request.server.prisma,
            data,
            tenantId
        );

        const response = {
            ...patient,
            patient_id: patient.patient_id.toString(),
            tenant_id: patient.tenant_id.toString(),
            facility_id: patient.facility_id?.toString() || null
        };

        return reply.code(201).send(response);

    } catch (error) {
        request.log.error(error);

        if (error.code === 'P2002') {
            return reply.code(409).send({
                error: 'Duplicate Entry',
                message: `A record with this ${error.meta?.target?.[0] || 'value'} already exists.`
            });
        }

        return reply.code(500).send({
            error: 'Emergency Registration Failed',
            message: 'Unable to register emergency patient. Please try again.'
        });
    }
};

/**
 * Get emergency patient by ID or case number
 * GET /api/emergency/:id
 */
export const getEmergencyById = async (request, reply) => {
    try {
        const identifier = request.params.id;
        const tenantId = BigInt(1);

        const patient = await emergencyService.getEmergencyById(
            request.server.prisma,
            identifier,
            tenantId
        );

        if (!patient) {
            return reply.code(404).send({
                error: 'Not Found',
                message: 'Emergency case not found'
            });
        }

        const response = {
            ...patient,
            patient_id: patient.patient_id.toString(),
            tenant_id: patient.tenant_id.toString(),
            facility_id: patient.facility_id?.toString() || null,
            patient_disabilities: (patient.patient_disabilities || []).map(d => ({
                ...d,
                disability_id: d.disability_id.toString(),
                tenant_id: d.tenant_id.toString(),
                patient_id: d.patient_id.toString()
            })),
            patient_allergies: (patient.patient_allergies || []).map(a => ({
                ...a,
                allergy_id: a.allergy_id.toString(),
                tenant_id: a.tenant_id.toString(),
                patient_id: a.patient_id.toString()
            }))
        };

        return reply.send(response);

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            error: 'Server Error',
            message: 'Unable to retrieve emergency case'
        });
    }
};

/**
 * Get all emergency cases with optional filters
 * GET /api/emergency
 */
export const getAllEmergencies = async (request, reply) => {
    try {
        const filters = request.query;
        const tenantId = BigInt(1);

        const result = await emergencyService.getAllEmergencies(
            request.server.prisma,
            filters,
            tenantId
        );

        const emergencies = result.emergencies.map(p => ({
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
            emergencies,
            total: result.total
        });

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            error: 'Server Error',
            message: 'Unable to retrieve emergency cases'
        });
    }
};

/**
 * Update emergency patient information
 * PUT /api/emergency/:id
 */
export const updateEmergency = async (request, reply) => {
    try {
        const identifier = request.params.id;
        const updateData = request.body;
        const tenantId = BigInt(1);

        const updated = await emergencyService.updateEmergency(
            request.server.prisma,
            identifier,
            updateData,
            tenantId
        );

        if (!updated) {
            return reply.code(404).send({
                error: 'Not Found',
                message: 'Emergency case not found'
            });
        }

        const response = {
            ...updated,
            patient_id: updated.patient_id.toString(),
            tenant_id: updated.tenant_id.toString(),
            facility_id: updated.facility_id?.toString() || null,
            patient_disabilities: (updated.patient_disabilities || []).map(d => ({
                ...d,
                disability_id: d.disability_id.toString(),
                tenant_id: d.tenant_id.toString(),
                patient_id: d.patient_id.toString()
            })),
            patient_allergies: (updated.patient_allergies || []).map(a => ({
                ...a,
                allergy_id: a.allergy_id.toString(),
                tenant_id: a.tenant_id.toString(),
                patient_id: a.patient_id.toString()
            }))
        };

        return reply.send(response);

    } catch (error) {
        request.log.error(error);
        return reply.code(500).send({
            error: 'Update Failed',
            message: 'Unable to update emergency case'
        });
    }
};
