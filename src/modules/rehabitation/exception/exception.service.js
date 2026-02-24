/**
 * Exception Reports Service
 * Handles business logic for generating exception reports for rehabilitation management
 */

// Fix for BigInt serialization
BigInt.prototype.toJSON = function () {
    return this.toString();
};

/**
 * Get resolved exceptions from audit logs
 * @param {Object} prisma - Prisma instance
 * @param {BigInt} tenant_id - Tenant ID
 * @returns {Promise<Set>} Set of resolved exception IDs
 */
async function getResolvedExceptions(prisma, tenant_id) {
    const resolved = await prisma.audit_logs.findMany({
        where: {
            tenant_id: tenant_id,
            table_name: 'exception_reports',
            action: 'RESOLVE_EXCEPTION'
        },
        select: {
            new_values: true
        }
    });

    // Extract exception IDs that have been marked as resolved
    const resolvedIds = new Set();
    for (const log of resolved) {
        if (log.new_values && log.new_values.exception_id && log.new_values.action_taken === true) {
            resolvedIds.add(log.new_values.exception_id);
        }
    }

    return resolvedIds;
}

/**
 * Get exception reports based on filters
 * @param {Object} fastify - Fastify instance
 * @param {Object} filters - Filter parameters
 * @param {Object} user - Authenticated user
 * @returns {Promise<Object>} Exception reports with summary and pagination
 */
export async function getExceptionReports(fastify, filters, user) {
    const { prisma } = fastify;

    const tenant_id = user.tenant_id;

    // Get resolved exceptions
    const resolvedExceptionIds = await getResolvedExceptions(prisma, tenant_id);

    let exceptions = [];
    
    // Gather all exception types
    const missedSessions = await getMissedSessionsExceptions(prisma, tenant_id, resolvedExceptionIds);
    exceptions.push(...missedSessions);
    
    const noProgress = await getNoProgressExceptions(prisma, tenant_id, resolvedExceptionIds);
    exceptions.push(...noProgress);
    
    const goalsOverdue = await getGoalsOverdueExceptions(prisma, tenant_id, resolvedExceptionIds);
    exceptions.push(...goalsOverdue);
    
    const hepNotGiven = await getHEPNotGivenExceptions(prisma, tenant_id, resolvedExceptionIds);
    exceptions.push(...hepNotGiven);
    
    const patientNotSeen = await getPatientNotSeenExceptions(prisma, tenant_id, resolvedExceptionIds);
    exceptions.push(...patientNotSeen);

    // Calculate summary
    const summary = {
        total: exceptions.length,
        critical: exceptions.filter(e => e.severity === 'Critical').length,
        high: exceptions.filter(e => e.severity === 'High').length,
        medium: exceptions.filter(e => e.severity === 'Medium').length,
        low: exceptions.filter(e => e.severity === 'Low').length
    };

    return {
        summary,
        data: exceptions
    };
}

/**
 * Get missed sessions exceptions
 * Logic: Appointments with 'no_show' or 'cancelled' status in last 30 days, count > 2
 */
async function getMissedSessionsExceptions(prisma, tenant_id, resolvedIds = new Set()) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const missedAppointments = await prisma.$queryRaw`
        SELECT 
            p.patient_id,
            p.upid,
            p.first_name || ' ' || COALESCE(p.last_name, '') as patient_name,
            COUNT(*) as missed_count,
            MAX(a.appointment_date) as last_missed_date,
            u.user_id as therapist_id,
            sp.first_name || ' ' || COALESCE(sp.last_name, '') as therapist_name
        FROM appointments a
        JOIN patients p ON a.patient_id = p.patient_id
        LEFT JOIN users u ON a.therapist_id = u.user_id OR a.doctor_id = u.user_id
        LEFT JOIN staff_profiles sp ON u.user_id = sp.user_id
        WHERE a.tenant_id = ${tenant_id}
        AND a.appointment_date >= ${thirtyDaysAgo}
        AND (a.status = 'no_show' OR a.status = 'cancelled')
        GROUP BY p.patient_id, p.upid, p.first_name, p.last_name, u.user_id, sp.first_name, sp.last_name
        HAVING COUNT(*) > 2
        ORDER BY COUNT(*) DESC
    `;

    return missedAppointments.map((record, index) => {
        const exceptionId = `EXP-MS-${record.patient_id}`;
        return {
            id: exceptionId,
            patientName: record.patient_name,
            patientId: record.upid,
            exceptionType: 'Missed Sessions',
            severity: record.missed_count >= 5 ? 'Critical' : record.missed_count >= 3 ? 'High' : 'Medium',
            dateFlagged: record.last_missed_date.toISOString().split('T')[0],
            therapistName: record.therapist_name || 'Not Assigned',
            therapistId: record.therapist_id ? `TH-${record.therapist_id}` : null,
            notes: `Patient missed ${record.missed_count} sessions in the last 30 days.`,
            actionTaken: resolvedIds.has(exceptionId),
            status: resolvedIds.has(exceptionId) ? 'Resolved' : 'Pending',
            avatar: `/avatars/${(index % 10) + 1}.png`
        };
    });
}

