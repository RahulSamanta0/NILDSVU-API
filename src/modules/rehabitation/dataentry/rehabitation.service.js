/**
 * Rehabilitation Data Entry Service
 * Handles business logic for creating and updating rehabilitation entries
 */

/**
 * Create a new rehabilitation entry
 * @param {Object} fastify - Fastify instance
 * @param {Object} data - Entry data
 * @param {Object} user - Authenticated user from JWT token
 * @returns {Promise<Object>} Created entry
 */
export async function createRehabilitationEntry(fastify, data, user) {
    const { prisma } = fastify;
    const { 
        patientId, 
        patientName, // Ignored
        opdId, 
        // Assessment
        assessmentDate, 
        referringDoctor, 
        diagnosis, 
        baselineStatus, 
        impairments,
        // Goals
        goalDescription,
        goal, // Alias for goalDescription
        goalType, 
        targetDate, 
        reviewDate, 
        reviewOutcome,
        // Devices
        deviceType, 
        side, 
        fittingDetails,
        prescribed, // Prescribed date for devices
        // HEP
        dateGiven, 
        frequency, 
        exerciseList,
        // Session
        sessionType,
        therapyType, // PT, OT, ST
        duration, 
        intensity, 
        interventions, 
        response, 
        therapistSignature,
        medicine, // Medicine name
        // Status
        status, // In Progress, Completed, Incomplete
        nextCheckup // Next checkup date
    } = data;

    // Find patient by UPID (from patientId field)
    const patient = await prisma.patients.findUnique({
        where: { upid: patientId }
    });

    if (!patient) {
        throw new Error('Patient not found');
    }

    // Lookup visit_id if opdId is provided
    let visit_id = null;
    if (opdId) {
        const visit = await prisma.opd_visits.findUnique({
            where: {
                visit_number: opdId,
                tenant_id: patient.tenant_id // Ensure tenant matches
            }
        });
        if (visit) {
            visit_id = visit.visit_id;
        }
    }

    // Mapping to DB schema
    const newEntry = await prisma.rehabilitation_entries.create({
        data: {
            tenant_id: patient.tenant_id,
            patient_id: patient.patient_id,
            visit_id: visit_id,
            therapist_id: user?.user_id ? BigInt(user.user_id) : null,
            
            assessment_date: assessmentDate ? new Date(assessmentDate) : new Date(),
            referring_doctor: referringDoctor,
            diagnosis: diagnosis,
            baseline_status: baselineStatus,
            impairments: impairments,

            goal_description: goal || goalDescription, // Support both field names
            goal_type: goalType,
            target_date: targetDate ? new Date(targetDate) : null,
            review_date: reviewDate ? new Date(reviewDate) : null,
            review_outcome: reviewOutcome,

            device_type: deviceType,
            side_region: side,
            fitting_details: fittingDetails,
            prescribed_date: prescribed ? new Date(prescribed) : null,

            hep_date_given: dateGiven ? new Date(dateGiven) : null,
            hep_frequency: frequency,
            hep_exercise_list: exerciseList,

            session_type: sessionType,
            therapy_type: therapyType, // PT, OT, ST
            duration_minutes: duration ? parseInt(duration, 10) : null,
            intensity: intensity,
            interventions: interventions,
            patient_response: response,
            therapist_signature: therapistSignature,
            medicine: medicine,

            status: status || 'In Progress', // Default status
            next_checkup: nextCheckup ? new Date(nextCheckup) : null
        }
    });

    return newEntry;
}

/**
 * Update a rehabilitation entry
 * @param {Object} fastify - Fastify instance
 * @param {string} entryId - Entry ID to update
 * @param {Object} data - Updated entry data
 * @param {Object} user - Authenticated user from JWT token
 * @returns {Promise<Object>} Updated entry
 */
