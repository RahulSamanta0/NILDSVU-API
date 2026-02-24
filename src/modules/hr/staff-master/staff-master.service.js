/**
 * Staff Master Service Layer
 *
 * Purpose: Business logic for staff request submissions and staff master reads
 */

import { registerStaff } from '../../auth/authstaff.service.js';
import { ensureEmployeeCode, normalizeEmployeeCode } from '../../../utils/employeeCodeGenerator.js';

function toNullableNumber(value) {
    if (value === null || value === undefined) return null;
    return Number(value);
}

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

function mapStaffListItem(profile) {
    const roles = profile.users?.user_roles_user_roles_user_idTousers?.map(entry => entry.roles?.role_name).filter(Boolean) || [];

    return {
        profile_id: Number(profile.profile_id),
        user_id: Number(profile.user_id),
        employee_code: normalizeEmployeeCode(profile.employee_code),
        full_name: `${profile.first_name} ${profile.last_name}`,
        first_name: profile.first_name,
        last_name: profile.last_name,
        username: profile.users?.username || null,
        email: profile.users?.email || null,
        designation: profile.designation,
        department_id: profile.department_id,
        department_name: profile.departments?.department_name || null,
        facility_id: toNullableNumber(profile.users?.facility_id),
        facility_name: profile.users?.facilities?.facility_name || null,
        role_names: roles,
        primary_role: roles[0] || null,
        specialization: profile.specialization,
        qualification: profile.qualification,
        registration_number: profile.registration_number,
        date_of_joining: toIsoString(profile.date_of_joining),
        contact_number: profile.contact_number,
        emergency_contact: profile.emergency_contact,
        photo_url: profile.photo_url,
        room_number: profile.room_number,
        current_status: profile.current_status,
        is_active: profile.is_active,
        request_status: profile.request_status,
        request_type: profile.request_type,
        submitted_by: toNullableNumber(profile.submitted_by),
        submitted_by_name: profile.submitted_by_user
            ? `${profile.submitted_by_user.username} (${profile.submitted_by_user.email})`
            : null,
        reviewed_by: toNullableNumber(profile.reviewed_by),
        reviewed_by_name: profile.reviewed_by_user
            ? `${profile.reviewed_by_user.username} (${profile.reviewed_by_user.email})`
            : null,
        created_at: toIsoString(profile.created_at),
        updated_at: toIsoString(profile.updated_at)
    };
}

function mapStaffDetails(profile) {
    const roles = profile.users?.user_roles_user_roles_user_idTousers?.map(entry => ({
        role_id: entry.roles?.role_id || null,
        role_name: entry.roles?.role_name || null,
        role_code: entry.roles?.role_code || null,
        assigned_at: toIsoString(entry.assigned_at)
    })) || [];

    return {
        profile_id: Number(profile.profile_id),
        tenant_id: Number(profile.tenant_id),
        user_id: Number(profile.user_id),
        employee_code: normalizeEmployeeCode(profile.employee_code),
        first_name: profile.first_name,
        last_name: profile.last_name,
        designation: profile.designation,
        department_id: profile.department_id,
        department_name: profile.departments?.department_name || null,
        specialization: profile.specialization,
        qualification: profile.qualification,
        registration_number: profile.registration_number,
        date_of_joining: toIsoString(profile.date_of_joining),
        contact_number: profile.contact_number,
        emergency_contact: profile.emergency_contact,
        photo_url: profile.photo_url,
        room_number: profile.room_number,
        current_status: profile.current_status,
        is_active: profile.is_active,
        request_status: profile.request_status,
        request_type: profile.request_type,
        request_notes: profile.request_notes,
        submitted_by: toNullableNumber(profile.submitted_by),
        submitted_by_name: profile.submitted_by_user
            ? `${profile.submitted_by_user.username} (${profile.submitted_by_user.email})`
            : null,
        reviewed_by: toNullableNumber(profile.reviewed_by),
        reviewed_by_name: profile.reviewed_by_user
            ? `${profile.reviewed_by_user.username} (${profile.reviewed_by_user.email})`
            : null,
        reviewed_at: toIsoString(profile.reviewed_at),
        created_at: toIsoString(profile.created_at),
        updated_at: toIsoString(profile.updated_at),
        user: profile.users
            ? {
                user_id: Number(profile.users.user_id),
                username: profile.users.username,
                email: profile.users.email,
                employee_id: normalizeEmployeeCode(profile.users.employee_id),
                facility_id: toNullableNumber(profile.users.facility_id),
                facility_name: profile.users.facilities?.facility_name || null,
                is_active: profile.users.is_active,
                is_verified: profile.users.is_verified,
                last_login_at: toIsoString(profile.users.last_login_at),
                created_at: toIsoString(profile.users.created_at),
                updated_at: toIsoString(profile.users.updated_at),
                roles
            }
            : null,
        documents: profile.staff_request_documents.map(document => ({
            document_id: Number(document.document_id),
            document_type: document.document_type,
            file_url: document.file_url,
            file_name: document.file_name,
            file_size: document.file_size ? Number(document.file_size) : null,
            uploaded_at: toIsoString(document.uploaded_at)
        }))
    };
}

