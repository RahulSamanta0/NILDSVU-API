/**
 * Wards Service Layer
 * 
 * Purpose: Business logic for ward CRUD operations using Prisma Client
 */

/**
 * Create a new ward
 */
export async function createWard(prisma, tenantId, data) {
    const {
        ward_name,
        ward_code,
        ward_type,
        floor_number,
        total_beds,
        available_beds,
        facility_id
    } = data;

    const existingWard = await prisma.wards.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            ward_code: ward_code
        }
    });

    if (existingWard) {
        throw new Error('WARD_CODE_EXISTS');
    }

    const ward = await prisma.wards.create({
        data: {
            tenant_id: BigInt(tenantId),
            facility_id: facility_id ? BigInt(facility_id) : null,
            ward_name,
            ward_code,
            ward_type: ward_type || null,
            floor_number: floor_number !== undefined && floor_number !== null ? Number(floor_number) : null,
            total_beds: total_beds !== undefined && total_beds !== null ? Number(total_beds) : 0,
            available_beds: available_beds !== undefined && available_beds !== null ? Number(available_beds) : 0,
            is_active: true
        }
    });

    return {
        ward_id: Number(ward.ward_id),
        ward_name: ward.ward_name,
        ward_code: ward.ward_code,
        ward_type: ward.ward_type,
        floor_number: ward.floor_number,
        total_beds: ward.total_beds,
        available_beds: ward.available_beds,
        facility_id: ward.facility_id ? Number(ward.facility_id) : null,
        is_active: ward.is_active,
        created_at: ward.created_at
    };
}

/**
 * Get all wards
 */
export async function listWards(prisma, tenantId, filters = {}) {
    const whereClause = {
        tenant_id: BigInt(tenantId)
    };

    if (filters.is_active !== undefined) {
        whereClause.is_active = filters.is_active;
    }

    if (filters.ward_type) {
        whereClause.ward_type = filters.ward_type;
    }

    if (filters.facility_id !== undefined) {
        whereClause.facility_id = filters.facility_id ? BigInt(filters.facility_id) : null;
    }

    const wards = await prisma.wards.findMany({
        where: whereClause,
        orderBy: {
            ward_name: 'asc'
        }
    });

    return wards.map(ward => ({
        ward_id: Number(ward.ward_id),
        ward_name: ward.ward_name,
        ward_code: ward.ward_code,
        ward_type: ward.ward_type,
        floor_number: ward.floor_number,
        total_beds: ward.total_beds,
        available_beds: ward.available_beds,
        facility_id: ward.facility_id ? Number(ward.facility_id) : null,
        is_active: ward.is_active,
        created_at: ward.created_at
    }));
}

/**
 * Get ward by ID
 */
export async function getWardById(prisma, tenantId, wardId) {
    const ward = await prisma.wards.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            ward_id: Number(wardId)
        }
    });

    if (!ward) {
        throw new Error('WARD_NOT_FOUND');
    }

    return {
        ward_id: Number(ward.ward_id),
        ward_name: ward.ward_name,
        ward_code: ward.ward_code,
        ward_type: ward.ward_type,
        floor_number: ward.floor_number,
        total_beds: ward.total_beds,
        available_beds: ward.available_beds,
        facility_id: ward.facility_id ? Number(ward.facility_id) : null,
        is_active: ward.is_active,
        created_at: ward.created_at
    };
}

/**
 * Update ward
 */
export async function updateWard(prisma, tenantId, wardId, data) {
    const existing = await prisma.wards.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            ward_id: Number(wardId)
        }
    });

    if (!existing) {
        throw new Error('WARD_NOT_FOUND');
    }

    if (data.ward_code && data.ward_code !== existing.ward_code) {
        const duplicate = await prisma.wards.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                ward_code: data.ward_code,
                ward_id: {
                    not: Number(wardId)
                }
            }
        });

        if (duplicate) {
            throw new Error('WARD_CODE_EXISTS');
        }
    }

    const updateData = {};
    if (data.ward_name) updateData.ward_name = data.ward_name;
    if (data.ward_code) updateData.ward_code = data.ward_code;
    if (data.ward_type !== undefined) updateData.ward_type = data.ward_type;
    if (data.floor_number !== undefined) {
        updateData.floor_number = data.floor_number !== null ? Number(data.floor_number) : null;
    }
    if (data.total_beds !== undefined) {
        updateData.total_beds = data.total_beds !== null ? Number(data.total_beds) : null;
    }
    if (data.available_beds !== undefined) {
        updateData.available_beds = data.available_beds !== null ? Number(data.available_beds) : null;
    }
    if (data.facility_id !== undefined) {
        updateData.facility_id = data.facility_id ? BigInt(data.facility_id) : null;
    }
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const updated = await prisma.wards.update({
        where: {
            ward_id: Number(wardId)
        },
        data: updateData
    });

    return {
        ward_id: Number(updated.ward_id),
        ward_name: updated.ward_name,
        ward_code: updated.ward_code,
        is_active: updated.is_active
    };
}

/**
 * Delete ward (soft delete)
 */
export async function deleteWard(prisma, tenantId, wardId) {
    const ward = await prisma.wards.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            ward_id: Number(wardId)
        }
    });

    if (!ward) {
        throw new Error('WARD_NOT_FOUND');
    }

    await prisma.wards.update({
        where: {
            ward_id: Number(wardId)
        },
        data: {
            is_active: false
        }
    });

    return {
        message: 'Ward deactivated successfully',
        ward_id: Number(wardId)
    };
}
