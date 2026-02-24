/**
 * Doctor Schedule Management Service
 *
 * Uses duty_roster as persistent storage for doctor schedules.
 */

import { normalizeEmployeeCode } from '../../../utils/employeeCodeGenerator.js';

const META_PREFIX = '__SCHEDULE_META__';

function toIsoString(value) {
    return value ? new Date(value).toISOString() : null;
}

function parseBooleanFilter(value) {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return undefined;
}

function inferShiftType(startTime) {
    const date = new Date(startTime);
    const hour = date.getUTCHours();

    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'night';
}

function getMinutesFromDate(dateValue) {
    const date = new Date(dateValue);
    return (date.getUTCHours() * 60) + date.getUTCMinutes();
}

function mergeDutyDateAndTime(dutyDateValue, timeValue) {
    if (!timeValue) return null;

    const dutyDate = dutyDateValue ? new Date(dutyDateValue) : new Date();
    const timeDate = new Date(timeValue);

    return new Date(Date.UTC(
        dutyDate.getUTCFullYear(),
        dutyDate.getUTCMonth(),
        dutyDate.getUTCDate(),
        timeDate.getUTCHours(),
        timeDate.getUTCMinutes(),
        timeDate.getUTCSeconds(),
        timeDate.getUTCMilliseconds()
    ));
}

function hasOverlap(startA, endA, startB, endB) {
    const aStart = getMinutesFromDate(startA);
    const aEnd = getMinutesFromDate(endA);
    const bStart = getMinutesFromDate(startB);
    const bEnd = getMinutesFromDate(endB);

    return aStart < bEnd && aEnd > bStart;
}

function encodeRemarks(meta, notes) {
    const encodedMeta = `${META_PREFIX}${JSON.stringify(meta)}`;
    if (!notes) return encodedMeta;
    return `${encodedMeta}\n${notes}`;
}

function decodeRemarks(remarks) {
    if (!remarks) {
        return {
            meta: {},
            notes: null
        };
    }

    if (!remarks.startsWith(META_PREFIX)) {
        return {
            meta: {},
            notes: remarks
        };
    }

    const lines = remarks.split('\n');
    const firstLine = lines[0] || '';
    const metaRaw = firstLine.slice(META_PREFIX.length);

    try {
        const meta = JSON.parse(metaRaw);
        const notes = lines.slice(1).join('\n') || null;
        return { meta, notes };
    } catch (_) {
        return {
            meta: {},
            notes: remarks
        };
    }
}

async function validateDoctorProfile(prisma, tenantId, doctorProfileId) {
    const doctor = await prisma.staff_profiles.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            profile_id: BigInt(doctorProfileId),
            request_status: 'approved',
            users: {
                user_roles_user_roles_user_idTousers: {
                    some: {
                        roles: {
                            role_code: {
                                equals: 'doctor',
                                mode: 'insensitive'
                            }
                        }
                    }
                }
            }
        },
        select: {
            profile_id: true,
            user_id: true,
            employee_code: true,
            first_name: true,
            last_name: true,
            is_active: true,
            users: {
                select: {
                    is_active: true
                }
            }
        }
    });

    if (!doctor) {
        throw new Error('DOCTOR_NOT_FOUND');
    }

    if (doctor.is_active === false || doctor.users?.is_active === false) {
        throw new Error('DOCTOR_NOT_FOUND');
    }

    return doctor;
}

async function resolveDoctorProfile(prisma, tenantId, doctorId, doctorRef) {
    if (doctorId !== undefined && doctorId !== null && doctorId !== '') {
        const doctorIdAsString = String(doctorId).trim();
        const parsedDoctorId = Number(doctorIdAsString);

        if (Number.isInteger(parsedDoctorId)) {
            return validateDoctorProfile(prisma, tenantId, parsedDoctorId);
        }

        if (!doctorRef || String(doctorRef).trim() === '') {
            doctorRef = doctorIdAsString;
        }
    }

    if (doctorRef !== undefined && doctorRef !== null && String(doctorRef).trim() !== '') {
        const normalizedRef = normalizeEmployeeCode(doctorRef);

        const doctorByCode = await prisma.staff_profiles.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                employee_code: {
                    equals: normalizedRef,
                    mode: 'insensitive'
                }
            },
            select: { profile_id: true }
        });

        if (!doctorByCode) {
            throw new Error('DOCTOR_NOT_FOUND');
        }

        return validateDoctorProfile(prisma, tenantId, Number(doctorByCode.profile_id));
    }

    throw new Error('DOCTOR_NOT_FOUND');
}

