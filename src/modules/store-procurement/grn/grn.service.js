/**
 * GRN Service Layer
 *
 * Purpose: Business logic for Goods Receipt Note — including auto stock update on verify/post
 */

import { generateNumber } from '../../../utils/number-generator.js';

export async function createGRN(prisma, tenantId, userId, data) {
    const {
        po_id, vendor_id, department_id, received_date, invoice_number,
        invoice_date, invoice_amount, notes, items
    } = data;

    // Validate PO if provided
    if (po_id) {
        const po = await prisma.purchase_orders.findFirst({
            where: { tenant_id: BigInt(tenantId), po_id: BigInt(po_id) }
        });
        if (!po) throw new Error('PO_NOT_FOUND');
    }

    const grn_number = await generateNumber(prisma, 'GRN', tenantId);

    // Calculate invoice amount from items if not provided
    const calculatedAmount = items.reduce((sum, item) => {
        const price = (item.unit_price || 0) * (item.received_qty || 0);
        return sum + price;
    }, 0);

    const grn = await prisma.grn.create({
        data: {
            tenant_id: BigInt(tenantId),
            grn_number,
            po_id: po_id ? BigInt(po_id) : null,
            vendor_id: vendor_id ? BigInt(vendor_id) : null,
            department_id: department_id ? Number(department_id) : null,
            received_date: received_date ? new Date(received_date) : new Date(),
            received_by: userId ? BigInt(userId) : null,
            invoice_number: invoice_number || null,
            invoice_date: invoice_date ? new Date(invoice_date) : null,
            invoice_amount: invoice_amount || calculatedAmount,
            status: 'draft',
            notes: notes || null,
            grn_items: {
                create: items.map(item => ({
                    tenant_id: BigInt(tenantId),
                    item_id: BigInt(item.item_id),
                    item_name: item.item_name,
                    ordered_qty: item.ordered_qty || null,
                    received_qty: item.received_qty,
                    free_qty: item.free_qty || 0,
                    rejected_qty: item.rejected_qty || 0,
                    unit: item.unit || null,
                    batch_number: item.batch_number || null,
                    expiry_date: item.expiry_date ? new Date(item.expiry_date) : null,
                    unit_price: item.unit_price || null,
                    total_price: item.unit_price ? item.unit_price * item.received_qty : null
                }))
            }
        },
        include: { grn_items: true }
    });

    return serializeGRN(grn);
}

export async function listGRNs(prisma, tenantId, filters = {}) {
    const where = { tenant_id: BigInt(tenantId) };

    if (filters.status) where.status = filters.status;
    if (filters.vendor_id) where.vendor_id = BigInt(filters.vendor_id);
    if (filters.po_id) where.po_id = BigInt(filters.po_id);
    if (filters.from || filters.to) {
        where.received_date = {};
        if (filters.from) where.received_date.gte = new Date(filters.from);
        if (filters.to) where.received_date.lte = new Date(filters.to + 'T23:59:59');
    }

    const grns = await prisma.grn.findMany({
        where,
        include: {
            _count: { select: { grn_items: true } }
        },
        orderBy: { received_date: 'desc' }
    });

    return grns.map(grn => ({
        ...serializeGRN(grn),
        item_count: grn._count.grn_items
    }));
}

export async function getGRNById(prisma, tenantId, grnId) {
    const grn = await prisma.grn.findFirst({
        where: { tenant_id: BigInt(tenantId), grn_id: BigInt(grnId) },
        include: {
            grn_items: true,
            purchase_orders: {
                select: { po_id: true, po_number: true, status: true }
            }
        }
    });
    if (!grn) throw new Error('GRN_NOT_FOUND');
    return serializeGRN(grn);
}

/**
 * Verify and post GRN — auto-updates inventory_items.current_stock and department_stock
 */
