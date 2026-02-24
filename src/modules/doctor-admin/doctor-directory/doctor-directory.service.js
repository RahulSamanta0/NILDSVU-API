/**
 * Doctor Directory Service Layer
 *
 * Purpose: Business logic for doctor directory management
 */

import { normalizeEmployeeCode } from '../../../utils/employeeCodeGenerator.js';

function toStatusLabel(profile, user) {
    if (profile.is_active === false || user?.is_active === false) {
        return 'Inactive';
    }
    if (profile.current_status && profile.current_status.toLowerCase() === 'on_leave') {
        return 'On Leave';
    }
    return 'Active';
}

function experienceFromDate(dateOfJoining) {
    if (!dateOfJoining) return null;
    const now = new Date();
    const diff = now.getTime() - dateOfJoining.getTime();
    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    return Math.max(0, years);
}

function dateFromExperienceYears(years) {
    if (!Number.isFinite(years)) return null;
    const now = new Date();
    const date = new Date(now);
    date.setFullYear(now.getFullYear() - years);
    return date;
}

function mapDocuments(documents = []) {
    const documentFiles = {};
    const names = documents.map(doc => {
        const sizeKb = doc.file_size ? Math.round(Number(doc.file_size) / 1024) : null;
        documentFiles[doc.document_type] = {
            name: doc.file_name,
            url: doc.file_url,
            size_kb: sizeKb
        };
        return doc.document_type;
    });

    return { names, documentFiles };
}

function mapDoctor(profile) {
    const user = profile.users;
    const role = user?.user_roles_user_roles_user_idTousers
        ?.map(item => item.roles)
        .find(r => r?.role_code?.toLowerCase() === 'doctor');

    const status = toStatusLabel(profile, user);
    const experienceYears = experienceFromDate(profile.date_of_joining);
    const { names, documentFiles } = mapDocuments(profile.staff_request_documents || []);

    return {
        profile_id: Number(profile.profile_id),
        user_id: Number(profile.user_id),
        doctor_id: normalizeEmployeeCode(profile.employee_code),
        full_name: `${profile.first_name} ${profile.last_name}`,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: user?.email || null,
        username: user?.username || null,
        phone: profile.contact_number || null,
        designation: profile.designation || null,
        specialization: profile.specialization || null,
        department_id: profile.department_id || null,
        department_name: profile.departments?.department_name || null,
        qualification: profile.qualification || null,
        registration_number: profile.registration_number || null,
        date_of_joining: profile.date_of_joining ? profile.date_of_joining.toISOString().slice(0, 10) : null,
        experience_years: experienceYears,
        status,
        is_active: profile.is_active !== false && user?.is_active !== false,
        role_code: role?.role_code || null,
        role_name: role?.role_name || null,
        image_url: profile.photo_url || null,
        documents: names,
        document_files: documentFiles,
        request_status: profile.request_status,
        created_at: profile.created_at ? profile.created_at.toISOString() : null
    };
}

export async function listDoctors(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const whereClause = {
        tenant_id: BigInt(tenantId),
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
    };

    if (filters.department_id) {
        whereClause.department_id = Number(filters.department_id);
    }

    if (filters.specialization) {
        whereClause.specialization = { contains: filters.specialization, mode: 'insensitive' };
    }

    if (filters.status) {
        if (filters.status === 'active') {
            whereClause.is_active = true;
        }
        if (filters.status === 'inactive') {
            whereClause.is_active = false;
        }
        if (filters.status === 'on_leave') {
            whereClause.current_status = 'on_leave';
        }
    }

    if (filters.search) {
        const search = filters.search;
        whereClause.OR = [
            { first_name: { contains: search, mode: 'insensitive' } },
            { last_name: { contains: search, mode: 'insensitive' } },
            { employee_code: { contains: search, mode: 'insensitive' } },
            { specialization: { contains: search, mode: 'insensitive' } },
            { departments: { department_name: { contains: search, mode: 'insensitive' } } },
            { users: { email: { contains: search, mode: 'insensitive' } } },
            { users: { username: { contains: search, mode: 'insensitive' } } }
        ];
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
                },
                users: {
                    select: {
                        user_id: true,
                        email: true,
                        username: true,
                        is_active: true,
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
                },
                staff_request_documents: {
                    select: {
                        document_type: true,
                        file_name: true,
                        file_url: true,
                        file_size: true
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

    const data = profiles.map(mapDoctor);

    return { page, pageSize, total, data };
}

export async function getDoctor(prisma, tenantId, doctorId) {
    const normalizedDoctorId = normalizeEmployeeCode(doctorId);

    const profile = await prisma.staff_profiles.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            employee_code: normalizedDoctorId,
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
        include: {
            departments: {
                select: {
                    department_id: true,
                    department_name: true
                }
            },
            users: {
                select: {
                    user_id: true,
                    email: true,
                    username: true,
                    is_active: true,
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
            },
            staff_request_documents: {
                select: {
                    document_type: true,
                    file_name: true,
                    file_url: true,
                    file_size: true
                }
            }
        }
    });

    if (!profile) {
        throw new Error('DOCTOR_NOT_FOUND');
    }

    return mapDoctor(profile);
}

export async function updateDoctor(prisma, tenantId, doctorId, data = {}) {
    const normalizedDoctorId = normalizeEmployeeCode(doctorId);
    const normalizedEmployeeCode = data.employee_code !== undefined
        ? normalizeEmployeeCode(data.employee_code)
        : undefined;

    const profile = await prisma.staff_profiles.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            employee_code: normalizedDoctorId,
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
            employee_code: true
        }
    });

    if (!profile) {
        throw new Error('DOCTOR_NOT_FOUND');
    }

    if (normalizedEmployeeCode && normalizedEmployeeCode !== profile.employee_code) {
        const existing = await prisma.staff_profiles.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                employee_code: normalizedEmployeeCode
            },
            select: { profile_id: true }
        });

        if (existing) {
            throw new Error('EMPLOYEE_CODE_EXISTS');
        }
    }

    if (data.email) {
        const existingEmail = await prisma.users.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                email: data.email,
                NOT: { user_id: profile.user_id }
            },
            select: { user_id: true }
        });

        if (existingEmail) {
            throw new Error('EMAIL_EXISTS');
        }
    }

    let dateOfJoining = data.date_of_joining ? new Date(data.date_of_joining) : undefined;
    if (!dateOfJoining && Number.isFinite(data.experience_years)) {
        dateOfJoining = dateFromExperienceYears(Number(data.experience_years));
    }

    await prisma.$transaction(async tx => {
        await tx.staff_profiles.update({
            where: { profile_id: profile.profile_id },
            data: {
                employee_code: normalizedEmployeeCode,
                first_name: data.first_name,
                last_name: data.last_name,
                designation: data.designation,
                department_id: data.department_id ? Number(data.department_id) : undefined,
                specialization: data.specialization,
                qualification: data.qualification,
                registration_number: data.registration_number,
                date_of_joining: dateOfJoining,
                contact_number: data.contact_number,
                photo_url: data.photo_url,
                current_status: data.current_status,
                is_active: typeof data.is_active === 'boolean' ? data.is_active : undefined
            }
        });

        if (data.email || data.username || typeof data.is_active === 'boolean') {
            await tx.users.update({
                where: { user_id: profile.user_id },
                data: {
                    email: data.email,
                    username: data.username,
                    is_active: typeof data.is_active === 'boolean' ? data.is_active : undefined
                }
            });
        }
    });

    return getDoctor(prisma, tenantId, normalizedEmployeeCode || normalizedDoctorId);
}

