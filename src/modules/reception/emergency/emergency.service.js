/**
 * Emergency Registration Service
 *
 * Core business logic for emergency patient registration.
 * Handles rapid intake with minimal info, unknown patients,
 * vitals recording, and triage classification.
 */

import { generateNumber } from '../../../utils/number-generator.js';

/**
 * Map frontend gender values to database enum
 */
const genderMap = {
    'Male': 'male',
    'Female': 'female',
    'Other': 'other',
    'Unknown': 'unknown'
};

async function generateEmergencyCaseNumber(prisma, tenantId) {
    return await generateNumber(prisma, 'ER', tenantId);
}

/**
 * Register a new emergency patient
 */
export const registerEmergency = async (prisma, data, tenantId) => {
    const caseNumber = await generateEmergencyCaseNumber(prisma, tenantId);
    const upid = await generateNumber(prisma, 'NILD', tenantId);

    const dbGender = genderMap[data.gender] || 'unknown';

    // Compute approximate DOB from age
    const now = new Date();
    const approximateDOB = new Date(now.getFullYear() - data.approximateAge, 0, 1);

    // Parse patient name
    let firstName = 'Unknown';
    let lastName = null;
    if (!data.isUnknownPatient && data.patientName) {
        const nameParts = data.patientName.trim().split(/\s+/);
        firstName = nameParts[0];
        lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
    }

    const result = await prisma.$transaction(async (tx) => {
        const patient = await tx.patients.create({
            data: {
                tenant_id: tenantId,
                facility_id: data.facilityId ? BigInt(data.facilityId) : null,
                upid: upid,
                first_name: firstName,
                last_name: lastName,
                date_of_birth: approximateDOB,
                gender: dbGender,
                mobile_primary: data.mobileNumber || null,
                emergency_contact_phone: data.broughtByContact || data.mobileNumber || null,
                is_divyangjan: false,
                is_emergency: true,
                is_unknown_patient: data.isUnknownPatient || false,
                emergency_case_number: caseNumber,
                arrival_mode: data.broughtBy || 'Ambulance',
                arrival_time: now,
                brought_by_contact: data.broughtByContact || null,
                emergency_type: data.emergencyType || 'Trauma',
                triage_priority: data.priorityLevel || 'Critical',
                vitals: data.vitals || null,
                complaint_notes: data.complaintNotes || null,
                registration_date: now
            }
        });

        return patient;
    });

    return result;
};

/**
 * Get emergency patient by ID or case number (auto-detects)
 */
export const getEmergencyById = async (prisma, identifier, tenantId) => {
    const casePattern = /^ER-\d{8}-\d{4}$/;
    const upidPattern = /^NILD-\d{8}-\d{4}$/;

    const where = {
        tenant_id: tenantId,
        is_emergency: true
    };

    if (casePattern.test(identifier)) {
        where.emergency_case_number = identifier;
    } else if (upidPattern.test(identifier)) {
        where.upid = identifier;
    } else {
        where.patient_id = BigInt(identifier);
    }

    const patient = await prisma.patients.findFirst({
        where,
        include: {
            patient_disabilities: {
                where: { is_active: true }
            },
            patient_allergies: {
                where: { is_active: true }
            }
        }
    });

    return patient;
};

/**
 * Get all emergency patients with optional filters
 */
export const getAllEmergencies = async (prisma, filters, tenantId) => {
    const { search, priorityLevel, emergencyType, startDate, endDate, limit = 50, offset = 0 } = filters;

    const where = {
        tenant_id: tenantId,
        is_emergency: true
    };

    // Search by name or mobile
    if (search) {
        where.OR = [
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } },
            { mobile_primary: { contains: search } },
            { emergency_case_number: { contains: search, mode: 'insensitive' } }
        ];
    }

    if (priorityLevel) {
        where.triage_priority = priorityLevel;
    }

    if (emergencyType) {
        where.emergency_type = emergencyType;
    }

    // Date range on arrival_time
    if (startDate || endDate) {
        where.arrival_time = {};
        if (startDate) where.arrival_time.gte = new Date(startDate);
        if (endDate) where.arrival_time.lte = new Date(endDate);
    }

    const [total, emergencies] = await Promise.all([
        prisma.patients.count({ where }),
        prisma.patients.findMany({
            where,
            include: {
                patient_disabilities: {
                    where: { is_active: true }
                },
                patient_allergies: {
                    where: { is_active: true }
                }
            },
            orderBy: {
                arrival_time: 'desc'
            },
            skip: offset,
            take: limit
        })
    ]);

    return { emergencies, total };
};

/**
 * Update emergency patient information
 */