export async function verifyGRN(prisma, tenantId, userId, grnId, notes) {
    const grn = await prisma.grn.findFirst({
        where: { tenant_id: BigInt(tenantId), grn_id: BigInt(grnId) },
        include: { grn_items: true }
    });
    if (!grn) throw new Error('GRN_NOT_FOUND');
    if (grn.status !== 'draft') throw new Error('GRN_ALREADY_PROCESSED');

    await prisma.$transaction(async (tx) => {
        for (const grnItem of grn.grn_items) {
            const qtyToAdd = grnItem.received_qty + (grnItem.free_qty || 0) - (grnItem.rejected_qty || 0);
            if (qtyToAdd <= 0) continue;

            // Update inventory_items.current_stock
            await tx.inventory_items.update({
                where: { item_id: grnItem.item_id },
                data: {
                    current_stock: { increment: qtyToAdd },
                    updated_at: new Date()
                }
            });

            // Upsert department_stock
            if (grn.department_id) {
                await tx.department_stock.upsert({
                    where: {
                        idx_dept_stock_unique: {
                            tenant_id: BigInt(tenantId),
                            department_id: grn.department_id,
                            item_id: grnItem.item_id
                        }
                    },
                    create: {
                        tenant_id: BigInt(tenantId),
                        department_id: grn.department_id,
                        item_id: grnItem.item_id,
                        current_qty: qtyToAdd,
                        last_updated: new Date()
                    },
                    update: {
                        current_qty: { increment: qtyToAdd },
                        last_updated: new Date()
                    }
                });
            }
        }

        // Update PO received qty and status
        if (grn.po_id) {
            for (const grnItem of grn.grn_items) {
                await tx.purchase_order_items.updateMany({
                    where: {
                        po_id: grn.po_id,
                        item_id: grnItem.item_id
                    },
                    data: {
                        received_qty: { increment: grnItem.received_qty }
                    }
                });
            }
            // Check if all PO items fully received → update PO status
            const poItems = await tx.purchase_order_items.findMany({
                where: { po_id: grn.po_id }
            });
            const allReceived = poItems.every(pi => (pi.received_qty || 0) >= pi.quantity);
            const anyReceived = poItems.some(pi => (pi.received_qty || 0) > 0);
            await tx.purchase_orders.update({
                where: { po_id: grn.po_id },
                data: {
                    status: allReceived ? 'received' : anyReceived ? 'partially_received' : undefined,
                    updated_at: new Date()
                }
            });
        }

        // Mark GRN as posted
        await tx.grn_records.update({
            where: { grn_id: BigInt(grnId) },
            data: {
                status: 'posted',
                verified_by: userId ? BigInt(userId) : null,
                verified_at: new Date(),
                notes: notes || grn.notes,
                updated_at: new Date()
            }
        });
    });

    return { message: 'GRN verified and stock updated', grn_id: Number(grnId) };
}

// ── Helpers ─────────────────────────────────────────────

function serializeGRN(g) {
    return {
        grn_id: Number(g.grn_id),
        grn_number: g.grn_number,
        po_id: g.po_id ? Number(g.po_id) : null,
        po_number: g.purchase_orders?.po_number || null,
        vendor_id: g.vendor_id ? Number(g.vendor_id) : null,
        department_id: g.department_id,
        received_date: g.received_date,
        received_by: g.received_by ? Number(g.received_by) : null,
        invoice_number: g.invoice_number,
        invoice_date: g.invoice_date,
        invoice_amount: g.invoice_amount ? Number(g.invoice_amount) : null,
        status: g.status,
        verified_by: g.verified_by ? Number(g.verified_by) : null,
        verified_at: g.verified_at,
        notes: g.notes,
        created_at: g.created_at,
        updated_at: g.updated_at,
        items: (g.grn_items || []).map(item => ({
            grn_item_id: Number(item.grn_item_id),
            item_id: Number(item.item_id),
            item_name: item.item_name,
            ordered_qty: item.ordered_qty,
            received_qty: item.received_qty,
            free_qty: item.free_qty,
            rejected_qty: item.rejected_qty,
            unit: item.unit,
            batch_number: item.batch_number,
            expiry_date: item.expiry_date,
            unit_price: item.unit_price ? Number(item.unit_price) : null,
            total_price: item.total_price ? Number(item.total_price) : null
        }))
    };
}
