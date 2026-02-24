/**
 * Patient Details Service
 * Handles business logic for retrieving patient rehabilitation details organized by sections
 */

/**
 * Get all rehabilitation entries for a patient, separated by sections
 * @param {Object} fastify - Fastify instance
 * @param {string} upid - Unique Patient ID
 * @returns {Promise<Object>} Entries organized by sections
 */
export async function getRehabilitationEntriesBySection(fastify, upid) {
    const { prisma } = fastify;

    // Verify patient exists
    const patient = await prisma.patients.findUnique({
        where: { upid: upid },
        select: {
            patient_id: true,
            upid: true,
            first_name: true,
            last_name: true
        }
    });

    if (!patient) {
        throw new Error('Patient not found');
    }

    // Fetch all rehabilitation entries
    const entries = await prisma.rehabilitation_entries.findMany({
        where: {
            patient_id: patient.patient_id
        },
        include: {
            users: {
                select: {
                    user_id: true,
                    username: true,
                    email: true,
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

    // Organize entries by sections
    const therapySessions = entries
        .filter(e => e.session_type || e.duration_minutes || e.interventions)
        .map(e => ({
            entry_id: e.entry_id.toString(),
            assessment_date: e.assessment_date,
            session_type: e.session_type,
            duration_minutes: e.duration_minutes,
            intensity: e.intensity,
            interventions: e.interventions,
            patient_response: e.patient_response,
            therapist_signature: e.therapist_signature,
            therapist: e.users ? {
                name: e.users.staff_profiles 
                    ? `${e.users.staff_profiles.first_name} ${e.users.staff_profiles.last_name}`
                    : e.users.username
            } : null,
            visit_number: e.opd_visits?.visit_number || null,
            created_at: e.created_at
        }));

    const homeExerciseProgram = entries
        .filter(e => e.hep_date_given || e.hep_frequency || e.hep_exercise_list)
        .map(e => ({
            entry_id: e.entry_id.toString(),
            assessment_date: e.assessment_date,
            date_given: e.hep_date_given,
            frequency: e.hep_frequency,
            exercise_list: e.hep_exercise_list,
            therapist: e.users ? {
                name: e.users.staff_profiles 
                    ? `${e.users.staff_profiles.first_name} ${e.users.staff_profiles.last_name}`
                    : e.users.username
            } : null,
            visit_number: e.opd_visits?.visit_number || null,
            created_at: e.created_at
        }));

    const patientGoals = entries
        .filter(e => e.goal_description || e.goal_type)
        .map(e => ({
            entry_id: e.entry_id.toString(),
            assessment_date: e.assessment_date,
            goal_description: e.goal_description,
            goal_type: e.goal_type,
            target_date: e.target_date,
            review_date: e.review_date,
            review_outcome: e.review_outcome,
            therapist: e.users ? {
                name: e.users.staff_profiles 
                    ? `${e.users.staff_profiles.first_name} ${e.users.staff_profiles.last_name}`
                    : e.users.username
            } : null,
            visit_number: e.opd_visits?.visit_number || null,
            created_at: e.created_at
        }));

    const devices = entries
        .filter(e => e.device_type || e.side_region || e.fitting_details)
        .map(e => ({
            entry_id: e.entry_id.toString(),
            assessment_date: e.assessment_date,
            device_type: e.device_type,
            side_region: e.side_region,
            fitting_details: e.fitting_details,
            therapist: e.users ? {
                name: e.users.staff_profiles 
                    ? `${e.users.staff_profiles.first_name} ${e.users.staff_profiles.last_name}`
                    : e.users.username
            } : null,
            visit_number: e.opd_visits?.visit_number || null,
            created_at: e.created_at
        }));

    return {
        patient: {
            patient_id: patient.patient_id.toString(),
            upid: patient.upid,
            name: `${patient.first_name} ${patient.last_name || ''}`.trim()
        },
        sections: {
            therapy_sessions: therapySessions,
            home_exercise_program: homeExerciseProgram,
            patient_goals: patientGoals,
            devices: devices
        },
        total_entries: entries.length
    };
}

/**
 * Get all patients with rehabilitation entries, separated by sections
 * @param {Object} fastify - Fastify instance
 * @returns {Promise<Object>} Array of patients with their rehabilitation entries organized by sections
 */
export async function getAllPatientsWithRehabEntries(fastify) {
    const { prisma } = fastify;

    // Fetch all rehabilitation entries with patient and user details
    const entries = await prisma.rehabilitation_entries.findMany({
        include: {
            patients: {
                select: {
                    patient_id: true,
                    upid: true,
                    first_name: true,
                    middle_name: true,
                    last_name: true,
                    date_of_birth: true,
                    gender: true,
                    mobile_primary: true
                }
            },
            users: {
                select: {
                    user_id: true,
                    username: true,
                    email: true,
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

    // Group entries by patient
    const patientMap = new Map();

    entries.forEach(entry => {
        const patientId = entry.patient_id.toString();
        
        if (!patientMap.has(patientId)) {
            patientMap.set(patientId, {
                patient: {
                    patient_id: entry.patients.patient_id.toString(),
                    upid: entry.patients.upid,
                    name: `${entry.patients.first_name} ${entry.patients.middle_name || ''} ${entry.patients.last_name || ''}`.replace(/\s+/g, ' ').trim(),
                    date_of_birth: entry.patients.date_of_birth,
                    gender: entry.patients.gender,
                    mobile: entry.patients.mobile_primary
                },
                sections: {
                    therapy_sessions: [],
                    home_exercise_program: [],
                    patient_goals: [],
                    devices: []
                },
                total_entries: 0,
                latest_assessment_date: entry.assessment_date
            });
        }

        const patientData = patientMap.get(patientId);
        patientData.total_entries++;

        // Helper to format therapist info
        const getTherapistInfo = () => {
            if (!entry.users) return null;
            return {
                name: entry.users.staff_profiles 
                    ? `${entry.users.staff_profiles.first_name} ${entry.users.staff_profiles.last_name}`
                    : entry.users.username
            };
        };

        // Add to Therapy Sessions
        if (entry.session_type || entry.duration_minutes || entry.interventions) {
            patientData.sections.therapy_sessions.push({
                entry_id: entry.entry_id.toString(),
                assessment_date: entry.assessment_date,
                session_type: entry.session_type,
                duration_minutes: entry.duration_minutes,
                intensity: entry.intensity,
                interventions: entry.interventions,
                patient_response: entry.patient_response,
                therapist_signature: entry.therapist_signature,
                therapist: getTherapistInfo(),
                visit_number: entry.opd_visits?.visit_number || null,
                created_at: entry.created_at
            });
        }

        // Add to Home Exercise Program
        if (entry.hep_date_given || entry.hep_frequency || entry.hep_exercise_list) {
            patientData.sections.home_exercise_program.push({
                entry_id: entry.entry_id.toString(),
                assessment_date: entry.assessment_date,
                date_given: entry.hep_date_given,
                frequency: entry.hep_frequency,
                exercise_list: entry.hep_exercise_list,
                therapist: getTherapistInfo(),
                visit_number: entry.opd_visits?.visit_number || null,
                created_at: entry.created_at
            });
        }

        // Add to Patient Goals
        if (entry.goal_description || entry.goal_type) {
            patientData.sections.patient_goals.push({
                entry_id: entry.entry_id.toString(),
                assessment_date: entry.assessment_date,
                goal_description: entry.goal_description,
                goal_type: entry.goal_type,
                target_date: entry.target_date,
                review_date: entry.review_date,
                review_outcome: entry.review_outcome,
                therapist: getTherapistInfo(),
                visit_number: entry.opd_visits?.visit_number || null,
                created_at: entry.created_at
            });
        }

        // Add to Devices
        if (entry.device_type || entry.side_region || entry.fitting_details) {
            patientData.sections.devices.push({
                entry_id: entry.entry_id.toString(),
                assessment_date: entry.assessment_date,
                device_type: entry.device_type,
                side_region: entry.side_region,
                fitting_details: entry.fitting_details,
                therapist: getTherapistInfo(),
                visit_number: entry.opd_visits?.visit_number || null,
                created_at: entry.created_at
            });
        }
    });

    // Convert map to array and sort by latest assessment date
    const patients = Array.from(patientMap.values()).sort((a, b) => 
        new Date(b.latest_assessment_date) - new Date(a.latest_assessment_date)
    );

    return {
        total_patients: patients.length,
        patients: patients
    };
}
