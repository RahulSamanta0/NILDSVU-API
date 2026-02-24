import {
    submitStaffRequest,
    addStaffRequestDocument,
    listStaffRequestDocuments,
    updateStaffRequestDocument,
    deleteStaffRequestDocument
} from '../../hr/staff-master/staff-master.service.js';
import { normalizeEmployeeCode } from '../../../utils/employeeCodeGenerator.js';

function toDateOnlyUtc(dateValue) {
    if (!dateValue) {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }

    const parsed = new Date(`${dateValue}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) {
        const now = new Date();
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }

    return parsed;
}

function addDaysUtc(date, days) {
    const value = new Date(date);
    value.setUTCDate(value.getUTCDate() + days);
    return value;
}

function isoDate(date) {
    return date.toISOString().slice(0, 10);
}

function safeNumber(value, fallback = 0) {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'bigint') return Number(value);
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function average(values) {
    if (!values.length) return 0;
    const total = values.reduce((acc, value) => acc + value, 0);
    return total / values.length;
}

function quarterLabel(monthIndex) {
    if (monthIndex <= 2) return 'Q1';
    if (monthIndex <= 5) return 'Q2';
    if (monthIndex <= 8) return 'Q3';
    return 'Q4';
}

function buildName(profile, username = null) {
    const first = profile?.first_name || '';
    const last = profile?.last_name || '';
    const full = `${first} ${last}`.trim();
    return full || username || 'Unknown';
}

function isHrRoleFromUser(user) {
    const roles = user?.user_roles_user_roles_user_idTousers || [];
    return roles.some(entry => entry?.roles?.role_code?.toUpperCase() === 'HR');
}

async function getHrManagerUsers(prisma, tenantId) {
    return prisma.users.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            user_roles_user_roles_user_idTousers: {
                some: {
                    tenant_id: BigInt(tenantId),
                    roles: {
                        role_code: {
                            equals: 'HR',
                            mode: 'insensitive'
                        }
                    }
                }
            }
        },
        include: {
            staff_profiles: {
                include: {
                    departments: {
                        select: {
                            department_id: true,
                            department_name: true
                        }
                    }
                }
            },
            user_roles_user_roles_user_idTousers: {
                where: { tenant_id: BigInt(tenantId) },
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
        },
        orderBy: {
            created_at: 'desc'
        }
    });
}

async function getAttendanceScoresByStaff(prisma, tenantId, profileIds, days = 30) {
    if (!profileIds.length) return new Map();

    const endDate = toDateOnlyUtc();
    const startDate = addDaysUtc(endDate, -(days - 1));

    const rosterRows = await prisma.duty_roster.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            staff_id: { in: profileIds.map(id => BigInt(id)) },
            duty_date: {
                gte: startDate,
                lte: endDate
            }
        },
        select: {
            staff_id: true,
            is_available: true
        }
    });

    const scoreMap = new Map();

    for (const row of rosterRows) {
        const profileId = safeNumber(row.staff_id);
        if (!scoreMap.has(profileId)) {
            scoreMap.set(profileId, { total: 0, present: 0 });
        }

        const bucket = scoreMap.get(profileId);
        bucket.total += 1;
        if (row.is_available) bucket.present += 1;
    }

    const result = new Map();

    for (const [profileId, bucket] of scoreMap.entries()) {
        const score = bucket.total > 0 ? (bucket.present / bucket.total) * 100 : 0;
        result.set(profileId, Number(score.toFixed(2)));
    }

    return result;
}

async function getOnLeaveStaffIds(prisma, tenantId, profileIds = [], refDateValue = null) {
    if (!profileIds.length) return new Set();

    const refDate = toDateOnlyUtc(refDateValue);

    const rows = await prisma.leave_applications.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            staff_id: { in: profileIds.map(id => BigInt(id)) },
            status: 'approved',
            start_date: { lte: refDate },
            end_date: { gte: refDate }
        },
        select: {
            staff_id: true
        }
    });

    return new Set(rows.map(row => safeNumber(row.staff_id)));
}

function mapStaffUiStatus(staff, onLeaveSet) {
    const profileId = safeNumber(staff.profile_id);

    if (onLeaveSet.has(profileId)) return 'On Leave';
    if (staff.request_status === 'pending') return 'Probation';
    if (staff.request_status === 'rejected') return 'Probation';
    if (!staff.is_active || !staff.users?.is_active) return 'Probation';
    return 'Active';
}

async function getManagerAggregates(prisma, tenantId, managerUserIds) {
    if (!managerUserIds.length) {
        return {
            teamCountByManager: new Map(),
            attentionCountByManager: new Map(),
            avgPerformanceByManager: new Map(),
            allProfiles: []
        };
    }

    const allProfiles = await prisma.staff_profiles.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            submitted_by: {
                in: managerUserIds.map(id => BigInt(id))
            }
        },
        include: {
            users: {
                select: {
                    email: true,
                    is_active: true
                }
            }
        }
    });

    const profileIds = allProfiles.map(profile => safeNumber(profile.profile_id));
    const attendanceScoreMap = await getAttendanceScoresByStaff(prisma, tenantId, profileIds, 30);
    const onLeaveSet = await getOnLeaveStaffIds(prisma, tenantId, profileIds);

    const teamCountByManager = new Map();
    const attentionCountByManager = new Map();
    const performanceBucketsByManager = new Map();

    for (const profile of allProfiles) {
        const managerId = safeNumber(profile.submitted_by);
        if (!managerId) continue;

        teamCountByManager.set(managerId, (teamCountByManager.get(managerId) || 0) + 1);

        const status = mapStaffUiStatus(profile, onLeaveSet);
        if (status !== 'Active') {
            attentionCountByManager.set(managerId, (attentionCountByManager.get(managerId) || 0) + 1);
        }

        const score = attendanceScoreMap.get(safeNumber(profile.profile_id)) || 0;
        if (!performanceBucketsByManager.has(managerId)) {
            performanceBucketsByManager.set(managerId, []);
        }
        performanceBucketsByManager.get(managerId).push(score);
    }

    const avgPerformanceByManager = new Map();
    for (const [managerId, values] of performanceBucketsByManager.entries()) {
        avgPerformanceByManager.set(managerId, Number(average(values).toFixed(2)));
    }

    return {
        teamCountByManager,
        attentionCountByManager,
        avgPerformanceByManager,
        allProfiles
    };
}

function pickManagerRole(user) {
    const roles = user?.user_roles_user_roles_user_idTousers || [];
    const hrRole = roles.find(roleEntry => roleEntry?.roles?.role_code?.toUpperCase() === 'HR');
    return hrRole?.roles?.role_name || user?.staff_profiles?.designation || 'HR Manager';
}

function mapManagerCard(user, teamCountByManager, avgPerformanceByManager, attentionCountByManager) {
    const managerId = safeNumber(user.user_id);
    const profile = user.staff_profiles;

    return {
        manager_id: managerId,
        user_id: managerId,
        name: buildName(profile, user.username),
        role: pickManagerRole(user),
        department_id: profile?.department_id ? Number(profile.department_id) : null,
        department: profile?.departments?.department_name || null,
        teamSize: teamCountByManager.get(managerId) || 0,
        avgTeamPerformance: Number((avgPerformanceByManager.get(managerId) || 0).toFixed(2)),
        attentionNeeded: attentionCountByManager.get(managerId) || 0,
        image: profile?.photo_url || null,
        email: user.email,
        phone: profile?.contact_number || null,
        joinedDate: profile?.date_of_joining ? isoDate(profile.date_of_joining) : null,
        is_active: user.is_active !== false
    };
}

async function validateManager(prisma, tenantId, managerId) {
    const manager = await prisma.users.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            user_id: BigInt(managerId),
            user_roles_user_roles_user_idTousers: {
                some: {
                    tenant_id: BigInt(tenantId),
                    roles: {
                        role_code: {
                            equals: 'HR',
                            mode: 'insensitive'
                        }
                    }
                }
            }
        },
        include: {
            staff_profiles: {
                include: {
                    departments: {
                        select: {
                            department_id: true,
                            department_name: true
                        }
                    }
                }
            },
            user_roles_user_roles_user_idTousers: {
                where: { tenant_id: BigInt(tenantId) },
                include: {
                    roles: {
                        select: {
                            role_name: true,
                            role_code: true
                        }
                    }
                }
            }
        }
    });

    if (!manager) {
        throw new Error('MANAGER_NOT_FOUND');
    }

    return manager;
}

export async function getMetricsSummary(prisma, tenantId, filters = {}) {
    const managers = await getHrManagerUsers(prisma, tenantId);
    const managerIds = managers.map(manager => safeNumber(manager.user_id));

    const {
        teamCountByManager,
        attentionCountByManager,
        avgPerformanceByManager,
        allProfiles
    } = await getManagerAggregates(prisma, tenantId, managerIds);

    const totalManagers = managers.length;
    const totalStaff = allProfiles.length;
    const managerPerformance = managerIds.map(id => avgPerformanceByManager.get(id) || 0);
    const avgTeamPerformance = totalManagers ? Number(average(managerPerformance).toFixed(2)) : 0;

    const attentionNeeded = Array.from(attentionCountByManager.values()).reduce((acc, value) => acc + value, 0);

    return {
        as_of_date: isoDate(toDateOnlyUtc(filters?.date)),
        totalManagers,
        totalStaff,
        avgTeamPerformance,
        attentionNeeded,
        totalsByManager: managerIds.map(managerId => ({
            manager_id: managerId,
            teamSize: teamCountByManager.get(managerId) || 0,
            avgTeamPerformance: avgPerformanceByManager.get(managerId) || 0,
            attentionNeeded: attentionCountByManager.get(managerId) || 0
        }))
    };
}

export async function getMetricsAttention(prisma, tenantId, filters = {}) {
    const managers = await getHrManagerUsers(prisma, tenantId);
    const managerIds = managers.map(manager => BigInt(safeNumber(manager.user_id)));

    if (!managerIds.length) {
        return {
            as_of_date: isoDate(toDateOnlyUtc(filters?.date)),
            total: 0,
            pending: 0,
            rejected: 0,
            on_leave: 0,
            inactive: 0,
            missing_documents: 0
        };
    }

    const profiles = await prisma.staff_profiles.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            submitted_by: { in: managerIds }
        },
        select: {
            profile_id: true,
            request_status: true,
            is_active: true
        }
    });

    const profileIds = profiles.map(profile => safeNumber(profile.profile_id));
    const onLeaveSet = await getOnLeaveStaffIds(prisma, tenantId, profileIds, filters?.date);

    const docGrouped = profileIds.length
        ? await prisma.staff_request_documents.groupBy({
            by: ['profile_id'],
            where: {
                profile_id: { in: profileIds.map(id => BigInt(id)) }
            },
            _count: { _all: true }
        })
        : [];

    const profileWithDocs = new Set(docGrouped.map(item => safeNumber(item.profile_id)));

    let pending = 0;
    let rejected = 0;
    let inactive = 0;
    let onLeave = 0;
    let missingDocuments = 0;

    for (const profile of profiles) {
        const profileId = safeNumber(profile.profile_id);

        if (profile.request_status === 'pending') pending += 1;
        if (profile.request_status === 'rejected') rejected += 1;
        if (!profile.is_active) inactive += 1;
        if (onLeaveSet.has(profileId)) onLeave += 1;
        if (!profileWithDocs.has(profileId)) missingDocuments += 1;
    }

    return {
        as_of_date: isoDate(toDateOnlyUtc(filters?.date)),
        total: profiles.length,
        pending,
        rejected,
        on_leave: onLeave,
        inactive,
        missing_documents: missingDocuments
    };
}

export async function getAttendanceTrend(prisma, tenantId, filters = {}) {
    const days = Number(filters.days || 7);
    const endDate = toDateOnlyUtc();
    const startDate = addDaysUtc(endDate, -(days - 1));

    const rosterRows = await prisma.duty_roster.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            duty_date: {
                gte: startDate,
                lte: endDate
            }
        },
        select: {
            duty_date: true,
            is_available: true,
            staff_profiles: {
                select: {
                    users: {
                        select: {
                            user_roles_user_roles_user_idTousers: {
                                where: { tenant_id: BigInt(tenantId) },
                                include: {
                                    roles: {
                                        select: {
                                            role_code: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    const dayMap = new Map();

    for (let i = 0; i < days; i += 1) {
        const date = addDaysUtc(startDate, i);
        const key = isoDate(date);
        dayMap.set(key, {
            hrTotal: 0,
            hrPresent: 0,
            staffTotal: 0,
            staffPresent: 0,
            date
        });
    }

    for (const row of rosterRows) {
        const key = isoDate(toDateOnlyUtc(isoDate(row.duty_date)));
        const bucket = dayMap.get(key);
        if (!bucket) continue;

        const roleEntries = row.staff_profiles?.users?.user_roles_user_roles_user_idTousers || [];
        const isHr = roleEntries.some(entry => entry?.roles?.role_code?.toUpperCase() === 'HR');

        if (isHr) {
            bucket.hrTotal += 1;
            if (row.is_available) bucket.hrPresent += 1;
        } else {
            bucket.staffTotal += 1;
            if (row.is_available) bucket.staffPresent += 1;
        }
    }

    const data = Array.from(dayMap.values()).map(entry => ({
        date: isoDate(entry.date),
        day: entry.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
        hr: entry.hrTotal ? Number(((entry.hrPresent / entry.hrTotal) * 100).toFixed(2)) : 0,
        staff: entry.staffTotal ? Number(((entry.staffPresent / entry.staffTotal) * 100).toFixed(2)) : 0,
        hr_sample: entry.hrTotal,
        staff_sample: entry.staffTotal
    }));

    return {
        days,
        data
    };
}

export async function getHiringComparison(prisma, tenantId, filters = {}) {
    const year = Number(filters.year || new Date().getUTCFullYear());
    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year, 11, 31));

    const profiles = await prisma.staff_profiles.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            OR: [
                {
                    date_of_joining: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                {
                    created_at: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            ]
        },
        include: {
            users: {
                select: {
                    user_roles_user_roles_user_idTousers: {
                        where: {
                            tenant_id: BigInt(tenantId)
                        },
                        include: {
                            roles: {
                                select: {
                                    role_code: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    const quarters = {
        Q1: { name: 'Q1', hrHired: 0, staffHired: 0 },
        Q2: { name: 'Q2', hrHired: 0, staffHired: 0 },
        Q3: { name: 'Q3', hrHired: 0, staffHired: 0 },
        Q4: { name: 'Q4', hrHired: 0, staffHired: 0 }
    };

    for (const profile of profiles) {
        const joinedOn = profile.date_of_joining || profile.created_at;
        if (!joinedOn) continue;

        const month = joinedOn.getUTCMonth();
        const quarter = quarterLabel(month);

        const isHr = profile.users?.user_roles_user_roles_user_idTousers?.some(entry => entry?.roles?.role_code?.toUpperCase() === 'HR');

        if (isHr) {
            quarters[quarter].hrHired += 1;
        } else {
            quarters[quarter].staffHired += 1;
        }
    }

    return {
        year,
        data: [quarters.Q1, quarters.Q2, quarters.Q3, quarters.Q4]
    };
}

export async function getPerformanceDistribution(prisma, tenantId, filters = {}) {
    const days = Number(filters.days || 30);

    const managers = await getHrManagerUsers(prisma, tenantId);
    const managerIds = managers.map(manager => BigInt(safeNumber(manager.user_id)));

    if (!managerIds.length) {
        return {
            days,
            performance_source: 'attendance_proxy_from_duty_roster',
            data: [
                { name: 'Excellent (90+)', value: 0 },
                { name: 'Good (80-89)', value: 0 },
                { name: 'Average (70-79)', value: 0 },
                { name: 'Below Avg (<70)', value: 0 }
            ]
        };
    }

    const profiles = await prisma.staff_profiles.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            submitted_by: { in: managerIds }
        },
        select: {
            profile_id: true
        }
    });

    const profileIds = profiles.map(profile => safeNumber(profile.profile_id));
    const attendanceScoreMap = await getAttendanceScoresByStaff(prisma, tenantId, profileIds, days);

    const result = {
        excellent: 0,
        good: 0,
        average: 0,
        belowAverage: 0
    };

    for (const profileId of profileIds) {
        const score = attendanceScoreMap.get(profileId) || 0;

        if (score >= 90) result.excellent += 1;
        else if (score >= 80) result.good += 1;
        else if (score >= 70) result.average += 1;
        else result.belowAverage += 1;
    }

    return {
        days,
        performance_source: 'attendance_proxy_from_duty_roster',
        data: [
            { name: 'Excellent (90+)', value: result.excellent },
            { name: 'Good (80-89)', value: result.good },
            { name: 'Average (70-79)', value: result.average },
            { name: 'Below Avg (<70)', value: result.belowAverage }
        ]
    };
}

export async function listManagers(prisma, tenantId, filters = {}) {
    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);

    const allManagers = await getHrManagerUsers(prisma, tenantId);
    const managerIds = allManagers.map(manager => safeNumber(manager.user_id));

    const {
        teamCountByManager,
        attentionCountByManager,
        avgPerformanceByManager
    } = await getManagerAggregates(prisma, tenantId, managerIds);

    const cards = allManagers.map(manager => mapManagerCard(
        manager,
        teamCountByManager,
        avgPerformanceByManager,
        attentionCountByManager
    ));

    const search = (filters.search || '').trim().toLowerCase();
    const filtered = search
        ? cards.filter(item => {
            const target = [
                item.name,
                item.email,
                item.role,
                item.department,
                item.phone
            ].filter(Boolean).join(' ').toLowerCase();

            return target.includes(search);
        })
        : cards;

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return {
        page,
        pageSize,
        total,
        data
    };
}

export async function getManager(prisma, tenantId, managerId) {
    const manager = await validateManager(prisma, tenantId, managerId);

    const {
        teamCountByManager,
        attentionCountByManager,
        avgPerformanceByManager
    } = await getManagerAggregates(prisma, tenantId, [Number(managerId)]);

    const managerCard = mapManagerCard(
        manager,
        teamCountByManager,
        avgPerformanceByManager,
        attentionCountByManager
    );

    return {
        manager: managerCard
    };
}

export async function listManagerStaff(prisma, tenantId, managerId, filters = {}) {
    await validateManager(prisma, tenantId, managerId);

    const page = Number(filters.page || 1);
    const pageSize = Number(filters.pageSize || 10);

    const profiles = await prisma.staff_profiles.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            submitted_by: BigInt(managerId)
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
                    email: true,
                    is_active: true,
                    user_roles_user_roles_user_idTousers: {
                        where: { tenant_id: BigInt(tenantId) },
                        include: {
                            roles: {
                                select: {
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
        }
    });

    const profileIds = profiles.map(profile => safeNumber(profile.profile_id));
    const attendanceScoreMap = await getAttendanceScoresByStaff(prisma, tenantId, profileIds, 30);
    const onLeaveSet = await getOnLeaveStaffIds(prisma, tenantId, profileIds);

    const rows = profiles.map(profile => {
        const profileId = safeNumber(profile.profile_id);
        const uiStatus = mapStaffUiStatus(profile, onLeaveSet);

        const roleName = profile.users?.user_roles_user_roles_user_idTousers?.[0]?.roles?.role_name || profile.designation || null;

        return {
            staff_id: profileId,
            profile_id: profileId,
            user_id: safeNumber(profile.user_id),
            employee_code: normalizeEmployeeCode(profile.employee_code),
            name: buildName(profile),
            role: roleName,
            designation: profile.designation || null,
            department_id: profile.department_id ? Number(profile.department_id) : null,
            department_name: profile.departments?.department_name || null,
            performance: attendanceScoreMap.get(profileId) || 0,
            attendance: attendanceScoreMap.get(profileId) || 0,
            tasksCompleted: null,
            status: uiStatus,
            request_status: profile.request_status,
            email: profile.users?.email || null,
            phone: profile.contact_number || null,
            joinedDate: profile.date_of_joining ? isoDate(profile.date_of_joining) : null,
            image: profile.photo_url || null
        };
    });

    const search = (filters.search || '').trim().toLowerCase();
    let filtered = rows;

    if (search) {
        filtered = filtered.filter(row => {
            const text = [
                row.name,
                row.role,
                row.designation,
                row.department_name,
                row.email,
                row.employee_code
            ].filter(Boolean).join(' ').toLowerCase();

            return text.includes(search);
        });
    }

    if (filters.status) {
        filtered = filtered.filter(row => row.status === filters.status);
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return {
        page,
        pageSize,
        total,
        data
    };
}

export async function getStaff(prisma, tenantId, staffId) {
    const profile = await prisma.staff_profiles.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            profile_id: BigInt(staffId)
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
                    email: true,
                    is_active: true,
                    user_roles_user_roles_user_idTousers: {
                        where: { tenant_id: BigInt(tenantId) },
                        include: {
                            roles: {
                                select: {
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
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            },
            reviewed_by_user: {
                select: {
                    user_id: true,
                    username: true,
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

    if (!profile) throw new Error('STAFF_NOT_FOUND');

    const profileId = safeNumber(profile.profile_id);
    const attendanceMap = await getAttendanceScoresByStaff(prisma, tenantId, [profileId], 30);
    const onLeaveSet = await getOnLeaveStaffIds(prisma, tenantId, [profileId]);

    const documents = await prisma.staff_request_documents.findMany({
        where: {
            profile_id: BigInt(staffId)
        },
        orderBy: {
            uploaded_at: 'desc'
        },
        take: 10
    });

    const recruiterProfile = profile.submitted_by_user?.staff_profiles;
    const reviewerProfile = profile.reviewed_by_user?.staff_profiles;

    return {
        staff: {
            staff_id: profileId,
            profile_id: profileId,
            user_id: safeNumber(profile.user_id),
            employee_code: normalizeEmployeeCode(profile.employee_code),
            name: buildName(profile),
            first_name: profile.first_name,
            last_name: profile.last_name,
            role: profile.users?.user_roles_user_roles_user_idTousers?.[0]?.roles?.role_name || profile.designation || null,
            role_code: profile.users?.user_roles_user_roles_user_idTousers?.[0]?.roles?.role_code || null,
            designation: profile.designation || null,
            department_id: profile.department_id ? Number(profile.department_id) : null,
            department_name: profile.departments?.department_name || null,
            status: mapStaffUiStatus(profile, onLeaveSet),
            request_status: profile.request_status,
            request_type: profile.request_type,
            request_notes: profile.request_notes || null,
            performance: attendanceMap.get(profileId) || 0,
            attendance: attendanceMap.get(profileId) || 0,
            tasksCompleted: null,
            email: profile.users?.email || null,
            phone: profile.contact_number || null,
            emergency_contact: profile.emergency_contact || null,
            specialization: profile.specialization || null,
            qualification: profile.qualification || null,
            registration_number: profile.registration_number || null,
            room_number: profile.room_number || null,
            joinedDate: profile.date_of_joining ? isoDate(profile.date_of_joining) : null,
            current_status: profile.current_status || null,
            is_active: profile.is_active !== false,
            image: profile.photo_url || null,
            recruiter: profile.submitted_by
                ? {
                    user_id: safeNumber(profile.submitted_by_user?.user_id),
                    name: buildName(recruiterProfile, profile.submitted_by_user?.username)
                }
                : null,
            reviewer: profile.reviewed_by
                ? {
                    user_id: safeNumber(profile.reviewed_by_user?.user_id),
                    name: buildName(reviewerProfile, profile.reviewed_by_user?.username),
                    reviewed_at: profile.reviewed_at ? profile.reviewed_at.toISOString() : null
                }
                : null,
            created_at: profile.created_at ? profile.created_at.toISOString() : null,
            updated_at: profile.updated_at ? profile.updated_at.toISOString() : null
        },
        documents: documents.map(document => ({
            document_id: safeNumber(document.document_id),
            document_type: document.document_type,
            file_url: document.file_url,
            file_name: document.file_name,
            file_size: document.file_size ? safeNumber(document.file_size) : null,
            uploaded_at: document.uploaded_at ? document.uploaded_at.toISOString() : null
        }))
    };
}

export async function addStaffDocument(prisma, tenantId, staffId, data) {
    return addStaffRequestDocument(prisma, tenantId, staffId, data);
}

export async function listStaffDocuments(prisma, tenantId, staffId) {
    return listStaffRequestDocuments(prisma, tenantId, staffId);
}

export async function updateStaffDocument(prisma, tenantId, staffId, documentId, data) {
    return updateStaffRequestDocument(prisma, tenantId, staffId, documentId, data);
}

export async function deleteStaffDocument(prisma, tenantId, staffId, documentId) {
    return deleteStaffRequestDocument(prisma, tenantId, staffId, documentId);
}

export async function createManager(prisma, bcrypt, tenantId, creatorId, data) {
    const hrRole = await prisma.roles.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            is_active: true,
            role_code: {
                equals: 'HR',
                mode: 'insensitive'
            }
        },
        select: {
            role_id: true
        }
    });

    if (!hrRole) {
        throw new Error('HR_ROLE_NOT_FOUND');
    }

    if (data.department_id !== undefined) {
        const department = await prisma.departments.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                department_id: Number(data.department_id)
            },
            select: {
                department_id: true
            }
        });

        if (!department) throw new Error('DEPARTMENT_NOT_FOUND');
    }

    const submitted = await submitStaffRequest(
        prisma,
        bcrypt,
        tenantId,
        creatorId,
        {
            ...data,
            role_id: Number(hrRole.role_id),
            designation: data.designation || 'HR Manager',
            request_type: 'new',
            is_active: true,
            current_status: 'online'
        }
    );

    const profile = await prisma.staff_profiles.update({
        where: {
            profile_id: BigInt(submitted.profile_id)
        },
        data: {
            request_status: 'approved',
            request_notes: null,
            reviewed_by: creatorId ? BigInt(creatorId) : null,
            reviewed_at: new Date(),
            is_active: true,
            current_status: 'online',
            updated_at: new Date()
        }
    });

    const user = await prisma.users.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            user_id: BigInt(submitted.user_id)
        },
        select: {
            username: true,
            email: true
        }
    });

    return {
        manager_id: safeNumber(submitted.user_id),
        user_id: safeNumber(submitted.user_id),
        profile_id: safeNumber(profile.profile_id),
        name: buildName(profile, user?.username || data.username),
        role: 'HR',
        email: user?.email || data.email,
        employee_code: normalizeEmployeeCode(profile.employee_code),
        request_status: profile.request_status
    };
}

export async function deleteManager(prisma, tenantId, requesterId, managerId) {
    if (requesterId && Number(requesterId) === Number(managerId)) {
        throw new Error('SELF_DELETE_NOT_ALLOWED');
    }

    await validateManager(prisma, tenantId, managerId);

    await prisma.$transaction(async tx => {
        await tx.users.update({
            where: {
                user_id: BigInt(managerId)
            },
            data: {
                is_active: false
            }
        });

        await tx.staff_profiles.updateMany({
            where: {
                tenant_id: BigInt(tenantId),
                user_id: BigInt(managerId)
            },
            data: {
                is_active: false,
                current_status: 'offline',
                updated_at: new Date()
            }
        });
    });

    return {
        manager_id: Number(managerId),
        deleted: true
    };
}