async function validateDepartment(prisma, tenantId, departmentId) {
    if (departmentId === undefined || departmentId === null) return null;

    const department = await prisma.departments.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            department_id: Number(departmentId)
        },
        select: {
            department_id: true,
            department_name: true
        }
    });

    if (!department) {
        throw new Error('DEPARTMENT_NOT_FOUND');
    }

    return department;
}

async function ensureNoScheduleConflict(prisma, tenantId, payload) {
    const where = {
        tenant_id: BigInt(tenantId),
        staff_id: BigInt(payload.doctor_id),
        duty_date: new Date(payload.duty_date)
    };

    if (payload.exclude_roster_id) {
        where.NOT = { roster_id: BigInt(payload.exclude_roster_id) };
    }

    const entries = await prisma.duty_roster.findMany({
        where,
        select: {
            roster_id: true,
            start_time: true,
            end_time: true
        }
    });

    const conflicting = entries.find(entry => hasOverlap(payload.start_time, payload.end_time, entry.start_time, entry.end_time));

    if (conflicting) {
        throw new Error('SCHEDULE_CONFLICT');
    }
}

function validateTimeRange(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (!(start < end)) {
        throw new Error('INVALID_TIME_RANGE');
    }
}

function buildScheduleMeta(data = {}, existingMeta = {}) {
    const scheduleType = data.schedule_type || existingMeta.schedule_type || 'opd';

    const slotDuration = data.slot_duration_minutes ?? existingMeta.slot_duration_minutes ?? (scheduleType === 'opd' ? 15 : null);
    if (slotDuration !== null && slotDuration !== undefined && Number(slotDuration) < 5) {
        throw new Error('INVALID_SLOT_DURATION');
    }

    return {
        schedule_type: scheduleType,
        slot_duration_minutes: slotDuration,
        max_patients: data.max_patients ?? existingMeta.max_patients ?? null,
        ward_rounds: data.ward_rounds ?? existingMeta.ward_rounds ?? null,
        consultation_mode: data.consultation_mode ?? existingMeta.consultation_mode ?? null
    };
}

function mapSchedule(row) {
    const { meta, notes } = decodeRemarks(row.remarks);
    const mergedStart = mergeDutyDateAndTime(row.duty_date, row.start_time);
    const mergedEnd = mergeDutyDateAndTime(row.duty_date, row.end_time);

    return {
        schedule_id: Number(row.roster_id),
        doctor_id: Number(row.staff_id),
        doctor_name: row.staff_profiles ? `${row.staff_profiles.first_name} ${row.staff_profiles.last_name}` : null,
        doctor_code: normalizeEmployeeCode(row.staff_profiles?.employee_code),
        duty_date: row.duty_date ? new Date(row.duty_date).toISOString().slice(0, 10) : null,
        start_time: toIsoString(mergedStart),
        end_time: toIsoString(mergedEnd),
        shift_type: inferShiftType(mergedStart || row.start_time),
        schedule_type: meta.schedule_type || 'opd',
        slot_duration_minutes: meta.slot_duration_minutes ?? null,
        max_patients: meta.max_patients ?? null,
        ward_rounds: meta.ward_rounds ?? null,
        consultation_mode: meta.consultation_mode ?? null,
        department_id: row.department_id,
        department_name: row.departments?.department_name || null,
        is_available: row.is_available,
        notes,
        created_at: toIsoString(row.created_at)
    };
}

function generateTimeSlots(startTime, endTime, durationMinutes) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const slots = [];

    let cursor = new Date(start);
    while (cursor < end) {
        const next = new Date(cursor.getTime() + (durationMinutes * 60 * 1000));
        if (next > end) break;

        slots.push({
            start_time: cursor.toISOString(),
            end_time: next.toISOString()
        });

        cursor = next;
    }

    return slots;
}

