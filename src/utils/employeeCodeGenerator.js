function normalizePrefix(roleCode) {
    const raw = (roleCode || 'EMP').toUpperCase().replace(/[^A-Z0-9]/g, '');
    return (raw.substring(0, 3) || 'EMP').padEnd(3, 'X');
}

function parsePrismaCode(error) {
    return error?.code || error?.meta?.code || null;
}

export function normalizeEmployeeCode(value) {
    if (value === null || value === undefined) return null;

    const normalized = String(value).trim().toUpperCase();
    return normalized || null;
}

export async function ensureEmployeeCode(prisma, tenantId, userId) {
    const user = await prisma.users.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            user_id: BigInt(userId)
        },
        select: {
            user_id: true,
            employee_id: true,
            user_roles_user_roles_user_idTousers: {
                where: { tenant_id: BigInt(tenantId) },
                take: 1,
                select: {
                    role_id: true,
                    roles: {
                        select: {
                            role_code: true
                        }
                    }
                }
            }
        }
    });

    if (!user) {
        throw new Error('USER_NOT_FOUND');
    }

    if (user.employee_id) {
        const normalizedExisting = normalizeEmployeeCode(user.employee_id);

        if (normalizedExisting && normalizedExisting !== user.employee_id) {
            const updated = await prisma.users.update({
                where: { user_id: BigInt(userId) },
                data: { employee_id: normalizedExisting },
                select: { employee_id: true }
            });

            return updated.employee_id;
        }

        return user.employee_id;
    }

    const roleEntry = user.user_roles_user_roles_user_idTousers?.[0] || null;
    const roleId = roleEntry?.role_id || null;
    const roleCode = roleEntry?.roles?.role_code || 'EMP';
    const prefix = normalizePrefix(roleCode);

    const baseCount = roleId
        ? await prisma.user_roles.count({
            where: {
                tenant_id: BigInt(tenantId),
                role_id: Number(roleId)
            }
        })
        : await prisma.users.count({
            where: {
                tenant_id: BigInt(tenantId),
                employee_id: {
                    startsWith: prefix
                }
            }
        });

    let sequence = baseCount + 1;

    for (let attempt = 0; attempt < 100; attempt += 1) {
        const candidate = `${prefix}${String(sequence).padStart(4, '0')}`;

        const existing = await prisma.users.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                employee_id: candidate
            },
            select: {
                user_id: true
            }
        });

        if (!existing) {
            try {
                const updated = await prisma.users.update({
                    where: { user_id: BigInt(userId) },
                    data: { employee_id: candidate },
                    select: { employee_id: true }
                });

                return updated.employee_id;
            } catch (error) {
                if (parsePrismaCode(error) === 'P2002') {
                    sequence += 1;
                    continue;
                }
                throw error;
            }
        }

        sequence += 1;
    }

    const fallback = `${prefix}${Date.now().toString().slice(-6)}`;

    const updated = await prisma.users.update({
        where: { user_id: BigInt(userId) },
        data: { employee_id: fallback },
        select: { employee_id: true }
    });

    return updated.employee_id;
}
