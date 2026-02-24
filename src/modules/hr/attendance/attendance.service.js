/**
 * Attendance Service
 */

import { normalizeEmployeeCode } from '../../../utils/employeeCodeGenerator.js';

function toIsoString(value) {
    return value ? new Date(value).toISOString() : null;
}

function startOfDay(dateValue) {
    const date = new Date(dateValue);
    date.setHours(0, 0, 0, 0);
    return date;
}

function endOfDay(dateValue) {
    const date = new Date(dateValue);
    date.setHours(23, 59, 59, 999);
    return date;
}

function toDateKey(dateValue) {
    return startOfDay(dateValue).toISOString().slice(0, 10);
}

function getDateRange(filters = {}) {
    const toDate = filters.to_date ? endOfDay(filters.to_date) : endOfDay(new Date());
    const fromDate = filters.from_date
        ? startOfDay(filters.from_date)
        : startOfDay(new Date(toDate.getTime() - (29 * 24 * 60 * 60 * 1000)));

    if (fromDate > toDate) {
        throw new Error('INVALID_DATE_RANGE');
    }

    return { fromDate, toDate };
}

function percentage(part, total) {
    if (!total) return 0;
    return Number(((part / total) * 100).toFixed(2));
}

function calculateWorkedMinutes(checkInTime, checkOutTime) {
    if (!checkInTime || !checkOutTime) return 0;
    const checkIn = new Date(checkInTime);
    const checkOut = new Date(checkOutTime);
    const diff = checkOut.getTime() - checkIn.getTime();

    if (Number.isNaN(diff) || diff < 0) {
        throw new Error('INVALID_CHECKIN_CHECKOUT');
    }

    return Math.floor(diff / (1000 * 60));
}

function mapAttendanceRecord(row) {
    return {
        attendance_id: Number(row.attendance_id),
        tenant_id: Number(row.tenant_id),
        staff_id: Number(row.staff_id),
        staff_name: row.staff_profiles ? `${row.staff_profiles.first_name} ${row.staff_profiles.last_name}` : null,
        employee_code: normalizeEmployeeCode(row.staff_profiles?.employee_code),
        department_id: row.staff_profiles?.department_id || null,
        department_name: row.staff_profiles?.departments?.department_name || null,
        attendance_date: toDateKey(row.attendance_date),
        roster_id: row.roster_id ? Number(row.roster_id) : null,
        status: row.status,
        check_in_time: toIsoString(row.check_in_time),
        check_out_time: toIsoString(row.check_out_time),
        worked_minutes: row.worked_minutes || 0,
        late_minutes: row.late_minutes || 0,
        early_exit_minutes: row.early_exit_minutes || 0,
        overtime_minutes: row.overtime_minutes || 0,
        source: row.source,
        is_manual: row.is_manual,
        remarks: row.remarks,
        approved_by: row.approved_by ? Number(row.approved_by) : null,
        approved_at: toIsoString(row.approved_at),
        created_by: row.created_by ? Number(row.created_by) : null,
        created_at: toIsoString(row.created_at),
        updated_at: toIsoString(row.updated_at)
    };
}

async function validateStaffProfile(prisma, tenantId, staffId) {
    const profile = await prisma.staff_profiles.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            profile_id: BigInt(staffId)
        },
        select: { profile_id: true }
    });

    if (!profile) {
        throw new Error('STAFF_PROFILE_NOT_FOUND');
    }
}

async function validateRoster(prisma, tenantId, staffId, rosterId, attendanceDate) {
    if (rosterId === undefined || rosterId === null) return;

    const roster = await prisma.duty_roster.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            roster_id: BigInt(rosterId)
        },
        select: {
            roster_id: true,
            staff_id: true,
            duty_date: true
        }
    });

    if (!roster) {
        throw new Error('DUTY_ROSTER_NOT_FOUND');
    }

    if (Number(roster.staff_id) !== Number(staffId)) {
        throw new Error('ROSTER_STAFF_MISMATCH');
    }

    if (toDateKey(roster.duty_date) !== toDateKey(attendanceDate)) {
        throw new Error('ROSTER_DATE_MISMATCH');
    }
}

