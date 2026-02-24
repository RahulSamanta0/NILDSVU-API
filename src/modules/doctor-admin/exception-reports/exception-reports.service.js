/**
 * Doctor Admin Exception Reports Service
 */

import { normalizeEmployeeCode } from '../../../utils/employeeCodeGenerator.js';

function toDateStart(value) { return new Date(`${value}T00:00:00.000Z`); }
function toDateEnd(value) { return new Date(`${value}T23:59:59.999Z`); }
function toDateOnly(value) { return new Date(`${value}T00:00:00.000Z`); }
function dateToIso(value) { return value ? new Date(value).toISOString() : null; }
function dateToYmd(value) { return value ? new Date(value).toISOString().slice(0, 10) : null; }

function parseDateTimeRange(filters = {}, key) {
    if (!filters.from_date && !filters.to_date) return undefined;
    return {
        [key]: {
            ...(filters.from_date ? { gte: toDateStart(filters.from_date) } : {}),
            ...(filters.to_date ? { lte: toDateEnd(filters.to_date) } : {})
        }
    };
}

function getDoctorNameFromProfile(doctor) { return `${doctor.first_name} ${doctor.last_name}`; }

async function getDoctors(prisma, tenantId, filters = {}) {
    const where = {
        tenant_id: BigInt(tenantId),
        request_status: 'approved',
        users: {
            user_roles_user_roles_user_idTousers: {
                some: { roles: { role_code: { equals: 'doctor', mode: 'insensitive' } } }
            }
        }
    };

    if (filters.department_id) where.department_id = Number(filters.department_id);
    if (filters.doctor_ref) {
        where.employee_code = { equals: normalizeEmployeeCode(filters.doctor_ref), mode: 'insensitive' };
    }

    return prisma.staff_profiles.findMany({
        where,
        select: {
            profile_id: true,
            user_id: true,
            employee_code: true,
            first_name: true,
            last_name: true,
            specialization: true,
            department_id: true,
            departments: { select: { department_name: true } }
        },
        orderBy: [{ first_name: 'asc' }, { last_name: 'asc' }]
    });
}

async function resolveDoctorByRef(prisma, tenantId, doctorRef) {
    const doctor = (await getDoctors(prisma, tenantId, { doctor_ref: doctorRef }))[0];
    if (!doctor) throw new Error('DOCTOR_NOT_FOUND');
    return doctor;
}

function nowUtc() {
    return new Date();
}

function toHoursDiff(from, to = nowUtc()) {
    if (!from) return 0;
    return Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60)));
}

function toDaysDiff(from, to = nowUtc()) {
    if (!from) return 0;
    return Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)));
}

function priorityToExpectedHours(priority) {
    const normalized = String(priority || '').toLowerCase();
    if (normalized === 'stat') return 4;
    if (normalized === 'urgent') return 12;
    return 24;
}

function getDelaySeverity(delayHours) {
    if (delayHours >= 48) return 'critical';
    if (delayHours >= 12) return 'moderate';
    return 'minor';
}

function getMissedFollowUpSeverity(days) {
    if (days >= 60) return 'critical';
    if (days >= 45) return 'high';
    if (days >= 30) return 'medium';
    return 'low';
}

function normalizeRiskLevel(level) {
    const normalized = String(level || '').toLowerCase();
    if (normalized === 'critical') return 'critical';
    if (normalized === 'high') return 'high';
    return 'moderate';
}

function inferRiskCategory(conditionText) {
    const text = String(conditionText || '').toLowerCase();
    if (text.includes('cardiac') || text.includes('heart') || text.includes('troponin')) return 'Cardiac';
    if (text.includes('diabet') || text.includes('hba1c') || text.includes('glucose')) return 'Diabetic';
    if (text.includes('post') && text.includes('surg')) return 'Post-Surgical';
    if (text.includes('respirat') || text.includes('copd') || text.includes('asthma')) return 'Chronic Respiratory';
    if (text.includes('renal') || text.includes('kidney') || text.includes('creatinine')) return 'Renal';
    if (text.includes(',') || text.includes(' and ')) return 'Multi-Morbidity';
    return 'General';
}

function inferUrgencyFromHours(hours) {
    if (hours >= 8) return 'Immediate';
    if (hours >= 4) return 'Urgent';
    return 'High';
}

function riskLevelFromSignals(overdueDays, unresolvedCriticalCount, missedFollowUpCount, pendingTherapyCount) {
    const score =
        (overdueDays >= 60 ? 3 : overdueDays >= 45 ? 2 : overdueDays >= 30 ? 1 : 0)
        + (unresolvedCriticalCount >= 2 ? 3 : unresolvedCriticalCount >= 1 ? 2 : 0)
        + (missedFollowUpCount >= 2 ? 2 : missedFollowUpCount >= 1 ? 1 : 0)
        + (pendingTherapyCount >= 3 ? 2 : pendingTherapyCount >= 1 ? 1 : 0);

    if (score >= 6) return 'critical';
    if (score >= 4) return 'high';
    return 'moderate';
}

function toPagedResult(rows, page, pageSize) {
    const total = rows.length;
    const start = (page - 1) * pageSize;
    return {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        data: rows.slice(start, start + pageSize)
    };
}

async function getDoctorSelectorBase(prisma, tenantId) {
    const doctors = await getDoctors(prisma, tenantId);
    return doctors.map(doctor => ({
        user_id: Number(doctor.user_id),
        doctor_ref: normalizeEmployeeCode(doctor.employee_code),
        doctor_name: getDoctorNameFromProfile(doctor),
        department_id: doctor.department_id || null,
        department_name: doctor.departments?.department_name || null
    }));
}

export async function getCriticalLabDoctorCards(prisma, tenantId, filters = {}) {
    const doctors = await getDoctorSelectorBase(prisma, tenantId);

    const rows = await prisma.lab_test_items.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            result_value: { not: null }
        },
        select: {
            is_critical: true,
            critical_acknowledged_at: true,
            verified_by: true,
            lab_test_orders: {
                select: {
                    ordering_doctor_id: true
                }
            }
        }
    });

    const map = new Map();
    rows.forEach(item => {
        const doctorUserId = item.lab_test_orders?.ordering_doctor_id ? Number(item.lab_test_orders.ordering_doctor_id) : null;
        if (!doctorUserId) return;

        if (!map.has(doctorUserId)) {
            map.set(doctorUserId, { critical_count: 0, total_count: 0 });
        }

        const bucket = map.get(doctorUserId);
        const unreviewed = !item.critical_acknowledged_at || !item.verified_by;
        if (unreviewed) {
            bucket.total_count += 1;
            if (item.is_critical) bucket.critical_count += 1;
        }
    });

    const search = String(filters.search || '').trim().toLowerCase();

    const data = doctors
        .map(doctor => ({
            ...doctor,
            critical_count: map.get(doctor.user_id)?.critical_count || 0,
            total_count: map.get(doctor.user_id)?.total_count || 0
        }))
        .filter(item => item.total_count > 0)
        .filter(item => {
            if (!search) return true;
            return `${item.doctor_name} ${item.department_name || ''} ${item.doctor_ref || ''}`.toLowerCase().includes(search);
        })
        .sort((a, b) => b.critical_count - a.critical_count);

    return { total: data.length, data };
}

