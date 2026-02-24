/**
 * Leave Management Service
 */

import { normalizeEmployeeCode } from '../../../utils/employeeCodeGenerator.js';

function toIsoString(value) {
    return value ? new Date(value).toISOString() : null;
}

function mapLeave(row) {
    return {
        leave_id: Number(row.leave_id),
        tenant_id: Number(row.tenant_id),
        staff_id: Number(row.staff_id),
        staff_name: row.staff_profiles ? `${row.staff_profiles.first_name} ${row.staff_profiles.last_name}` : null,
        employee_code: normalizeEmployeeCode(row.staff_profiles?.employee_code),
        leave_type: row.leave_type,
        start_date: toIsoString(row.start_date),
        end_date: toIsoString(row.end_date),
        total_days: row.total_days,
        reason: row.reason,
        status: row.status,
        applied_on: toIsoString(row.applied_on),
        approved_by: row.approved_by ? Number(row.approved_by) : null,
        approved_on: toIsoString(row.approved_on),
        remarks: row.remarks
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

function calculateTotalDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
        throw new Error('INVALID_LEAVE_DATE_RANGE');
    }

    const msInDay = 24 * 60 * 60 * 1000;
    return Math.floor((end.getTime() - start.getTime()) / msInDay) + 1;
}

export async function createLeaveRequest(prisma, tenantId, data) {
    await validateStaffProfile(prisma, tenantId, data.staff_id);

    const totalDays = calculateTotalDays(data.start_date, data.end_date);

    const overlapping = await prisma.leave_applications.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            staff_id: BigInt(data.staff_id),
            status: {
                in: ['pending', 'approved']
            },
            NOT: {
                OR: [
                    {
                        end_date: {
                            lt: new Date(data.start_date)
                        }
                    },
                    {
                        start_date: {
                            gt: new Date(data.end_date)
                        }
                    }
                ]
            }
        },
        select: {
            leave_id: true
        }
    });

    if (overlapping) {
        throw new Error('OVERLAPPING_LEAVE_REQUEST');
    }

    const created = await prisma.leave_applications.create({
        data: {
            tenant_id: BigInt(tenantId),
            staff_id: BigInt(data.staff_id),
            leave_type: data.leave_type,
            start_date: new Date(data.start_date),
            end_date: new Date(data.end_date),
            total_days: totalDays,
            reason: data.reason || null,
            status: 'pending',
            applied_on: new Date()
        },
        include: {
            staff_profiles: {
                select: {
                    first_name: true,
                    last_name: true,
                    employee_code: true
                }
            }
        }
    });

    return mapLeave(created);
}

export async function listLeaveRequests(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const where = {
        tenant_id: BigInt(tenantId)
    };

    if (filters.status) {
        where.status = filters.status;
    }

    if (filters.staff_id !== undefined) {
        where.staff_id = BigInt(filters.staff_id);
    }

    if (filters.from_date || filters.to_date) {
        where.start_date = {};
        if (filters.from_date) {
            where.start_date.gte = new Date(filters.from_date);
        }
        if (filters.to_date) {
            where.start_date.lte = new Date(filters.to_date);
        }
    }

    const [total, rows] = await Promise.all([
        prisma.leave_applications.count({ where }),
        prisma.leave_applications.findMany({
            where,
            include: {
                staff_profiles: {
                    select: {
                        first_name: true,
                        last_name: true,
                        employee_code: true
                    }
                }
            },
            orderBy: [{ applied_on: 'desc' }, { leave_id: 'desc' }],
            skip,
            take: pageSize
        })
    ]);

    return {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        data: rows.map(mapLeave)
    };
}

export async function getLeaveRequest(prisma, tenantId, leaveId) {
    const row = await prisma.leave_applications.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            leave_id: BigInt(leaveId)
        },
        include: {
            staff_profiles: {
                select: {
                    first_name: true,
                    last_name: true,
                    employee_code: true
                }
            }
        }
    });

    if (!row) {
        throw new Error('LEAVE_REQUEST_NOT_FOUND');
    }

    return mapLeave(row);
}

async function updateLeaveStatus(prisma, tenantId, leaveId, reviewerUserId, status, remarks) {
    const existing = await prisma.leave_applications.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            leave_id: BigInt(leaveId)
        },
        select: {
            leave_id: true,
            status: true
        }
    });

    if (!existing) {
        throw new Error('LEAVE_REQUEST_NOT_FOUND');
    }

    if (existing.status !== 'pending') {
        throw new Error('LEAVE_ALREADY_DECIDED');
    }

    const updated = await prisma.leave_applications.update({
        where: {
            leave_id: BigInt(leaveId)
        },
        data: {
            status,
            approved_by: BigInt(reviewerUserId),
            approved_on: new Date(),
            remarks: remarks || null
        },
        include: {
            staff_profiles: {
                select: {
                    first_name: true,
                    last_name: true,
                    employee_code: true
                }
            }
        }
    });

    return mapLeave(updated);
}

export async function approveLeaveRequest(prisma, tenantId, leaveId, reviewerUserId, remarks) {
    return updateLeaveStatus(prisma, tenantId, leaveId, reviewerUserId, 'approved', remarks);
}

export async function rejectLeaveRequest(prisma, tenantId, leaveId, reviewerUserId, remarks) {
    return updateLeaveStatus(prisma, tenantId, leaveId, reviewerUserId, 'rejected', remarks);
}

export async function leaveSummary(prisma, tenantId, filters = {}) {
    const year = Number(filters.year || new Date().getFullYear());
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    const where = {
        tenant_id: BigInt(tenantId),
        start_date: {
            gte: yearStart,
            lte: yearEnd
        }
    };

    if (filters.staff_id !== undefined) {
        where.staff_id = BigInt(filters.staff_id);
    }

    const rows = await prisma.leave_applications.findMany({
        where,
        include: {
            staff_profiles: {
                select: {
                    first_name: true,
                    last_name: true,
                    employee_code: true
                }
            }
        }
    });

    const totals = {
        total_requests: rows.length,
        pending: 0,
        approved: 0,
        rejected: 0,
        total_approved_days: 0
    };

    const byStaffMap = new Map();

    for (const row of rows) {
        const staffId = Number(row.staff_id);
        const key = String(staffId);

        if (!byStaffMap.has(key)) {
            byStaffMap.set(key, {
                staff_id: staffId,
                staff_name: row.staff_profiles ? `${row.staff_profiles.first_name} ${row.staff_profiles.last_name}` : null,
                employee_code: normalizeEmployeeCode(row.staff_profiles?.employee_code),
                pending: 0,
                approved: 0,
                rejected: 0,
                approved_days: 0
            });
        }

        const bucket = byStaffMap.get(key);
        const status = row.status || 'pending';

        if (status === 'pending') {
            totals.pending += 1;
            bucket.pending += 1;
        } else if (status === 'approved') {
            totals.approved += 1;
            bucket.approved += 1;
            totals.total_approved_days += row.total_days || 0;
            bucket.approved_days += row.total_days || 0;
        } else if (status === 'rejected') {
            totals.rejected += 1;
            bucket.rejected += 1;
        }
    }

    return {
        year,
        filters: {
            staff_id: filters.staff_id ? Number(filters.staff_id) : null
        },
        totals,
        by_staff: Array.from(byStaffMap.values())
    };
}