function buildUpdateData(data) {
    const updateData = {};

    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;
    if (data.designation !== undefined) updateData.designation = data.designation || null;
    if (data.department_id !== undefined) updateData.department_id = data.department_id ? Number(data.department_id) : null;
    if (data.specialization !== undefined) updateData.specialization = data.specialization || null;
    if (data.qualification !== undefined) updateData.qualification = data.qualification || null;
    if (data.registration_number !== undefined) updateData.registration_number = data.registration_number || null;
    if (data.date_of_joining !== undefined) updateData.date_of_joining = data.date_of_joining ? new Date(data.date_of_joining) : null;
    if (data.contact_number !== undefined) updateData.contact_number = data.contact_number || null;
    if (data.emergency_contact !== undefined) updateData.emergency_contact = data.emergency_contact || null;
    if (data.photo_url !== undefined) updateData.photo_url = data.photo_url || null;
    if (data.room_number !== undefined) updateData.room_number = data.room_number || null;
    if (data.current_status !== undefined) updateData.current_status = data.current_status || null;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    updateData.request_status = 'pending';
    if (data.request_type !== undefined) updateData.request_type = data.request_type;

    return updateData;
}

function buildSafeProfileUpdateData(data) {
    const updateData = {};

    if (data.first_name !== undefined) updateData.first_name = data.first_name;
    if (data.last_name !== undefined) updateData.last_name = data.last_name;
    if (data.designation !== undefined) updateData.designation = data.designation || null;
    if (data.department_id !== undefined) updateData.department_id = data.department_id ? Number(data.department_id) : null;
    if (data.specialization !== undefined) updateData.specialization = data.specialization || null;
    if (data.qualification !== undefined) updateData.qualification = data.qualification || null;
    if (data.registration_number !== undefined) updateData.registration_number = data.registration_number || null;
    if (data.date_of_joining !== undefined) updateData.date_of_joining = data.date_of_joining ? new Date(data.date_of_joining) : null;
    if (data.contact_number !== undefined) updateData.contact_number = data.contact_number || null;
    if (data.emergency_contact !== undefined) updateData.emergency_contact = data.emergency_contact || null;
    if (data.photo_url !== undefined) updateData.photo_url = data.photo_url || null;
    if (data.room_number !== undefined) updateData.room_number = data.room_number || null;
    if (data.current_status !== undefined) updateData.current_status = data.current_status || null;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    return updateData;
}

const SENSITIVE_UPDATE_FIELDS = new Set([
    'tenant_id',
    'user_id',
    'employee_code',
    'request_status',
    'request_type',
    'submitted_by',
    'reviewed_by',
    'reviewed_at',
    'request_notes',
    'created_at',
    'updated_at',
    'username',
    'email',
    'password',
    'password_hash',
    'role_id',
    'facility_id',
    'employee_id',
    'is_verified',
    'last_login_at'
]);

