/**
 * Diet Entry Service
 * 
 * Purpose:
 * - Contains core business logic for diet entry management
 * - Handles database operations using Prisma
 * - Implements data transformations
 */

/**
 * Calculate age from date of birth
 * @param {Date} dateOfBirth - Patient's date of birth
 * @returns {Number} Age in years
 */
const calculateAge = (dateOfBirth) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
};

/**
 * Get patient details by UPID for auto-fill
 * @param {Object} prisma - Prisma client instance
 * @param {String} upid - Universal Patient ID
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @returns {Promise<Object|null>} Patient details or null
 */
export const getPatientByUPID = async (prisma, upid, tenantId) => {
    const patient = await prisma.patients.findFirst({
        where: {
            upid: upid,
            tenant_id: tenantId
        },
        include: {
            ipd_admissions: {
                where: {
                    status: 'admitted'
                },
                orderBy: {
                    admission_date: 'desc'
                },
                take: 1,
                select: {
                    provisional_diagnosis: true,
                    admission_date: true
                }
            },
            diet_entries: {
                orderBy: {
                    entry_date: 'desc'
                },
                take: 1,
                select: {
                    height: true,
                    weight: true,
                    mobility: true
                }
            }
        }
    });

    if (!patient) {
        return null;
    }

    // Calculate age from date of birth
    const age = calculateAge(patient.date_of_birth);

    // Get the latest admission reason if available
    const admissionReason = patient.ipd_admissions?.[0]?.provisional_diagnosis || 'N/A';

    // Get latest measurements from previous diet entry if available
    const latestEntry = patient.diet_entries?.[0];

    // Format gender for display
    const genderMap = {
        'male': 'Male',
        'female': 'Female',
        'other': 'Other'
    };

    return {
        patientName: `${patient.first_name} ${patient.middle_name || ''} ${patient.last_name || ''}`.trim(),
        age: age,
        gender: genderMap[patient.gender] || patient.gender,
        admissionReason: admissionReason,
        mobility: latestEntry?.mobility || 'Ambulatory',
        height: latestEntry?.height ? Number(latestEntry.height) : null,
        weight: latestEntry?.weight ? Number(latestEntry.weight) : null
    };
};

/**
 * Create a new diet entry
 * @param {Object} prisma - Prisma client instance
 * @param {Object} entryData - Diet entry data with nested structure
 * @param {BigInt} tenantId - Tenant ID from JWT
 * @param {BigInt} createdBy - User ID of the dietician
 * @returns {Promise<Object>} Created diet entry
 */
