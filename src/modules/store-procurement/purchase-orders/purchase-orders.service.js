/**
 * Purchase Orders Service Layer
 *
 * Purpose: Business logic for purchase order lifecycle
 */

import { generateNumber } from '../../../utils/number-generator.js';

export async function createPO(prisma, tenantId, userId, data) {
    const { vendor_id, department_id, expected_delivery, payment_terms, notes, items } = data;

    // Validate vendor exists
    const vendor = await prisma.store_vendors.findFirst({
        where: { tenant_id: BigInt(tenantId), vendor_id: BigInt(vendor_id), is_active: true }
    });
    if (!vendor) throw new Error('VENDOR_NOT_FOUND');

    const po_number = await generateNumber(prisma, 'PO', tenantId);

    // Calculate total
    const total_amount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    const po = await prisma.purchase_orders.create({
        data: {
            tenant_id: BigInt(tenantId),
            po_number,
            vendor_id: BigInt(vendor_id),
            department_id: department_id ? Number(department_id) : null,
            expected_delivery: expected_delivery ? new Date(expected_delivery) : null,
            payment_terms: payment_terms || vendor.payment_terms || null,
            total_amount,
            notes: notes || null,
            status: 'pending',
            created_by: userId ? BigInt(userId) : null,
            purchase_order_items: {
                create: items.map(item => ({
                    tenant_id: BigInt(tenantId),
                    item_id: BigInt(item.item_id),
                    item_name: item.item_name,
                    quantity: item.quantity,
                    unit: item.unit || null,
                    unit_price: item.unit_price,
                    total_price: item.quantity * item.unit_price
                }))
            }
        },
        include: {
            purchase_order_items: true,
            store_vendors: {
                select: { vendor_name: true, vendor_code: true }
            }
        }
    });

    return serializePO(po);
}

export async function listPOs(prisma, tenantId, filters = {}) {
    const where = { tenant_id: BigInt(tenantId) };

    if (filters.status) where.status = filters.status;
    if (filters.vendor_id) where.vendor_id = BigInt(filters.vendor_id);
    if (filters.from || filters.to) {
        where.po_date = {};
        if (filters.from) where.po_date.gte = new Date(filters.from);
        if (filters.to) where.po_date.lte = new Date(filters.to + 'T23:59:59');
    }

    const pos = await prisma.purchase_orders.findMany({
        where,
        include: {
            store_vendors: { select: { vendor_name: true, vendor_code: true } },
            _count: { select: { purchase_order_items: true } }
        },
        orderBy: { po_date: 'desc' }
    });

    return pos.map(po => ({
        ...serializePO(po),
        item_count: po._count.purchase_order_items
    }));
}

export async function getPOById(prisma, tenantId, poId) {
    const po = await prisma.purchase_orders.findFirst({
        where: { tenant_id: BigInt(tenantId), po_id: BigInt(poId) },
        include: {
            purchase_order_items: true,
            store_vendors: true,
            grn_records: {
                select: { grn_id: true, grn_number: true, status: true, received_date: true }
            }
        }
    });
    if (!po) throw new Error('PO_NOT_FOUND');
    return serializePO(po);
}

export async function updatePO(prisma, tenantId, poId, data) {
    const po = await prisma.purchase_orders.findFirst({
        where: { tenant_id: BigInt(tenantId), po_id: BigInt(poId) }
    });
    if (!po) throw new Error('PO_NOT_FOUND');
    if (!['pending', 'approved'].includes(po.status)) throw new Error('PO_CANNOT_BE_UPDATED');

    const updateData = {};
    if (data.expected_delivery !== undefined) updateData.expected_delivery = new Date(data.expected_delivery);
    if (data.payment_terms !== undefined) updateData.payment_terms = data.payment_terms;
    if (data.notes !== undefined) updateData.notes = data.notes;
    updateData.updated_at = new Date();

    await prisma.purchase_orders.update({
        where: { po_id: BigInt(poId) },
        data: updateData
    });

    return { message: 'Purchase order updated', po_id: Number(poId) };
}

export async function approvePO(prisma, tenantId, userId, poId) {
    const po = await prisma.purchase_orders.findFirst({
        where: { tenant_id: BigInt(tenantId), po_id: BigInt(poId) }
    });
    if (!po) throw new Error('PO_NOT_FOUND');
    if (po.status !== 'pending') throw new Error('PO_NOT_PENDING');

    await prisma.purchase_orders.update({
        where: { po_id: BigInt(poId) },
        data: {
            status: 'approved',
            approved_by: userId ? BigInt(userId) : null,
            approved_at: new Date(),
            updated_at: new Date()
        }
    });

    return { message: 'Purchase order approved', po_id: Number(poId) };
}

export async function cancelPO(prisma, tenantId, userId, poId, cancellation_reason) {
    const po = await prisma.purchase_orders.findFirst({
        where: { tenant_id: BigInt(tenantId), po_id: BigInt(poId) }
    });
    if (!po) throw new Error('PO_NOT_FOUND');
    if (['received', 'cancelled'].includes(po.status)) throw new Error('PO_CANNOT_BE_CANCELLED');

    await prisma.purchase_orders.update({
        where: { po_id: BigInt(poId) },
        data: {
            status: 'cancelled',
            cancelled_by: userId ? BigInt(userId) : null,
            cancelled_at: new Date(),
            cancellation_reason: cancellation_reason || null,
            updated_at: new Date()
        }
    });

    return { message: 'Purchase order cancelled', po_id: Number(poId) };
}

// ── Helpers ─────────────────────────────────────────────

function serializePO(po) {
    return {
        po_id: Number(po.po_id),
        po_number: po.po_number,
        vendor_id: Number(po.vendor_id),
        vendor_name: po.store_vendors?.vendor_name || null,
        vendor_code: po.store_vendors?.vendor_code || null,
        department_id: po.department_id,
        po_date: po.po_date,
        expected_delivery: po.expected_delivery,
        payment_terms: po.payment_terms,
        total_amount: po.total_amount ? Number(po.total_amount) : 0,
        status: po.status,
        notes: po.notes,
        created_by: po.created_by ? Number(po.created_by) : null,
        approved_by: po.approved_by ? Number(po.approved_by) : null,
        approved_at: po.approved_at,
        cancelled_by: po.cancelled_by ? Number(po.cancelled_by) : null,
        cancelled_at: po.cancelled_at,
        cancellation_reason: po.cancellation_reason,
        created_at: po.created_at,
        updated_at: po.updated_at,
        items: (po.purchase_order_items || []).map(item => ({
            po_item_id: Number(item.po_item_id),
            item_id: Number(item.item_id),
            item_name: item.item_name,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: Number(item.unit_price),
            total_price: Number(item.total_price),
            received_qty: item.received_qty
        })),
        grn_records: (po.grn_records || []).map(g => ({
            grn_id: Number(g.grn_id),
            grn_number: g.grn_number,
            status: g.status,
            received_date: g.received_date
        }))
    };
}
