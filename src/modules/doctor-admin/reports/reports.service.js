/**
 * Doctor Admin Reports Service
 */

import { normalizeEmployeeCode } from '../../../utils/employeeCodeGenerator.js';

const META_PREFIX = '__SCHEDULE_META__';

function toDateStart(value) { return new Date(`${value}T00:00:00.000Z`); }
function toDateEnd(value) { return new Date(`${value}T23:59:59.999Z`); }
function toDateOnly(value) { return new Date(`${value}T00:00:00.000Z`); }
function dateToIso(value) { return value ? new Date(value).toISOString() : null; }
function dateToYmd(value) { return value ? new Date(value).toISOString().slice(0, 10) : null; }
function toNumber(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function safePercent(numerator, denominator) { return denominator ? Number(((numerator / denominator) * 100).toFixed(2)) : 0; }

function parseDateRange(filters = {}) {
    const whereDate = {};
    if (filters.from_date) whereDate.gte = toDateOnly(filters.from_date);
    if (filters.to_date) whereDate.lte = toDateOnly(filters.to_date);
    return Object.keys(whereDate).length ? whereDate : undefined;
}

function parseDateTimeRange(filters = {}, key) {
    if (!filters.from_date && !filters.to_date) return undefined;
    return {
        [key]: {
            ...(filters.from_date ? { gte: toDateStart(filters.from_date) } : {}),
            ...(filters.to_date ? { lte: toDateEnd(filters.to_date) } : {})
        }
    };
}

function parseScheduleMeta(remarks) {
    if (!remarks || !remarks.startsWith(META_PREFIX)) return {};
    const raw = (remarks.split('\n')[0] || '').slice(META_PREFIX.length);
    try { return JSON.parse(raw); } catch (_) { return {}; }
}

function mergeDutyDateAndTime(dutyDateValue, timeValue) {
    if (!dutyDateValue || !timeValue) return null;
    const dutyDate = new Date(dutyDateValue);
    const time = new Date(timeValue);
    return new Date(Date.UTC(
        dutyDate.getUTCFullYear(),
        dutyDate.getUTCMonth(),
        dutyDate.getUTCDate(),
        time.getUTCHours(),
        time.getUTCMinutes(),
        time.getUTCSeconds(),
        time.getUTCMilliseconds()
    ));
}

function minutesBetween(start, end) {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return diff > 0 ? Math.round(diff / (1000 * 60)) : 0;
}

function getStatusBreakdownMap(rows = []) {
    const map = { scheduled: 0, confirmed: 0, checked_in: 0, completed: 0, cancelled: 0, no_show: 0 };
    rows.forEach(row => {
        const key = row.status || 'scheduled';
        map[key] = (map[key] || 0) + 1;
    });
    return map;
}

function getDateKeyFromDate(date) { return new Date(date).toISOString().slice(0, 10); }
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

function buildSlotsForRoster(roster, appointmentsForDoctorDay = []) {
    const meta = parseScheduleMeta(roster.remarks);
    const scheduleType = meta.schedule_type || 'opd';
    const start = mergeDutyDateAndTime(roster.duty_date, roster.start_time);
    const end = mergeDutyDateAndTime(roster.duty_date, roster.end_time);
    const duration = scheduleType === 'opd' ? Number(meta.slot_duration_minutes || 15) : null;

    if (!start || !end || !duration || duration < 5) {
        return { schedule_type: scheduleType, total_slots: 0, booked_slots: 0, overbooked_slots: 0, slots: [] };
    }

    const totalSlots = Math.floor(minutesBetween(start, end) / duration);
    const slots = [];
    let bookedSlots = 0;
    let overbookedSlots = 0;

    for (let idx = 0; idx < totalSlots; idx += 1) {
        const slotStart = new Date(start.getTime() + (idx * duration * 60000));
        const slotEnd = new Date(slotStart.getTime() + (duration * 60000));

        const activeAppointments = appointmentsForDoctorDay
            .filter(app => {
                const appDateTime = mergeDutyDateAndTime(app.appointment_date, app.appointment_time);
                return appDateTime && appDateTime >= slotStart && appDateTime < slotEnd;
            })
            .filter(app => app.status !== 'cancelled');

        if (activeAppointments.length > 0) bookedSlots += 1;
        if (activeAppointments.length > 1) overbookedSlots += 1;

        slots.push({
            start_time: slotStart.toISOString(),
            end_time: slotEnd.toISOString(),
            appointment_count: activeAppointments.length,
            is_booked: activeAppointments.length > 0
        });
    }

    return { schedule_type: scheduleType, total_slots: totalSlots, booked_slots: bookedSlots, overbooked_slots: overbookedSlots, slots };
}

function buildPatientMix(appointments = [], fromDate) {
    const sorted = [...appointments].sort((a, b) => {
        const ad = mergeDutyDateAndTime(a.appointment_date, a.appointment_time)?.getTime() || 0;
        const bd = mergeDutyDateAndTime(b.appointment_date, b.appointment_time)?.getTime() || 0;
        return ad - bd;
    });

    const seen = new Set();
    const seenBeforeRange = new Set();
    if (fromDate) {
        appointments.forEach(item => {
            if (new Date(item.appointment_date) < fromDate) seenBeforeRange.add(String(item.patient_id));
        });
    }

    let newPatients = 0;
    let followUps = 0;

    sorted.forEach(item => {
        const key = String(item.patient_id);
        if (seenBeforeRange.has(key) || seen.has(key)) followUps += 1;
        else {
            newPatients += 1;
            seen.add(key);
        }
    });

    return {
        new_patients: newPatients,
        follow_up_patients: followUps,
        new_patient_percentage: safePercent(newPatients, newPatients + followUps),
        follow_up_percentage: safePercent(followUps, newPatients + followUps)
    };
}

export async function getAllDoctorsOverview(prisma, tenantId, filters = {}) {
    const doctors = await getDoctors(prisma, tenantId, filters);
    const doctorUserIds = doctors.map(d => BigInt(d.user_id));
    const doctorProfileIds = doctors.map(d => BigInt(d.profile_id));
    const dateRange = parseDateRange(filters);

    const [appointments, opdVisits, ipdAdmissions, rosters, bills] = await Promise.all([
        prisma.appointments.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                doctor_id: doctorUserIds.length ? { in: doctorUserIds } : { equals: BigInt(-1) },
                ...(dateRange ? { appointment_date: dateRange } : {})
            },
            select: { appointment_date: true, appointment_time: true, doctor_id: true, patient_id: true, status: true }
        }),
        prisma.opd_visits.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                doctor_id: doctorUserIds.length ? { in: doctorUserIds } : { equals: BigInt(-1) },
                ...(dateRange ? { visit_date: dateRange } : {})
            },
            select: {
                visit_id: true,
                visit_date: true,
                visit_time: true,
                checked_in_at: true,
                consultation_start_at: true,
                consultation_end_at: true,
                patient_id: true,
                status: true
            }
        }),
        prisma.ipd_admissions.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                admitting_doctor_id: doctorUserIds.length ? { in: doctorUserIds } : { equals: BigInt(-1) },
                ...parseDateTimeRange(filters, 'admission_date')
            },
            select: { admission_id: true }
        }),
        prisma.duty_roster.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                staff_id: doctorProfileIds.length ? { in: doctorProfileIds } : { equals: BigInt(-1) },
                ...(dateRange ? { duty_date: dateRange } : {})
            },
            select: { staff_id: true, duty_date: true, start_time: true, end_time: true, remarks: true }
        }),
        prisma.bills.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                visit_id: { not: null },
                ...parseDateTimeRange(filters, 'bill_date')
            },
            select: { visit_id: true, payment_status: true, net_amount: true }
        })
    ]);

    const appointmentStatus = getStatusBreakdownMap(appointments);

    const waitRows = opdVisits.map(item => {
        const visitDateTime = mergeDutyDateAndTime(item.visit_date, item.visit_time);
        return {
            queueWait: minutesBetween(item.checked_in_at, item.consultation_start_at),
            consultDelay: minutesBetween(visitDateTime, item.consultation_start_at),
            consultDuration: minutesBetween(item.consultation_start_at, item.consultation_end_at)
        };
    });

    const avgQueue = waitRows.length ? Number((waitRows.reduce((a, b) => a + b.queueWait, 0) / waitRows.length).toFixed(2)) : 0;
    const avgDelay = waitRows.length ? Number((waitRows.reduce((a, b) => a + b.consultDelay, 0) / waitRows.length).toFixed(2)) : 0;
    const avgDuration = waitRows.length ? Number((waitRows.reduce((a, b) => a + b.consultDuration, 0) / waitRows.length).toFixed(2)) : 0;

    const appointmentsByDoctorDate = new Map();
    appointments.forEach(app => {
        if (!app.doctor_id) return;
        const key = `${String(app.doctor_id)}_${getDateKeyFromDate(app.appointment_date)}`;
        if (!appointmentsByDoctorDate.has(key)) appointmentsByDoctorDate.set(key, []);
        appointmentsByDoctorDate.get(key).push(app);
    });

    let totalSlots = 0;
    let bookedSlots = 0;
    let overbookedSlots = 0;
    rosters.forEach(roster => {
        const doctorUserId = doctors.find(d => String(d.profile_id) === String(roster.staff_id))?.user_id;
        const dayKey = doctorUserId ? `${String(doctorUserId)}_${getDateKeyFromDate(roster.duty_date)}` : null;
        const slotData = buildSlotsForRoster(roster, dayKey ? (appointmentsByDoctorDate.get(dayKey) || []) : []);
        if (slotData.schedule_type === 'opd') {
            totalSlots += slotData.total_slots;
            bookedSlots += slotData.booked_slots;
            overbookedSlots += slotData.overbooked_slots;
        }
    });

    const patientMix = buildPatientMix(appointments, filters.from_date ? toDateOnly(filters.from_date) : null);

    return {
        doctors_count: doctors.length,
        schedule_utilization: {
            total_slots: totalSlots,
            booked_slots: bookedSlots,
            fill_rate_percentage: safePercent(bookedSlots, totalSlots),
            cancelled_appointments: appointmentStatus.cancelled || 0,
            overbooked_slots: overbookedSlots
        },
        appointment_funnel: appointmentStatus,
        clinical_workload: {
            opd_visits: opdVisits.length,
            ipd_admissions: ipdAdmissions.length
        },
        revenue_linked_activity: {
            consultations_total: opdVisits.length,
            consultations_billed: new Set(bills.map(b => String(b.visit_id))).size,
            billed_completed_paid: bills.filter(b => b.payment_status === 'paid').length,
            billed_amount_total: Number(bills.reduce((acc, item) => acc + toNumber(item.net_amount), 0).toFixed(2))
        },
        patient_mix: patientMix,
        wait_time_summary: {
            avg_queue_time_minutes: avgQueue,
            avg_consultation_start_delay_minutes: avgDelay,
            avg_consultation_duration_minutes: avgDuration
        },
        patient_metrics: {
            unique_patients_from_appointments: new Set(appointments.map(a => String(a.patient_id))).size
        }
    };
}

