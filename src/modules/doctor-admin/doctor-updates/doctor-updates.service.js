/**
 * Doctor Admin Service Layer
 *
 * Purpose: Business logic for doctor-specific pending staff approvals
 */

import { normalizeEmployeeCode } from '../../../utils/employeeCodeGenerator.js';

export async function listPendingDoctorStaff(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const whereClause = {
        tenant_id: BigInt(tenantId),
        request_status: 'pending',
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
                },
                users: {
                    select: {
                        user_roles_user_roles_user_idTousers: {
                            select: {
                                roles: {
                                    select: {
                                        role_code: true,
                                        role_name: true
                                    }
                                }
                            }
                        }
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

    const data = profiles.map(profile => {
        const role = profile.users?.user_roles_user_roles_user_idTousers
            ?.map(item => item.roles)
            .find(r => r?.role_code?.toLowerCase() === 'doctor');

        return {
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
            role_code: role?.role_code || null,
            role_name: role?.role_name || null,
            created_at: profile.created_at ? profile.created_at.toISOString() : null
        };
    });

    return { page, pageSize, total, data };
}
