/**
 * Progress Report Service
 * 
 * Purpose:
 * - Retrieve all patients with rehabilitation entries
 * - Generate progress reports for individual patients
 * - Track rehabilitation progress metrics
 */

/**
 * Get all patients with rehabilitation entries
 * @param {Object} fastify - Fastify instance
 * @param {Object} user - Authenticated user from JWT token
 * @returns {Promise<Object>} All patients with basic rehabilitation info
 */
export async function getAllPatientsWithRehabEntries(fastify, user) {
    const { prisma } = fastify;
    
    const entries = await prisma.rehabilitation_entries.findMany({
        where: {
            tenant_id: BigInt(user.tenant_id)
        },
        distinct: ['patient_id'],
        include: {
            patients: {
                select: {
                    patient_id: true,
                    upid: true,
                    first_name: true,
                    last_name: true,
                    date_of_birth: true,
                    gender: true,
                    mobile_primary: true
                }
            }
        },
        orderBy: {
            created_at: 'desc'
        }
    });

    // Get unique patients with entry count
    const patientMap = new Map();
    
    for (const entry of entries) {
        const patientId = entry.patient_id.toString();
        if (!patientMap.has(patientId)) {
            // Count total entries for this patient
            const entryCount = await prisma.rehabilitation_entries.count({
                where: {
                    tenant_id: BigInt(user.tenant_id),
                    patient_id: entry.patient_id
                }
            });

            // Get latest entry date
            const latestEntry = await prisma.rehabilitation_entries.findFirst({
                where: {
                    tenant_id: BigInt(user.tenant_id),
                    patient_id: entry.patient_id
                },
                orderBy: {
                    created_at: 'desc'
                },
                select: {
                    created_at: true,
                    status: true
                }
            });

            patientMap.set(patientId, {
                patient_id: patientId,
                upid: entry.patients.upid,
                name: `${entry.patients.first_name} ${entry.patients.last_name}`,
                first_name: entry.patients.first_name,
                last_name: entry.patients.last_name,
                date_of_birth: entry.patients.date_of_birth,
                gender: entry.patients.gender,
                mobile_primary: entry.patients.mobile_primary,
                total_entries: entryCount,
                latest_entry_date: latestEntry?.created_at,
                current_status: latestEntry?.status
            });
        }
    }

    const patients = Array.from(patientMap.values());

    return {
        total_patients: patients.length,
        patients: patients
    };
}

/**
 * Get detailed progress report for a specific patient
 * @param {Object} fastify - Fastify instance
 * @param {string} patientId - Patient UPID
 * @param {Object} user - Authenticated user from JWT token
 * @returns {Promise<Object>} Detailed progress report
 */
export async function getPatientProgressReport(fastify, patientId, user) {
    const { prisma } = fastify;

    // Find patient by UPID
    const patient = await prisma.patients.findFirst({
        where: {
            upid: patientId,
            tenant_id: BigInt(user.tenant_id)
        }
    });

    if (!patient) {
        return null;
    }

    // Get all rehabilitation entries for this patient
    const entries = await prisma.rehabilitation_entries.findMany({
        where: {
            patient_id: patient.patient_id,
            tenant_id: BigInt(user.tenant_id)
        },
        include: {
            users: {
                select: {
                    username: true,
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true,
                            specialization: true
                        }
                    }
                }
            },
            opd_visits: {
                select: {
                    visit_number: true,
                    visit_date: true,
                    visit_type: true
                }
            }
        },
        orderBy: {
            created_at: 'asc'
        }
    });

    // Calculate progress metrics
    const totalSessions = entries.filter(e => e.session_type).length;
    const completedGoals = entries.filter(e => e.status === 'Completed').length;
    const activeGoals = entries.filter(e => e.status === 'In Progress').length;
    const devicesIssued = entries.filter(e => e.device_type).length;
    const hepPlans = entries.filter(e => e.hep_exercise_list).length;

    // Group by therapy type
    const therapyBreakdown = {};
    entries.forEach(entry => {
        if (entry.therapy_type) {
            therapyBreakdown[entry.therapy_type] = (therapyBreakdown[entry.therapy_type] || 0) + 1;
        }
    });

    // Format entries
    const formattedEntries = entries.map(entry => ({
        entry_id: entry.entry_id.toString(),
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        status: entry.status,
        
        // Assessment
        assessment: entry.assessment_date || entry.diagnosis || entry.baseline_status ? {
            date: entry.assessment_date,
            diagnosis: entry.diagnosis,
            baseline_status: entry.baseline_status,
            impairments: entry.impairments,
            referring_doctor: entry.referring_doctor
        } : null,

        // Goals
        goal: entry.goal_description ? {
            description: entry.goal_description,
            type: entry.goal_type,
            target_date: entry.target_date,
            review_date: entry.review_date,
            review_outcome: entry.review_outcome
        } : null,

        // Session
        session: entry.session_type ? {
            type: entry.session_type,
            therapy_type: entry.therapy_type,
            duration: entry.duration_minutes,
            intensity: entry.intensity,
            interventions: entry.interventions,
            response: entry.patient_response,
            signature: entry.therapist_signature
        } : null,

        // Device
        device: entry.device_type ? {
            type: entry.device_type,
            side: entry.side_region,
            fitting_details: entry.fitting_details,
            prescribed_date: entry.prescribed_date
        } : null,

        // HEP
        hep: entry.hep_exercise_list ? {
            date_given: entry.hep_date_given,
            frequency: entry.hep_frequency,
            exercises: entry.hep_exercise_list
        } : null,

        // Therapist
        therapist: entry.users?.staff_profiles ? {
            name: `${entry.users.staff_profiles.first_name} ${entry.users.staff_profiles.last_name}`,
            specialization: entry.users.staff_profiles.specialization
        } : null,

        // Visit
        visit: entry.opd_visits ? {
            visit_number: entry.opd_visits.visit_number,
            visit_date: entry.opd_visits.visit_date,
            visit_type: entry.opd_visits.visit_type
        } : null,

        next_checkup: entry.next_checkup,
        medicine: entry.medicine
    }));

    return {
        patient: {
            upid: patient.upid,
            name: `${patient.first_name} ${patient.last_name}`,
            first_name: patient.first_name,
            last_name: patient.last_name,
            date_of_birth: patient.date_of_birth,
            gender: patient.gender,
            mobile_primary: patient.mobile_primary
        },
        progress_summary: {
            total_entries: entries.length,
            total_sessions: totalSessions,
            completed_goals: completedGoals,
            active_goals: activeGoals,
            devices_issued: devicesIssued,
            hep_plans: hepPlans,
            therapy_breakdown: therapyBreakdown,
            first_visit: entries[0]?.created_at,
            latest_visit: entries[entries.length - 1]?.created_at
        },
        entries: formattedEntries
    };
}

