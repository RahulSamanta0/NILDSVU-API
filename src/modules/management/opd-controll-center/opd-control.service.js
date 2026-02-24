/**
 * OPD Control Center Service Layer
 *
 * Purpose: Business logic for OPD control center snapshot APIs
 */

function normalizeDate(dateValue) {
    if (!dateValue) {
        const now = new Date();
        const dateOnly = now.toISOString().slice(0, 10);
        return new Date(`${dateOnly}T00:00:00.000Z`);
    }

    return new Date(`${dateValue}T00:00:00.000Z`);
}

function minutesBetween(start, end) {
    if (!start || !end) return null;
    const diffMs = end.getTime() - start.getTime();
    return diffMs >= 0 ? diffMs / (1000 * 60) : null;
}

function average(values) {
    if (!values.length) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
}

function calculateAge(dob, referenceDate) {
    if (!dob) return null;
    const ref = new Date(referenceDate);
    let age = ref.getFullYear() - dob.getFullYear();
    const monthDiff = ref.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < dob.getDate())) {
        age -= 1;
    }
    return age;
}

function buildVisitWhereClause(tenantId, filters) {
    const date = normalizeDate(filters.date);
    const whereClause = {
        tenant_id: BigInt(tenantId),
        visit_date: date
    };

    if (filters.facility_id !== undefined) {
        whereClause.facility_id = filters.facility_id ? BigInt(filters.facility_id) : null;
    }

    if (filters.department_id !== undefined) {
        whereClause.department_id = filters.department_id ? Number(filters.department_id) : null;
    }

    if (filters.doctor_id !== undefined) {
        whereClause.doctor_id = filters.doctor_id ? BigInt(filters.doctor_id) : null;
    }

    return { whereClause, date };
}

function buildDutyWhereClause(tenantId, filters) {
    const date = normalizeDate(filters.date);
    const whereClause = {
        tenant_id: BigInt(tenantId),
        duty_date: date
    };

    if (filters.department_id !== undefined) {
        whereClause.department_id = filters.department_id ? Number(filters.department_id) : null;
    }

    return { whereClause, date };
}

function buildDoctorRoleFilter(tenantId) {
    return {
        staff_profiles: {
            users: {
                user_roles_user_roles_user_idTousers: {
                    some: {
                        tenant_id: BigInt(tenantId),
                        roles: {
                            role_code: {
                                equals: 'doctor',
                                mode: 'insensitive'
                            }
                        }
                    }
                }
            }
        }
    };
}

/**
 * Metrics snapshot
 */
export async function getMetrics(prisma, tenantId, filters = {}) {
    const { whereClause: visitWhere, date } = buildVisitWhereClause(tenantId, filters);
    const { whereClause: dutyWhere } = buildDutyWhereClause(tenantId, filters);

    const [totalRegistrations, totalDoctors, availableDoctors, waitSamples] = await Promise.all([
        prisma.opd_visits.count({ where: visitWhere }),
        prisma.duty_roster.count({ where: dutyWhere }),
        prisma.duty_roster.count({
            where: {
                ...dutyWhere,
                is_available: true
            }
        }),
        prisma.opd_visits.findMany({
            where: {
                ...visitWhere,
                checked_in_at: { not: null },
                consultation_start_at: { not: null }
            },
            select: {
                checked_in_at: true,
                consultation_start_at: true
            }
        })
    ]);

    const waitMinutes = waitSamples
        .map(sample => minutesBetween(sample.checked_in_at, sample.consultation_start_at))
        .filter(value => value !== null);

    return {
        date: date.toISOString().slice(0, 10),
        total_registrations: totalRegistrations,
        doctors_on_duty: availableDoctors,
        doctors_total: totalDoctors,
        avg_wait_minutes: Number(average(waitMinutes).toFixed(2))
    };
}

/**
 * Department grid snapshot
 */