export async function getCriticalLabValuesNotReviewed(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);

    const doctor = filters.doctor_ref ? await resolveDoctorByRef(prisma, tenantId, filters.doctor_ref) : null;

    const where = {
        tenant_id: BigInt(tenantId),
        is_critical: true,
        result_value: { not: null },
        OR: [
            { critical_acknowledged_at: null },
            { verified_by: null }
        ],
        ...(doctor ? { lab_test_orders: { ordering_doctor_id: BigInt(doctor.user_id) } } : {})
    };

    const rows = await prisma.lab_test_items.findMany({
        where,
        include: {
            lab_tests: {
                select: {
                    test_name: true,
                    test_category: true
                }
            },
            lab_test_orders: {
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
                    users_lab_test_orders_ordering_doctor_idTousers: {
                        select: {
                            user_id: true,
                            staff_profiles: {
                                select: {
                                    employee_code: true,
                                    first_name: true,
                                    last_name: true
                                }
                            }
                        }
                    }
                }
            }
        },
        orderBy: [{ result_date: 'desc' }, { test_item_id: 'desc' }]
    });

    const search = String(filters.search || '').trim().toLowerCase();
    const category = String(filters.category || '').trim().toLowerCase();
    const urgency = String(filters.urgency || '').trim().toLowerCase();

    const normalized = rows.map(item => {
        const patient = item.lab_test_orders?.patients;
        const doctorProfile = item.lab_test_orders?.users_lab_test_orders_ordering_doctor_idTousers?.staff_profiles;
        const resultAt = item.result_date || item.created_at || item.lab_test_orders?.order_date;
        const hoursUnreviewed = toHoursDiff(resultAt);
        const urgencyLabel = inferUrgencyFromHours(hoursUnreviewed);

        return {
            test_item_id: Number(item.test_item_id),
            result_id: `RES-${new Date().getUTCFullYear()}-${String(item.test_item_id).padStart(6, '0')}`,
            patient: patient
                ? {
                    patient_id: Number(patient.patient_id),
                    upid: patient.upid,
                    patient_name: [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' '),
                    age: patient.date_of_birth ? Math.max(0, new Date().getUTCFullYear() - new Date(patient.date_of_birth).getUTCFullYear()) : null,
                    gender: patient.gender || null,
                    mobile_primary: patient.mobile_primary || null
                }
                : null,
            doctor: {
                doctor_ref: normalizeEmployeeCode(doctorProfile?.employee_code),
                doctor_name: doctorProfile ? [doctorProfile.first_name, doctorProfile.last_name].filter(Boolean).join(' ') : null
            },
            test_name: item.lab_tests?.test_name || null,
            category: item.lab_tests?.test_category || 'Other',
            value: item.result_value,
            normal_range: item.reference_range,
            flag: 'Panic',
            result_at: dateToIso(resultAt),
            hours_unreviewed: hoursUnreviewed,
            urgency: urgencyLabel,
            ordering_doctor_id: item.lab_test_orders?.ordering_doctor_id ? Number(item.lab_test_orders.ordering_doctor_id) : null,
            clinical_significance: item.remarks || null,
            status: item.status
        };
    })
        .filter(item => {
            if (!search) return true;
            return [
                item.result_id,
                item.patient?.patient_name,
                item.patient?.upid,
                item.test_name
            ].filter(Boolean).join(' ').toLowerCase().includes(search);
        })
        .filter(item => {
            if (!category) return true;
            return String(item.category || '').toLowerCase() === category;
        })
        .filter(item => {
            if (!urgency) return true;
            return String(item.urgency || '').toLowerCase() === urgency;
        });

    return toPagedResult(normalized, page, pageSize);
}

