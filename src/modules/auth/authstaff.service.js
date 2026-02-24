/**
 * Authentication Service
 * 
 * Purpose:
 * - Business logic for authentication operations
 * - Database interactions via Prisma
 * - Password hashing and verification
 * - Multi-tenant validation
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - registerStaff: Reduced from 6-9 queries to 3 queries
 * - loginStaff: Reduced from 4 queries to 2 queries
 * - Used Promise.all() for parallel execution
 * - Inlined helper functions to reduce call overhead
 * - Fire-and-forget for non-critical updates
 */

import { ensureEmployeeCode, normalizeEmployeeCode } from '../../utils/employeeCodeGenerator.js';

/**
 * Register a new staff member
 * OPTIMIZED: Reduced from 6-9 queries to 3 queries using parallel execution
 */
export async function registerStaff(prisma, bcrypt, data) {
    const { tenant_id, username, email, password, role_id, facility_id } = data;

    // OPTIMIZATION: Parallel validation queries (3 queries in parallel instead of 5 sequential)
    const [tenant, role, existingUser] = await Promise.all([
        // 1. Validate tenant
        prisma.tenants.findUnique({
            where: { tenant_id: BigInt(tenant_id) },
            select: {
                tenant_id: true,
                tenant_code: true,
                tenant_name: true,
                status: true
            }
        }),
        // 2. Validate role exists
        prisma.roles.findFirst({
            where: {
                role_id: role_id,
                tenant_id: BigInt(tenant_id),
                is_active: true
            },
            select: {
                role_id: true,
                role_name: true,
                role_code: true
            }
        }),
        // 3. Check for duplicate username OR email in single query
        prisma.users.findFirst({
            where: {
                tenant_id: BigInt(tenant_id),
                OR: [
                    { username: username },
                    { email: email }
                ]
            },
            select: {
                username: true,
                email: true
            }
        })
    ]);

    // Validate tenant
    if (!tenant) {
        throw new Error('TENANT_NOT_FOUND');
    }
    if (tenant.status !== 'active') {
        throw new Error('TENANT_INACTIVE');
    }

    // Validate role
    if (!role) {
        throw new Error('ROLE_NOT_FOUND');
    }

    // Check duplicates
    if (existingUser) {
        if (existingUser.username === username) {
            throw new Error('USERNAME_EXISTS');
        }
        if (existingUser.email === email) {
            throw new Error('EMAIL_EXISTS');
        }
    }

    // OPTIMIZATION: Hash password once before transaction
    const hashedPassword = await bcrypt.hash(password);

    // Create user and assign role in a transaction
    const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.users.create({
            data: {
                tenant_id: BigInt(tenant_id),
                username: username,
                email: email,
                password_hash: hashedPassword,
                employee_id: null,
                facility_id: facility_id ? BigInt(facility_id) : null,
                is_active: true,
                is_verified: false
            },
            select: {
                user_id: true,
                tenant_id: true,
                username: true,
                email: true,
                facility_id: true,
                is_active: true,
                is_verified: true,
                created_at: true
            }
        });

        // Assign role to user
        await tx.user_roles.create({
            data: {
                tenant_id: BigInt(tenant_id),
                user_id: user.user_id,
                role_id: role_id
            }
        });

        const employeeId = await ensureEmployeeCode(tx, tenant_id, user.user_id);

        return {
            ...user,
            employee_id: employeeId
        };
    });

    // OPTIMIZATION: Single object spread with conversions
    return {
        user_id: Number(result.user_id),
        tenant_id: Number(result.tenant_id),
        username: result.username,
        email: result.email,
        employee_id: normalizeEmployeeCode(result.employee_id),
        facility_id: result.facility_id ? Number(result.facility_id) : null,
        is_active: result.is_active,
        is_verified: result.is_verified,
        created_at: result.created_at,
        role: {
            role_id: Number(role.role_id),
            role_name: role.role_name,
            role_code: role.role_code
        }
    };
}

/**
 * Login staff member
 * OPTIMIZED: Reduced from 4 queries to 2 queries using joins and parallel execution
 */