export async function createSchedule(prisma, tenantId, data) {
    const doctor = await resolveDoctorProfile(prisma, tenantId, data.doctor_id, data.doctor_ref);
    await validateDepartment(prisma, tenantId, data.department_id);
    validateTimeRange(data.start_time, data.end_time);

    await ensureNoScheduleConflict(prisma, tenantId, {
        doctor_id: Number(doctor.profile_id),
        duty_date: data.duty_date,
        start_time: data.start_time,
        end_time: data.end_time
    });

    const scheduleMeta = buildScheduleMeta(data);

    const roster = await prisma.duty_roster.create({
        data: {
            tenant_id: BigInt(tenantId),
            staff_id: BigInt(doctor.profile_id),
            duty_date: new Date(data.duty_date),
            shift_type: data.shift_type || inferShiftType(data.start_time),
            start_time: new Date(data.start_time),
            end_time: new Date(data.end_time),
            department_id: data.department_id ? Number(data.department_id) : null,
            is_available: data.is_available !== undefined ? data.is_available : true,
            remarks: encodeRemarks(scheduleMeta, data.notes || null)
        },
        include: {
            departments: {
                select: {
                    department_name: true
                }
            },
            staff_profiles: {
                select: {
                    first_name: true,
                    last_name: true,
                    employee_code: true
                }
            }
        }
    });

    return mapSchedule(roster);
}

export async function bulkCreateSchedules(prisma, tenantId, entries = []) {
    const created = [];

    for (const entry of entries) {
        const row = await createSchedule(prisma, tenantId, entry);
        created.push(row);
    }

    return {
        created_count: created.length,
        data: created
    };
}

export async function listSchedules(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const where = {
        tenant_id: BigInt(tenantId)
    };

    if (filters.doctor_id !== undefined) {
        where.staff_id = BigInt(filters.doctor_id);
    } else if (filters.doctor_ref) {
        const doctor = await resolveDoctorProfile(prisma, tenantId, undefined, filters.doctor_ref);
        where.staff_id = BigInt(doctor.profile_id);
    }

    if (filters.department_id !== undefined) {
        where.department_id = Number(filters.department_id);
    }

    const isAvailable = parseBooleanFilter(filters.is_available);
    if (isAvailable !== undefined) {
        where.is_available = isAvailable;
    }

    if (filters.from_date || filters.to_date) {
        where.duty_date = {};

        if (filters.from_date) {
            where.duty_date.gte = new Date(filters.from_date);
        }

        if (filters.to_date) {
            where.duty_date.lte = new Date(filters.to_date);
        }
    }

    const [total, rows] = await Promise.all([
        prisma.duty_roster.count({ where }),
        prisma.duty_roster.findMany({
            where,
            include: {
                departments: {
                    select: {
                        department_name: true
                    }
                },
                staff_profiles: {
                    select: {
                        first_name: true,
                        last_name: true,
                        employee_code: true
                    }
                }
            },
            orderBy: [{ duty_date: 'desc' }, { start_time: 'asc' }, { roster_id: 'desc' }],
            skip,
            take: pageSize
        })
    ]);

    let data = rows.map(mapSchedule);

    if (filters.schedule_type) {
        data = data.filter(item => item.schedule_type === filters.schedule_type);
    }

    return {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        data
    };
}

export async function getDoctorAvailability(prisma, tenantId, doctorId, dutyDate, scheduleType = 'opd') {
    const doctor = await resolveDoctorProfile(prisma, tenantId, doctorId, doctorId);

    const rosterRows = await prisma.duty_roster.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            staff_id: BigInt(doctor.profile_id),
            duty_date: new Date(dutyDate),
            is_available: true
        },
        include: {
            departments: {
                select: {
                    department_name: true
                }
            },
            staff_profiles: {
                select: {
                    first_name: true,
                    last_name: true,
                    employee_code: true
                }
            }
        },
        orderBy: [{ start_time: 'asc' }]
    });

    const schedules = rosterRows.map(mapSchedule).filter(item => item.schedule_type === scheduleType);

    if (scheduleType !== 'opd') {
        return {
            doctor_id: Number(doctor.profile_id),
            doctor_user_id: Number(doctor.user_id),
            doctor_name: `${doctor.first_name} ${doctor.last_name}`,
            duty_date: dutyDate,
            schedule_type: scheduleType,
            schedules
        };
    }

    const appointments = await prisma.appointments.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            doctor_id: BigInt(doctor.user_id),
            appointment_date: new Date(dutyDate),
            NOT: {
                status: 'cancelled'
            }
        },
        select: {
            appointment_id: true,
            appointment_time: true,
            status: true,
            appointment_number: true
        }
    });

    const appointmentMinutes = appointments.map(item => ({
        appointment_id: Number(item.appointment_id),
        appointment_number: item.appointment_number,
        minutes: getMinutesFromDate(item.appointment_time),
        status: item.status
    }));

    const scheduleWithSlots = schedules.map(schedule => {
        const slotDuration = schedule.slot_duration_minutes || 15;
        const slots = generateTimeSlots(schedule.start_time, schedule.end_time, slotDuration).map(slot => {
            const slotStartMinutes = getMinutesFromDate(slot.start_time);
            const slotEndMinutes = getMinutesFromDate(slot.end_time);

            const bookedAppointment = appointmentMinutes.find(apt => apt.minutes >= slotStartMinutes && apt.minutes < slotEndMinutes);

            return {
                ...slot,
                is_booked: Boolean(bookedAppointment),
                appointment_id: bookedAppointment?.appointment_id || null,
                appointment_number: bookedAppointment?.appointment_number || null
            };
        });

        return {
            ...schedule,
            slots
        };
    });

    return {
        doctor_id: Number(doctor.profile_id),
        doctor_user_id: Number(doctor.user_id),
        doctor_name: `${doctor.first_name} ${doctor.last_name}`,
        duty_date: dutyDate,
        schedule_type: 'opd',
        schedules: scheduleWithSlots
    };
}

