/**
 * Reception Service
 * 
 * Purpose:
 * - Contains core business logic for patient registration
 * - Handles database operations using Prisma
 * - Implements data transformations
 * - Manages transactions
 */

import { generateNumber } from '../../../utils/number-generator.js';

/**
 * Map frontend gender values to database enum
 */
const genderMap = {
    'Male': 'male',
    'Female': 'female',
    'Ambiguous': 'other'
};

/**
 * Register a new patient
 * @param {Object} prisma - Prisma client instance
 * @param {Object} patientData - Patient registration data
 * @param {BigInt} tenantId - Tenant ID from JWT
 * @returns {Promise<Object>} Created patient with UPID
 */
export const registerPatient = async (prisma, patientData, tenantId) => {
    // Generate UPID
    const upid = await generateNumber(prisma, 'NILD', tenantId);

    // Map gender to database enum
    const dbGender = genderMap[patientData.gender] || 'unknown';

    // Combine address fields
    const addressLine1 = patientData.doorNoStreet || '';
    const addressLine2 = patientData.area || '';
    const city = patientData.district || '';

    // Start a transaction to create patient and related records
    const result = await prisma.$transaction(async (tx) => {
        // Create patient record
        const patient = await tx.patients.create({
            data: {
                tenant_id: tenantId,
                facility_id: patientData.facilityId ? BigInt(patientData.facilityId) : null,
                upid: upid,
                first_name: patientData.firstName,
                middle_name: patientData.middleName || null,
                last_name: patientData.lastName || null,
                date_of_birth: new Date(patientData.dateOfBirth),
                gender: dbGender,
                blood_group: patientData.bloodGroup || null,
                mobile_primary: patientData.mobileNumber,
                mobile_secondary: patientData.mobileSecondary || null,
                email: patientData.email || null,
                aadhaar_number: patientData.aadhaarNumber || null,
                address_line1: addressLine1,
                address_line2: addressLine2,
                city: city,
                state: patientData.state || null,
                pincode: patientData.pincode || null,
                emergency_contact_name: patientData.emergencyContactName || null,
                emergency_contact_phone: patientData.emergencyContactPhone,
                emergency_contact_relation: patientData.emergencyContactRelation || null,
                is_divyangjan: patientData.isDivyangjan || false,
                registration_date: new Date()
            }
        });

        // If divyangjan, create disability record
        if (patientData.isDivyangjan && patientData.disabilityType) {
            await tx.patient_disabilities.create({
                data: {
                    tenant_id: tenantId,
                    patient_id: patient.patient_id,
                    disability_type: patientData.disabilityType,
                    is_active: true
                }
            });
        }

        return patient;
    });

    return result;
};

/**
 * Get patient by ID or UPID (auto-detects which one)
 * @param {Object} prisma - Prisma client instance
 * @param {String} identifier - Patient ID (numeric) or UPID (string pattern)
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @returns {Promise<Object|null>} Patient object or null
 */
export const getPatientById = async (prisma, identifier, tenantId) => {
    // Check if identifier matches UPID pattern (NILD-YYYYMMDD-SEQN)
    const upidPattern = /^NILD-\d{8}-\d{4}$/;
    const isUPID = upidPattern.test(identifier);

    // Build where clause based on identifier type
    const where = {
        tenant_id: tenantId
    };

    if (isUPID) {
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
 * Get patient by UPID
 * @param {Object} prisma - Prisma client instance
 * @param {String} upid - Universal Patient ID
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @returns {Promise<Object|null>} Patient object or null
 */
export const getPatientByUPID = async (prisma, upid, tenantId) => {
    const patient = await prisma.patients.findFirst({
        where: {
            upid: upid,
            tenant_id: tenantId
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

    return patient;
};

/**
 * Get all patients with optional filters
 * @param {Object} prisma - Prisma client instance
 * @param {Object} filters - Filter parameters
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @returns {Promise<Object>} { patients: Array, total: Number }
 */
export const getAllPatients = async (prisma, filters, tenantId) => {
    const { search, isDivyangjan, patientType, startDate, endDate, limit = 50, offset = 0 } = filters;

    // Build where clause
    const where = {
        tenant_id: tenantId
    };

    // Search filter (name or mobile)
    if (search) {
        where.OR = [
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } },
            { mobile_primary: { contains: search } }
        ];
    }

    // Divyangjan filter
    if (isDivyangjan !== undefined) {
        where.is_divyangjan = isDivyangjan;
    }

    // Date range filter
    if (startDate || endDate) {
        where.registration_date = {};
        if (startDate) where.registration_date.gte = new Date(startDate);
        if (endDate) where.registration_date.lte = new Date(endDate);
    }

    // Get total count and patients
    const [total, patients] = await Promise.all([
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
                registration_date: 'desc'
            },
            skip: offset,
            take: limit
        })
    ]);

    return { patients, total };
};