export async function listDepartmentStatus(prisma, tenantId, filters = {}) {
    const { whereClause: visitWhere, date } = buildVisitWhereClause(tenantId, filters);
    const { whereClause: dutyWhere } = buildDutyWhereClause(tenantId, filters);

    const departments = await prisma.departments.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            is_active: true
        },
        select: {
            department_id: true,
            department_name: true,
            department_code: true,
            location: true
        },
        orderBy: {
            department_name: 'asc'
        }
    });

    const waitingCounts = await prisma.opd_visits.groupBy({
        by: ['department_id'],
        where: {
            ...visitWhere,
            status: 'waiting'
        },
        _count: { _all: true }
    });

    const visitsForAvg = await prisma.opd_visits.findMany({
        where: {
            ...visitWhere,
            checked_in_at: { not: null },
            consultation_start_at: { not: null }
        },
        select: {
            department_id: true,
            checked_in_at: true,
            consultation_start_at: true
        }
    });

    const activeDoctorCounts = await prisma.duty_roster.groupBy({
        by: ['department_id'],
        where: {
            ...dutyWhere,
            is_available: true
        },
        _count: { _all: true }
    });

    const totalDoctorCounts = await prisma.duty_roster.groupBy({
        by: ['department_id'],
        where: dutyWhere,
        _count: { _all: true }
    });

    const waitingMap = new Map(
        waitingCounts.map(item => [item.department_id, item._count._all])
    );

    const activeDoctorsMap = new Map(
        activeDoctorCounts.map(item => [item.department_id, item._count._all])
    );

    const totalDoctorsMap = new Map(
        totalDoctorCounts.map(item => [item.department_id, item._count._all])
    );

    const avgWaitMap = new Map();
    visitsForAvg.forEach(visit => {
        if (!visit.department_id) return;
        const minutes = minutesBetween(visit.checked_in_at, visit.consultation_start_at);
        if (minutes === null) return;

        const bucket = avgWaitMap.get(visit.department_id) || [];
        bucket.push(minutes);
        avgWaitMap.set(visit.department_id, bucket);
    });

    return departments.map(dept => {
        const waitingCount = waitingMap.get(dept.department_id) || 0;
        const avgWaitMinutes = average(avgWaitMap.get(dept.department_id) || []);
        const activeDoctors = activeDoctorsMap.get(dept.department_id) || 0;
        const totalDoctors = totalDoctorsMap.get(dept.department_id) || 0;

        let loadStatus = 'Normal';
        if (waitingCount >= 50) loadStatus = 'Critical';
        else if (waitingCount >= 20) loadStatus = 'High Load';

        return {
            department_id: Number(dept.department_id),
            department_name: dept.department_name,
            department_code: dept.department_code,
            location: dept.location || null,
            waiting_count: waitingCount,
            avg_wait_minutes: Number(avgWaitMinutes.toFixed(2)),
            active_doctors: activeDoctors,
            total_doctors: totalDoctors,
            load_status: loadStatus,
            date: date.toISOString().slice(0, 10)
        };
    });
}

/**
 * Doctor queue table snapshot
 */
export async function listDoctors(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const { whereClause: dutyWhere, date } = buildDutyWhereClause(tenantId, filters);

    const roster = await prisma.duty_roster.findMany({
        where: {
            ...dutyWhere,
            ...buildDoctorRoleFilter(tenantId)
        },
        include: {
            staff_profiles: {
                select: {
                    profile_id: true,
                    user_id: true,
                    first_name: true,
                    last_name: true,
                    department_id: true,
                    room_number: true,
                    departments: {
                        select: {
                            department_id: true,
                            department_name: true
                        }
                    }
                }
            }
        },
        orderBy: {
            start_time: 'asc'
        }
    });

    const uniqueDoctors = new Map();
    roster.forEach(entry => {
        if (!entry.staff_profiles) return;
        const doctorId = Number(entry.staff_profiles.user_id);
        if (!uniqueDoctors.has(doctorId)) {
            uniqueDoctors.set(doctorId, {
                doctor_id: doctorId,
                doctor_name: `${entry.staff_profiles.first_name} ${entry.staff_profiles.last_name}`,
                department_id: entry.staff_profiles.department_id ? Number(entry.staff_profiles.department_id) : null,
                department_name: entry.staff_profiles.departments?.department_name || null,
                room_number: entry.staff_profiles.room_number || null,
                status: entry.is_available ? 'Active' : 'Break'
            });
        }
    });

    const doctorList = Array.from(uniqueDoctors.values());

    if (filters.doctor_id) {
        const doctorId = Number(filters.doctor_id);
        const filtered = doctorList.filter(doc => doc.doctor_id === doctorId);
        return buildDoctorListResponse(filtered, page, pageSize, date, prisma, tenantId, filters);
    }

    return buildDoctorListResponse(doctorList, page, pageSize, date, prisma, tenantId, filters);
}

async function buildDoctorListResponse(doctorList, page, pageSize, date, prisma, tenantId, filters) {
    const total = doctorList.length;
    const paged = doctorList.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    const doctorIds = paged.map(doc => BigInt(doc.doctor_id));

    if (!doctorIds.length) {
        return { page, pageSize, total, data: [] };
    }

    const visitWhere = {
        tenant_id: BigInt(tenantId),
        visit_date: date,
        doctor_id: { in: doctorIds }
    };

    if (filters.facility_id !== undefined) {
        visitWhere.facility_id = filters.facility_id ? BigInt(filters.facility_id) : null;
    }

    const visits = await prisma.opd_visits.findMany({
        where: visitWhere,
        select: {
            doctor_id: true,
            status: true,
            checked_in_at: true,
            consultation_start_at: true,
            consultation_end_at: true
        }
    });

    const queueMap = new Map();
    const seenMap = new Map();
    const consultDurations = new Map();

    visits.forEach(visit => {
        const doctorId = Number(visit.doctor_id);
        if (visit.status === 'waiting') {
            queueMap.set(doctorId, (queueMap.get(doctorId) || 0) + 1);
        }
        if (visit.status === 'completed') {
            seenMap.set(doctorId, (seenMap.get(doctorId) || 0) + 1);
        }

        const consultMinutes = minutesBetween(visit.consultation_start_at, visit.consultation_end_at);
        if (consultMinutes !== null) {
            const bucket = consultDurations.get(doctorId) || [];
            bucket.push(consultMinutes);
            consultDurations.set(doctorId, bucket);
        }
    });

    const data = paged.map(doc => {
        const avgConsult = average(consultDurations.get(doc.doctor_id) || []);
        return {
            doctor_id: doc.doctor_id,
            doctor_name: doc.doctor_name,
            department_id: doc.department_id,
            department_name: doc.department_name,
            room_number: doc.room_number,
            status: doc.status,
            queue_count: queueMap.get(doc.doctor_id) || 0,
            patients_seen: seenMap.get(doc.doctor_id) || 0,
            avg_consult_minutes: Number(avgConsult.toFixed(2))
        };
    });

    return { page, pageSize, total, data };
}