export async function submitStaffRequest(prisma, bcrypt, tenantId, submittedBy, data) {
    let userId = data.user_id;
    let userEmployeeId = null;

    if (!userId) {
        if (!data.username || !data.email || !data.password || !data.role_id) {
            throw new Error('USER_NOT_FOUND');
        }

        const created = await registerStaff(prisma, bcrypt, {
            tenant_id: tenantId,
            username: data.username,
            email: data.email,
            password: data.password,
            role_id: data.role_id,
            facility_id: data.facility_id
        });

        userId = created.user_id;
        userEmployeeId = created.employee_id;
    }

    const user = await prisma.users.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            user_id: BigInt(userId)
        },
        select: {
            user_id: true,
            employee_id: true
        }
    });

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    if (data.department_id !== undefined) {
        const department = await prisma.departments.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                department_id: Number(data.department_id)
            },
            select: { department_id: true }
        });

        if (!department) {
            throw new Error('DEPARTMENT_NOT_FOUND');
        }
    }

    const employeeCode = normalizeEmployeeCode(
        userEmployeeId || user.employee_id || await ensureEmployeeCode(prisma, tenantId, userId)
    );

    const updateData = buildUpdateData({
        ...data,
        employee_code: employeeCode
    });

    const profile = await prisma.staff_profiles.upsert({
        where: { user_id: BigInt(userId) },
        create: {
            tenant_id: BigInt(tenantId),
            user_id: BigInt(userId),
            employee_code: employeeCode,
            first_name: data.first_name,
            last_name: data.last_name,
            designation: data.designation || null,
            department_id: data.department_id ? Number(data.department_id) : null,
            specialization: data.specialization || null,
            qualification: data.qualification || null,
            registration_number: data.registration_number || null,
            date_of_joining: data.date_of_joining ? new Date(data.date_of_joining) : null,
            contact_number: data.contact_number || null,
            emergency_contact: data.emergency_contact || null,
            photo_url: data.photo_url || null,
            room_number: data.room_number || null,
            current_status: data.current_status || 'offline',
            is_active: data.is_active !== undefined ? data.is_active : true,
            request_status: 'pending',
            request_type: data.request_type,
            submitted_by: submittedBy ? BigInt(submittedBy) : null,
            reviewed_by: null,
            reviewed_at: null,
            request_notes: null
        },
        update: {
            ...updateData,
            submitted_by: submittedBy ? BigInt(submittedBy) : null,
            reviewed_by: null,
            reviewed_at: null,
            request_notes: null
        }
    });

    return {
        profile_id: Number(profile.profile_id),
        user_id: Number(profile.user_id),
        employee_code: normalizeEmployeeCode(profile.employee_code),
        first_name: profile.first_name,
        last_name: profile.last_name,
        request_status: profile.request_status,
        request_type: profile.request_type,
        submitted_by: profile.submitted_by ? Number(profile.submitted_by) : null,
        created_at: profile.created_at ? profile.created_at.toISOString() : null
    };
}

export async function listStaffRequests(prisma, tenantId, submittedBy, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const whereClause = {
        tenant_id: BigInt(tenantId)
    };

    if (submittedBy) {
        whereClause.submitted_by = BigInt(submittedBy);
    }

    if (filters.status) {
        whereClause.request_status = filters.status;
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
        created_at: profile.created_at ? profile.created_at.toISOString() : null
    }));

    return { page, pageSize, total, data };
}