/**
 * Get no progress exceptions
 * Logic: Compare progress_score of last 5 sessions, variance < 5% or negative trend
 */
async function getNoProgressExceptions(prisma, tenant_id, resolvedIds = new Set()) {
    const noProgressRecords = await prisma.$queryRaw`
        WITH patient_sessions AS (
            SELECT 
                patient_id,
                overall_score,
                assessment_date,
                ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY assessment_date DESC) as rn
            FROM rehabilitation_entries
            WHERE tenant_id = ${tenant_id}
            AND overall_score IS NOT NULL
            AND overall_score > 0
        ),
        progress_stats AS (
            SELECT 
                patient_id,
                MAX(overall_score) as max_score,
                MIN(overall_score) as min_score,
                AVG(overall_score) as avg_score,
                COUNT(*) as session_count
            FROM patient_sessions
            WHERE rn <= 5
            GROUP BY patient_id
            HAVING COUNT(*) >= 3
        )
        SELECT 
            ps.patient_id,
            p.upid,
            p.first_name || ' ' || COALESCE(p.last_name, '') as patient_name,
            ps.max_score,
            ps.min_score,
            ps.avg_score,
            ps.session_count,
            re.assessment_date as last_session_date,
            u.user_id as therapist_id,
            sp.first_name || ' ' || COALESCE(sp.last_name, '') as therapist_name
        FROM progress_stats ps
        JOIN patients p ON ps.patient_id = p.patient_id
        JOIN rehabilitation_entries re ON ps.patient_id = re.patient_id
        LEFT JOIN users u ON re.therapist_id = u.user_id
        LEFT JOIN staff_profiles sp ON u.user_id = sp.user_id
        WHERE p.tenant_id = ${tenant_id}
        AND re.entry_id = (
            SELECT entry_id 
            FROM rehabilitation_entries 
            WHERE patient_id = ps.patient_id 
            ORDER BY assessment_date DESC 
            LIMIT 1
        )
        AND (
            (ps.max_score - ps.min_score) < (ps.avg_score * 0.05)
            OR ps.max_score < ps.min_score
        )
        ORDER BY ps.session_count DESC
    `;

    return noProgressRecords.map((record, index) => {
        const exceptionId = `EXP-NP-${record.patient_id}`;
        return {
            id: exceptionId,
            patientName: record.patient_name,
            patientId: record.upid,
            exceptionType: 'No Progress',
            severity: record.session_count >= 5 ? 'High' : 'Medium',
            dateFlagged: record.last_session_date.toISOString().split('T')[0],
            therapistName: record.therapist_name || 'Not Assigned',
            therapistId: record.therapist_id ? `TH-${record.therapist_id}` : null,
            notes: `No significant progress observed over ${record.session_count} sessions. Score variance: ${(record.max_score - record.min_score).toFixed(1)}`,
            actionTaken: resolvedIds.has(exceptionId),
            status: resolvedIds.has(exceptionId) ? 'Resolved' : 'Pending',
            avatar: `/avatars/${(index % 10) + 1}.png`
        };
    });
}

/**
 * Get goals overdue exceptions
 * Logic: Goals with target_date < today and status != 'Completed'
 */
async function getGoalsOverdueExceptions(prisma, tenant_id, resolvedIds = new Set()) {
    const today = new Date();

    const overdueGoals = await prisma.$queryRaw`
        SELECT 
            p.patient_id,
            p.upid,
            p.first_name || ' ' || COALESCE(p.last_name, '') as patient_name,
            re.goal_description,
            re.goal_type,
            re.target_date,
            re.assessment_date,
            u.user_id as therapist_id,
            sp.first_name || ' ' || COALESCE(sp.last_name, '') as therapist_name,
            (CURRENT_DATE - re.target_date) as days_overdue
        FROM rehabilitation_entries re
        JOIN patients p ON re.patient_id = p.patient_id
        LEFT JOIN users u ON re.therapist_id = u.user_id
        LEFT JOIN staff_profiles sp ON u.user_id = sp.user_id
        WHERE re.tenant_id = ${tenant_id}
        AND re.target_date < ${today}
        AND (re.status IS NULL OR re.status != 'Completed')
        AND re.goal_description IS NOT NULL
        ORDER BY (CURRENT_DATE - re.target_date) DESC
    `;

    return overdueGoals.map((record, index) => {
        const exceptionId = `EXP-GO-${record.patient_id}-${index}`;
        return {
            id: exceptionId,
            patientName: record.patient_name,
            patientId: record.upid,
            exceptionType: 'Goals Overdue',
            severity: record.days_overdue >= 30 ? 'Critical' : record.days_overdue >= 14 ? 'High' : 'Medium',
            dateFlagged: record.target_date.toISOString().split('T')[0],
            therapistName: record.therapist_name || 'Not Assigned',
            therapistId: record.therapist_id ? `TH-${record.therapist_id}` : null,
            notes: `Goal "${record.goal_description}" is ${record.days_overdue} days overdue. Type: ${record.goal_type || 'Not specified'}`,
            actionTaken: resolvedIds.has(exceptionId),
            status: resolvedIds.has(exceptionId) ? 'Resolved' : 'Pending',
            avatar: `/avatars/${(index % 10) + 1}.png`
        };
    });
}