async function buildDoctorMetrics(prisma, tenantId, doctor, filters) {
    const dateRange = parseDateRange(filters);

    const [appointments, opdVisits, ipdAdmissions, rosters, followUps] = await Promise.all([
        prisma.appointments.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                doctor_id: BigInt(doctor.user_id),
                ...(dateRange ? { appointment_date: dateRange } : {})
            },
            select: { appointment_date: true, appointment_time: true, patient_id: true, status: true }
        }),
        prisma.opd_visits.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                doctor_id: BigInt(doctor.user_id),
                ...(dateRange ? { visit_date: dateRange } : {})
            },
            select: {
                visit_id: true,
                patient_id: true,
                consultation_start_at: true,
                consultation_end_at: true
            }
        }),
        prisma.ipd_admissions.count({
            where: {
                tenant_id: BigInt(tenantId),
                admitting_doctor_id: BigInt(doctor.user_id),
                ...parseDateTimeRange(filters, 'admission_date')
            }
        }),
        prisma.duty_roster.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                staff_id: BigInt(doctor.profile_id),
                ...(dateRange ? { duty_date: dateRange } : {})
            },
            select: { duty_date: true, start_time: true, end_time: true, is_available: true, remarks: true }
        }),
        prisma.opd_consultations.count({
            where: {
                tenant_id: BigInt(tenantId),
                doctor_id: BigInt(doctor.user_id),
                follow_up_date: {
                    gte: toDateOnly(new Date().toISOString().slice(0, 10)),
                    lte: toDateOnly(new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10))
                }
            }
        })
    ]);

    const statusBreakdown = getStatusBreakdownMap(appointments);
    const completionRate = safePercent(statusBreakdown.completed || 0, appointments.length);

    let opdMinutes = 0;
    let ipdMinutes = 0;
    let availableBlocks = 0;
    rosters.forEach(row => {
        const meta = parseScheduleMeta(row.remarks);
        const scheduleType = meta.schedule_type || 'opd';
        const duration = minutesBetween(
            mergeDutyDateAndTime(row.duty_date, row.start_time),
            mergeDutyDateAndTime(row.duty_date, row.end_time)
        );
        if (scheduleType === 'opd') opdMinutes += duration;
        else ipdMinutes += duration;
        if (row.is_available !== false) availableBlocks += 1;
    });

    const consultDurations = opdVisits
        .map(v => minutesBetween(v.consultation_start_at, v.consultation_end_at))
        .filter(v => v > 0);

    const patientMix = buildPatientMix(appointments, filters.from_date ? toDateOnly(filters.from_date) : null);

    return {
        doctor_profile_id: Number(doctor.profile_id),
        doctor_user_id: Number(doctor.user_id),
        doctor_ref: normalizeEmployeeCode(doctor.employee_code),
        doctor_name: getDoctorNameFromProfile(doctor),
        specialization: doctor.specialization || null,
        department_id: doctor.department_id || null,
        department_name: doctor.departments?.department_name || null,
        performance_snapshot: {
            patients_seen: new Set(opdVisits.map(v => String(v.patient_id))).size,
            completion_rate: completionRate,
            no_show_count: statusBreakdown.no_show || 0,
            no_show_impact_percentage: safePercent(statusBreakdown.no_show || 0, appointments.length)
        },
        appointments: {
            total: appointments.length,
            status_breakdown: statusBreakdown
        },
        clinical_load: {
            opd_visits: opdVisits.length,
            ipd_admissions: ipdAdmissions,
            new_patients: patientMix.new_patients,
            follow_up_patients: patientMix.follow_up_patients,
            repeat_patients: new Set(
                appointments.map(a => String(a.patient_id)).filter((pid, idx, arr) => arr.indexOf(pid) !== idx)
            ).size,
            avg_consult_duration_minutes: consultDurations.length
                ? Number((consultDurations.reduce((a, b) => a + b, 0) / consultDurations.length).toFixed(2))
                : 0
        },
        calendar_summary: {
            opd_hours: Number((opdMinutes / 60).toFixed(2)),
            ipd_hours: Number((ipdMinutes / 60).toFixed(2)),
            total_blocks: rosters.length,
            available_blocks: availableBlocks,
            occupied_blocks: Math.max(0, rosters.length - availableBlocks)
        },
        follow_up_due_next_7_days: followUps
    };
}