/**
 * Update progress report for a rehabilitation entry
 * @param {Object} fastify - Fastify instance
 * @param {string} entryId - Entry ID to update
 * @param {Object} updateData - Data to update
 * @param {Object} user - Authenticated user from JWT token
 * @returns {Promise<Object>} Updated entry
 */
export async function updateProgressReport(fastify, entryId, updateData, user) {
    const { prisma } = fastify;

    // First check if entry exists and belongs to tenant
    const existingEntry = await prisma.rehabilitation_entries.findFirst({
        where: {
            entry_id: BigInt(entryId),
            tenant_id: BigInt(user.tenant_id)
        }
    });

    if (!existingEntry) {
        return null;
    }

    // Prepare update object
    const updatePayload = {
        updated_at: new Date()
    };

    // Map current_session to session_type (formatted as "Session #{value}")
    if (updateData.current_session !== undefined) {
        updatePayload.session_type = `Session #${updateData.current_session}`;
        updatePayload.session_number = parseInt(updateData.current_session);
    }

    // Map goal_scores to patient_response (JSON stringified) and progress_scores
    if (updateData.goal_scores) {
        updatePayload.patient_response = JSON.stringify(updateData.goal_scores);
        updatePayload.progress_scores = updateData.goal_scores;
        
        // Calculate overall_score as average of all goal scores
        const scores = Object.values(updateData.goal_scores);
        if (scores.length > 0) {
            const sum = scores.reduce((acc, score) => acc + score, 0);
            updatePayload.overall_score = Math.round(sum / scores.length);
        }
    }

    // Auto-calculate status based on overall_score if not provided
    if (updateData.calculated_status) {
        updatePayload.status = updateData.calculated_status;
    } else if (updatePayload.overall_score !== undefined) {
        // Auto-calculate based on average score
        if (updatePayload.overall_score >= 70) {
            updatePayload.status = 'Improving';
        } else if (updatePayload.overall_score >= 50) {
            updatePayload.status = 'Stable';
        } else {
            updatePayload.status = 'Needs Attention';
        }
    }

    // Update next_checkup_date if provided
    if (updateData.next_checkup_date) {
        updatePayload.next_checkup = new Date(updateData.next_checkup_date);
    }

    // Perform the update
    const updatedEntry = await prisma.rehabilitation_entries.update({
        where: {
            entry_id: BigInt(entryId)
        },
        data: updatePayload,
        include: {
            patients: {
                select: {
                    upid: true,
                    first_name: true,
                    last_name: true,
                    date_of_birth: true,
                    gender: true
                }
            },
            users: {
                select: {
                    user_id: true,
                    username: true,
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true,
                            specialization: true
                        }
                    }
                }
            }
        }
    });

    // Format response
    return {
        entry_id: updatedEntry.entry_id.toString(),
        patient: {
            upid: updatedEntry.patients.upid,
            name: `${updatedEntry.patients.first_name} ${updatedEntry.patients.last_name}`
        },
        session_number: updatedEntry.session_number,
        session_type: updatedEntry.session_type,
        progress_scores: updatedEntry.progress_scores,
        overall_score: updatedEntry.overall_score,
        status: updatedEntry.status,
        next_checkup: updatedEntry.next_checkup,
        updated_at: updatedEntry.updated_at,
        therapist: updatedEntry.users?.staff_profiles ? {
            name: `${updatedEntry.users.staff_profiles.first_name} ${updatedEntry.users.staff_profiles.last_name}`,
            specialization: updatedEntry.users.staff_profiles.specialization
        } : null
    };
}
