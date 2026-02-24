/**
 * Vendors Service Layer
 *
 * Purpose:
 * - Business logic for store vendor operations using Prisma Client
 * - Handles vendor persistence and price list management
 */

/**
 * Create a new vendor
 */
export async function createVendor(prisma, tenantId, data) {
    const {
        vendor_code, vendor_name, contact_person, email,
        phone_primary, phone_secondary, address,
        gst_number, pan_number, payment_terms, department_id, is_active
    } = data;

    const existing = await prisma.store_vendors.findFirst({
        where: { tenant_id: BigInt(tenantId), vendor_code }
    });
    if (existing) throw new Error('VENDOR_CODE_EXISTS');

    const vendor = await prisma.store_vendors.create({
        data: {
            tenant_id: BigInt(tenantId),
            vendor_code,
            vendor_name,
            contact_person: contact_person || null,
            email: email || null,
            phone_primary: phone_primary || null,
            phone_secondary: phone_secondary || null,
            address: address || null,
            gst_number: gst_number || null,
            pan_number: pan_number || null,
            payment_terms: payment_terms || null,
            department_id: department_id ? Number(department_id) : null,
            is_active: is_active !== undefined ? is_active : true
        }
    });

    return serializeVendor(vendor);
}

/**
 * List all vendors with optional filters
 */
export async function listVendors(prisma, tenantId, filters = {}) {
    const where = { tenant_id: BigInt(tenantId) };

    if (filters.is_active !== undefined) where.is_active = filters.is_active;
    if (filters.department_id !== undefined) where.department_id = Number(filters.department_id);
    if (filters.search) {
        where.OR = [
            { vendor_name: { contains: filters.search, mode: 'insensitive' } },
            { vendor_code: { contains: filters.search, mode: 'insensitive' } },
            { contact_person: { contains: filters.search, mode: 'insensitive' } }
        ];
    }

    const vendors = await prisma.store_vendors.findMany({
        where,
        orderBy: { vendor_name: 'asc' }
    });

    return vendors.map(serializeVendor);
}

/**
 * Get vendor by ID (with price list)
 */
export async function getVendorById(prisma, tenantId, vendorId) {
    const vendor = await prisma.store_vendors.findFirst({
        where: { tenant_id: BigInt(tenantId), vendor_id: BigInt(vendorId) },
        include: {
            vendor_items: {
                where: { is_active: true },
                include: {
                    inventory_items: {
                        select: { item_id: true, item_code: true, item_name: true, unit_of_measure: true }
                    }
                }
            }
        }
    });

    if (!vendor) throw new Error('VENDOR_NOT_FOUND');

    return {
        ...serializeVendor(vendor),
        items: vendor.vendor_items.map(vi => ({
            vendor_item_id: Number(vi.vendor_item_id),
            item_id: Number(vi.item_id),
            item_code: vi.inventory_items?.item_code || null,
            item_name: vi.inventory_items?.item_name || null,
            unit: vi.inventory_items?.unit_of_measure || null,
            quoted_price: Number(vi.quoted_price),
            lead_time_days: vi.lead_time_days,
            is_preferred: vi.is_preferred,
            is_active: vi.is_active
        }))
    };
}

/**
 * Update vendor
 */
export async function updateVendor(prisma, tenantId, vendorId, data) {
    const existing = await prisma.store_vendors.findFirst({
        where: { tenant_id: BigInt(tenantId), vendor_id: BigInt(vendorId) }
    });
    if (!existing) throw new Error('VENDOR_NOT_FOUND');

    const updateData = {};
    const fields = ['vendor_name', 'contact_person', 'email', 'phone_primary',
        'phone_secondary', 'address', 'gst_number', 'pan_number',
        'payment_terms', 'is_active'];
    for (const f of fields) {
        if (data[f] !== undefined) updateData[f] = data[f];
    }
    if (data.department_id !== undefined) updateData.department_id = Number(data.department_id);
    updateData.updated_at = new Date();

    const updated = await prisma.store_vendors.update({
        where: { vendor_id: BigInt(vendorId) },
        data: updateData
    });

    return serializeVendor(updated);
}

/**
 * Soft delete vendor
 */
export async function deleteVendor(prisma, tenantId, vendorId) {
    const existing = await prisma.store_vendors.findFirst({
        where: { tenant_id: BigInt(tenantId), vendor_id: BigInt(vendorId) }
    });
    if (!existing) throw new Error('VENDOR_NOT_FOUND');

    await prisma.store_vendors.update({
        where: { vendor_id: BigInt(vendorId) },
        data: { is_active: false, updated_at: new Date() }
    });

    return { message: 'Vendor deactivated successfully', vendor_id: Number(vendorId) };
}

/**
 * Upsert vendor items (price list)
 */
export async function upsertVendorItems(prisma, tenantId, vendorId, items) {
    const vendor = await prisma.store_vendors.findFirst({
        where: { tenant_id: BigInt(tenantId), vendor_id: BigInt(vendorId) }
    });
    if (!vendor) throw new Error('VENDOR_NOT_FOUND');

    const results = [];
    for (const item of items) {
        const upserted = await prisma.vendor_items.upsert({
            where: {
                idx_vendor_items_unique: {
                    tenant_id: BigInt(tenantId),
                    vendor_id: BigInt(vendorId),
                    item_id: BigInt(item.item_id)
                }
            },
            create: {
                tenant_id: BigInt(tenantId),
                vendor_id: BigInt(vendorId),
                item_id: BigInt(item.item_id),
                quoted_price: item.quoted_price,
                lead_time_days: item.lead_time_days || null,
                is_preferred: item.is_preferred !== undefined ? item.is_preferred : false,
                is_active: item.is_active !== undefined ? item.is_active : true
            },
            update: {
                quoted_price: item.quoted_price,
                lead_time_days: item.lead_time_days !== undefined ? item.lead_time_days : undefined,
                is_preferred: item.is_preferred !== undefined ? item.is_preferred : undefined,
                is_active: item.is_active !== undefined ? item.is_active : undefined,
                updated_at: new Date()
            }
        });
        results.push({
            vendor_item_id: Number(upserted.vendor_item_id),
            item_id: Number(upserted.item_id),
            quoted_price: Number(upserted.quoted_price)
        });
    }

    return { updated: results.length, items: results };
}

// ── Helpers ───────────────────────────────────────────────

function serializeVendor(v) {
    return {
        vendor_id: Number(v.vendor_id),
        vendor_code: v.vendor_code,
        vendor_name: v.vendor_name,
        contact_person: v.contact_person,
        email: v.email,
        phone_primary: v.phone_primary,
        phone_secondary: v.phone_secondary,
        address: v.address,
        gst_number: v.gst_number,
        pan_number: v.pan_number,
        payment_terms: v.payment_terms,
        department_id: v.department_id,
        is_active: v.is_active,
        created_at: v.created_at,
        updated_at: v.updated_at
    };
}