export async function getCriticalLabValueDetail(prisma, tenantId, testItemId) {
    const item = await prisma.lab_test_items.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            test_item_id: BigInt(testItemId)
        },
        include: {
            lab_tests: true,
            lab_test_orders: {
                include: {
                    patients: true,
                    users_lab_test_orders_ordering_doctor_idTousers: {
                        select: {
                            user_id: true,
                            staff_profiles: {
                                select: {
                                    first_name: true,
                                    last_name: true,
                                    employee_code: true,
                                    departments: {
                                        select: {
                                            department_name: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    users_lab_test_orders_sample_collected_byTousers: {
                        select: {
                            user_id: true,
                            staff_profiles: {
                                select: {
                                    first_name: true,
                                    last_name: true,
                                    employee_code: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!item) {
        throw new Error('RESULT_NOT_FOUND');
    }

    const patient = item.lab_test_orders?.patients;
    const doctorProfile = item.lab_test_orders?.users_lab_test_orders_ordering_doctor_idTousers?.staff_profiles;
    const technicianProfile = item.lab_test_orders?.users_lab_test_orders_sample_collected_byTousers?.staff_profiles;

    return {
        test_item_id: Number(item.test_item_id),
        result_id: `RES-${new Date().getUTCFullYear()}-${String(item.test_item_id).padStart(6, '0')}`,
        critical: Boolean(item.is_critical),
        test_name: item.lab_tests?.test_name || null,
        category: item.lab_tests?.test_category || null,
        result_value: item.result_value,
        normal_range: item.reference_range,
        clinical_significance: item.remarks || null,
        result_at: dateToIso(item.result_date || item.created_at),
        patient: patient
            ? {
                patient_id: Number(patient.patient_id),
                upid: patient.upid,
                name: [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' '),
                age: patient.date_of_birth ? Math.max(0, new Date().getUTCFullYear() - new Date(patient.date_of_birth).getUTCFullYear()) : null,
                gender: patient.gender || null
            }
            : null,
        ordering_doctor: {
            doctor_ref: normalizeEmployeeCode(doctorProfile?.employee_code),
            name: doctorProfile ? [doctorProfile.first_name, doctorProfile.last_name].filter(Boolean).join(' ') : null,
            department: doctorProfile?.departments?.department_name || null
        },
        lab_technician: {
            employee_ref: normalizeEmployeeCode(technicianProfile?.employee_code),
            name: technicianProfile ? [technicianProfile.first_name, technicianProfile.last_name].filter(Boolean).join(' ') : null
        }
    };
}

export async function markCriticalLabReviewed(prisma, tenantId, testItemId, reviewerUserId) {
    const existing = await prisma.lab_test_items.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            test_item_id: BigInt(testItemId)
        },
        select: {
            test_item_id: true,
            critical_acknowledged_at: true
        }
    });

    if (!existing) {
        throw new Error('RESULT_NOT_FOUND');
    }

    const updated = await prisma.lab_test_items.update({
        where: {
            test_item_id: BigInt(testItemId)
        },
        data: {
            critical_acknowledged_by: reviewerUserId ? BigInt(reviewerUserId) : null,
            critical_acknowledged_at: new Date(),
            ...(reviewerUserId ? { verified_by: BigInt(reviewerUserId) } : {})
        },
        select: {
            test_item_id: true,
            critical_acknowledged_at: true,
            critical_acknowledged_by: true
        }
    });

    return {
        test_item_id: Number(updated.test_item_id),
        reviewed_at: dateToIso(updated.critical_acknowledged_at),
        reviewed_by: updated.critical_acknowledged_by ? Number(updated.critical_acknowledged_by) : null
    };
}

async function getDelayedDiagnosticRows(prisma, tenantId, filters = {}) {
    const doctor = filters.doctor_ref ? await resolveDoctorByRef(prisma, tenantId, filters.doctor_ref) : null;
    const dateRange = parseDateTimeRange(filters, 'order_date');

    const [labOrders, radiologyOrders] = await Promise.all([
        prisma.lab_test_orders.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                ...(doctor ? { ordering_doctor_id: BigInt(doctor.user_id) } : {}),
                ...(dateRange || {})
            },
            include: {
                patients: {
                    select: {
                        patient_id: true,
                        upid: true,
                        first_name: true,
                        middle_name: true,
                        last_name: true,
                        mobile_primary: true,
                        email: true
                    }
                },
                users_lab_test_orders_ordering_doctor_idTousers: {
                    select: {
                        user_id: true,
                        staff_profiles: {
                            select: {
                                first_name: true,
                                last_name: true,
                                employee_code: true
                            }
                        }
                    }
                },
                lab_test_items: {
                    include: {
                        lab_tests: {
                            select: {
                                test_name: true,
                                test_category: true,
                                turnaround_time: true
                            }
                        }
                    }
                }
            }
        }),
        prisma.radiology_orders.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                ...(doctor ? { ordering_doctor_id: BigInt(doctor.user_id) } : {}),
                ...(dateRange || {})
            },
            include: {
                patients: {
                    select: {
                        patient_id: true,
                        upid: true,
                        first_name: true,
                        middle_name: true,
                        last_name: true,
                        mobile_primary: true,
                        email: true
                    }
                },
                users_radiology_orders_ordering_doctor_idTousers: {
                    select: {
                        user_id: true,
                        staff_profiles: {
                            select: {
                                first_name: true,
                                last_name: true,
                                employee_code: true
                            }
                        }
                    }
                },
                radiology_order_items: {
                    include: {
                        radiology_studies: {
                            select: {
                                study_name: true,
                                modality: true
                            }
                        }
                    }
                }
            }
        })
    ]);

    const rows = [];

    labOrders.forEach(order => {
        order.lab_test_items.forEach(item => {
            const expected = Number(item.lab_tests?.turnaround_time || priorityToExpectedHours(order.priority));
            const current = toHoursDiff(order.order_date || order.created_at);
            const delay = Math.max(0, current - expected);

            if (delay <= 0) return;
            if (['completed', 'cancelled'].includes(String(item.status || '').toLowerCase())) return;

            const doctorProfile = order.users_lab_test_orders_ordering_doctor_idTousers?.staff_profiles;
            rows.push({
                source: 'lab',
                item_id: Number(item.test_item_id),
                order_id: Number(order.order_id),
                order_number: order.order_number,
                patient_id: order.patients ? Number(order.patients.patient_id) : null,
                patient_upid: order.patients?.upid || null,
                patient_name: order.patients ? [order.patients.first_name, order.patients.middle_name, order.patients.last_name].filter(Boolean).join(' ') : null,
                mobile_primary: order.patients?.mobile_primary || null,
                email: order.patients?.email || null,
                test_name: item.lab_tests?.test_name || null,
                test_category: item.lab_tests?.test_category || null,
                test_type: 'Lab',
                expected_hours: expected,
                current_hours: current,
                delay_hours: delay,
                delay_severity: getDelaySeverity(delay),
                priority: order.priority || 'normal',
                status: item.status || order.status,
                notes: item.remarks || null,
                technician_id: item.verified_by ? Number(item.verified_by) : null,
                ordering_doctor_id: order.ordering_doctor_id ? Number(order.ordering_doctor_id) : null,
                doctor_ref: normalizeEmployeeCode(doctorProfile?.employee_code),
                doctor_name: doctorProfile ? [doctorProfile.first_name, doctorProfile.last_name].filter(Boolean).join(' ') : null,
                ordered_at: dateToIso(order.order_date || order.created_at)
            });
        });
    });

    radiologyOrders.forEach(order => {
        order.radiology_order_items.forEach(item => {
            const expected = priorityToExpectedHours(order.priority);
            const current = toHoursDiff(order.order_date || order.created_at);
            const delay = Math.max(0, current - expected);

            if (delay <= 0) return;
            if (['completed', 'cancelled'].includes(String(item.status || '').toLowerCase())) return;

            const doctorProfile = order.users_radiology_orders_ordering_doctor_idTousers?.staff_profiles;
            rows.push({
                source: 'radiology',
                item_id: Number(item.item_id),
                order_id: Number(order.order_id),
                order_number: order.order_number,
                patient_id: order.patients ? Number(order.patients.patient_id) : null,
                patient_upid: order.patients?.upid || null,
                patient_name: order.patients ? [order.patients.first_name, order.patients.middle_name, order.patients.last_name].filter(Boolean).join(' ') : null,
                mobile_primary: order.patients?.mobile_primary || null,
                email: order.patients?.email || null,
                test_name: item.radiology_studies?.study_name || item.study_name,
                test_category: item.radiology_studies?.modality || null,
                test_type: 'Radiology',
                expected_hours: expected,
                current_hours: current,
                delay_hours: delay,
                delay_severity: getDelaySeverity(delay),
                priority: order.priority || 'normal',
                status: item.status || order.status,
                notes: item.clinical_indication || null,
                technician_id: item.performed_by ? Number(item.performed_by) : null,
                ordering_doctor_id: order.ordering_doctor_id ? Number(order.ordering_doctor_id) : null,
                doctor_ref: normalizeEmployeeCode(doctorProfile?.employee_code),
                doctor_name: doctorProfile ? [doctorProfile.first_name, doctorProfile.last_name].filter(Boolean).join(' ') : null,
                ordered_at: dateToIso(order.order_date || order.created_at)
            });
        });
    });

    return rows;
}

export async function getDelayedDiagnosticsDoctorCards(prisma, tenantId, filters = {}) {
    const doctors = await getDoctorSelectorBase(prisma, tenantId);
    const rows = await getDelayedDiagnosticRows(prisma, tenantId, filters);

    const map = new Map();
    rows.forEach(item => {
        const doctorUserId = item.ordering_doctor_id;
        if (!doctorUserId) return;
        if (!map.has(doctorUserId)) map.set(doctorUserId, { delayed_count: 0, total_count: 0 });
        const bucket = map.get(doctorUserId);
        bucket.total_count += 1;
        bucket.delayed_count += 1;
    });

    const search = String(filters.search || '').trim().toLowerCase();
    const data = doctors
        .map(doctor => ({
            ...doctor,
            delayed_count: map.get(doctor.user_id)?.delayed_count || 0,
            total_count: map.get(doctor.user_id)?.total_count || 0
        }))
        .filter(item => item.total_count > 0)
        .filter(item => {
            if (!search) return true;
            return `${item.doctor_name} ${item.department_name || ''} ${item.doctor_ref || ''}`.toLowerCase().includes(search);
        })
        .sort((a, b) => b.delayed_count - a.delayed_count);

    return { total: data.length, data };
}

export async function getDelayedDiagnosticResults(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const search = String(filters.search || '').trim().toLowerCase();
    const testType = String(filters.test_type || '').trim().toLowerCase();
    const priority = String(filters.priority || '').trim().toLowerCase();

    const rows = (await getDelayedDiagnosticRows(prisma, tenantId, filters))
        .filter(item => {
            if (!search) return true;
            return [
                item.order_number,
                item.patient_name,
                item.patient_upid,
                item.test_name
            ].filter(Boolean).join(' ').toLowerCase().includes(search);
        })
        .filter(item => {
            if (!testType) return true;
            return String(item.test_type || '').toLowerCase() === testType;
        })
        .filter(item => {
            if (!priority) return true;
            return String(item.priority || '').toLowerCase() === priority;
        })
        .sort((a, b) => b.delay_hours - a.delay_hours);

    return toPagedResult(rows, page, pageSize);
}

export async function getDelayedDiagnosticDetail(prisma, tenantId, source, itemId) {
    const normalizedSource = String(source || '').toLowerCase();

    if (normalizedSource === 'lab') {
        const item = await prisma.lab_test_items.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                test_item_id: BigInt(itemId)
            },
            include: {
                lab_tests: true,
                lab_test_orders: {
                    include: {
                        patients: true,
                        users_lab_test_orders_ordering_doctor_idTousers: {
                            select: {
                                staff_profiles: {
                                    select: {
                                        first_name: true,
                                        last_name: true,
                                        employee_code: true
                                    }
                                }
                            }
                        },
                        users_lab_test_orders_sample_collected_byTousers: {
                            select: {
                                staff_profiles: {
                                    select: {
                                        first_name: true,
                                        last_name: true,
                                        employee_code: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!item) throw new Error('ORDER_ITEM_NOT_FOUND');

        const expected = Number(item.lab_tests?.turnaround_time || priorityToExpectedHours(item.lab_test_orders?.priority));
        const current = toHoursDiff(item.lab_test_orders?.order_date || item.lab_test_orders?.created_at);
        const patient = item.lab_test_orders?.patients;
        const doctorProfile = item.lab_test_orders?.users_lab_test_orders_ordering_doctor_idTousers?.staff_profiles;
        const technicianProfile = item.lab_test_orders?.users_lab_test_orders_sample_collected_byTousers?.staff_profiles;

        return {
            source: 'lab',
            item_id: Number(item.test_item_id),
            order_id: Number(item.order_id),
            order_number: item.lab_test_orders?.order_number,
            delay_severity: getDelaySeverity(Math.max(0, current - expected)),
            priority: item.lab_test_orders?.priority || 'normal',
            status: item.status || item.lab_test_orders?.status,
            patient: patient ? {
                patient_id: Number(patient.patient_id),
                upid: patient.upid,
                name: [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' '),
                mobile_primary: patient.mobile_primary,
                email: patient.email
            } : null,
            test: {
                test_name: item.lab_tests?.test_name || null,
                test_type: 'Lab'
            },
            tat: {
                expected_hours: expected,
                current_hours: current
            },
            notes: item.remarks || null,
            technician: {
                name: technicianProfile ? [technicianProfile.first_name, technicianProfile.last_name].filter(Boolean).join(' ') : null,
                employee_ref: normalizeEmployeeCode(technicianProfile?.employee_code)
            },
            ordering_doctor: {
                name: doctorProfile ? [doctorProfile.first_name, doctorProfile.last_name].filter(Boolean).join(' ') : null,
                doctor_ref: normalizeEmployeeCode(doctorProfile?.employee_code)
            }
        };
    }

    if (normalizedSource === 'radiology') {
        const item = await prisma.radiology_order_items.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                item_id: BigInt(itemId)
            },
            include: {
                radiology_studies: true,
                radiology_orders: {
                    include: {
                        patients: true,
                        users_radiology_orders_ordering_doctor_idTousers: {
                            select: {
                                staff_profiles: {
                                    select: {
                                        first_name: true,
                                        last_name: true,
                                        employee_code: true
                                    }
                                }
                            }
                        },
                        users_radiology_orders_cancelled_byTousers: {
                            select: {
                                staff_profiles: {
                                    select: {
                                        first_name: true,
                                        last_name: true,
                                        employee_code: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!item) throw new Error('ORDER_ITEM_NOT_FOUND');

        const expected = priorityToExpectedHours(item.radiology_orders?.priority);
        const current = toHoursDiff(item.radiology_orders?.order_date || item.radiology_orders?.created_at);
        const patient = item.radiology_orders?.patients;
        const doctorProfile = item.radiology_orders?.users_radiology_orders_ordering_doctor_idTousers?.staff_profiles;
        const technicianProfile = item.radiology_orders?.users_radiology_orders_cancelled_byTousers?.staff_profiles;

        return {
            source: 'radiology',
            item_id: Number(item.item_id),
            order_id: Number(item.order_id),
            order_number: item.radiology_orders?.order_number,
            delay_severity: getDelaySeverity(Math.max(0, current - expected)),
            priority: item.radiology_orders?.priority || 'normal',
            status: item.status || item.radiology_orders?.status,
            patient: patient ? {
                patient_id: Number(patient.patient_id),
                upid: patient.upid,
                name: [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' '),
                mobile_primary: patient.mobile_primary,
                email: patient.email
            } : null,
            test: {
                test_name: item.radiology_studies?.study_name || item.study_name,
                test_type: 'Radiology'
            },
            tat: {
                expected_hours: expected,
                current_hours: current
            },
            notes: item.clinical_indication || item.impressions || null,
            technician: {
                name: technicianProfile ? [technicianProfile.first_name, technicianProfile.last_name].filter(Boolean).join(' ') : null,
                employee_ref: normalizeEmployeeCode(technicianProfile?.employee_code)
            },
            ordering_doctor: {
                name: doctorProfile ? [doctorProfile.first_name, doctorProfile.last_name].filter(Boolean).join(' ') : null,
                doctor_ref: normalizeEmployeeCode(doctorProfile?.employee_code)
            }
        };
    }

    throw new Error('INVALID_SOURCE');
}

export async function escalateDelayedDiagnostic(prisma, tenantId, source, itemId, actorUserId, notes = null) {
    const detail = await getDelayedDiagnosticDetail(prisma, tenantId, source, itemId);

    await prisma.system_notifications.create({
        data: {
            tenant_id: BigInt(tenantId),
            user_id: detail.ordering_doctor?.doctor_ref ? null : null,
            notification_type: 'exception_escalation',
            title: `Delayed ${detail.source} diagnostic escalation`,
            message: `${detail.order_number} for ${detail.patient?.name || 'patient'} has ${detail.tat.current_hours}h TAT vs ${detail.tat.expected_hours}h expected. ${notes || ''}`.trim(),
            reference_type: `${detail.source}_order_item`,
            reference_id: BigInt(detail.item_id),
            is_read: false
        }
    });

    if (actorUserId) {
        await prisma.audit_logs.create({
            data: {
                tenant_id: BigInt(tenantId),
                table_name: 'exception_reports',
                record_id: BigInt(detail.item_id),
                action: 'ESCALATE_DELAYED_DIAGNOSTIC',
                new_values: {
                    source: detail.source,
                    order_number: detail.order_number,
                    notes: notes || null
                },
                user_id: BigInt(actorUserId)
            }
        });
    }

    return {
        escalated: true,
        source: detail.source,
        item_id: detail.item_id,
        order_number: detail.order_number,
        message: 'Delayed diagnostic escalated'
    };
}

async function getMissedFollowUpRows(prisma, tenantId, filters = {}) {
    const today = toDateOnly(new Date().toISOString().slice(0, 10));
    const doctor = filters.doctor_ref ? await resolveDoctorByRef(prisma, tenantId, filters.doctor_ref) : null;

    const consultations = await prisma.opd_consultations.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            follow_up_date: { lt: today },
            ...(doctor ? { doctor_id: BigInt(doctor.user_id) } : {})
        },
        include: {
            opd_visits: {
                select: {
                    visit_id: true,
                    visit_date: true,
                    patient_id: true,
                    visit_type: true,
                    patients: {
                        select: {
                            patient_id: true,
                            upid: true,
                            first_name: true,
                            middle_name: true,
                            last_name: true,
                            mobile_primary: true,
                            email: true
                        }
                    }
                }
            },
            users: {
                select: {
                    user_id: true,
                    staff_profiles: {
                        select: {
                            employee_code: true,
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            }
        }
    });

    const patientIds = [...new Set(consultations.map(item => item.opd_visits?.patient_id).filter(Boolean).map(value => BigInt(value)))];
    const futureVisits = await prisma.opd_visits.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            patient_id: patientIds.length ? { in: patientIds } : { equals: BigInt(-1) }
        },
        select: {
            patient_id: true,
            visit_date: true
        }
    });

    const visitsByPatient = new Map();
    futureVisits.forEach(visit => {
        const key = String(visit.patient_id);
        if (!visitsByPatient.has(key)) visitsByPatient.set(key, []);
        visitsByPatient.get(key).push(dateToYmd(visit.visit_date));
    });

    return consultations
        .map(item => {
            const patient = item.opd_visits?.patients;
            if (!patient) return null;

            const dueDate = dateToYmd(item.follow_up_date);
            const hasVisitedAfterDue = (visitsByPatient.get(String(patient.patient_id)) || []).some(date => date >= dueDate);
            if (hasVisitedAfterDue) return null;

            const missedDays = toDaysDiff(item.follow_up_date);
            const doctorProfile = item.users?.staff_profiles;

            return {
                consultation_id: Number(item.consultation_id),
                doctor_user_id: item.doctor_id ? Number(item.doctor_id) : null,
                doctor_ref: normalizeEmployeeCode(doctorProfile?.employee_code),
                doctor_name: doctorProfile ? [doctorProfile.first_name, doctorProfile.last_name].filter(Boolean).join(' ') : null,
                patient_id: Number(patient.patient_id),
                patient_upid: patient.upid,
                patient_name: [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' '),
                mobile_primary: patient.mobile_primary || null,
                email: patient.email || null,
                last_visit_date: dateToYmd(item.opd_visits?.visit_date),
                due_date: dueDate,
                missed_days: missedDays,
                severity: getMissedFollowUpSeverity(missedDays),
                appointment_type: item.opd_visits?.visit_type || 'Routine',
                condition: item.final_diagnosis || item.provisional_diagnosis || null,
                contact_attempts: 0,
                contact_status: 'Not Contacted'
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.missed_days - a.missed_days);
}

export async function getMissedFollowUpDoctorCards(prisma, tenantId, filters = {}) {
    const doctors = await getDoctorSelectorBase(prisma, tenantId);
    const rows = await getMissedFollowUpRows(prisma, tenantId, filters);

    const map = new Map();
    rows.forEach(item => {
        if (!item.doctor_user_id) return;
        if (!map.has(item.doctor_user_id)) {
            map.set(item.doctor_user_id, { missed_count: 0, total_count: 0 });
        }
        const bucket = map.get(item.doctor_user_id);
        bucket.total_count += 1;
        bucket.missed_count += 1;
    });

    const search = String(filters.search || '').trim().toLowerCase();
    const data = doctors
        .map(doctor => ({
            ...doctor,
            missed_count: map.get(doctor.user_id)?.missed_count || 0,
            total_count: map.get(doctor.user_id)?.total_count || 0
        }))
        .filter(item => item.total_count > 0)
        .filter(item => {
            if (!search) return true;
            return `${item.doctor_name} ${item.department_name || ''} ${item.doctor_ref || ''}`.toLowerCase().includes(search);
        })
        .sort((a, b) => b.missed_count - a.missed_count);

    return { total: data.length, data };
}

export async function getMissedFollowUps(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const search = String(filters.search || '').trim().toLowerCase();
    const appointmentType = String(filters.appointment_type || '').trim().toLowerCase();
    const contactStatus = String(filters.contact_status || '').trim().toLowerCase();

    const rows = (await getMissedFollowUpRows(prisma, tenantId, filters))
        .filter(item => {
            if (!search) return true;
            return [
                item.patient_name,
                item.patient_upid,
                item.condition
            ].filter(Boolean).join(' ').toLowerCase().includes(search);
        })
        .filter(item => {
            if (!appointmentType) return true;
            return String(item.appointment_type || '').toLowerCase() === appointmentType;
        })
        .filter(item => {
            if (!contactStatus) return true;
            return String(item.contact_status || '').toLowerCase() === contactStatus;
        });

    return toPagedResult(rows, page, pageSize);
}

async function getHighRiskRows(prisma, tenantId, filters = {}) {
    const doctor = filters.doctor_ref ? await resolveDoctorByRef(prisma, tenantId, filters.doctor_ref) : null;

    const consultations = await prisma.opd_consultations.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            ...(doctor ? { doctor_id: BigInt(doctor.user_id) } : {})
        },
        include: {
            opd_visits: {
                select: {
                    visit_id: true,
                    visit_date: true,
                    patient_id: true,
                    visit_type: true,
                    patients: {
                        select: {
                            patient_id: true,
                            upid: true,
                            first_name: true,
                            middle_name: true,
                            last_name: true,
                            date_of_birth: true,
                            gender: true,
                            mobile_primary: true,
                            email: true,
                            vitals: true,
                            complaint_notes: true
                        }
                    }
                }
            },
            users: {
                select: {
                    user_id: true,
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true,
                            employee_code: true
                        }
                    }
                }
            }
        }
    });

    const patientIds = [...new Set(consultations.map(item => item.opd_visits?.patient_id).filter(Boolean).map(value => BigInt(value)))];

    const [criticalLabs, therapyOrders] = await Promise.all([
        prisma.lab_test_items.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                is_critical: true,
                OR: [
                    { critical_acknowledged_at: null },
                    { verified_by: null }
                ],
                lab_test_orders: {
                    patient_id: patientIds.length ? { in: patientIds } : { equals: BigInt(-1) }
                }
            },
            select: {
                lab_test_orders: {
                    select: {
                        patient_id: true
                    }
                }
            }
        }),
        prisma.therapy_orders.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                patient_id: patientIds.length ? { in: patientIds } : { equals: BigInt(-1) },
                OR: [
                    { status: { in: ['pending', 'in_progress'] } },
                    { sessions_completed: { lt: 1 } }
                ]
            },
            select: {
                patient_id: true,
                session_count: true,
                sessions_completed: true
            }
        })
    ]);

    const criticalMap = new Map();
    criticalLabs.forEach(item => {
        const key = String(item.lab_test_orders?.patient_id || '');
        if (!key) return;
        criticalMap.set(key, (criticalMap.get(key) || 0) + 1);
    });

    const pendingTherapyMap = new Map();
    therapyOrders.forEach(item => {
        const key = String(item.patient_id);
        const pending = Math.max(0, Number(item.session_count || 0) - Number(item.sessions_completed || 0));
        pendingTherapyMap.set(key, (pendingTherapyMap.get(key) || 0) + pending);
    });

    const byPatient = new Map();
    consultations.forEach(item => {
        const patient = item.opd_visits?.patients;
        if (!patient) return;
        const key = String(patient.patient_id);
        const doctorProfile = item.users?.staff_profiles;

        if (!byPatient.has(key)) {
            byPatient.set(key, {
                patient_id: Number(patient.patient_id),
                patient_upid: patient.upid,
                patient_name: [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' '),
                age: patient.date_of_birth ? Math.max(0, new Date().getUTCFullYear() - new Date(patient.date_of_birth).getUTCFullYear()) : null,
                gender: patient.gender || null,
                mobile_primary: patient.mobile_primary || null,
                email: patient.email || null,
                doctor_ref: normalizeEmployeeCode(doctorProfile?.employee_code),
                doctor_name: doctorProfile ? [doctorProfile.first_name, doctorProfile.last_name].filter(Boolean).join(' ') : null,
                primary_condition: item.final_diagnosis || item.provisional_diagnosis || patient.complaint_notes || 'Clinical follow-up required',
                last_review_date: dateToYmd(item.updated_at || item.created_at || item.opd_visits?.visit_date),
                last_visit_type: item.opd_visits?.visit_type || null,
                missed_followups: 0,
                unresolved_critical: criticalMap.get(key) || 0,
                pending_therapy: pendingTherapyMap.get(key) || 0,
                compliance_issue: false,
                vitals: patient.vitals || null
            });
        }

        const row = byPatient.get(key);

        const followUpDays = item.follow_up_date ? toDaysDiff(item.follow_up_date) : 0;
        if (item.follow_up_date && followUpDays >= 30) {
            row.missed_followups += 1;
        }

        const candidateReview = item.updated_at || item.created_at || item.opd_visits?.visit_date;
        if (candidateReview && (!row.last_review_date || candidateReview > new Date(`${row.last_review_date}T00:00:00.000Z`))) {
            row.last_review_date = dateToYmd(candidateReview);
        }
    });

    return Array.from(byPatient.values())
        .map(row => {
            const overdueDays = row.last_review_date ? toDaysDiff(new Date(`${row.last_review_date}T00:00:00.000Z`)) : 999;
            const riskLevel = riskLevelFromSignals(overdueDays, row.unresolved_critical, row.missed_followups, row.pending_therapy);
            const riskCategory = inferRiskCategory(row.primary_condition);

            return {
                ...row,
                risk_category: riskCategory,
                risk_level: riskLevel,
                overdue_days: overdueDays,
                compliance_issue: row.missed_followups > 0 || row.unresolved_critical > 0,
                comorbidities: [riskCategory === 'General' ? null : riskCategory].filter(Boolean)
            };
        })
        .filter(row => row.overdue_days >= 30 || row.unresolved_critical > 0 || row.pending_therapy > 0)
        .sort((a, b) => b.overdue_days - a.overdue_days);
}