export async function getDoctorWiseReport(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const doctors = await getDoctors(prisma, tenantId, filters);

    const total = doctors.length;
    const startIndex = (page - 1) * pageSize;
    const data = await Promise.all(doctors.slice(startIndex, startIndex + pageSize).map(
        doctor => buildDoctorMetrics(prisma, tenantId, doctor, filters)
    ));

    return {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        data
    };
}

export async function getDoctorPatientsReport(prisma, tenantId, doctorRef, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const doctor = await resolveDoctorByRef(prisma, tenantId, doctorRef);
    const dateRange = parseDateRange(filters);

    const [appointments, opdVisits, ipdAdmissions, consultations] = await Promise.all([
        prisma.appointments.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                doctor_id: BigInt(doctor.user_id),
                ...(dateRange ? { appointment_date: dateRange } : {})
            },
            include: {
                patients: {
                    select: {
                        patient_id: true,
                        upid: true,
                        first_name: true,
                        middle_name: true,
                        last_name: true,
                        gender: true,
                        mobile_primary: true,
                        date_of_birth: true
                    }
                }
            }
        }),
        prisma.opd_visits.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                doctor_id: BigInt(doctor.user_id),
                ...(dateRange ? { visit_date: dateRange } : {})
            },
            include: {
                patients: {
                    select: {
                        patient_id: true,
                        upid: true,
                        first_name: true,
                        middle_name: true,
                        last_name: true,
                        gender: true,
                        mobile_primary: true,
                        date_of_birth: true
                    }
                }
            }
        }),
        prisma.ipd_admissions.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                admitting_doctor_id: BigInt(doctor.user_id),
                ...parseDateTimeRange(filters, 'admission_date')
            },
            include: {
                patients: {
                    select: {
                        patient_id: true,
                        upid: true,
                        first_name: true,
                        middle_name: true,
                        last_name: true,
                        gender: true,
                        mobile_primary: true,
                        date_of_birth: true
                    }
                }
            }
        }),
        prisma.opd_consultations.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                doctor_id: BigInt(doctor.user_id)
            },
            select: {
                visit_id: true,
                provisional_diagnosis: true,
                final_diagnosis: true,
                follow_up_date: true
            }
        })
    ]);

    const consultationByVisit = new Map(consultations.map(c => [String(c.visit_id), c]));
    const map = new Map();

    function ensure(patient) {
        const key = String(patient.patient_id);
        if (!map.has(key)) {
            map.set(key, {
                patient_id: Number(patient.patient_id),
                upid: patient.upid,
                full_name: [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' '),
                gender: patient.gender,
                mobile_primary: patient.mobile_primary,
                date_of_birth: dateToYmd(patient.date_of_birth),
                appointment_count: 0,
                opd_visit_count: 0,
                ipd_admission_count: 0,
                diagnosis_context: null,
                follow_up_due: null,
                interaction_types: [],
                last_interaction_at: null
            });
        }
        return map.get(key);
    }

    appointments.forEach(item => {
        if (!item.patients) return;
        const row = ensure(item.patients);
        row.appointment_count += 1;
        if (!row.interaction_types.includes('appointment')) row.interaction_types.push('appointment');
        const at = dateToIso(item.appointment_date);
        if (!row.last_interaction_at || new Date(at) > new Date(row.last_interaction_at)) row.last_interaction_at = at;
    });

    opdVisits.forEach(item => {
        if (!item.patients) return;
        const row = ensure(item.patients);
        row.opd_visit_count += 1;
        if (!row.interaction_types.includes('opd_visit')) row.interaction_types.push('opd_visit');
        const at = dateToIso(item.visit_date);
        if (!row.last_interaction_at || new Date(at) > new Date(row.last_interaction_at)) row.last_interaction_at = at;
        const consultation = consultationByVisit.get(String(item.visit_id));
        if (consultation) {
            row.diagnosis_context = consultation.final_diagnosis || consultation.provisional_diagnosis || row.diagnosis_context;
            row.follow_up_due = consultation.follow_up_date ? dateToYmd(consultation.follow_up_date) : row.follow_up_due;
        }
    });

    ipdAdmissions.forEach(item => {
        if (!item.patients) return;
        const row = ensure(item.patients);
        row.ipd_admission_count += 1;
        if (!row.interaction_types.includes('ipd_admission')) row.interaction_types.push('ipd_admission');
        const at = dateToIso(item.admission_date);
        if (!row.last_interaction_at || new Date(at) > new Date(row.last_interaction_at)) row.last_interaction_at = at;
    });

    let data = Array.from(map.values()).map(item => ({
        ...item,
        total_interactions: item.appointment_count + item.opd_visit_count + item.ipd_admission_count
    }));

    if (filters.search) {
        const search = String(filters.search).toLowerCase();
        data = data.filter(item =>
            String(item.upid || '').toLowerCase().includes(search)
            || String(item.full_name || '').toLowerCase().includes(search)
            || String(item.mobile_primary || '').toLowerCase().includes(search)
        );
    }

    data.sort((a, b) => {
        if (!a.last_interaction_at && !b.last_interaction_at) return 0;
        if (!a.last_interaction_at) return 1;
        if (!b.last_interaction_at) return -1;
        return new Date(b.last_interaction_at) - new Date(a.last_interaction_at);
    });

    const total = data.length;
    const startIndex = (page - 1) * pageSize;

    return {
        doctor_ref: normalizeEmployeeCode(doctor.employee_code),
        doctor_name: getDoctorNameFromProfile(doctor),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        data: data.slice(startIndex, startIndex + pageSize)
    };
}