export const updateEmergency = async (prisma, identifier, updateData, tenantId) => {
    const existing = await getEmergencyById(prisma, identifier, tenantId);
    if (!existing) {
        return null;
    }

    const updateFields = {};

    // Patient name
    if (updateData.patientName) {
        const nameParts = updateData.patientName.trim().split(/\s+/);
        updateFields.first_name = nameParts[0];
        updateFields.last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
    }

    if (updateData.isUnknownPatient !== undefined) {
        updateFields.is_unknown_patient = updateData.isUnknownPatient;
    }

    if (updateData.approximateAge !== undefined) {
        const now = new Date();
        updateFields.date_of_birth = new Date(now.getFullYear() - updateData.approximateAge, 0, 1);
    }

    if (updateData.gender) {
        const validDbGenders = ['male', 'female', 'other', 'unknown'];
        const lower = updateData.gender.toLowerCase();
        updateFields.gender = validDbGenders.includes(lower) ? lower : (genderMap[updateData.gender] || 'unknown');
    }

    if (updateData.mobileNumber) {
        updateFields.mobile_primary = updateData.mobileNumber;
    }

    if (updateData.broughtBy) {
        updateFields.arrival_mode = updateData.broughtBy;
    }

    if (updateData.broughtByContact !== undefined) {
        updateFields.brought_by_contact = updateData.broughtByContact;
    }

    if (updateData.emergencyType) {
        updateFields.emergency_type = updateData.emergencyType;
    }

    if (updateData.priorityLevel) {
        updateFields.triage_priority = updateData.priorityLevel;
    }

    if (updateData.vitals !== undefined) {
        updateFields.vitals = updateData.vitals;
    }

    if (updateData.complaintNotes !== undefined) {
        updateFields.complaint_notes = updateData.complaintNotes;
    }

    // DB field names (snake_case) — direct passthrough
    if (updateData.first_name !== undefined) updateFields.first_name = updateData.first_name;
    if (updateData.middle_name !== undefined) updateFields.middle_name = updateData.middle_name;
    if (updateData.last_name !== undefined) updateFields.last_name = updateData.last_name;
    if (updateData.date_of_birth !== undefined) updateFields.date_of_birth = new Date(updateData.date_of_birth);
    if (updateData.mobile_primary !== undefined) updateFields.mobile_primary = updateData.mobile_primary;
    if (updateData.mobile_secondary !== undefined) updateFields.mobile_secondary = updateData.mobile_secondary;
    if (updateData.email !== undefined) updateFields.email = updateData.email;
    if (updateData.blood_group !== undefined) updateFields.blood_group = updateData.blood_group;
    if (updateData.aadhaar_number !== undefined) updateFields.aadhaar_number = updateData.aadhaar_number;
    if (updateData.address_line1 !== undefined) updateFields.address_line1 = updateData.address_line1;
    if (updateData.address_line2 !== undefined) updateFields.address_line2 = updateData.address_line2;
    if (updateData.city !== undefined) updateFields.city = updateData.city;
    if (updateData.state !== undefined) updateFields.state = updateData.state;
    if (updateData.pincode !== undefined) updateFields.pincode = updateData.pincode;
    if (updateData.emergency_contact_name !== undefined) updateFields.emergency_contact_name = updateData.emergency_contact_name;
    if (updateData.emergency_contact_phone !== undefined) updateFields.emergency_contact_phone = updateData.emergency_contact_phone;
    if (updateData.emergency_contact_relation !== undefined) updateFields.emergency_contact_relation = updateData.emergency_contact_relation;
    if (updateData.is_unknown_patient !== undefined) updateFields.is_unknown_patient = updateData.is_unknown_patient;
    if (updateData.is_divyangjan !== undefined) updateFields.is_divyangjan = updateData.is_divyangjan;
    if (updateData.triage_priority !== undefined) updateFields.triage_priority = updateData.triage_priority;
    if (updateData.emergency_type !== undefined) updateFields.emergency_type = updateData.emergency_type;
    if (updateData.arrival_mode !== undefined) updateFields.arrival_mode = updateData.arrival_mode;
    if (updateData.brought_by_contact !== undefined) updateFields.brought_by_contact = updateData.brought_by_contact;
    if (updateData.complaint_notes !== undefined) updateFields.complaint_notes = updateData.complaint_notes;

    const updated = await prisma.patients.update({
        where: {
            patient_id: existing.patient_id
        },
        data: {
            ...updateFields,
            updated_at: new Date()
        },
        include: {
            patient_disabilities: {
                where: { is_active: true }
            },
            patient_allergies: {
                where: { is_active: true }
            }
        }
    });

    return updated;
};
