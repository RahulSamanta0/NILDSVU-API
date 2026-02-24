/**
 * Indents Service Layer
 *
 * Purpose: Business logic for indent requests with auto-stock-check on approval
 */

import { generateNumber } from '../../../utils/number-generator.js';

export async function createIndent(prisma, tenantId, userId, data) {
    const { department_id, required_by, priority, remarks, items } = data;

    const indent_number = await generateNumber(prisma, 'INDENT', tenantId);

    const indent = await prisma.indent_requests.create({
        data: {
            tenant_id: BigInt(tenantId),
            indent_number,
            department_id: department_id ? Number(department_id) : null,
            requested_by: userId ? BigInt(userId) : null,
            required_by: required_by ? new Date(required_by) : null,
            priority: priority || 'normal',
            remarks: remarks || null,
            status: 'pending',
            indent_items: {
                create: items.map(item => ({
                    tenant_id: BigInt(tenantId),
                    item_id: item.item_id ? BigInt(item.item_id) : null,
                    item_name: item.item_name,
                    quantity: item.quantity,
                    unit: item.unit || null,
                    remarks: item.remarks || null
                }))
            }
        },
        include: { indent_items: true }
    });

    return serializeIndent(indent);
}

export async function listIndents(prisma, tenantId, filters = {}) {
    const where = { tenant_id: BigInt(tenantId) };

    if (filters.status) where.status = filters.status;
    if (filters.department_id) where.department_id = Number(filters.department_id);
    if (filters.from || filters.to) {
        where.request_date = {};
        if (filters.from) where.request_date.gte = new Date(filters.from);
        if (filters.to) where.request_date.lte = new Date(filters.to + 'T23:59:59');
    }

    const indents = await prisma.indent_requests.findMany({
        where,
        include: {
            indent_items: true,
            _count: { select: { indent_items: true } }
        },
        orderBy: { request_date: 'desc' }
    });

    return indents.map(indent => ({
        ...serializeIndent(indent),
        item_count: indent._count.indent_items
    }));
}

export async function getIndentById(prisma, tenantId, indentId) {
    const indent = await prisma.indent_requests.findFirst({
        where: { tenant_id: BigInt(tenantId), indent_id: BigInt(indentId) },
        include: { indent_items: true }
    });
    if (!indent) throw new Error('INDENT_NOT_FOUND');
    return serializeIndent(indent);
}

export async function approveIndent(prisma, tenantId, userId, indentId) {
    const indent = await prisma.indent_requests.findFirst({
        where: { tenant_id: BigInt(tenantId), indent_id: BigInt(indentId) },
        include: { indent_items: true }
    });
    if (!indent) throw new Error('INDENT_NOT_FOUND');
    if (indent.status !== 'pending') throw new Error('INDENT_NOT_PENDING');

    // Check & auto-deduct department stock for each item
    const stockUpdates = [];
    for (const lineItem of indent.indent_items) {
        if (!lineItem.item_id) continue;
        const deptStock = await prisma.department_stock.findFirst({
            where: {
                tenant_id: BigInt(tenantId),
                department_id: indent.department_id || 0,
                item_id: lineItem.item_id
            }
        });
        const availableQty = deptStock?.current_qty || 0;
        const toIssue = Math.min(lineItem.quantity, availableQty);

        if (toIssue > 0) {
            stockUpdates.push({
                stockId: deptStock.stock_id,
                newQty: availableQty - toIssue,
                issued: toIssue,
                indentItemId: lineItem.indent_item_id
            });
        }
    }

    // Apply stock deductions + update indent status in a transaction
    await prisma.$transaction(async (tx) => {
        for (const upd of stockUpdates) {
            await tx.department_stock.update({
                where: { stock_id: upd.stockId },
                data: { current_qty: upd.newQty, last_updated: new Date() }
            });
            await tx.indent_items.update({
                where: { indent_item_id: upd.indentItemId },
                data: { available_qty: upd.newQty, issued_qty: upd.issued }
            });
        }

        await tx.indent_requests.update({
            where: { indent_id: BigInt(indentId) },
            data: {
                status: 'approved',
                approved_by: userId ? BigInt(userId) : null,
                approved_at: new Date(),
                updated_at: new Date()
            }
        });
    });

    return { message: 'Indent approved', indent_id: Number(indentId), stock_issued: stockUpdates.length };
}

export async function rejectIndent(prisma, tenantId, userId, indentId, rejection_note) {
    const indent = await prisma.indent_requests.findFirst({
        where: { tenant_id: BigInt(tenantId), indent_id: BigInt(indentId) }
    });
    if (!indent) throw new Error('INDENT_NOT_FOUND');
    if (indent.status !== 'pending') throw new Error('INDENT_NOT_PENDING');

    await prisma.indent_requests.update({
        where: { indent_id: BigInt(indentId) },
        data: { status: 'rejected', rejection_note: rejection_note || null, updated_at: new Date() }
    });

    return { message: 'Indent rejected', indent_id: Number(indentId) };
}

export async function updateIndent(prisma, tenantId, indentId, data) {
    const indent = await prisma.indent_requests.findFirst({
        where: { tenant_id: BigInt(tenantId), indent_id: BigInt(indentId) }
    });
    if (!indent) throw new Error('INDENT_NOT_FOUND');
    if (indent.status !== 'pending') throw new Error('INDENT_NOT_PENDING');

    const updateData = {};
    if (data.department_id !== undefined) updateData.department_id = Number(data.department_id);
    if (data.required_by !== undefined) updateData.required_by = new Date(data.required_by);
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;
    updateData.updated_at = new Date();

    await prisma.indent_requests.update({
        where: { indent_id: BigInt(indentId) },
        data: updateData
    });

    return { message: 'Indent updated', indent_id: Number(indentId) };
}

// ── Helpers ─────────────────────────────────────────────

function serializeIndent(i) {
    return {
        indent_id: Number(i.indent_id),
        indent_number: i.indent_number,
        department_id: i.department_id,
        requested_by: i.requested_by ? Number(i.requested_by) : null,
        request_date: i.request_date,
        required_by: i.required_by,
        status: i.status,
        priority: i.priority,
        remarks: i.remarks,
        approved_by: i.approved_by ? Number(i.approved_by) : null,
        approved_at: i.approved_at,
        rejection_note: i.rejection_note,
        created_at: i.created_at,
        updated_at: i.updated_at,
        items: (i.indent_items || []).map(item => ({
            indent_item_id: Number(item.indent_item_id),
            item_id: item.item_id ? Number(item.item_id) : null,
            item_name: item.item_name,
            quantity: item.quantity,
            unit: item.unit,
            available_qty: item.available_qty,
            issued_qty: item.issued_qty,
            remarks: item.remarks
        }))
    };
}