async function upsertAttendanceRecordInternal(prisma, tenantId, userId, payload) {
    await validateStaffProfile(prisma, tenantId, payload.staff_id);

    const attendanceDate = startOfDay(payload.attendance_date);
    await validateRoster(prisma, tenantId, payload.staff_id, payload.roster_id, attendanceDate);

    const hasCheckIn = payload.check_in_time !== undefined;
    const hasCheckOut = payload.check_out_time !== undefined;
    if (hasCheckIn && hasCheckOut && payload.check_in_time && payload.check_out_time) {
        calculateWorkedMinutes(payload.check_in_time, payload.check_out_time);
    }

    const existing = await prisma.attendance_records.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            staff_id: BigInt(payload.staff_id),
            attendance_date: attendanceDate
        },
        select: {
            attendance_id: true
        }
    });

    const updateData = {
        ...(payload.roster_id !== undefined ? { roster_id: payload.roster_id ? BigInt(payload.roster_id) : null } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.check_in_time !== undefined ? { check_in_time: payload.check_in_time ? new Date(payload.check_in_time) : null } : {}),
        ...(payload.check_out_time !== undefined ? { check_out_time: payload.check_out_time ? new Date(payload.check_out_time) : null } : {}),
        ...(payload.late_minutes !== undefined ? { late_minutes: Number(payload.late_minutes) } : {}),
        ...(payload.early_exit_minutes !== undefined ? { early_exit_minutes: Number(payload.early_exit_minutes) } : {}),
        ...(payload.overtime_minutes !== undefined ? { overtime_minutes: Number(payload.overtime_minutes) } : {}),
        ...(payload.source !== undefined ? { source: payload.source } : {}),
        ...(payload.is_manual !== undefined ? { is_manual: payload.is_manual } : {}),
        ...(payload.remarks !== undefined ? { remarks: payload.remarks || null } : {}),
        updated_at: new Date()
    };

    if (payload.check_in_time !== undefined || payload.check_out_time !== undefined) {
        const checkIn = payload.check_in_time ? new Date(payload.check_in_time) : null;
        const checkOut = payload.check_out_time ? new Date(payload.check_out_time) : null;
        updateData.worked_minutes = (checkIn && checkOut) ? calculateWorkedMinutes(checkIn, checkOut) : 0;
    }

    let saved;

    if (existing) {
        saved = await prisma.attendance_records.update({
            where: {
                attendance_id: existing.attendance_id
            },
            data: updateData,
            include: {
                staff_profiles: {
                    select: {
                        first_name: true,
                        last_name: true,
                        employee_code: true,
                        department_id: true,
                        departments: {
                            select: {
                                department_name: true
                            }
                        }
                    }
                }
            }
        });
    } else {
        saved = await prisma.attendance_records.create({
            data: {
                tenant_id: BigInt(tenantId),
                staff_id: BigInt(payload.staff_id),
                attendance_date: attendanceDate,
                roster_id: payload.roster_id ? BigInt(payload.roster_id) : null,
                status: payload.status,
                check_in_time: payload.check_in_time ? new Date(payload.check_in_time) : null,
                check_out_time: payload.check_out_time ? new Date(payload.check_out_time) : null,
                worked_minutes: payload.check_in_time && payload.check_out_time
                    ? calculateWorkedMinutes(payload.check_in_time, payload.check_out_time)
                    : 0,
                late_minutes: payload.late_minutes || 0,
                early_exit_minutes: payload.early_exit_minutes || 0,
                overtime_minutes: payload.overtime_minutes || 0,
                source: payload.source || 'manual',
                is_manual: payload.is_manual !== undefined ? payload.is_manual : true,
                remarks: payload.remarks || null,
                created_by: userId ? BigInt(userId) : null,
                created_at: new Date(),
                updated_at: new Date()
            },
            include: {
                staff_profiles: {
                    select: {
                        first_name: true,
                        last_name: true,
                        employee_code: true,
                        department_id: true,
                        departments: {
                            select: {
                                department_name: true
                            }
                        }
                    }
                }
            }
        });
    }

    return mapAttendanceRecord(saved);
}

export async function upsertAttendanceRecord(prisma, tenantId, userId, data) {
    return upsertAttendanceRecordInternal(prisma, tenantId, userId, data);
}

export async function bulkUpsertAttendanceRecords(prisma, tenantId, userId, records = []) {
    const data = [];

    for (const record of records) {
        const saved = await upsertAttendanceRecordInternal(prisma, tenantId, userId, record);
        data.push(saved);
    }

    return {
        updated_count: data.length,
        data
    };
}

export async function listAttendanceRecords(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const where = {
        tenant_id: BigInt(tenantId)
    };

    if (filters.staff_id !== undefined) {
        where.staff_id = BigInt(filters.staff_id);
    }

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.from_date || filters.to_date) {
        where.attendance_date = {};
        if (filters.from_date) where.attendance_date.gte = startOfDay(filters.from_date);
        if (filters.to_date) where.attendance_date.lte = endOfDay(filters.to_date);
    }

    if (filters.department_id !== undefined) {
        where.staff_profiles = {
            department_id: Number(filters.department_id)
        };
    }

    const [total, rows] = await Promise.all([
        prisma.attendance_records.count({ where }),
        prisma.attendance_records.findMany({
            where,
            include: {
                staff_profiles: {
                    select: {
                        first_name: true,
                        last_name: true,
                        employee_code: true,
                        department_id: true,
                        departments: {
                            select: {
                                department_name: true
                            }
                        }
                    }
                }
            },
            orderBy: [{ attendance_date: 'desc' }, { attendance_id: 'desc' }],
            skip,
            take: pageSize
        })
    ]);

    return {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        data: rows.map(mapAttendanceRecord)
    };
}