export async function getHighRiskDoctorCards(prisma, tenantId, filters = {}) {
    const doctors = await getDoctorSelectorBase(prisma, tenantId);
    const rows = await getHighRiskRows(prisma, tenantId, filters);

    const map = new Map();
    rows.forEach(item => {
        const doctor = doctors.find(d => d.doctor_ref && d.doctor_ref === item.doctor_ref);
        if (!doctor) return;

        if (!map.has(doctor.user_id)) {
            map.set(doctor.user_id, { critical_count: 0, total_count: 0 });
        }

        const bucket = map.get(doctor.user_id);
        bucket.total_count += 1;
        if (item.risk_level === 'critical') bucket.critical_count += 1;
    });

    const search = String(filters.search || '').trim().toLowerCase();
    const data = doctors
        .map(doctor => ({
            ...doctor,
            critical_count: map.get(doctor.user_id)?.critical_count || 0,
            total_count: map.get(doctor.user_id)?.total_count || 0
        }))
        .filter(item => item.total_count > 0)
        .filter(item => {
            if (!search) return true;
            return `${item.doctor_name} ${item.department_name || ''} ${item.doctor_ref || ''}`.toLowerCase().includes(search);
        })
        .sort((a, b) => b.critical_count - a.critical_count);

    return { total: data.length, data };
}