export const createDietEntry = async (prisma, entryData, tenantId, createdBy) => {
    // First, get the patient ID from UPID
    const patient = await prisma.patients.findFirst({
        where: {
            upid: entryData.patientId,
            tenant_id: tenantId
        },
        select: {
            patient_id: true
        }
    });

    if (!patient) {
        throw new Error('Patient not found');
    }

    // Extract nested data
    const anthropometrics = entryData.anthropometrics || {};
    const labResults = entryData.labResults || {};
    const prescription = entryData.prescription || {};
    const schedule = entryData.schedule || {};

    // Calculate BMI if height and weight are provided
    let bmi = null;
    if (anthropometrics.height && anthropometrics.weight) {
        const heightInMeters = parseFloat(anthropometrics.height) / 100;
        const weightInKg = parseFloat(anthropometrics.weight);
        bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(2);
    }

    // Create the diet entry
    const dietEntry = await prisma.diet_entries.create({
        data: {
            tenant_id: tenantId,
            patient_id: patient.patient_id,
            // entry_date will use default(now()) from schema
            
            // Anthropometrics
            age: anthropometrics.age ? parseInt(anthropometrics.age) : null,
            gender: anthropometrics.gender || null,
            height: anthropometrics.height ? parseFloat(anthropometrics.height) : null,
            weight: anthropometrics.weight ? parseFloat(anthropometrics.weight) : null,
            bmi: bmi ? parseFloat(bmi) : null,
            mobility: anthropometrics.mobility || null,
            
            // Lab Results
            glucose: labResults.glucose ? parseFloat(labResults.glucose) : null,
            hba1c: labResults.hba1c ? parseFloat(labResults.hba1c) : null,
            
            // Prescription
            diet_type: prescription.dietType || null,
            calories: prescription.calories ? parseInt(prescription.calories) : null,
            protein: prescription.protein ? parseFloat(prescription.protein) : null,
            
            // Schedule
            breakfast_time: schedule.breakfast || null,
            lunch_time: schedule.lunch || null,
            dinner_time: schedule.dinner || null,
            
            // Notes
            notes: entryData.notes || null,
            
            // Audit
            created_by: createdBy
        },
        include: {
            patients: {
                select: {
                    upid: true,
                    first_name: true,
                    middle_name: true,
                    last_name: true
                }
            },
            users: {
                select: {
                    username: true,
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            }
        }
    });

    return dietEntry;
};

/**
 * Get all diet entries for a patient
 * @param {Object} prisma - Prisma client instance
 * @param {String} upid - Universal Patient ID
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @returns {Promise<Array>} List of diet entries
 */
export const getDietEntriesByPatient = async (prisma, upid, tenantId) => {
    // Get patient ID from UPID
    const patient = await prisma.patients.findFirst({
        where: {
            upid: upid,
            tenant_id: tenantId
        },
        select: {
            patient_id: true
        }
    });

    if (!patient) {
        return [];
    }

    const entries = await prisma.diet_entries.findMany({
        where: {
            patient_id: patient.patient_id,
            tenant_id: tenantId
        },
        include: {
            patients: {
                select: {
                    upid: true,
                    first_name: true,
                    middle_name: true,
                    last_name: true
                }
            },
            users: {
                select: {
                    username: true,
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            }
        },
        orderBy: {
            entry_date: 'desc'
        }
    });

    return entries;
};

/**
 * Get a specific diet entry by ID
 * @param {Object} prisma - Prisma client instance
 * @param {BigInt} entryId - Diet entry ID
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @returns {Promise<Object|null>} Diet entry or null
 */
export const getDietEntryById = async (prisma, entryId, tenantId) => {
    const entry = await prisma.diet_entries.findFirst({
        where: {
            entry_id: BigInt(entryId),
            tenant_id: tenantId
        },
        include: {
            patients: {
                select: {
                    upid: true,
                    first_name: true,
                    middle_name: true,
                    last_name: true,
                    date_of_birth: true,
                    gender: true
                }
            },
            users: {
                select: {
                    username: true,
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            }
        }
    });

    return entry;
};

/**
 * Update a diet entry
 * @param {Object} prisma - Prisma client instance
 * @param {BigInt} entryId - Diet entry ID
 * @param {Object} updateData - Updated diet entry data with nested structure
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @returns {Promise<Object|null>} Updated diet entry or null
 */
export const updateDietEntry = async (prisma, entryId, updateData, tenantId) => {
    // Extract nested data
    const anthropometrics = updateData.anthropometrics || {};
    const labResults = updateData.labResults || {};
    const prescription = updateData.prescription || {};
    const schedule = updateData.schedule || {};

    // Calculate BMI if height and weight are provided
    let bmi = null;
    if (anthropometrics.height && anthropometrics.weight) {
        const heightInMeters = parseFloat(anthropometrics.height) / 100;
        const weightInKg = parseFloat(anthropometrics.weight);
        bmi = (weightInKg / (heightInMeters * heightInMeters)).toFixed(2);
    }

    const updatedEntry = await prisma.diet_entries.updateMany({
        where: {
            entry_id: BigInt(entryId),
            tenant_id: tenantId
        },
        data: {
            // Anthropometrics
            age: anthropometrics.age ? parseInt(anthropometrics.age) : undefined,
            gender: anthropometrics.gender || undefined,
            height: anthropometrics.height ? parseFloat(anthropometrics.height) : undefined,
            weight: anthropometrics.weight ? parseFloat(anthropometrics.weight) : undefined,
            bmi: bmi ? parseFloat(bmi) : undefined,
            mobility: anthropometrics.mobility || undefined,
            
            // Lab Results
            glucose: labResults.glucose ? parseFloat(labResults.glucose) : undefined,
            hba1c: labResults.hba1c ? parseFloat(labResults.hba1c) : undefined,
            
            // Prescription
            diet_type: prescription.dietType || undefined,
            calories: prescription.calories ? parseInt(prescription.calories) : undefined,
            protein: prescription.protein ? parseFloat(prescription.protein) : undefined,
            
            // Schedule
            breakfast_time: schedule.breakfast || undefined,
            lunch_time: schedule.lunch || undefined,
            dinner_time: schedule.dinner || undefined,
            
            // Notes
            notes: updateData.notes || undefined
        }
    });

    if (updatedEntry.count === 0) {
        return null;
    }

    return getDietEntryById(prisma, entryId, tenantId);
};

/**
 * Delete a diet entry
 * @param {Object} prisma - Prisma client instance
 * @param {BigInt} entryId - Diet entry ID
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @returns {Promise<Boolean>} True if deleted, false otherwise
 */
export const deleteDietEntry = async (prisma, entryId, tenantId) => {
    const result = await prisma.diet_entries.deleteMany({
        where: {
            entry_id: BigInt(entryId),
            tenant_id: tenantId
        }
    });

    return result.count > 0;
};