/**
 * Get HEP not given exceptions
 * Logic: Recent sessions without HEP assignments
 */
async function getHEPNotGivenExceptions(prisma, tenant_id, resolvedIds = new Set()) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const hepNotGiven = await prisma.$queryRaw`
        SELECT 
            p.patient_id,
            p.upid,
            p.first_name || ' ' || COALESCE(p.last_name, '') as patient_name,
            re.assessment_date,
            re.session_type,
            u.user_id as therapist_id,
            sp.first_name || ' ' || COALESCE(sp.last_name, '') as therapist_name,
            COUNT(*) OVER (PARTITION BY p.patient_id) as sessions_without_hep
        FROM rehabilitation_entries re
        JOIN patients p ON re.patient_id = p.patient_id
        LEFT JOIN users u ON re.therapist_id = u.user_id
        LEFT JOIN staff_profiles sp ON u.user_id = sp.user_id
        WHERE re.tenant_id = ${tenant_id}
        AND re.assessment_date >= ${thirtyDaysAgo}
        AND (re.hep_date_given IS NULL OR re.hep_exercise_list IS NULL)
        ORDER BY re.assessment_date DESC
    `;

    return hepNotGiven.map((record, index) => {
        const exceptionId = `EXP-HEP-${record.patient_id}-${index}`;
        return {
            id: exceptionId,
            patientName: record.patient_name,
            patientId: record.upid,
            exceptionType: 'HEP Not Given',
            severity: record.sessions_without_hep >= 3 ? 'High' : record.sessions_without_hep >= 2 ? 'Medium' : 'Low',
            dateFlagged: record.assessment_date.toISOString().split('T')[0],
            therapistName: record.therapist_name || 'Not Assigned',
            therapistId: record.therapist_id ? `TH-${record.therapist_id}` : null,
            notes: `Home Exercise Program not provided for session on ${record.assessment_date.toISOString().split('T')[0]}`,
            actionTaken: resolvedIds.has(exceptionId),
            status: resolvedIds.has(exceptionId) ? 'Resolved' : 'Pending',
            avatar: `/avatars/${(index % 10) + 1}.png`
        };
    });
}

/**
 * Get patient not seen exceptions
 * Logic: Patients registered > 1 month ago with no recent visit (> 30 days)
 */
async function getPatientNotSeenExceptions(prisma, tenant_id, resolvedIds = new Set()) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const patientNotSeen = await prisma.$queryRaw`
        WITH latest_activities AS (
            SELECT 
                patient_id,
                MAX(assessment_date) as last_rehab_date
            FROM rehabilitation_entries
            WHERE tenant_id = ${tenant_id}
            GROUP BY patient_id
        ),
        latest_appointments AS (
            SELECT 
                patient_id,
                MAX(appointment_date) as last_appointment_date
            FROM appointments
            WHERE tenant_id = ${tenant_id}
            AND status IN ('completed', 'checked_in')
            GROUP BY patient_id
        )
        SELECT 
            p.patient_id,
            p.upid,
            p.first_name || ' ' || COALESCE(p.last_name, '') as patient_name,
            p.created_at as registration_date,
            COALESCE(la.last_rehab_date, lap.last_appointment_date) as last_visit_date,
            (CURRENT_DATE - COALESCE(la.last_rehab_date, lap.last_appointment_date, p.created_at)::date) as days_since_visit
        FROM patients p
        LEFT JOIN latest_activities la ON p.patient_id = la.patient_id
        LEFT JOIN latest_appointments lap ON p.patient_id = lap.patient_id
        WHERE p.tenant_id = ${tenant_id}
        AND p.created_at < ${oneMonthAgo}
        AND (
            (la.last_rehab_date IS NULL AND lap.last_appointment_date IS NULL)
            OR (COALESCE(la.last_rehab_date, lap.last_appointment_date) < ${thirtyDaysAgo})
        )
        ORDER BY days_since_visit DESC
    `;

    return patientNotSeen.map((record, index) => {
        const exceptionId = `EXP-PNS-${record.patient_id}`;
        return {
            id: exceptionId,
            patientName: record.patient_name,
            patientId: record.upid,
            exceptionType: 'Patient Not Seen',
            severity: record.days_since_visit >= 90 ? 'Critical' : record.days_since_visit >= 60 ? 'High' : 'Medium',
            dateFlagged: record.last_visit_date ? record.last_visit_date.toISOString().split('T')[0] : record.registration_date.toISOString().split('T')[0],
            therapistName: 'Not Assigned',
            therapistId: null,
            notes: record.last_visit_date 
                ? `Patient not seen for ${record.days_since_visit} days since last visit.`
                : `Patient registered ${record.days_since_visit} days ago but never seen.`,
            actionTaken: resolvedIds.has(exceptionId),
            status: resolvedIds.has(exceptionId) ? 'Resolved' : 'Pending',
            avatar: `/avatars/${(index % 10) + 1}.png`
        };
    });
}