export async function getHighRiskPatientsWithoutRecentReview(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const search = String(filters.search || '').trim().toLowerCase();
    const riskCategory = String(filters.risk_category || '').trim().toLowerCase();
    const riskLevel = normalizeRiskLevel(filters.risk_level);
    const daysSinceReview = String(filters.days_since_review || '').trim();

    let rows = await getHighRiskRows(prisma, tenantId, filters);

    if (search) {
        rows = rows.filter(item => {
            return [
                item.patient_name,
                item.patient_upid,
                item.primary_condition
            ].filter(Boolean).join(' ').toLowerCase().includes(search);
        });
    }

    if (riskCategory) {
        rows = rows.filter(item => String(item.risk_category || '').toLowerCase() === riskCategory);
    }

    if (filters.risk_level) {
        rows = rows.filter(item => item.risk_level === riskLevel);
    }

    if (daysSinceReview === '30+') rows = rows.filter(item => item.overdue_days >= 30);
    if (daysSinceReview === '45+') rows = rows.filter(item => item.overdue_days >= 45);
    if (daysSinceReview === '60+') rows = rows.filter(item => item.overdue_days >= 60);

    return toPagedResult(rows, page, pageSize);
}

export async function getPendingRehabTherapistCards(prisma, tenantId, filters = {}) {
    const rows = await prisma.therapy_sessions.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            therapist_id: { not: null }
        },
        include: {
            users: {
                select: {
                    user_id: true,
                    staff_profiles: {
                        select: {
                            employee_code: true,
                            first_name: true,
                            last_name: true,
                            departments: {
                                select: {
                                    department_name: true
                                }
                            }
                        }
                    }
                }
            },
            therapy_orders: {
                select: {
                    session_count: true,
                    sessions_completed: true
                }
            }
        }
    });

    const map = new Map();
    rows.forEach(item => {
        const therapistId = item.therapist_id ? Number(item.therapist_id) : null;
        if (!therapistId) return;

        if (!map.has(therapistId)) {
            const profile = item.users?.staff_profiles;
            map.set(therapistId, {
                therapist_id: therapistId,
                therapist_ref: normalizeEmployeeCode(profile?.employee_code),
                therapist_name: profile ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') : null,
                department_name: profile?.departments?.department_name || null,
                pending_count: 0,
                total_count: 0
            });
        }

        const bucket = map.get(therapistId);
        const pending = Math.max(0, Number(item.therapy_orders?.session_count || 0) - Number(item.therapy_orders?.sessions_completed || 0));
        bucket.pending_count += pending;
        bucket.total_count += Number(item.therapy_orders?.session_count || 0);
    });

    const search = String(filters.search || '').trim().toLowerCase();
    const data = Array.from(map.values())
        .filter(item => item.pending_count > 0)
        .filter(item => {
            if (!search) return true;
            return `${item.therapist_name || ''} ${item.department_name || ''} ${item.therapist_ref || ''}`.toLowerCase().includes(search);
        })
        .sort((a, b) => b.pending_count - a.pending_count);

    return { total: data.length, data };
}