export async function autoMarkAttendanceForDate(prisma, tenantId, userId, dateValue) {
    const markDateStart = startOfDay(dateValue);
    const markDateEnd = endOfDay(dateValue);

    const [holiday, rosters, leaves] = await Promise.all([
        prisma.holiday_calendar.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                holiday_date: {
                    gte: markDateStart,
                    lte: markDateEnd
                }
            },
            select: {
                holiday_name: true
            }
        }),
        prisma.duty_roster.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                duty_date: {
                    gte: markDateStart,
                    lte: markDateEnd
                }
            },
            select: {
                roster_id: true,
                staff_id: true,
                is_available: true
            }
        }),
        prisma.leave_applications.findMany({
            where: {
                tenant_id: BigInt(tenantId),
                status: 'approved',
                start_date: { lte: markDateEnd },
                end_date: { gte: markDateStart }
            },
            select: {
                staff_id: true
            }
        })
    ]);

    const leaveStaffSet = new Set(leaves.map(row => Number(row.staff_id)));
    const data = [];

    for (const roster of rosters) {
        const staffId = Number(roster.staff_id);
        const status = holiday
            ? 'holiday'
            : leaveStaffSet.has(staffId)
                ? 'leave'
                : roster.is_available
                    ? 'present'
                    : 'absent';

        const saved = await upsertAttendanceRecordInternal(prisma, tenantId, userId, {
            staff_id: staffId,
            attendance_date: toDateKey(markDateStart),
            roster_id: Number(roster.roster_id),
            status,
            source: 'system',
            is_manual: false,
            remarks: holiday ? `Auto marked for holiday: ${holiday.holiday_name}` : 'Auto marked from duty roster'
        });

        data.push(saved);
    }

    return {
        date: toDateKey(markDateStart),
        holiday_applied: Boolean(holiday),
        holiday_name: holiday?.holiday_name || null,
        total_roster_entries: rosters.length,
        processed_records: data.length,
        data
    };
}

export async function attendanceSummary(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const skip = (page - 1) * pageSize;
    const { fromDate, toDate } = getDateRange(filters);

    const staffWhere = {
        tenant_id: BigInt(tenantId)
    };

    if (filters.department_id !== undefined) {
        staffWhere.department_id = Number(filters.department_id);
    }

    if (filters.staff_id !== undefined) {
        staffWhere.profile_id = BigInt(filters.staff_id);
    }

    const [total, staffProfiles] = await Promise.all([
        prisma.staff_profiles.count({ where: staffWhere }),
        prisma.staff_profiles.findMany({
            where: staffWhere,
            select: {
                profile_id: true,
                employee_code: true,
                first_name: true,
                last_name: true,
                department_id: true,
                departments: {
                    select: {
                        department_name: true
                    }
                }
            },
            orderBy: {
                profile_id: 'desc'
            },
            skip,
            take: pageSize
        })
    ]);

    const profileIds = staffProfiles.map(profile => profile.profile_id);

    const attendanceRows = await prisma.attendance_records.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            staff_id: { in: profileIds.length ? profileIds : [BigInt(-1)] },
            attendance_date: {
                gte: fromDate,
                lte: toDate
            }
        },
        select: {
            staff_id: true,
            status: true,
            worked_minutes: true
        }
    });

    const attendanceMap = new Map();
    for (const row of attendanceRows) {
        const key = Number(row.staff_id);
        if (!attendanceMap.has(key)) {
            attendanceMap.set(key, {
                present: 0,
                absent: 0,
                leave: 0,
                half_day: 0,
                holiday: 0,
                weekoff: 0,
                worked_minutes: 0
            });
        }

        const bucket = attendanceMap.get(key);
        const status = row.status || 'absent';
        if (bucket[status] !== undefined) {
            bucket[status] += 1;
        }
        bucket.worked_minutes += row.worked_minutes || 0;
    }

    const data = staffProfiles.map(profile => {
        const profileId = Number(profile.profile_id);
        const attendance = attendanceMap.get(profileId) || {
            present: 0,
            absent: 0,
            leave: 0,
            half_day: 0,
            holiday: 0,
            weekoff: 0,
            worked_minutes: 0
        };

        const scheduledDays = attendance.present + attendance.absent + attendance.half_day;
        const presentEquivalent = attendance.present + (attendance.half_day * 0.5);

        return {
            staff_id: profileId,
            employee_code: normalizeEmployeeCode(profile.employee_code),
            staff_name: `${profile.first_name} ${profile.last_name}`,
            department_id: profile.department_id,
            department_name: profile.departments?.department_name || null,
            date_range: {
                from_date: toIsoString(fromDate),
                to_date: toIsoString(toDate)
            },
            scheduled_days: scheduledDays,
            present_days: attendance.present,
            half_days: attendance.half_day,
            absent_days: attendance.absent,
            approved_leave_days: attendance.leave,
            holiday_days: attendance.holiday,
            weekoff_days: attendance.weekoff,
            worked_minutes: attendance.worked_minutes,
            attendance_percentage: percentage(presentEquivalent, scheduledDays)
        };
    });

    const totals = data.reduce((acc, item) => {
        acc.scheduled_days += item.scheduled_days;
        acc.present_days += item.present_days;
        acc.half_days += item.half_days;
        acc.absent_days += item.absent_days;
        acc.approved_leave_days += item.approved_leave_days;
        acc.holiday_days += item.holiday_days;
        acc.weekoff_days += item.weekoff_days;
        acc.worked_minutes += item.worked_minutes;
        return acc;
    }, {
        scheduled_days: 0,
        present_days: 0,
        half_days: 0,
        absent_days: 0,
        approved_leave_days: 0,
        holiday_days: 0,
        weekoff_days: 0,
        worked_minutes: 0
    });

    const totalPresentEquivalent = totals.present_days + (totals.half_days * 0.5);

    return {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        range: {
            from_date: toIsoString(fromDate),
            to_date: toIsoString(toDate)
        },
        totals: {
            ...totals,
            attendance_percentage: percentage(totalPresentEquivalent, totals.scheduled_days)
        },
        data
    };
}