/**
 * Get dashboard statistics
 * @param {Object} fastify - Fastify instance
 * @param {Object} user - Authenticated user
 * @returns {Promise<Object>} Statistics summary
 */
export async function getDashboardStats(fastify, user) {
    const { prisma } = fastify;
    const tenant_id = user.tenant_id;

    const missedSessions = await getMissedSessionsExceptions(prisma, tenant_id);
    const noProgress = await getNoProgressExceptions(prisma, tenant_id);
    const goalsOverdue = await getGoalsOverdueExceptions(prisma, tenant_id);
    const hepNotGiven = await getHEPNotGivenExceptions(prisma, tenant_id);
    const patientNotSeen = await getPatientNotSeenExceptions(prisma, tenant_id);

    const totalExceptions = 
        missedSessions.length + 
        noProgress.length + 
        goalsOverdue.length + 
        hepNotGiven.length + 
        patientNotSeen.length;

    const breakdown = [
        {
            title: 'Missed Sessions',
            count: missedSessions.length,
            severity: missedSessions.some(e => e.severity === 'Critical') ? 'critical' : 
                     missedSessions.some(e => e.severity === 'High') ? 'high' : 'medium'
        },
        {
            title: 'No Progress',
            count: noProgress.length,
            severity: noProgress.some(e => e.severity === 'High') ? 'high' : 'medium'
        },
        {
            title: 'Goals Overdue',
            count: goalsOverdue.length,
            severity: goalsOverdue.some(e => e.severity === 'Critical') ? 'critical' :
                     goalsOverdue.some(e => e.severity === 'High') ? 'high' : 'medium'
        },
        {
            title: 'HEP Not Given',
            count: hepNotGiven.length,
            severity: hepNotGiven.some(e => e.severity === 'High') ? 'high' : 'low'
        },
        {
            title: 'Patient Not Seen',
            count: patientNotSeen.length,
            severity: patientNotSeen.some(e => e.severity === 'Critical') ? 'critical' :
                     patientNotSeen.some(e => e.severity === 'High') ? 'high' : 'medium'
        }
    ];

    return {
        totalExceptions,
        breakdown
    };
}

/**
 * Mark exception as resolved
 * @param {Object} fastify - Fastify instance
 * @param {string} exceptionId - Exception ID
 * @param {Object} data - Resolution data
 * @param {Object} user - Authenticated user
 * @returns {Promise<Object>} Updated exception
 */
export async function resolveException(fastify, exceptionId, data, user) {
    const { prisma } = fastify;
    const { actionTaken, adminNotes } = data;

    // Parse exception ID to get type and patient info
    // Format: EXP-{TYPE}-{PATIENT_ID}[-{INDEX}]
    const parts = exceptionId.split('-');
    
    if (parts.length < 3) {
        throw new Error('Invalid exception ID format');
    }

    // For now, we'll store the resolution in audit logs
    // You can create a separate exception_resolutions table if needed
    const auditLog = await prisma.audit_logs.create({
        data: {
            tenant_id: user.tenant_id,
            table_name: 'exception_reports',
            record_id: BigInt(0), // Placeholder since we don't have a specific table
            action: 'RESOLVE_EXCEPTION',
            old_values: { exception_id: exceptionId, action_taken: false },
            new_values: { 
                exception_id: exceptionId, 
                action_taken: actionTaken,
                admin_notes: adminNotes,
                resolved_by: user.user_id,
                resolved_at: new Date()
            },
            user_id: user.user_id,
            created_at: new Date()
        }
    });

    return {
        id: exceptionId,
        actionTaken,
        adminNotes,
        resolvedBy: user.user_id,
        resolvedAt: new Date()
    };
}


