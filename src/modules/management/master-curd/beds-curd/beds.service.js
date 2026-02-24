/**
 * Beds Service Layer
 * 
 * Purpose: Business logic for bed CRUD operations using Prisma Client
 */

/**
 * Create a new bed
 */
export async function createBed(prisma, tenantId, data) {
    const {
        ward_id,
        bed_number,
        bed_type,
        is_occupied,
        is_active
    } = data;

    const ward = await prisma.wards.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            ward_id: Number(ward_id)
        }
    });

    if (!ward) {
        throw new Error('WARD_NOT_FOUND');
    }

    const existingBed = await prisma.beds.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            ward_id: Number(ward_id),
            bed_number: bed_number
        }
    });

    if (existingBed) {
        throw new Error('BED_NUMBER_EXISTS');
    }

    const bed = await prisma.beds.create({
        data: {
            tenant_id: BigInt(tenantId),
            ward_id: Number(ward_id),
            bed_number,
            bed_type: bed_type || null,
            is_occupied: is_occupied !== undefined ? is_occupied : false,
            is_active: is_active !== undefined ? is_active : true
        }
    });

    return {
        bed_id: Number(bed.bed_id),
        ward_id: Number(bed.ward_id),
        bed_number: bed.bed_number,
        bed_type: bed.bed_type,
        is_occupied: bed.is_occupied,
        is_active: bed.is_active,
        created_at: bed.created_at
    };
}

/**
 * Get all beds
 */
export async function listBeds(prisma, tenantId, filters = {}) {
    const whereClause = {
        tenant_id: BigInt(tenantId)
    };

    if (filters.is_active !== undefined) {
        whereClause.is_active = filters.is_active;
    }

    if (filters.is_occupied !== undefined) {
        whereClause.is_occupied = filters.is_occupied;
    }

    if (filters.ward_id !== undefined) {
        whereClause.ward_id = Number(filters.ward_id);
    }

    const beds = await prisma.beds.findMany({
        where: whereClause,
        include: {
            wards: {
                select: {
                    ward_id: true,
                    ward_code: true,
                    ward_name: true
                }
            }
        },
        orderBy: {
            bed_number: 'asc'
        }
    });

    return beds.map(bed => ({
        bed_id: Number(bed.bed_id),
        ward_id: Number(bed.ward_id),
        ward_code: bed.wards?.ward_code || null,
        ward_name: bed.wards?.ward_name || null,
        bed_number: bed.bed_number,
        bed_type: bed.bed_type,
        is_occupied: bed.is_occupied,
        is_active: bed.is_active,
        created_at: bed.created_at
    }));
}

/**
 * Get bed by ID
 */
export async function getBedById(prisma, tenantId, bedId) {
    const bed = await prisma.beds.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            bed_id: Number(bedId)
        },
        include: {
            wards: {
                select: {
                    ward_id: true,
                    ward_code: true,
                    ward_name: true
                }
            }
        }
    });

    if (!bed) {
        throw new Error('BED_NOT_FOUND');
    }

    return {
        bed_id: Number(bed.bed_id),
        ward_id: Number(bed.ward_id),
        ward_code: bed.wards?.ward_code || null,
        ward_name: bed.wards?.ward_name || null,
        bed_number: bed.bed_number,
        bed_type: bed.bed_type,
        is_occupied: bed.is_occupied,
        is_active: bed.is_active,
        created_at: bed.created_at
    };
}

/**
 * Update bed
 */
export async function updateBed(prisma, tenantId, bedId, data) {
    const existing = await prisma.beds.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            bed_id: Number(bedId)
        }
    });

    if (!existing) {
        throw new Error('BED_NOT_FOUND');
    }

    const targetWardId = data.ward_id !== undefined ? Number(data.ward_id) : Number(existing.ward_id);
    const targetBedNumber = data.bed_number !== undefined ? data.bed_number : existing.bed_number;

    if (data.ward_id !== undefined) {
        const ward = await prisma.wards.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                ward_id: Number(data.ward_id)
            }
        });

        if (!ward) {
            throw new Error('WARD_NOT_FOUND');
        }
    }

    if (data.ward_id !== undefined || data.bed_number !== undefined) {
        const duplicate = await prisma.beds.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                ward_id: targetWardId,
                bed_number: targetBedNumber,
                bed_id: {
                    not: Number(bedId)
                }
            }
        });

        if (duplicate) {
            throw new Error('BED_NUMBER_EXISTS');
        }
    }

    const updateData = {};
    if (data.ward_id !== undefined) updateData.ward_id = Number(data.ward_id);
    if (data.bed_number !== undefined) updateData.bed_number = data.bed_number;
    if (data.bed_type !== undefined) updateData.bed_type = data.bed_type;
    if (data.is_occupied !== undefined) updateData.is_occupied = data.is_occupied;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const updated = await prisma.beds.update({
        where: {
            bed_id: Number(bedId)
        },
        data: updateData
    });

    return {
        bed_id: Number(updated.bed_id),
        bed_number: updated.bed_number,
        is_active: updated.is_active
    };
}

/**
 * Delete bed (soft delete)
 */
export async function deleteBed(prisma, tenantId, bedId) {
    const bed = await prisma.beds.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            bed_id: Number(bedId)
        }
    });

    if (!bed) {
        throw new Error('BED_NOT_FOUND');
    }

    await prisma.beds.update({
        where: {
            bed_id: Number(bedId)
        },
        data: {
            is_active: false
        }
    });

    return {
        message: 'Bed deactivated successfully',
        bed_id: Number(bedId)
    };
}