export async function attendanceByStaff(prisma, tenantId, staffId, filters = {}) {
    const { fromDate, toDate } = getDateRange(filters);

    const profile = await prisma.staff_profiles.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            profile_id: BigInt(staffId)
        },
        select: {
            profile_id: true,
            employee_code: true,
            first_name: true,
            last_name: true,
            department_id: true,
            departments: {
                select: {
                    department_name: true
                }
            }
        }
    });

    if (!profile) {
        throw new Error('STAFF_PROFILE_NOT_FOUND');
    }

    const rows = await prisma.attendance_records.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            staff_id: BigInt(staffId),
            attendance_date: {
                gte: fromDate,
                lte: toDate
            }
        },
        orderBy: {
            attendance_date: 'asc'
        },
        select: {
            attendance_id: true,
            attendance_date: true,
            roster_id: true,
            status: true,
            check_in_time: true,
            check_out_time: true,
            worked_minutes: true,
            late_minutes: true,
            early_exit_minutes: true,
            overtime_minutes: true,
            source: true,
            is_manual: true,
            remarks: true
        }
    });

    const summary = rows.reduce((acc, row) => {
        const status = row.status || 'absent';
        if (acc[status] !== undefined) {
            acc[status] += 1;
        }
        acc.worked_minutes += row.worked_minutes || 0;
        return acc;
    }, {
        present: 0,
        absent: 0,
        leave: 0,
        half_day: 0,
        holiday: 0,
        weekoff: 0,
        worked_minutes: 0
    });

    const scheduledDays = summary.present + summary.absent + summary.half_day;
    const presentEquivalent = summary.present + (summary.half_day * 0.5);

    const daily = rows.map(row => ({
        attendance_id: Number(row.attendance_id),
        roster_id: row.roster_id ? Number(row.roster_id) : null,
        date: toDateKey(row.attendance_date),
        status: row.status,
        check_in_time: toIsoString(row.check_in_time),
        check_out_time: toIsoString(row.check_out_time),
        worked_minutes: row.worked_minutes || 0,
        late_minutes: row.late_minutes || 0,
        early_exit_minutes: row.early_exit_minutes || 0,
        overtime_minutes: row.overtime_minutes || 0,
        source: row.source,
        is_manual: row.is_manual,
        remarks: row.remarks
    }));

    return {
        staff: {
            staff_id: Number(profile.profile_id),
            employee_code: normalizeEmployeeCode(profile.employee_code),
            staff_name: `${profile.first_name} ${profile.last_name}`,
            department_id: profile.department_id,
            department_name: profile.departments?.department_name || null
        },
        range: {
            from_date: toIsoString(fromDate),
            to_date: toIsoString(toDate)
        },
        summary: {
            scheduled_days: scheduledDays,
            present_days: summary.present,
            half_days: summary.half_day,
            absent_days: summary.absent,
            approved_leave_days: summary.leave,
            holiday_days: summary.holiday,
            weekoff_days: summary.weekoff,
            worked_minutes: summary.worked_minutes,
            attendance_percentage: percentage(presentEquivalent, scheduledDays)
        },
        daily
    };
}