export async function updateSchedule(prisma, tenantId, scheduleId, data = {}) {
    const existing = await prisma.duty_roster.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            roster_id: BigInt(scheduleId)
        },
        select: {
            roster_id: true,
            staff_id: true,
            duty_date: true,
            start_time: true,
            end_time: true,
            shift_type: true,
            department_id: true,
            is_available: true,
            remarks: true
        }
    });

    if (!existing) {
        throw new Error('SCHEDULE_NOT_FOUND');
    }

    const { meta: existingMeta, notes: existingNotes } = decodeRemarks(existing.remarks);

    const resolvedDoctor = await resolveDoctorProfile(
        prisma,
        tenantId,
        data.doctor_id ?? Number(existing.staff_id),
        data.doctor_ref
    );
    const doctorId = Number(resolvedDoctor.profile_id);
    const dutyDate = data.duty_date ?? new Date(existing.duty_date).toISOString().slice(0, 10);
    const startTime = data.start_time ?? existing.start_time.toISOString();
    const endTime = data.end_time ?? existing.end_time.toISOString();

    await validateDepartment(prisma, tenantId, data.department_id ?? existing.department_id);
    validateTimeRange(startTime, endTime);

    await ensureNoScheduleConflict(prisma, tenantId, {
        doctor_id: doctorId,
        duty_date: dutyDate,
        start_time: startTime,
        end_time: endTime,
        exclude_roster_id: scheduleId
    });

    const scheduleMeta = buildScheduleMeta(data, existingMeta);

    const updated = await prisma.duty_roster.update({
        where: { roster_id: BigInt(scheduleId) },
        data: {
            staff_id: BigInt(doctorId),
            duty_date: new Date(dutyDate),
            start_time: new Date(startTime),
            end_time: new Date(endTime),
            shift_type: data.shift_type || existing.shift_type || inferShiftType(startTime),
            department_id: data.department_id !== undefined
                ? (data.department_id ? Number(data.department_id) : null)
                : existing.department_id,
            is_available: data.is_available !== undefined ? data.is_available : existing.is_available,
            remarks: encodeRemarks(scheduleMeta, data.notes !== undefined ? data.notes : existingNotes)
        },
        include: {
            departments: {
                select: {
                    department_name: true
                }
            },
            staff_profiles: {
                select: {
                    first_name: true,
                    last_name: true,
                    employee_code: true
                }
            }
        }
    });

    return mapSchedule(updated);
}

export async function toggleScheduleAvailability(prisma, tenantId, scheduleId, isAvailable) {
    return updateSchedule(prisma, tenantId, scheduleId, { is_available: isAvailable });
}

export async function deleteSchedule(prisma, tenantId, scheduleId) {
    const existing = await prisma.duty_roster.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            roster_id: BigInt(scheduleId)
        },
        select: {
            roster_id: true
        }
    });

    if (!existing) {
        throw new Error('SCHEDULE_NOT_FOUND');
    }

    await prisma.duty_roster.delete({
        where: {
            roster_id: BigInt(scheduleId)
        }
    });

    return {
        success: true,
        message: 'Schedule deleted successfully'
    };
}
