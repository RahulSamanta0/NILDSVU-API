/**
 * Vendor Entry Service
 * 
 * Purpose:
 * - Business logic for vendor entry operations
 * - Database interactions via Prisma
 * - Multi-tenant validation
 */

import { generateNumber } from '../../../utils/number-generator.js';

async function generateVendorPassNumber(prisma, tenantId) {
    return await generateNumber(prisma, 'VPASS', tenantId);
}

/**
 * Create a new vendor entry
 * @param {Object} prisma - Prisma client instance
 * @param {Object} data - Vendor entry data
 * @param {Object} user - Authenticated user (contains tenant_id)
 * @returns {Object} Created vendor entry with vendor pass number
 */
export async function createVendorEntry(prisma, data, user) {
    const {
        vendorName,
        company,
        contactNumber,
        idType,
        idNumber,
        purpose,
        department,
        expectedExit,
        gate,
        vendorType,
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

    // Generate unique vendor pass number
    const vendorPassNumber = await generateVendorPassNumber(prisma, BigInt(tenant_id));

    // Combine Vendor Type and Company into the purpose string
    const formattedPurpose = `[${vendorType || 'Vendor'} | ${company || 'N/A'}] ${purpose || ''}`.trim();

    // Create vendor entry
    const newVendor = await prisma.visitor_entries.create({
        data: {
            tenant_id: BigInt(tenant_id),
            visitor_pass_number: vendorPassNumber,
            visitor_name: vendorName,
            mobile: contactNumber,
            id_type: idType,
            id_number: idNumber,
            department: department,
            purpose: formattedPurpose,
            gate_number: gate,
            entry_time: new Date(),
            expected_exit_time: expectedExit || null,
            guard_name: guardName || "System Auto",
            status: "checkin",
            visitor_type: vendorType || 'Vendor',
            company_name: company || null
        }
    });

    return newVendor;
}