/**
 * Update patient information
 * @param {Object} prisma - Prisma client instance
 * @param {BigInt} patientId - Patient ID
 * @param {Object} updateData - Fields to update
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @returns {Promise<Object|null>} Updated patient or null
 */
export const updatePatient = async (prisma, patientId, updateData, tenantId) => {
    // 1. Resolve patient (handles both UPID and numeric ID)
    const existingPatient = await getPatientById(prisma, patientId, tenantId);
    if (!existingPatient) {
        return null;
    }

    // 2. Map fields to database columns
    const updateFields = {};

    // Personal Config
    if (updateData.firstName) updateFields.first_name = updateData.firstName;
    if (updateData.middleName !== undefined) updateFields.middle_name = updateData.middleName;
    if (updateData.lastName !== undefined) updateFields.last_name = updateData.lastName;
    if (updateData.dateOfBirth) updateFields.date_of_birth = new Date(updateData.dateOfBirth);

    // Gender Enum Map
    if (updateData.gender) {
        updateFields.gender = genderMap[updateData.gender] || 'unknown';
    }

    // Contact
    if (updateData.mobileNumber) updateFields.mobile_primary = updateData.mobileNumber;
    if (updateData.mobileSecondary !== undefined) updateFields.mobile_secondary = updateData.mobileSecondary;
    if (updateData.email !== undefined) updateFields.email = updateData.email;
    if (updateData.aadhaarNumber !== undefined) updateFields.aadhaar_number = updateData.aadhaarNumber;

    // Address
    if (updateData.doorNoStreet !== undefined) updateFields.address_line1 = updateData.doorNoStreet;
    if (updateData.area !== undefined) updateFields.address_line2 = updateData.area;
    if (updateData.district !== undefined) updateFields.city = updateData.district; // Mapping district to city as per register
    if (updateData.state !== undefined) updateFields.state = updateData.state;
    if (updateData.pincode !== undefined) updateFields.pincode = updateData.pincode;

    // Emergency
    if (updateData.emergencyContactName !== undefined) updateFields.emergency_contact_name = updateData.emergencyContactName;
    if (updateData.emergencyContactPhone !== undefined) updateFields.emergency_contact_phone = updateData.emergencyContactPhone;
    if (updateData.emergencyContactRelation !== undefined) updateFields.emergency_contact_relation = updateData.emergencyContactRelation;

    // Divyangjan Status
    if (updateData.isDivyangjan !== undefined) updateFields.is_divyangjan = updateData.isDivyangjan;

    // 3. Perform Update
    // Use the resolved BigInt ID from existingPatient
    const updated = await prisma.$transaction(async (tx) => {
        const p = await tx.patients.update({
            where: {
                patient_id: existingPatient.patient_id
            },
            data: {
                ...updateFields,
                updated_at: new Date()
            }
        });

        // Update Disability Info if provided
        if (updateData.disabilityType && existingPatient.is_divyangjan) {
            // Deactivate old disabilities (simplistic approach)
            await tx.patient_disabilities.updateMany({
                where: { patient_id: existingPatient.patient_id },
                data: { is_active: false }
            });

            // Add new
            await tx.patient_disabilities.create({
                data: {
                    tenant_id: tenantId,
                    patient_id: existingPatient.patient_id,
                    disability_type: updateData.disabilityType,
                    is_active: true
                }
            });
        }

        return p;
    });

    return updated;
};