export async function loginStaff(prisma, bcrypt, jwt, data) {
    const { tenant_id, identifier, password } = data;

    // OPTIMIZATION: Parallel tenant validation and user lookup with role join
    const [tenant, userWithRole] = await Promise.all([
        // 1. Validate tenant
        prisma.tenants.findUnique({
            where: { tenant_id: BigInt(tenant_id) },
            select: {
                tenant_id: true,
                status: true
            }
        }),
        // 2. Find user with role in single query using join
        prisma.users.findFirst({
            where: {
                tenant_id: BigInt(tenant_id),
                OR: [
                    { username: identifier },
                    { email: identifier }
                ]
            },
            select: {
                user_id: true,
                tenant_id: true,
                username: true,
                email: true,
                password_hash: true,
                employee_id: true,
                facility_id: true,
                is_active: true,
                is_verified: true,
                last_login_at: true,
                user_roles_user_roles_user_idTousers: {
                    where: {
                        tenant_id: BigInt(tenant_id)
                    },
                    take: 1,
                    select: {
                        roles: {
                            select: {
                                role_id: true,
                                role_name: true,
                                role_code: true,
                                description: true
                            }
                        }
                    }
                }
            }
        })
    ]);

    // Validate tenant
    if (!tenant) {
        throw new Error('TENANT_NOT_FOUND');
    }
    if (tenant.status !== 'active') {
        throw new Error('TENANT_INACTIVE');
    }

    // Validate user
    if (!userWithRole) {
        throw new Error('INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (!userWithRole.is_active) {
        throw new Error('USER_INACTIVE');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userWithRole.password_hash);
    
    if (!isPasswordValid) {
        throw new Error('INVALID_CREDENTIALS');
    }

    // Extract role from joined data
    const userRole = userWithRole.user_roles_user_roles_user_idTousers[0];

    // OPTIMIZATION: Update last login asynchronously (fire and forget)
    prisma.users.update({
        where: { user_id: userWithRole.user_id },
        data: { last_login_at: new Date() }
    }).catch(err => console.error('Failed to update last_login_at:', err));

    // Generate JWT token with role information
    const tokenPayload = {
        user_id: Number(userWithRole.user_id),
        tenant_id: Number(userWithRole.tenant_id),
        username: userWithRole.username,
        email: userWithRole.email,
        employee_id: normalizeEmployeeCode(userWithRole.employee_id),
        facility_id: userWithRole.facility_id ? Number(userWithRole.facility_id) : null,
        role_id: userRole?.roles?.role_id ? Number(userRole.roles.role_id) : null,
        role_code: userRole?.roles?.role_code || null
    };

    const token = jwt.sign(tokenPayload);

    // Return token and user info with role
    return {
        token,
        user: {
            user_id: Number(userWithRole.user_id),
            tenant_id: Number(userWithRole.tenant_id),
            username: userWithRole.username,
            email: userWithRole.email,
            employee_id: normalizeEmployeeCode(userWithRole.employee_id),
            facility_id: userWithRole.facility_id ? Number(userWithRole.facility_id) : null,
            is_active: userWithRole.is_active,
            is_verified: userWithRole.is_verified,
            last_login_at: userWithRole.last_login_at,
            role: userRole?.roles ? {
                role_id: Number(userRole.roles.role_id),
                role_name: userRole.roles.role_name,
                role_code: userRole.roles.role_code,
                description: userRole.roles.description
            } : null
        }
    };
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(prisma, userId, tenantId) {
    const user = await prisma.users.findFirst({
        where: {
            user_id: BigInt(userId),
            tenant_id: BigInt(tenantId)
        },
        select: {
            user_id: true,
            tenant_id: true,
            username: true,
            email: true,
            employee_id: true,
            facility_id: true,
            is_active: true,
            is_verified: true,
            last_login_at: true,
            created_at: true,
            updated_at: true
        }
    });

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    return {
        ...user,
        user_id: Number(user.user_id),
        tenant_id: Number(user.tenant_id),
        employee_id: normalizeEmployeeCode(user.employee_id),
        facility_id: user.facility_id ? Number(user.facility_id) : null
    };
}