export async function getFollowUpDueReport(prisma, tenantId, filters = {}) {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const days = Number(filters.days || 7);
    const endDate = new Date(today);
    endDate.setUTCDate(endDate.getUTCDate() + days);

    const fromDate = filters.from_date ? toDateOnly(filters.from_date) : today;
    const toDate = filters.to_date ? toDateOnly(filters.to_date) : endDate;

    let doctorUserId = null;
    if (filters.doctor_ref) {
        const doctor = await resolveDoctorByRef(prisma, tenantId, filters.doctor_ref);
        doctorUserId = BigInt(doctor.user_id);
    }

    const rows = await prisma.opd_consultations.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            follow_up_date: { gte: fromDate, lte: toDate },
            ...(doctorUserId ? { doctor_id: doctorUserId } : {})
        },
        include: {
            users: {
                select: {
                    user_id: true,
                    staff_profiles: {
                        select: { employee_code: true, first_name: true, last_name: true }
                    }
                }
            },
            opd_visits: {
                select: {
                    visit_id: true,
                    visit_number: true,
                    visit_date: true,
                    patients: {
                        select: {
                            patient_id: true,
                            upid: true,
                            first_name: true,
                            middle_name: true,
                            last_name: true,
                            mobile_primary: true
                        }
                    }
                }
            }
        },
        orderBy: [{ follow_up_date: 'asc' }]
    });

    return {
        from_date: dateToYmd(fromDate),
        to_date: dateToYmd(toDate),
        total: rows.length,
        data: rows.map(row => {
            const patient = row.opd_visits?.patients;
            const doctorProfile = row.users?.staff_profiles;
            return {
                consultation_id: Number(row.consultation_id),
                follow_up_date: dateToYmd(row.follow_up_date),
                follow_up_instructions: row.follow_up_instructions || null,
                patient: patient
                    ? {
                        patient_id: Number(patient.patient_id),
                        upid: patient.upid,
                        full_name: [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' '),
                        mobile_primary: patient.mobile_primary
                    }
                    : null,
                doctor: {
                    doctor_user_id: row.doctor_id ? Number(row.doctor_id) : null,
                    doctor_ref: normalizeEmployeeCode(doctorProfile?.employee_code),
                    doctor_name: doctorProfile
                        ? [doctorProfile.first_name, doctorProfile.last_name].filter(Boolean).join(' ')
                        : null
                },
                visit: row.opd_visits
                    ? {
                        visit_id: Number(row.opd_visits.visit_id),
                        visit_number: row.opd_visits.visit_number,
                        visit_date: dateToYmd(row.opd_visits.visit_date)
                    }
                    : null
            };
        })
    };
}