export async function getPendingRehabSessions(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const search = String(filters.search || '').trim().toLowerCase();
    const therapyType = String(filters.therapy_type || '').trim().toLowerCase();
    const statusFilter = String(filters.status || '').trim().toLowerCase();
    const therapistId = filters.therapist_id ? Number(filters.therapist_id) : null;

    const orders = await prisma.therapy_orders.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            ...(therapyType ? { therapy_type: therapyType } : {})
        },
        include: {
            patients: {
                select: {
                    patient_id: true,
                    upid: true,
                    first_name: true,
                    middle_name: true,
                    last_name: true,
                    date_of_birth: true,
                    gender: true
                }
            },
            therapy_sessions: {
                where: {
                    ...(therapistId ? { therapist_id: BigInt(therapistId) } : {})
                },
                include: {
                    users: {
                        select: {
                            user_id: true,
                            staff_profiles: {
                                select: {
                                    employee_code: true,
                                    first_name: true,
                                    last_name: true
                                }
                            }
                        }
                    }
                },
                orderBy: [{ session_number: 'asc' }]
            }
        }
    });

    let rows = orders.map(order => {
        const sessions = order.therapy_sessions || [];
        const prescribed = Number(order.session_count || 0);
        const completed = Number(order.sessions_completed || 0);
        const pending = Math.max(0, prescribed - completed);
        const lastSession = sessions.filter(item => item.session_date).slice(-1)[0] || null;
        const nextScheduled = sessions
            .filter(item => item.scheduled_date && new Date(item.scheduled_date) >= new Date())
            .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))[0] || null;

        const overdueDays = nextScheduled
            ? 0
            : lastSession?.session_date
                ? toDaysDiff(lastSession.session_date)
                : order.order_date
                    ? toDaysDiff(order.order_date)
                    : 0;

        const hasNoShow = sessions.some(item => String(item.attendance_status || '').toLowerCase() === 'no_show');

        let status = 'Not Scheduled';
        if (hasNoShow) status = 'Patient No-Show';
        else if (overdueDays > 0 && pending > 0) status = 'Overdue';

        const therapistProfile = sessions[0]?.users?.staff_profiles;
        const patient = order.patients;

        return {
            order_id: Number(order.order_id),
            order_number: order.order_number,
            patient_id: patient ? Number(patient.patient_id) : null,
            patient_upid: patient?.upid || null,
            patient_name: patient ? [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' ') : null,
            age: patient?.date_of_birth ? Math.max(0, new Date().getUTCFullYear() - new Date(patient.date_of_birth).getUTCFullYear()) : null,
            gender: patient?.gender || null,
            therapy_type: order.therapy_type,
            condition: order.diagnosis || null,
            prescribed_sessions: prescribed,
            completed_sessions: completed,
            pending_sessions: pending,
            progress_percent: prescribed > 0 ? Number(((completed / prescribed) * 100).toFixed(2)) : 0,
            therapist_id: sessions[0]?.therapist_id ? Number(sessions[0].therapist_id) : null,
            therapist_ref: normalizeEmployeeCode(therapistProfile?.employee_code),
            therapist_name: therapistProfile ? [therapistProfile.first_name, therapistProfile.last_name].filter(Boolean).join(' ') : 'Not Assigned',
            last_session_date: dateToYmd(lastSession?.session_date || null),
            next_scheduled_date: dateToYmd(nextScheduled?.scheduled_date || null),
            overdue_days: overdueDays,
            status
        };
    }).filter(item => item.pending_sessions > 0);

    if (search) {
        rows = rows.filter(item => {
            return [
                item.patient_name,
                item.patient_upid,
                item.condition,
                item.therapy_type
            ].filter(Boolean).join(' ').toLowerCase().includes(search);
        });
    }

    if (statusFilter) {
        rows = rows.filter(item => String(item.status || '').toLowerCase() === statusFilter);
    }

    rows.sort((a, b) => b.overdue_days - a.overdue_days);

    return toPagedResult(rows, page, pageSize);
}

