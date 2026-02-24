/**
 * Duty Roster Service
 */

import { normalizeEmployeeCode } from '../../../utils/employeeCodeGenerator.js';

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

async function validateDepartment(prisma, tenantId, departmentId) {
    if (departmentId === undefined || departmentId === null) return;

    const department = await prisma.departments.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            department_id: Number(departmentId)
        },
        select: { department_id: true }
    });

    if (!department) {
        throw new Error('DEPARTMENT_NOT_FOUND');
    }
}

function mapRoster(row) {
    return {
        roster_id: Number(row.roster_id),
        tenant_id: Number(row.tenant_id),
        staff_id: Number(row.staff_id),
        staff_name: row.staff_profiles ? `${row.staff_profiles.first_name} ${row.staff_profiles.last_name}` : null,
        employee_code: normalizeEmployeeCode(row.staff_profiles?.employee_code),
        duty_date: toIsoString(row.duty_date),
        shift_type: row.shift_type,
        start_time: toIsoString(row.start_time),
        end_time: toIsoString(row.end_time),
        department_id: row.department_id,
        department_name: row.departments?.department_name || null,
        is_available: row.is_available,
        remarks: row.remarks,
        created_at: toIsoString(row.created_at)
    };
}

export async function createDutyRoster(prisma, tenantId, data) {
    await validateStaffProfile(prisma, tenantId, data.staff_id);
    await validateDepartment(prisma, tenantId, data.department_id);

    const roster = await prisma.duty_roster.create({
        data: {
            tenant_id: BigInt(tenantId),
            staff_id: BigInt(data.staff_id),
            duty_date: new Date(data.duty_date),
            shift_type: data.shift_type || null,
            start_time: new Date(data.start_time),
            end_time: new Date(data.end_time),
            department_id: data.department_id ? Number(data.department_id) : null,
            is_available: data.is_available !== undefined ? data.is_available : true,
            remarks: data.remarks || null
        },
        include: {
            staff_profiles: {
                select: {
                    first_name: true,
                    last_name: true,
                    employee_code: true
                }
            },
            departments: {
                select: {
                    department_name: true
                }
            }
        }
    });

    return mapRoster(roster);
}

export async function bulkCreateDutyRoster(prisma, tenantId, entries = []) {
    const created = [];

    for (const entry of entries) {
        const row = await createDutyRoster(prisma, tenantId, entry);
        created.push(row);
    }

    return {
        created_count: created.length,
        data: created
    };
}

export async function listDutyRoster(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const where = {
        tenant_id: BigInt(tenantId)
    };

    if (filters.staff_id !== undefined) {
        where.staff_id = BigInt(filters.staff_id);
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
                staff_profiles: {
                    select: {
                        first_name: true,
                        last_name: true,
                        employee_code: true
                    }
                },
                departments: {
                    select: {
                        department_name: true
                    }
                }
            },
            orderBy: [{ duty_date: 'desc' }, { roster_id: 'desc' }],
            skip,
            take: pageSize
        })
    ]);

    return {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        data: rows.map(mapRoster)
    };
}

export async function updateDutyRoster(prisma, tenantId, rosterId, data) {
    const existing = await prisma.duty_roster.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            roster_id: BigInt(rosterId)
        },
        select: { roster_id: true }
    });

    if (!existing) {
        throw new Error('ROSTER_NOT_FOUND');
    }

    await validateDepartment(prisma, tenantId, data.department_id);

    const updateData = {};
    if (data.duty_date !== undefined) updateData.duty_date = new Date(data.duty_date);
    if (data.shift_type !== undefined) updateData.shift_type = data.shift_type || null;
    if (data.start_time !== undefined) updateData.start_time = new Date(data.start_time);
    if (data.end_time !== undefined) updateData.end_time = new Date(data.end_time);
    if (data.department_id !== undefined) updateData.department_id = data.department_id ? Number(data.department_id) : null;
    if (data.is_available !== undefined) updateData.is_available = data.is_available;
    if (data.remarks !== undefined) updateData.remarks = data.remarks || null;

    const updated = await prisma.duty_roster.update({
        where: { roster_id: BigInt(rosterId) },
        data: updateData,
        include: {
            staff_profiles: {
                select: {
                    first_name: true,
                    last_name: true,
                    employee_code: true
                }
            },
            departments: {
                select: {
                    department_name: true
                }
            }
        }
    });

    return mapRoster(updated);
}

export async function toggleDutyRosterAvailability(prisma, tenantId, rosterId, isAvailable) {
    return updateDutyRoster(prisma, tenantId, rosterId, { is_available: isAvailable });
}