export async function getDepartmentWorkload(prisma, tenantId, filters = {}) {
    const doctors = await getDoctors(prisma, tenantId, filters);
    const doctorByUserId = new Map(doctors.map(d => [String(d.user_id), d]));
    const doctorByProfileId = new Map(doctors.map(d => [String(d.profile_id), d]));
    const dateRange = parseDateRange(filters);

    const [appointments, opdVisits, ipdAdmissions, rosters] = await Promise.all([
        prisma.appointments.findMany({
            where: { tenant_id: BigInt(tenantId), ...(dateRange ? { appointment_date: dateRange } : {}) },
            select: { department_id: true, patient_id: true }
        }),
        prisma.opd_visits.findMany({
            where: { tenant_id: BigInt(tenantId), ...(dateRange ? { visit_date: dateRange } : {}) },
            select: { department_id: true, patient_id: true }
        }),
        prisma.ipd_admissions.findMany({
            where: { tenant_id: BigInt(tenantId), ...parseDateTimeRange(filters, 'admission_date') },
            select: { patient_id: true, admitting_doctor_id: true }
        }),
        prisma.duty_roster.findMany({
            where: { tenant_id: BigInt(tenantId), ...(dateRange ? { duty_date: dateRange } : {}) },
            select: { staff_id: true, department_id: true, duty_date: true, start_time: true, end_time: true, remarks: true }
        })
    ]);

    const map = new Map();
    function ensureDept(departmentId, fallbackName = null) {
        const key = String(departmentId || 0);
        if (!map.has(key)) {
            map.set(key, {
                department_id: departmentId || null,
                department_name: fallbackName,
                doctor_ids: new Set(),
                opd_hours: 0,
                ipd_hours: 0,
                appointment_count: 0,
                opd_visit_count: 0,
                ipd_admission_count: 0,
                unique_patients: new Set()
            });
        }
        return map.get(key);
    }

    doctors.forEach(doc => {
        const row = ensureDept(doc.department_id, doc.departments?.department_name || null);
        row.doctor_ids.add(String(doc.profile_id));
    });

    rosters.forEach(item => {
        const doctor = doctorByProfileId.get(String(item.staff_id));
        const dept = ensureDept(item.department_id || doctor?.department_id || null, doctor?.departments?.department_name || null);
        const scheduleType = parseScheduleMeta(item.remarks).schedule_type || 'opd';
        const hrs = minutesBetween(
            mergeDutyDateAndTime(item.duty_date, item.start_time),
            mergeDutyDateAndTime(item.duty_date, item.end_time)
        ) / 60;
        if (scheduleType === 'opd') dept.opd_hours += hrs;
        else dept.ipd_hours += hrs;
    });

    appointments.forEach(item => {
        const dept = ensureDept(item.department_id || null, null);
        dept.appointment_count += 1;
        dept.unique_patients.add(String(item.patient_id));
    });

    opdVisits.forEach(item => {
        const dept = ensureDept(item.department_id || null, null);
        dept.opd_visit_count += 1;
        dept.unique_patients.add(String(item.patient_id));
    });

    ipdAdmissions.forEach(item => {
        const doctor = doctorByUserId.get(String(item.admitting_doctor_id || ''));
        const dept = ensureDept(doctor?.department_id || null, doctor?.departments?.department_name || null);
        dept.ipd_admission_count += 1;
        dept.unique_patients.add(String(item.patient_id));
    });

    return {
        total_departments: map.size,
        data: Array.from(map.values()).map(item => ({
            department_id: item.department_id,
            department_name: item.department_name,
            doctor_count: item.doctor_ids.size,
            opd_hours: Number(item.opd_hours.toFixed(2)),
            ipd_hours: Number(item.ipd_hours.toFixed(2)),
            patient_volume: item.unique_patients.size,
            appointment_count: item.appointment_count,
            opd_visit_count: item.opd_visit_count,
            ipd_admission_count: item.ipd_admission_count
        }))
    };
}

export async function getWaitTimeSummary(prisma, tenantId, filters = {}) {
    const doctors = await getDoctors(prisma, tenantId, filters);
    const doctorUserIds = doctors.map(d => BigInt(d.user_id));
    const dateRange = parseDateRange(filters);

    const visits = await prisma.opd_visits.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            doctor_id: doctorUserIds.length ? { in: doctorUserIds } : { equals: BigInt(-1) },
            ...(filters.department_id ? { department_id: Number(filters.department_id) } : {}),
            ...(dateRange ? { visit_date: dateRange } : {})
        },
        select: {
            visit_date: true,
            visit_time: true,
            checked_in_at: true,
            consultation_start_at: true,
            consultation_end_at: true
        }
    });

    const rows = visits.map(item => {
        const visitDateTime = mergeDutyDateAndTime(item.visit_date, item.visit_time);
        return {
            queue: minutesBetween(item.checked_in_at, item.consultation_start_at),
            delay: minutesBetween(visitDateTime, item.consultation_start_at),
            duration: minutesBetween(item.consultation_start_at, item.consultation_end_at)
        };
    });

    const total = rows.length;
    return {
        total_visits_considered: total,
        avg_queue_time_minutes: total ? Number((rows.reduce((a, b) => a + b.queue, 0) / total).toFixed(2)) : 0,
        avg_consultation_start_delay_minutes: total ? Number((rows.reduce((a, b) => a + b.delay, 0) / total).toFixed(2)) : 0,
        avg_consultation_duration_minutes: total ? Number((rows.reduce((a, b) => a + b.duration, 0) / total).toFixed(2)) : 0
    };
}

export async function getRevenueLinkedActivity(prisma, tenantId, filters = {}) {
    const doctors = await getDoctors(prisma, tenantId, filters);
    const doctorUserIds = doctors.map(d => BigInt(d.user_id));
    const dateRange = parseDateRange(filters);

    const visits = await prisma.opd_visits.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            doctor_id: doctorUserIds.length ? { in: doctorUserIds } : { equals: BigInt(-1) },
            ...(filters.department_id ? { department_id: Number(filters.department_id) } : {}),
            ...(dateRange ? { visit_date: dateRange } : {})
        },
        select: { visit_id: true, status: true }
    });

    const visitIds = visits.map(v => BigInt(v.visit_id));
    const bills = await prisma.bills.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            visit_id: visitIds.length ? { in: visitIds } : { equals: BigInt(-1) },
            ...parseDateTimeRange(filters, 'bill_date')
        },
        select: { payment_status: true, net_amount: true, paid_amount: true }
    });

    return {
        consultations_total: visits.length,
        consultations_completed: visits.filter(v => v.status === 'completed').length,
        billed_consultations: bills.length,
        billed_completed_paid: bills.filter(b => b.payment_status === 'paid').length,
        billed_amount_total: Number(bills.reduce((acc, b) => acc + toNumber(b.net_amount), 0).toFixed(2)),
        paid_amount_total: Number(bills.reduce((acc, b) => acc + toNumber(b.paid_amount), 0).toFixed(2))
    };
}

export async function getPatientMixReport(prisma, tenantId, filters = {}) {
    const doctors = await getDoctors(prisma, tenantId, filters);
    const doctorUserIds = doctors.map(d => BigInt(d.user_id));
    const dateRange = parseDateRange(filters);

    const appointments = await prisma.appointments.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            doctor_id: doctorUserIds.length ? { in: doctorUserIds } : { equals: BigInt(-1) },
            ...(dateRange ? { appointment_date: dateRange } : {})
        },
        select: { patient_id: true, appointment_date: true, appointment_time: true }
    });

    return buildPatientMix(appointments, filters.from_date ? toDateOnly(filters.from_date) : null);
}

