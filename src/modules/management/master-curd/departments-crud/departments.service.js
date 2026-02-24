/**
 * Departments Service Layer
 * 
 * Purpose: Business logic for department CRUD operations using Prisma Client
 */

function buildDepartmentPrefix(departmentName) {
    const clean = (departmentName || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (!clean) return 'DEPT';
    return clean.slice(0, Math.min(clean.length, 4));
}

function parsePrismaCode(error) {
    return error?.code || error?.meta?.code || null;
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function generateDepartmentCode(prisma, tenantId, departmentName, offset = 0) {
    const prefix = buildDepartmentPrefix(departmentName);

    const existingCodes = await prisma.departments.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            department_code: {
                startsWith: prefix
            }
        },
        select: {
            department_code: true
        }
    });

    let maxSerial = 0;
    const safePrefix = escapeRegex(prefix);
    for (const row of existingCodes) {
        const match = row.department_code?.match(new RegExp(`^${safePrefix}(\\d+)$`));
        if (!match) continue;
        const serial = Number(match[1]);
        if (Number.isFinite(serial) && serial > maxSerial) {
            maxSerial = serial;
        }
    }

    return `${prefix}${String(maxSerial + 1 + offset).padStart(3, '0')}`;
}

/**
 * Create a new department
 */
export async function createDepartment(prisma, tenantId, data) {
    const { department_name, department_type, head_of_department, contact_number, facility_id } = data;
    let department;

    for (let attempt = 0; attempt < 25; attempt += 1) {
        const department_code = await generateDepartmentCode(prisma, tenantId, department_name, attempt);

        try {
            department = await prisma.departments.create({
                data: {
                    tenant_id: BigInt(tenantId),
                    facility_id: facility_id ? BigInt(facility_id) : null,
                    department_name,
                    department_code,
                    department_type: department_type || null,
                    head_of_department: head_of_department ? BigInt(head_of_department) : null,
                    contact_number: contact_number || null,
                    is_active: true
                }
            });
            break;
        } catch (error) {
            if (parsePrismaCode(error) === 'P2002') {
                continue;
            }
            throw error;
        }
    }

    if (!department) {
        throw new Error('DEPARTMENT_CODE_GENERATION_FAILED');
    }

    return {
        department_id: Number(department.department_id),
        department_name: department.department_name,
        department_code: department.department_code,
        department_type: department.department_type,
        head_of_department: department.head_of_department ? Number(department.head_of_department) : null,
        contact_number: department.contact_number,
        is_active: department.is_active,
        created_at: department.created_at
    };
}

/**
 * Get all departments
 */
export async function listDepartments(prisma, tenantId, filters = {}) {
    const whereClause = {
        tenant_id: BigInt(tenantId)
    };

    if (filters.is_active !== undefined) {
        whereClause.is_active = filters.is_active;
    }

    if (filters.department_type) {
        whereClause.department_type = filters.department_type;
    }

    const departments = await prisma.departments.findMany({
        where: whereClause,
        include: {
            users: {
                select: {
                    user_id: true,
                    employee_id: true,
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            }
        },
        orderBy: {
            department_name: 'asc'
        }
    });

    return departments.map(dept => {
        const headProfile = dept.users?.staff_profiles;
        const headName = headProfile
            ? `${headProfile.first_name} ${headProfile.last_name}`
            : null;

        return {
            department_id: Number(dept.department_id),
            department_name: dept.department_name,
            department_code: dept.department_code,
            department_type: dept.department_type,
            head_of_department: dept.head_of_department ? Number(dept.head_of_department) : null,
            head_name: headName,
            contact_number: dept.contact_number,
            is_active: dept.is_active,
            created_at: dept.created_at
        };
    });
}

/**
 * Get department by ID
 */
export async function getDepartmentById(prisma, tenantId, departmentId) {
    const department = await prisma.departments.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            department_id: Number(departmentId)
        },
        include: {
            users: {
                select: {
                    user_id: true,
                    employee_id: true,
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            }
        }
    });

    if (!department) {
        throw new Error('DEPARTMENT_NOT_FOUND');
    }

    const headProfile = department.users?.staff_profiles;
    const headName = headProfile
        ? `${headProfile.first_name} ${headProfile.last_name}`
        : null;

    return {
        department_id: Number(department.department_id),
        department_name: department.department_name,
        department_code: department.department_code,
        department_type: department.department_type,
        head_of_department: department.head_of_department ? Number(department.head_of_department) : null,
        head_name: headName,
        contact_number: department.contact_number,
        facility_id: department.facility_id ? Number(department.facility_id) : null,
        is_active: department.is_active,
        created_at: department.created_at
    };
}

/**
 * Update department
 */
export async function updateDepartment(prisma, tenantId, departmentId, data) {
    const existing = await prisma.departments.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            department_id: Number(departmentId)
        }
    });

    if (!existing) {
        throw new Error('DEPARTMENT_NOT_FOUND');
    }

    if (data.department_code && data.department_code !== existing.department_code) {
        const duplicate = await prisma.departments.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                department_code: data.department_code,
                department_id: {
                    not: Number(departmentId)
                }
            }
        });

        if (duplicate) {
            throw new Error('DEPARTMENT_CODE_EXISTS');
        }
    }

    const updateData = {};
    if (data.department_name) updateData.department_name = data.department_name;
    if (data.department_code) updateData.department_code = data.department_code;
    if (data.department_type !== undefined) updateData.department_type = data.department_type;
    if (data.head_of_department !== undefined) {
        updateData.head_of_department = data.head_of_department ? BigInt(data.head_of_department) : null;
    }
    if (data.contact_number !== undefined) updateData.contact_number = data.contact_number;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const updated = await prisma.departments.update({
        where: {
            department_id: Number(departmentId)
        },
        data: updateData
    });

    return {
        department_id: Number(updated.department_id),
        department_name: updated.department_name,
        department_code: updated.department_code,
        is_active: updated.is_active
    };
}

/**
 * Delete department (soft delete)
 */
export async function deleteDepartment(prisma, tenantId, departmentId) {
    const department = await prisma.departments.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            department_id: Number(departmentId)
        }
    });

    if (!department) {
        throw new Error('DEPARTMENT_NOT_FOUND');
    }

    await prisma.departments.update({
        where: {
            department_id: Number(departmentId)
        },
        data: {
            is_active: false
        }
    });

    return {
        message: 'Department deactivated successfully',
        department_id: Number(departmentId)
    };
}