export async function listAllStaff(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);
    const skip = (page - 1) * pageSize;

    const whereClause = {
        tenant_id: BigInt(tenantId)
    };

    if (filters.search) {
        whereClause.OR = [
            { employee_code: { contains: filters.search, mode: 'insensitive' } },
            { first_name: { contains: filters.search, mode: 'insensitive' } },
            { last_name: { contains: filters.search, mode: 'insensitive' } },
            { designation: { contains: filters.search, mode: 'insensitive' } },
            { contact_number: { contains: filters.search, mode: 'insensitive' } },
            {
                users: {
                    is: {
                        OR: [
                            { username: { contains: filters.search, mode: 'insensitive' } },
                            { email: { contains: filters.search, mode: 'insensitive' } }
                        ]
                    }
                }
            }
        ];
    }

    if (filters.department_id !== undefined) {
        whereClause.department_id = Number(filters.department_id);
    }

    if (filters.designation) {
        whereClause.designation = {
            contains: filters.designation,
            mode: 'insensitive'
        };
    }

    if (filters.request_status) {
        whereClause.request_status = filters.request_status;
    }

    if (filters.request_type) {
        whereClause.request_type = filters.request_type;
    }

    if (filters.current_status) {
        whereClause.current_status = {
            contains: filters.current_status,
            mode: 'insensitive'
        };
    }

    const isActiveFilter = parseBooleanFilter(filters.is_active);
    if (isActiveFilter !== undefined) {
        whereClause.is_active = isActiveFilter;
    }

    if (filters.submitted_by !== undefined) {
        whereClause.submitted_by = BigInt(filters.submitted_by);
    }

    if (filters.reviewed_by !== undefined) {
        whereClause.reviewed_by = BigInt(filters.reviewed_by);
    }

    if (filters.facility_id !== undefined) {
        whereClause.users = {
            ...(whereClause.users || {}),
            is: {
                ...(whereClause.users?.is || {}),
                facility_id: BigInt(filters.facility_id)
            }
        };
    }

    if (filters.role_id !== undefined) {
        whereClause.users = {
            ...(whereClause.users || {}),
            is: {
                ...(whereClause.users?.is || {}),
                user_roles_user_roles_user_idTousers: {
                    some: {
                        role_id: Number(filters.role_id),
                        tenant_id: BigInt(tenantId)
                    }
                }
            }
        };
    }

    if (filters.from_date || filters.to_date) {
        whereClause.created_at = {};
        if (filters.from_date) {
            whereClause.created_at.gte = new Date(filters.from_date);
        }
        if (filters.to_date) {
            whereClause.created_at.lte = new Date(filters.to_date);
        }
    }

    const allowedSortBy = new Set([
        'created_at',
        'updated_at',
        'date_of_joining',
        'first_name',
        'last_name',
        'employee_code'
    ]);

    const sortBy = allowedSortBy.has(filters.sort_by) ? filters.sort_by : 'created_at';
    const sortOrder = filters.sort_order === 'asc' ? 'asc' : 'desc';

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
                        username: true,
                        email: true,
                        facility_id: true,
                        facilities: {
                            select: {
                                facility_name: true
                            }
                        },
                        user_roles_user_roles_user_idTousers: {
                            where: {
                                tenant_id: BigInt(tenantId)
                            },
                            include: {
                                roles: {
                                    select: {
                                        role_name: true
                                    }
                                }
                            }
                        }
                    }
                },
                submitted_by_user: {
                    select: {
                        username: true,
                        email: true
                    }
                },
                reviewed_by_user: {
                    select: {
                        username: true,
                        email: true
                    }
                }
            },
            orderBy: {
                [sortBy]: sortOrder
            },
            skip,
            take: pageSize
        })
    ]);

    return {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        data: profiles.map(mapStaffListItem)
    };
}

export async function getStaffDetails(prisma, tenantId, profileId) {
    const profile = await prisma.staff_profiles.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            profile_id: BigInt(profileId)
        },
        include: {
            departments: {
                select: {
                    department_id: true,
                    department_name: true,
                    department_code: true,
                    department_type: true,
                    location: true,
                    is_active: true
                }
            },
            users: {
                include: {
                    facilities: {
                        select: {
                            facility_name: true,
                            facility_code: true,
                            facility_type: true,
                            city: true,
                            state: true
                        }
                    },
                    user_roles_user_roles_user_idTousers: {
                        where: {
                            tenant_id: BigInt(tenantId)
                        },
                        include: {
                            roles: {
                                select: {
                                    role_id: true,
                                    role_name: true,
                                    role_code: true
                                }
                            }
                        }
                    }
                }
            },
            submitted_by_user: {
                select: {
                    user_id: true,
                    username: true,
                    email: true
                }
            },
            reviewed_by_user: {
                select: {
                    user_id: true,
                    username: true,
                    email: true
                }
            },
            staff_request_documents: {
                orderBy: {
                    uploaded_at: 'desc'
                }
            }
        }
    });

    if (!profile) {
        throw new Error('STAFF_PROFILE_NOT_FOUND');
    }

    return mapStaffDetails(profile);
}

export async function updateStaffDetails(prisma, tenantId, profileId, data) {
    const sensitiveKeys = Object.keys(data).filter(key => SENSITIVE_UPDATE_FIELDS.has(key));
    if (sensitiveKeys.length > 0) {
        throw new Error('SENSITIVE_FIELDS_NOT_ALLOWED');
    }

    if (data.department_id !== undefined) {
        const department = await prisma.departments.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                department_id: Number(data.department_id)
            },
            select: { department_id: true }
        });

        if (!department) {
            throw new Error('DEPARTMENT_NOT_FOUND');
        }
    }

    const updateData = buildSafeProfileUpdateData(data);
    if (Object.keys(updateData).length === 0) {
        throw new Error('NO_UPDATABLE_FIELDS');
    }

    const profile = await prisma.staff_profiles.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            profile_id: BigInt(profileId)
        },
        select: {
            profile_id: true,
            user_id: true,
            employee_code: true
        }
    });

    if (!profile) {
        throw new Error('STAFF_PROFILE_NOT_FOUND');
    }

    const updatedProfile = await prisma.staff_profiles.update({
        where: {
            profile_id: BigInt(profileId)
        },
        data: {
            ...updateData,
            updated_at: new Date()
        }
    });

    return {
        profile_id: Number(updatedProfile.profile_id),
        user_id: Number(updatedProfile.user_id),
        employee_code: normalizeEmployeeCode(updatedProfile.employee_code),
        first_name: updatedProfile.first_name,
        last_name: updatedProfile.last_name,
        designation: updatedProfile.designation,
        department_id: updatedProfile.department_id,
        specialization: updatedProfile.specialization,
        qualification: updatedProfile.qualification,
        registration_number: updatedProfile.registration_number,
        date_of_joining: toIsoString(updatedProfile.date_of_joining),
        contact_number: updatedProfile.contact_number,
        emergency_contact: updatedProfile.emergency_contact,
        photo_url: updatedProfile.photo_url,
        room_number: updatedProfile.room_number,
        current_status: updatedProfile.current_status,
        is_active: updatedProfile.is_active,
        updated_at: toIsoString(updatedProfile.updated_at)
    };
}