export async function getDoctorCalendarSummary(prisma, tenantId, doctorRef, filters = {}) {
    const doctor = await resolveDoctorByRef(prisma, tenantId, doctorRef);
    const fromDate = filters.from_date ? toDateOnly(filters.from_date) : toDateOnly(new Date().toISOString().slice(0, 10));
    const toDate = filters.to_date
        ? toDateOnly(filters.to_date)
        : toDateOnly(new Date(Date.now() + (6 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10));

    const [rosters, appointments] = await Promise.all([
        prisma.duty_roster.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                staff_id: BigInt(doctor.profile_id),
                duty_date: { gte: fromDate, lte: toDate }
            },
            select: { duty_date: true, start_time: true, end_time: true, is_available: true, remarks: true },
            orderBy: [{ duty_date: 'asc' }, { start_time: 'asc' }]
        }),
        prisma.appointments.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                doctor_id: BigInt(doctor.user_id),
                appointment_date: { gte: fromDate, lte: toDate }
            },
            select: { appointment_date: true, appointment_time: true, status: true }
        })
    ]);

    const appointmentsByDay = new Map();
    appointments.forEach(app => {
        const key = getDateKeyFromDate(app.appointment_date);
        if (!appointmentsByDay.has(key)) appointmentsByDay.set(key, []);
        appointmentsByDay.get(key).push(app);
    });

    const dayMap = new Map();
    rosters.forEach(roster => {
        const dayKey = getDateKeyFromDate(roster.duty_date);
        if (!dayMap.has(dayKey)) {
            dayMap.set(dayKey, {
                date: dayKey,
                opd_blocks: 0,
                ipd_blocks: 0,
                available_blocks: 0,
                occupied_blocks: 0,
                total_slots: 0,
                booked_slots: 0
            });
        }

        const row = dayMap.get(dayKey);
        const slotData = buildSlotsForRoster(roster, appointmentsByDay.get(dayKey) || []);
        if (slotData.schedule_type === 'opd') row.opd_blocks += 1;
        else row.ipd_blocks += 1;

        row.total_slots += slotData.total_slots;
        row.booked_slots += slotData.booked_slots;
        if (roster.is_available === false) row.occupied_blocks += 1;
        else row.available_blocks += 1;
    });

    const daily = Array.from(dayMap.values()).map(item => ({
        ...item,
        fill_rate_percentage: safePercent(item.booked_slots, item.total_slots)
    }));

    if ((filters.view || 'daily') !== 'weekly') {
        return {
            doctor_ref: normalizeEmployeeCode(doctor.employee_code),
            doctor_name: getDoctorNameFromProfile(doctor),
            view: 'daily',
            from_date: dateToYmd(fromDate),
            to_date: dateToYmd(toDate),
            data: daily
        };
    }

    const weekMap = new Map();
    daily.forEach(item => {
        const dt = new Date(`${item.date}T00:00:00.000Z`);
        const weekStart = new Date(dt);
        weekStart.setUTCDate(dt.getUTCDate() - dt.getUTCDay());
        const key = dateToYmd(weekStart);
        if (!weekMap.has(key)) {
            weekMap.set(key, {
                week_start: key,
                opd_blocks: 0,
                ipd_blocks: 0,
                available_blocks: 0,
                occupied_blocks: 0,
                total_slots: 0,
                booked_slots: 0
            });
        }
        const row = weekMap.get(key);
        row.opd_blocks += item.opd_blocks;
        row.ipd_blocks += item.ipd_blocks;
        row.available_blocks += item.available_blocks;
        row.occupied_blocks += item.occupied_blocks;
        row.total_slots += item.total_slots;
        row.booked_slots += item.booked_slots;
    });

    return {
        doctor_ref: normalizeEmployeeCode(doctor.employee_code),
        doctor_name: getDoctorNameFromProfile(doctor),
        view: 'weekly',
        from_date: dateToYmd(fromDate),
        to_date: dateToYmd(toDate),
        data: Array.from(weekMap.values()).map(item => ({
            ...item,
            fill_rate_percentage: safePercent(item.booked_slots, item.total_slots)
        }))
    };
}

export async function getDoctorSlotEffectiveness(prisma, tenantId, doctorRef, filters = {}) {
    const doctor = await resolveDoctorByRef(prisma, tenantId, doctorRef);
    const dateRange = parseDateRange(filters);

    const [rosters, appointments] = await Promise.all([
        prisma.duty_roster.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                staff_id: BigInt(doctor.profile_id),
                ...(dateRange ? { duty_date: dateRange } : {})
            },
            select: { duty_date: true, start_time: true, end_time: true, remarks: true }
        }),
        prisma.appointments.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                doctor_id: BigInt(doctor.user_id),
                ...(dateRange ? { appointment_date: dateRange } : {})
            },
            select: { appointment_date: true, appointment_time: true, status: true }
        })
    ]);

    const appointmentsByDay = new Map();
    appointments.forEach(app => {
        const key = getDateKeyFromDate(app.appointment_date);
        if (!appointmentsByDay.has(key)) appointmentsByDay.set(key, []);
        appointmentsByDay.get(key).push(app);
    });

    const byHour = {};
    for (let i = 0; i < 24; i += 1) {
        byHour[String(i).padStart(2, '0')] = { total_slots: 0, booked_slots: 0, overbooked_slots: 0 };
    }

    let totalSlots = 0;
    let totalBooked = 0;
    let totalOverbooked = 0;

    rosters.forEach(roster => {
        const dayKey = getDateKeyFromDate(roster.duty_date);
        const slotData = buildSlotsForRoster(roster, appointmentsByDay.get(dayKey) || []);
        if (slotData.schedule_type !== 'opd') return;

        totalSlots += slotData.total_slots;
        totalBooked += slotData.booked_slots;
        totalOverbooked += slotData.overbooked_slots;

        slotData.slots.forEach(slot => {
            const hourKey = String(new Date(slot.start_time).getUTCHours()).padStart(2, '0');
            byHour[hourKey].total_slots += 1;
            if (slot.is_booked) byHour[hourKey].booked_slots += 1;
            if ((slot.appointment_count || 0) > 1) byHour[hourKey].overbooked_slots += 1;
        });
    });

    const hourData = Object.entries(byHour).map(([hour, item]) => ({
        hour,
        ...item,
        fill_rate_percentage: safePercent(item.booked_slots, item.total_slots)
    }));

    return {
        doctor_ref: normalizeEmployeeCode(doctor.employee_code),
        doctor_name: getDoctorNameFromProfile(doctor),
        total_slots: totalSlots,
        booked_slots: totalBooked,
        fill_rate_percentage: safePercent(totalBooked, totalSlots),
        overbooking_risk_slots: totalOverbooked,
        most_booked_hours: [...hourData].filter(h => h.booked_slots > 0).sort((a, b) => b.booked_slots - a.booked_slots).slice(0, 3),
        underutilized_windows: hourData.filter(h => h.total_slots > 0 && h.fill_rate_percentage < 30),
        by_hour: hourData
    };
}