/**
 * Department doctors snapshot
 */
export async function listDepartmentDoctors(prisma, tenantId, departmentId, filters = {}) {
    const { whereClause: dutyWhere, date } = buildDutyWhereClause(tenantId, filters);

    const roster = await prisma.duty_roster.findMany({
        where: {
            ...dutyWhere,
            department_id: Number(departmentId),
            ...buildDoctorRoleFilter(tenantId)
        },
        include: {
            staff_profiles: {
                select: {
                    user_id: true,
                    first_name: true,
                    last_name: true,
                    department_id: true,
                    room_number: true,
                    departments: {
                        select: {
                            department_id: true,
                            department_name: true
                        }
                    }
                }
            }
        },
        orderBy: {
            start_time: 'asc'
        }
    });

    const doctors = roster
        .filter(entry => entry.staff_profiles)
        .map(entry => ({
            doctor_id: Number(entry.staff_profiles.user_id),
            doctor_name: `${entry.staff_profiles.first_name} ${entry.staff_profiles.last_name}`,
            department_id: entry.staff_profiles.department_id ? Number(entry.staff_profiles.department_id) : null,
            department_name: entry.staff_profiles.departments?.department_name || null,
            room_number: entry.staff_profiles.room_number || null,
            status: entry.is_available ? 'Active' : 'Break'
        }));

    const doctorIds = doctors.map(doc => BigInt(doc.doctor_id));

    if (!doctorIds.length) return [];

    const visits = await prisma.opd_visits.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            visit_date: date,
            doctor_id: { in: doctorIds },
            status: 'waiting'
        },
        select: {
            doctor_id: true,
            checked_in_at: true,
            consultation_start_at: true
        }
    });

    const waitTimes = new Map();
    const queueMap = new Map();

    visits.forEach(visit => {
        const doctorId = Number(visit.doctor_id);
        queueMap.set(doctorId, (queueMap.get(doctorId) || 0) + 1);

        const minutes = minutesBetween(visit.checked_in_at, visit.consultation_start_at);
        if (minutes !== null) {
            const bucket = waitTimes.get(doctorId) || [];
            bucket.push(minutes);
            waitTimes.set(doctorId, bucket);
        }
    });

    return doctors.map(doc => {
        const avgWait = average(waitTimes.get(doc.doctor_id) || []);
        return {
            doctor_id: doc.doctor_id,
            doctor_name: doc.doctor_name,
            department_id: doc.department_id,
            department_name: doc.department_name,
            room_number: doc.room_number,
            status: doc.status,
            queue_count: queueMap.get(doc.doctor_id) || 0,
            avg_wait_minutes: Number(avgWait.toFixed(2))
        };
    });
}

/**
 * Doctor examined list
 */
export async function listDoctorExamined(prisma, tenantId, doctorId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const { whereClause: visitWhere, date } = buildVisitWhereClause(tenantId, {
        ...filters,
        doctor_id: doctorId
    });

    const whereClause = {
        ...visitWhere,
        status: 'completed'
    };

    const [total, visits] = await Promise.all([
        prisma.opd_visits.count({ where: whereClause }),
        prisma.opd_visits.findMany({
            where: whereClause,
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
                opd_consultations: {
                    select: {
                        final_diagnosis: true,
                        provisional_diagnosis: true,
                        vitals: true
                    }
                }
            },
            orderBy: {
                consultation_end_at: 'desc'
            },
            skip,
            take: pageSize
        })
    ]);

    const data = visits.map(visit => {
        const patient = visit.patients;
        const consult = visit.opd_consultations;
        const patientName = patient ? `${patient.first_name} ${patient.last_name}` : null;
        const diagnosis = consult?.final_diagnosis || consult?.provisional_diagnosis || null;
        const age = patient ? calculateAge(patient.date_of_birth, date) : null;

        return {
            visit_id: Number(visit.visit_id),
            uhid: patient?.upid || null,
            patient_name: patientName,
            age,
            gender: patient?.gender || null,
            issue: visit.reason_for_visit || null,
            diagnosis,
            vitals: consult?.vitals || null,
            visit_type: visit.visit_type,
            visit_time: visit.consultation_end_at ? visit.consultation_end_at.toISOString() : visit.visit_time.toISOString(),
            status: visit.status
        };
    });

    return { page, pageSize, total, data };
}
