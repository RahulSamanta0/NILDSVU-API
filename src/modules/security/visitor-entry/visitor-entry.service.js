/**
 * Visitor Entry Service
 * 
 * Purpose:
 * - Business logic for visitor entry operations
 * - Database interactions via Prisma
 * - Multi-tenant validation
 */

import { generateNumber } from '../../../utils/number-generator.js';

async function generateVisitorPassNumber(prisma, tenantId) {
    return await generateNumber(prisma, 'VPASS', tenantId);
}

/**
 * Create a new visitor entry
 * @param {Object} prisma - Prisma client instance
 * @param {Object} data - Visitor entry data
 * @param {Object} user - Authenticated user (contains tenant_id)
 * @returns {Object} Created visitor entry with visitor pass number
 */
export async function createVisitorEntry(prisma, data, user) {
    const {
        visitorName,
        mobile,
        idType,
        idNumber,
        department,
        purpose,
        gateNumber,
        entryTime,
        expectedExitTime,
        guardName
    } = data;

    // Extract tenant_id from authenticated user
    const tenant_id = user.tenant_id;

    // Validate tenant exists and is active
    const tenant = await prisma.tenants.findUnique({
        where: { tenant_id: BigInt(tenant_id) },
        select: {
            tenant_id: true,
            status: true
        }
    });

    if (!tenant) {
        throw new Error('TENANT_NOT_FOUND');
    }

    if (tenant.status !== 'active') {
        throw new Error('TENANT_INACTIVE');
    }

    // Generate unique visitor pass number
    const visitorPassNumber = await generateVisitorPassNumber(prisma, BigInt(tenant_id));

    // Create visitor entry
    const newVisitor = await prisma.visitor_entries.create({
        data: {
            tenant_id: BigInt(tenant_id),
            visitor_pass_number: visitorPassNumber,
            visitor_name: visitorName,
            mobile,
            id_type: idType,
            id_number: idNumber,
            department,
            purpose,
            gate_number: gateNumber,
            entry_time: entryTime ? new Date(entryTime) : new Date(),
            expected_exit_time: expectedExitTime || null,
            guard_name: guardName || "Security Guard",
            status: "checkin",
        }
    });

    return newVisitor;
}