export async function getDoctorLeaveImpact(prisma, tenantId, doctorRef, filters = {}) {
    const doctor = await resolveDoctorByRef(prisma, tenantId, doctorRef);
    const fromDate = filters.from_date ? toDateOnly(filters.from_date) : toDateOnly('1900-01-01');
    const toDate = filters.to_date ? toDateOnly(filters.to_date) : toDateOnly('2999-12-31');

    const [leaves, rosters, appointments] = await Promise.all([
        prisma.leave_applications.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                staff_id: BigInt(doctor.profile_id),
                status: 'approved',
                start_date: { lte: toDate },
                end_date: { gte: fromDate }
            },
            select: { leave_id: true, leave_type: true, start_date: true, end_date: true, total_days: true, remarks: true }
        }),
        prisma.duty_roster.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                staff_id: BigInt(doctor.profile_id),
                duty_date: { gte: fromDate, lte: toDate }
            },
            select: { duty_date: true, start_time: true, end_time: true, remarks: true }
        }),
        prisma.appointments.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                doctor_id: BigInt(doctor.user_id),
                appointment_date: { gte: fromDate, lte: toDate }
            },
            select: { appointment_date: true, status: true, cancellation_reason: true }
        })
    ]);

    const leaveDates = new Set();
    leaves.forEach(item => {
        const start = new Date(item.start_date);
        const end = new Date(item.end_date);
        const cursor = new Date(start);
        while (cursor <= end) {
            leaveDates.add(dateToYmd(cursor));
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
    });

    let missedSlots = 0;
    rosters.forEach(row => {
        if (!leaveDates.has(dateToYmd(row.duty_date))) return;
        missedSlots += buildSlotsForRoster(row, []).total_slots;
    });

    const affectedAppointments = appointments.filter(item => leaveDates.has(dateToYmd(item.appointment_date)));
    const potentialReschedules = affectedAppointments.filter(item => {
        const reason = String(item.cancellation_reason || '').toLowerCase();
        return item.status === 'cancelled' && (reason.includes('resched') || reason.includes('reschedule'));
    }).length;

    return {
        doctor_ref: normalizeEmployeeCode(doctor.employee_code),
        doctor_name: getDoctorNameFromProfile(doctor),
        approved_leaves_count: leaves.length,
        leave_days: leaveDates.size,
        missed_slots: missedSlots,
        affected_appointments: affectedAppointments.length,
        potential_reschedules: potentialReschedules,
        leaves: leaves.map(item => ({
            leave_id: Number(item.leave_id),
            leave_type: item.leave_type,
            start_date: dateToYmd(item.start_date),
            end_date: dateToYmd(item.end_date),
            total_days: item.total_days,
            remarks: item.remarks
        }))
    };
}

export async function getChronicRepeatPatients(prisma, tenantId, filters = {}) {
    let doctorUserId = null;
    if (filters.doctor_ref) {
        const doctor = await resolveDoctorByRef(prisma, tenantId, filters.doctor_ref);
        doctorUserId = BigInt(doctor.user_id);
    }

    const minVisits = Number(filters.min_visits || 3);
    const dateRange = parseDateRange(filters);

    const visits = await prisma.opd_visits.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            ...(doctorUserId ? { doctor_id: doctorUserId } : {}),
            ...(dateRange ? { visit_date: dateRange } : {})
        },
        include: {
            patients: {
                select: {
                    patient_id: true,
                    upid: true,
                    first_name: true,
                    middle_name: true,
                    last_name: true,
                    mobile_primary: true
                }
            }
        }
    });

    const consultations = await prisma.opd_consultations.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            ...(doctorUserId ? { doctor_id: doctorUserId } : {}),
            follow_up_date: { lt: toDateOnly(new Date().toISOString().slice(0, 10)) }
        },
        select: { visit_id: true, follow_up_date: true }
    });

    const visitsByPatient = new Map();
    visits.forEach(v => {
        const key = String(v.patient_id);
        if (!visitsByPatient.has(key)) visitsByPatient.set(key, { patient: v.patients, visit_dates: [], count: 0 });
        const row = visitsByPatient.get(key);
        row.count += 1;
        row.visit_dates.push(dateToYmd(v.visit_date));
    });

    const followUpMissMap = new Map();
    consultations.forEach(item => {
        const visit = visits.find(v => String(v.visit_id) === String(item.visit_id));
        if (!visit) return;
        const key = String(visit.patient_id);
        if (!followUpMissMap.has(key)) followUpMissMap.set(key, 0);

        const dueDate = dateToYmd(item.follow_up_date);
        const hadVisitAfterDue = (visitsByPatient.get(key)?.visit_dates || []).some(d => d >= dueDate);
        if (!hadVisitAfterDue) followUpMissMap.set(key, followUpMissMap.get(key) + 1);
    });

    const data = Array.from(visitsByPatient.values())
        .filter(item => item.count >= minVisits)
        .map(item => ({
            patient_id: Number(item.patient.patient_id),
            upid: item.patient.upid,
            full_name: [item.patient.first_name, item.patient.middle_name, item.patient.last_name].filter(Boolean).join(' '),
            mobile_primary: item.patient.mobile_primary,
            visit_count: item.count,
            missed_followups: followUpMissMap.get(String(item.patient.patient_id)) || 0,
            last_visit_date: item.visit_dates.sort().slice(-1)[0] || null
        }))
        .sort((a, b) => b.visit_count - a.visit_count);

    return { min_visits_threshold: minVisits, total: data.length, data };
}