export async function getExceptionReportsOverview(prisma, tenantId, filters = {}) {
    const [criticalLabs, delayedDiagnostics, highRisk, missedFollowUps, pendingRehab] = await Promise.all([
        getCriticalLabValuesNotReviewed(prisma, tenantId, { ...filters, page: 1, pageSize: 500 }),
        getDelayedDiagnosticResults(prisma, tenantId, { ...filters, page: 1, pageSize: 500 }),
        getHighRiskPatientsWithoutRecentReview(prisma, tenantId, { ...filters, page: 1, pageSize: 500 }),
        getMissedFollowUps(prisma, tenantId, { ...filters, page: 1, pageSize: 500 }),
        getPendingRehabSessions(prisma, tenantId, { ...filters, page: 1, pageSize: 500 })
    ]);

    const now = nowUtc();

    const recent = [
        ...criticalLabs.data.map(item => ({
            report_type: 'Critical Lab Values Not Reviewed',
            doctor_name: item.doctor?.doctor_name || null,
            patient_name: item.patient?.patient_name || null,
            patient_upid: item.patient?.upid || null,
            event_time: item.result_at,
            severity: item.urgency,
            navigation_key: `critical-lab-values-not-reviewed/${item.test_item_id}`
        })),
        ...delayedDiagnostics.data.map(item => ({
            report_type: 'Delayed Diagnostic Results',
            doctor_name: item.doctor_name,
            patient_name: item.patient_name,
            patient_upid: item.patient_upid,
            event_time: item.ordered_at,
            severity: item.delay_severity,
            navigation_key: `delayed-diagnostic-results/${item.source}/${item.item_id}`
        })),
        ...highRisk.data.map(item => ({
            report_type: 'High Risk Patients Without Recent Review',
            doctor_name: item.doctor_name,
            patient_name: item.patient_name,
            patient_upid: item.patient_upid,
            event_time: item.last_review_date,
            severity: item.risk_level,
            navigation_key: `high-risk-patients-without-recent-review/${item.patient_id}`
        })),
        ...missedFollowUps.data.map(item => ({
            report_type: 'Missed Follow-Ups',
            doctor_name: item.doctor_name,
            patient_name: item.patient_name,
            patient_upid: item.patient_upid,
            event_time: item.due_date,
            severity: item.severity,
            navigation_key: `missed-follow-ups/${item.consultation_id}`
        })),
        ...pendingRehab.data.map(item => ({
            report_type: 'Pending Rehab Sessions',
            doctor_name: item.therapist_name,
            patient_name: item.patient_name,
            patient_upid: item.patient_upid,
            event_time: item.next_scheduled_date || item.last_session_date,
            severity: item.status,
            navigation_key: `pending-rehab-sessions/${item.order_id}`
        }))
    ]
        .filter(item => item.event_time)
        .sort((a, b) => new Date(b.event_time) - new Date(a.event_time))
        .slice(0, 20);

    const trendBuckets = new Map();
    for (let i = 0; i < 7; i += 1) {
        const date = new Date(now);
        date.setUTCDate(now.getUTCDate() - i);
        const key = date.toISOString().slice(0, 10);
        trendBuckets.set(key, { date: key, missed: 0, delayed: 0, overdue: 0 });
    }

    missedFollowUps.data.forEach(item => {
        const key = String(item.due_date || '').slice(0, 10);
        if (trendBuckets.has(key)) trendBuckets.get(key).missed += 1;
    });

    delayedDiagnostics.data.forEach(item => {
        const key = String(item.ordered_at || '').slice(0, 10);
        if (trendBuckets.has(key)) trendBuckets.get(key).delayed += 1;
    });

    highRisk.data.forEach(item => {
        const key = String(item.last_review_date || '').slice(0, 10);
        if (trendBuckets.has(key)) trendBuckets.get(key).overdue += 1;
    });

    const criticalAlerts =
        criticalLabs.data.filter(item => item.urgency === 'Immediate').length
        + delayedDiagnostics.data.filter(item => item.delay_severity === 'critical').length
        + highRisk.data.filter(item => item.risk_level === 'critical').length
        + missedFollowUps.data.filter(item => item.severity === 'critical').length;

    const pendingReview =
        criticalLabs.total
        + delayedDiagnostics.total
        + highRisk.total
        + missedFollowUps.total
        + pendingRehab.total;

    const resolvedToday = await prisma.audit_logs.count({
        where: {
            tenant_id: BigInt(tenantId),
            action: {
                in: ['MARK_CRITICAL_LAB_REVIEWED', 'ESCALATE_DELAYED_DIAGNOSTIC']
            },
            created_at: {
                gte: toDateStart(now.toISOString().slice(0, 10)),
                lte: toDateEnd(now.toISOString().slice(0, 10))
            }
        }
    });

    return {
        stats: {
            total_exceptions: pendingReview,
            critical_alerts: criticalAlerts,
            pending_review: pendingReview,
            resolved_today: resolvedToday
        },
        charts: {
            trend_7_days: Array.from(trendBuckets.values()).sort((a, b) => new Date(a.date) - new Date(b.date)),
            category_breakdown: [
                { category: 'Critical Lab Values Not Reviewed', count: criticalLabs.total },
                { category: 'Delayed Diagnostic Results', count: delayedDiagnostics.total },
                { category: 'High Risk Patients Without Recent Review', count: highRisk.total },
                { category: 'Missed Follow-Ups', count: missedFollowUps.total },
                { category: 'Pending Rehab Sessions', count: pendingRehab.total }
            ]
        },
        recent_exception_reports: recent
    };
}
