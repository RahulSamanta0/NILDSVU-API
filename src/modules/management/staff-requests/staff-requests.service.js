/**
 * Staff Requests Service Layer
 *
 * Purpose: Business logic for management approval of staff requests
 */

import { normalizeEmployeeCode } from '../../../utils/employeeCodeGenerator.js';

export async function listStaffRequests(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const whereClause = {
        tenant_id: BigInt(tenantId)
    };

    if (filters.status) {
        whereClause.request_status = filters.status;
    }

    if (filters.department_id) {
        whereClause.department_id = Number(filters.department_id);
    }

    const [total, profiles] = await Promise.all([
        prisma.staff_profiles.count({ where: whereClause }),
        prisma.staff_profiles.findMany({
            where: whereClause,
            include: {
                departments: {
                    select: {
                        department_id: true,
                        department_name: true
                    }
                }
            },
            orderBy: {
                created_at: 'desc'
            },
            skip,
            take: pageSize
        })
    ]);

    const data = profiles.map(profile => ({
        profile_id: Number(profile.profile_id),
        user_id: Number(profile.user_id),
        employee_code: normalizeEmployeeCode(profile.employee_code),
        full_name: `${profile.first_name} ${profile.last_name}`,
        designation: profile.designation,
        department_id: profile.department_id,
        department_name: profile.departments?.department_name || null,
        specialization: profile.specialization,
        contact_number: profile.contact_number,
        request_status: profile.request_status,
        request_type: profile.request_type,
        submitted_by: profile.submitted_by ? Number(profile.submitted_by) : null,
        reviewed_by: profile.reviewed_by ? Number(profile.reviewed_by) : null,
        reviewed_at: profile.reviewed_at ? profile.reviewed_at.toISOString() : null,
        request_notes: profile.request_notes || null,
        created_at: profile.created_at ? profile.created_at.toISOString() : null
    }));

    return { page, pageSize, total, data };
}

export async function listRecentStaffRequests(prisma, tenantId, filters = {}) {
    const limit = Number(filters.limit || 10);

    const whereClause = {
        tenant_id: BigInt(tenantId),
        request_status: filters.status,
        reviewed_at: { not: null }
    };

    const [total, profiles] = await Promise.all([
        prisma.staff_profiles.count({ where: whereClause }),
        prisma.staff_profiles.findMany({
            where: whereClause,
            include: {
                departments: {
                    select: {
                        department_id: true,
                        department_name: true
                    }
                }
            },
            orderBy: {
                reviewed_at: 'desc'
            },
            take: limit
        })
    ]);

    const data = profiles.map(profile => ({
        profile_id: Number(profile.profile_id),
        user_id: Number(profile.user_id),
        employee_code: normalizeEmployeeCode(profile.employee_code),
        full_name: `${profile.first_name} ${profile.last_name}`,
        designation: profile.designation,
        department_id: profile.department_id,
        department_name: profile.departments?.department_name || null,
        specialization: profile.specialization,
        contact_number: profile.contact_number,
        request_status: profile.request_status,
        request_type: profile.request_type,
        submitted_by: profile.submitted_by ? Number(profile.submitted_by) : null,
        reviewed_by: profile.reviewed_by ? Number(profile.reviewed_by) : null,
        reviewed_at: profile.reviewed_at ? profile.reviewed_at.toISOString() : null,
        request_notes: profile.request_notes || null,
        created_at: profile.created_at ? profile.created_at.toISOString() : null
    }));

    return { total, data };
}

export async function approveStaffRequest(prisma, tenantId, reviewerId, profileId) {
    const profile = await prisma.staff_profiles.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            profile_id: BigInt(profileId)
        },
        select: { profile_id: true }
    });

    if (!profile) {
        throw new Error('STAFF_PROFILE_NOT_FOUND');
    }

    const updated = await prisma.staff_profiles.update({
        where: { profile_id: BigInt(profileId) },
        data: {
            request_status: 'approved',
            reviewed_by: reviewerId ? BigInt(reviewerId) : null,
            reviewed_at: new Date(),
            request_notes: null,
            is_active: true
        }
    });

    return {
        profile_id: Number(updated.profile_id),
        request_status: updated.request_status,
        reviewed_by: updated.reviewed_by ? Number(updated.reviewed_by) : null,
        reviewed_at: updated.reviewed_at ? updated.reviewed_at.toISOString() : null
    };
}

export async function rejectStaffRequest(prisma, tenantId, reviewerId, profileId, data) {
    const profile = await prisma.staff_profiles.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            profile_id: BigInt(profileId)
        },
        select: { profile_id: true }
    });

    if (!profile) {
        throw new Error('STAFF_PROFILE_NOT_FOUND');
    }

    const updated = await prisma.staff_profiles.update({
        where: { profile_id: BigInt(profileId) },
        data: {
            request_status: 'rejected',
            reviewed_by: reviewerId ? BigInt(reviewerId) : null,
            reviewed_at: new Date(),
            request_notes: data?.request_notes || null
        }
    });

    return {
        profile_id: Number(updated.profile_id),
        request_status: updated.request_status,
        reviewed_by: updated.reviewed_by ? Number(updated.reviewed_by) : null,
        reviewed_at: updated.reviewed_at ? updated.reviewed_at.toISOString() : null,
        request_notes: updated.request_notes || null
    };
}