export async function getReferralHandoverReport(prisma, tenantId, filters = {}) {
    let doctorUserId = null;
    if (filters.doctor_ref) {
        const doctor = await resolveDoctorByRef(prisma, tenantId, filters.doctor_ref);
        doctorUserId = BigInt(doctor.user_id);
    }

    const handoverDays = Number(filters.handover_days || 3);
    const dateRange = parseDateRange(filters);

    const [opdVisits, ipdAdmissions] = await Promise.all([
        prisma.opd_visits.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                ...(doctorUserId ? { doctor_id: doctorUserId } : {}),
                ...(dateRange ? { visit_date: dateRange } : {})
            },
            include: {
                patients: {
                    select: {
                        patient_id: true,
                        upid: true,
                        first_name: true,
                        middle_name: true,
                        last_name: true
                    }
                }
            },
            orderBy: [{ patient_id: 'asc' }, { visit_date: 'asc' }]
        }),
        prisma.ipd_admissions.findMany({
            where: { tenant_id: BigInt(tenantId), ...parseDateTimeRange(filters, 'admission_date') },
            select: { admission_id: true, admission_number: true, patient_id: true, admission_date: true, admitting_doctor_id: true }
        })
    ]);

    const ipdByPatient = new Map();
    ipdAdmissions.forEach(item => {
        const key = String(item.patient_id);
        if (!ipdByPatient.has(key)) ipdByPatient.set(key, []);
        ipdByPatient.get(key).push(item);
    });

    const opdToIpd = [];
    const doctorToDoctor = [];

    const visitsByPatient = new Map();
    opdVisits.forEach(item => {
        const key = String(item.patient_id);
        if (!visitsByPatient.has(key)) visitsByPatient.set(key, []);
        visitsByPatient.get(key).push(item);

        const admissions = ipdByPatient.get(key) || [];
        const visitDate = new Date(item.visit_date);
        admissions.forEach(adm => {
            const diffDays = Math.floor((new Date(adm.admission_date).getTime() - visitDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays <= handoverDays) {
                opdToIpd.push({
                    patient_id: Number(item.patient_id),
                    upid: item.patients?.upid || null,
                    patient_name: [item.patients?.first_name, item.patients?.middle_name, item.patients?.last_name].filter(Boolean).join(' '),
                    opd_visit_id: Number(item.visit_id),
                    opd_visit_date: dateToYmd(item.visit_date),
                    ipd_admission_id: Number(adm.admission_id),
                    ipd_admission_number: adm.admission_number,
                    ipd_admission_date: dateToIso(adm.admission_date),
                    handover_days: diffDays
                });
            }
        });
    });

    visitsByPatient.forEach(rows => {
        rows.sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date));
        for (let i = 1; i < rows.length; i += 1) {
            const prev = rows[i - 1];
            const curr = rows[i];
            if (String(prev.doctor_id || '') !== String(curr.doctor_id || '') && prev.doctor_id && curr.doctor_id) {
                doctorToDoctor.push({
                    patient_id: Number(curr.patient_id),
                    from_doctor_user_id: Number(prev.doctor_id),
                    to_doctor_user_id: Number(curr.doctor_id),
                    from_visit_id: Number(prev.visit_id),
                    to_visit_id: Number(curr.visit_id),
                    from_visit_date: dateToYmd(prev.visit_date),
                    to_visit_date: dateToYmd(curr.visit_date)
                });
            }
        }
    });

    return {
        handover_window_days: handoverDays,
        opd_to_ipd_handover_count: opdToIpd.length,
        doctor_to_doctor_handover_count: doctorToDoctor.length,
        opd_to_ipd_handover: opdToIpd,
        doctor_to_doctor_handover: doctorToDoctor
    };
}

export async function getHighRiskFollowUpReport(prisma, tenantId, filters = {}) {
    let doctorUserId = null;
    if (filters.doctor_ref) {
        const doctor = await resolveDoctorByRef(prisma, tenantId, filters.doctor_ref);
        doctorUserId = BigInt(doctor.user_id);
    }

    const threshold = Number(filters.missed_days_threshold || 7);
    const today = toDateOnly(new Date().toISOString().slice(0, 10));

    const rows = await prisma.opd_consultations.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            ...(doctorUserId ? { doctor_id: doctorUserId } : {}),
            follow_up_date: {
                ...(filters.from_date ? { gte: toDateOnly(filters.from_date) } : {}),
                ...(filters.to_date ? { lte: toDateOnly(filters.to_date) } : {}),
                lt: today
            }
        },
        include: {
            opd_visits: {
                select: {
                    visit_id: true,
                    visit_date: true,
                    patients: {
                        select: {
                            patient_id: true,
                            upid: true,
                            first_name: true,
                            middle_name: true,
                            last_name: true,
                            mobile_primary: true
                        }
                    }
                }
            }
        },
        orderBy: [{ follow_up_date: 'asc' }]
    });

    const patientIds = [...new Set(rows
        .map(r => r.opd_visits?.patients?.patient_id)
        .filter(Boolean)
        .map(v => BigInt(v)))];

    const futureVisits = await prisma.opd_visits.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            patient_id: patientIds.length ? { in: patientIds } : { equals: BigInt(-1) }
        },
        select: { patient_id: true, visit_date: true }
    });

    const visitsByPatient = new Map();
    futureVisits.forEach(v => {
        const key = String(v.patient_id);
        if (!visitsByPatient.has(key)) visitsByPatient.set(key, []);
        visitsByPatient.get(key).push(dateToYmd(v.visit_date));
    });

    const data = rows
        .map(item => {
            const patient = item.opd_visits?.patients;
            if (!patient) return null;

            const dueDate = toDateOnly(dateToYmd(item.follow_up_date));
            const gapDays = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            const hasVisitedAfterDue = (visitsByPatient.get(String(patient.patient_id)) || [])
                .some(d => d >= dateToYmd(item.follow_up_date));

            if (hasVisitedAfterDue || gapDays < threshold) return null;

            return {
                consultation_id: Number(item.consultation_id),
                patient_id: Number(patient.patient_id),
                upid: patient.upid,
                patient_name: [patient.first_name, patient.middle_name, patient.last_name].filter(Boolean).join(' '),
                mobile_primary: patient.mobile_primary,
                follow_up_date: dateToYmd(item.follow_up_date),
                gap_days: gapDays,
                risk_level: gapDays >= (threshold * 2) ? 'high' : 'medium',
                follow_up_instructions: item.follow_up_instructions || null
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.gap_days - a.gap_days);

    return { missed_days_threshold: threshold, total: data.length, data };
}