export async function updateRehabilitationEntry(fastify, entryId, data, user) {
    const { prisma } = fastify;
    
    console.log('=== UPDATE REHABILITATION ENTRY DEBUG ===');
    console.log('Entry ID:', entryId);
    console.log('User object:', user);
    console.log('Data received:', JSON.stringify(data, null, 2));
    
    const { 
        patientId,
        opdId,
        // Assessment
        assessmentDate, 
        referringDoctor, 
        diagnosis, 
        baselineStatus, 
        impairments,
        // Goals
        goalDescription,
        goal, // Alias for goalDescription
        goalType, 
        targetDate, 
        reviewDate, 
        reviewOutcome,
        // Devices
        deviceType, 
        side, 
        fittingDetails,
        prescribed, // Prescribed date for devices
        // HEP
        dateGiven, 
        frequency, 
        exerciseList,
        // Session
        sessionType,
        therapyType, // PT, OT, ST
        duration, 
        intensity, 
        interventions, 
        response, 
        therapistSignature,
        medicine, // Medicine name
        // Status fields
        status, // In Progress, Completed, Incomplete
        nextCheckup, // Next checkup date
        checkup // Alias for nextCheckup
    } = data;

    // Check if entry exists
    const existingEntry = await prisma.rehabilitation_entries.findUnique({
        where: { entry_id: BigInt(entryId) }
    });

    if (!existingEntry) {
        throw new Error('Rehabilitation entry not found');
    }

    // Prepare update data object
    const updateData = {};

    // Only update fields that are provided
    if (assessmentDate !== undefined) updateData.assessment_date = new Date(assessmentDate);
    if (referringDoctor !== undefined) updateData.referring_doctor = referringDoctor;
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
    if (baselineStatus !== undefined) updateData.baseline_status = baselineStatus;
    if (impairments !== undefined) updateData.impairments = impairments;

    if (goal !== undefined) updateData.goal_description = goal;
    if (goalDescription !== undefined) updateData.goal_description = goalDescription;
    if (goalType !== undefined) updateData.goal_type = goalType;
    if (targetDate !== undefined) updateData.target_date = targetDate ? new Date(targetDate) : null;
    if (reviewDate !== undefined) updateData.review_date = reviewDate ? new Date(reviewDate) : null;
    if (reviewOutcome !== undefined) updateData.review_outcome = reviewOutcome;

    if (deviceType !== undefined) updateData.device_type = deviceType;
    if (side !== undefined) updateData.side_region = side;
    if (fittingDetails !== undefined) updateData.fitting_details = fittingDetails;
    if (prescribed !== undefined) updateData.prescribed_date = prescribed ? new Date(prescribed) : null;

    if (dateGiven !== undefined) updateData.hep_date_given = dateGiven ? new Date(dateGiven) : null;
    if (frequency !== undefined) updateData.hep_frequency = frequency;
    if (exerciseList !== undefined) updateData.hep_exercise_list = exerciseList;

    if (sessionType !== undefined) updateData.session_type = sessionType;
    if (therapyType !== undefined) updateData.therapy_type = therapyType;
    if (duration !== undefined) updateData.duration_minutes = duration ? parseInt(duration, 10) : null;
    if (intensity !== undefined) updateData.intensity = intensity;
    if (interventions !== undefined) updateData.interventions = interventions;
    if (response !== undefined) updateData.patient_response = response;
    if (therapistSignature !== undefined) updateData.therapist_signature = therapistSignature;
    if (medicine !== undefined) updateData.medicine = medicine;

    if (status !== undefined) updateData.status = status;
    if (nextCheckup !== undefined) updateData.next_checkup = nextCheckup ? new Date(nextCheckup) : null;
    if (checkup !== undefined) updateData.next_checkup = checkup ? new Date(checkup) : null;

    // Always update the timestamp
    updateData.updated_at = new Date();

    // Handle OPD visit update
    if (opdId !== undefined) {
        if (opdId) {
            const visit = await prisma.opd_visits.findUnique({
                where: {
                    visit_number: opdId,
                    tenant_id: existingEntry.tenant_id
                }
            });
            if (visit) {
                updateData.visit_id = visit.visit_id;
            }
        } else {
            updateData.visit_id = null;
        }
    }

    // Update the entry
    const updatedEntry = await prisma.rehabilitation_entries.update({
        where: { entry_id: BigInt(entryId) },
        data: updateData,
        include: {
            patients: {
                select: {
                    upid: true,
                    first_name: true,
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
            },
            opd_visits: {
                select: {
                    visit_number: true
                }
            }
        }
    });

    console.log('Update successful');
    return updatedEntry;
}

/**
 * Get rehabilitation entries for a patient by UPID
 * @param {Object} fastify - Fastify instance
 * @param {string} upid - Patient UPID
 * @param {BigInt} tenant_id - Tenant ID for filtering
 * @returns {Promise<Object>} Patient info and rehabilitation entries
 */
export async function getRehabilitationEntriesByPatient(fastify, upid, tenant_id) {
    const { prisma } = fastify;

    // Ensure tenant_id is BigInt
    const tenantIdBigInt = typeof tenant_id === 'bigint' ? tenant_id : BigInt(tenant_id);

    // Find patient by UPID
    const patient = await prisma.patients.findFirst({
        where: {
            tenant_id: tenantIdBigInt,
            upid: upid
        },
        select: {
            patient_id: true,
            upid: true,
            first_name: true,
            last_name: true,
            date_of_birth: true,
            gender: true,
            mobile_primary: true,
            tenant_id: true
        }
    });

    if (!patient) {
        throw new Error('Patient not found');
    }

    // Get all rehabilitation entries for this patient
    const entries = await prisma.rehabilitation_entries.findMany({
        where: {
            tenant_id: tenantIdBigInt,
            patient_id: patient.patient_id
        },
        include: {
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
            },
            opd_visits: {
                select: {
                    visit_number: true,
                    visit_date: true
                }
            }
        },
        orderBy: {
            assessment_date: 'desc'
        }
    });

    return {
        patient: {
            patient_id: patient.patient_id.toString(),
            upid: patient.upid,
            name: `${patient.first_name} ${patient.last_name || ''}`.trim(),
            date_of_birth: patient.date_of_birth,
            gender: patient.gender,
            mobile: patient.mobile_primary
        },
        entries: entries.map(entry => ({
            entry_id: entry.entry_id.toString(),
            assessment_date: entry.assessment_date,
            diagnosis: entry.diagnosis,
            baseline_status: entry.baseline_status,
            impairments: entry.impairments,
            goal_description: entry.goal_description,
            goal_type: entry.goal_type,
            target_date: entry.target_date,
            review_date: entry.review_date,
            review_outcome: entry.review_outcome,
            device_type: entry.device_type,
            side_region: entry.side_region,
            fitting_details: entry.fitting_details,
            prescribed_date: entry.prescribed_date,
            hep_date_given: entry.hep_date_given,
            hep_frequency: entry.hep_frequency,
            hep_exercise_list: entry.hep_exercise_list,
            session_type: entry.session_type,
            therapy_type: entry.therapy_type,
            duration_minutes: entry.duration_minutes,
            intensity: entry.intensity,
            interventions: entry.interventions,
            patient_response: entry.patient_response,
            therapist_signature: entry.therapist_signature,
            medicine: entry.medicine,
            status: entry.status,
            next_checkup: entry.next_checkup,
            therapist: entry.users ? {
                name: entry.users.staff_profiles 
                    ? `${entry.users.staff_profiles.first_name} ${entry.users.staff_profiles.last_name}`
                    : entry.users.username
            } : null,
            visit_number: entry.opd_visits?.visit_number || null,
            created_at: entry.created_at,
            updated_at: entry.updated_at
        })),
        total_entries: entries.length
    };
}