export async function addStaffRequestDocument(prisma, tenantId, profileId, data) {
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

    const document = await prisma.staff_request_documents.create({
        data: {
            profile_id: BigInt(profileId),
            document_type: data.document_type,
            file_url: data.file_url,
            file_name: data.file_name,
            file_size: data.file_size !== undefined ? BigInt(data.file_size) : null
        }
    });

    return {
        document_id: Number(document.document_id),
        profile_id: Number(document.profile_id),
        document_type: document.document_type,
        file_url: document.file_url,
        file_name: document.file_name,
        file_size: document.file_size ? Number(document.file_size) : null,
        uploaded_at: document.uploaded_at ? document.uploaded_at.toISOString() : null
    };
}

export async function listStaffRequestDocuments(prisma, tenantId, profileId) {
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

    const documents = await prisma.staff_request_documents.findMany({
        where: {
            profile_id: BigInt(profileId)
        },
        orderBy: {
            uploaded_at: 'desc'
        }
    });

    return documents.map(doc => ({
        document_id: Number(doc.document_id),
        profile_id: Number(doc.profile_id),
        document_type: doc.document_type,
        file_url: doc.file_url,
        file_name: doc.file_name,
        file_size: doc.file_size ? Number(doc.file_size) : null,
        uploaded_at: doc.uploaded_at ? doc.uploaded_at.toISOString() : null
    }));
}

export async function updateStaffRequestDocument(prisma, tenantId, profileId, documentId, data) {
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

    const existingDocument = await prisma.staff_request_documents.findFirst({
        where: {
            document_id: BigInt(documentId),
            profile_id: BigInt(profileId)
        },
        select: {
            document_id: true
        }
    });

    if (!existingDocument) {
        throw new Error('DOCUMENT_NOT_FOUND');
    }

    const updateData = {};
    if (data.document_type !== undefined) updateData.document_type = data.document_type;
    if (data.file_url !== undefined) updateData.file_url = data.file_url;
    if (data.file_name !== undefined) updateData.file_name = data.file_name;
    if (data.file_size !== undefined) updateData.file_size = data.file_size !== null ? BigInt(data.file_size) : null;

    if (Object.keys(updateData).length === 0) {
        throw new Error('NO_UPDATABLE_FIELDS');
    }

    const updated = await prisma.staff_request_documents.update({
        where: {
            document_id: BigInt(documentId)
        },
        data: updateData
    });

    return {
        document_id: Number(updated.document_id),
        profile_id: Number(updated.profile_id),
        document_type: updated.document_type,
        file_url: updated.file_url,
        file_name: updated.file_name,
        file_size: updated.file_size ? Number(updated.file_size) : null,
        uploaded_at: updated.uploaded_at ? updated.uploaded_at.toISOString() : null
    };
}

export async function deleteStaffRequestDocument(prisma, tenantId, profileId, documentId) {
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

    const existingDocument = await prisma.staff_request_documents.findFirst({
        where: {
            document_id: BigInt(documentId),
            profile_id: BigInt(profileId)
        },
        select: {
            document_id: true,
            profile_id: true
        }
    });

    if (!existingDocument) {
        throw new Error('DOCUMENT_NOT_FOUND');
    }

    await prisma.staff_request_documents.delete({
        where: {
            document_id: BigInt(documentId)
        }
    });

    return {
        document_id: Number(existingDocument.document_id),
        profile_id: Number(existingDocument.profile_id),
        deleted: true
    };
}
