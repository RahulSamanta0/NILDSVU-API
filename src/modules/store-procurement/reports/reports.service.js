/**
 * Reports Service Layer
 *
 * Purpose:
 * - Analytical queries for store & procurement data
 * - Generates GRN registers, expiry reports, and stock movement ledgers
 */

/**
 * GRN Register — all GRNs in a date range with vendor & item detail
 */
export async function getGRNRegister(prisma, tenantId, filters = {}) {
    const where = { tenant_id: BigInt(tenantId) };

    if (filters.from || filters.to) {
        where.received_date = {};
        if (filters.from) where.received_date.gte = new Date(filters.from);
        if (filters.to) where.received_date.lte = new Date(filters.to + 'T23:59:59');
    }
    if (filters.vendor_id) where.vendor_id = BigInt(filters.vendor_id);

    const grns = await prisma.grn_records.findMany({
        where,
        include: {
            grn_items: {
                include: {
                    inventory_items: { select: { item_code: true, item_name: true, unit_of_measure: true } }
                }
            },
            purchase_orders: { select: { po_number: true } }
        },
        orderBy: { received_date: 'desc' }
    });

    return grns.map(g => ({
        grn_id: Number(g.grn_id),
        grn_number: g.grn_number,
        po_number: g.purchase_orders?.po_number || null,
        vendor_id: g.vendor_id ? Number(g.vendor_id) : null,
        department_id: g.department_id,
        received_date: g.received_date,
        invoice_number: g.invoice_number,
        invoice_amount: g.invoice_amount ? Number(g.invoice_amount) : null,
        status: g.status,
        items: g.grn_items.map(i => ({
            item_code: i.inventory_items?.item_code,
            item_name: i.item_name,
            unit: i.inventory_items?.unit_of_measure || i.unit,
            received_qty: i.received_qty,
            free_qty: i.free_qty,
            batch_number: i.batch_number,
            expiry_date: i.expiry_date,
            unit_price: i.unit_price ? Number(i.unit_price) : null,
            total_price: i.total_price ? Number(i.total_price) : null
        }))
    }));
}

/**
 * Expiry Report — items expiring within N days from GRN records
 */
export async function getExpiryReport(prisma, tenantId, filters = {}) {
    const days = filters.days ? Number(filters.days) : 30;
    const expiryBefore = new Date();
    expiryBefore.setDate(expiryBefore.getDate() + days);

    const items = await prisma.grn_items.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            expiry_date: { lte: expiryBefore, gte: new Date() },
            grn_records: { status: 'posted' }
        },
        include: {
            inventory_items: { select: { item_code: true, item_name: true, unit_of_measure: true } },
            grn_records: { select: { grn_number: true, received_date: true, department_id: true } }
        },
        orderBy: { expiry_date: 'asc' }
    });

    return items.map(i => ({
        grn_item_id: Number(i.grn_item_id),
        grn_number: i.grn_records?.grn_number,
        item_code: i.inventory_items?.item_code,
        item_name: i.item_name,
        batch_number: i.batch_number,
        expiry_date: i.expiry_date,
        received_qty: i.received_qty,
        department_id: i.grn_records?.department_id,
        days_to_expiry: Math.ceil((new Date(i.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
    }));
}

/**
 * Reorder Report — items at or below reorder_level per department
 */
export async function getReorderReport(prisma, tenantId, filters = {}) {
    const where = { tenant_id: BigInt(tenantId) };
    if (filters.department_id) where.department_id = Number(filters.department_id);

    const stocks = await prisma.department_stock.findMany({
        where,
        include: {
            inventory_items: {
                select: { item_code: true, item_name: true, unit_of_measure: true, unit_price: true }
            }
        }
    });

    return stocks
        .filter(s => s.current_qty <= (s.reorder_level ?? 10))
        .map(s => ({
            stock_id: Number(s.stock_id),
            department_id: s.department_id,
            item_code: s.inventory_items?.item_code,
            item_name: s.inventory_items?.item_name,
            unit: s.inventory_items?.unit_of_measure,
            current_qty: s.current_qty,
            reorder_level: s.reorder_level ?? 10,
            shortage: (s.reorder_level ?? 10) - s.current_qty,
            unit_price: s.inventory_items?.unit_price ? Number(s.inventory_items.unit_price) : null
        }));
}

/**
 * Purchase Summary — total spend by vendor/dept/date range
 */
export async function getPurchaseSummary(prisma, tenantId, filters = {}) {
    const where = { tenant_id: BigInt(tenantId) };

    if (filters.vendor_id) where.vendor_id = BigInt(filters.vendor_id);
    if (filters.department_id) where.department_id = Number(filters.department_id);
    if (filters.from || filters.to) {
        where.po_date = {};
        if (filters.from) where.po_date.gte = new Date(filters.from);
        if (filters.to) where.po_date.lte = new Date(filters.to + 'T23:59:59');
    }

    const pos = await prisma.purchase_orders.findMany({
        where,
        include: { store_vendors: { select: { vendor_name: true, vendor_code: true } } },
        orderBy: { po_date: 'desc' }
    });

    const summary = {
        total_orders: pos.length,
        total_amount: pos.reduce((sum, p) => sum + Number(p.total_amount || 0), 0),
        by_vendor: {},
        by_status: {},
        orders: pos.map(p => ({
            po_id: Number(p.po_id),
            po_number: p.po_number,
            vendor_name: p.store_vendors?.vendor_name,
            department_id: p.department_id,
            po_date: p.po_date,
            total_amount: Number(p.total_amount || 0),
            status: p.status
        }))
    };

    for (const po of pos) {
        const vName = po.store_vendors?.vendor_name || `Vendor ${po.vendor_id}`;
        summary.by_vendor[vName] = (summary.by_vendor[vName] || 0) + Number(po.total_amount || 0);
        summary.by_status[po.status] = (summary.by_status[po.status] || 0) + 1;
    }

    return summary;
}

/**
 * Stock Ledger — GRN receipt history for a specific item
 */
export async function getStockLedger(prisma, tenantId, filters = {}) {
    if (!filters.item_id) throw new Error('ITEM_ID_REQUIRED');

    const where = {
        tenant_id: BigInt(tenantId),
        item_id: BigInt(filters.item_id),
        grn_records: { status: 'posted' }
    };

    if (filters.from || filters.to) {
        where.grn_records = {
            ...where.grn_records,
            received_date: {}
        };
        if (filters.from) where.grn_records.received_date.gte = new Date(filters.from);
        if (filters.to) where.grn_records.received_date.lte = new Date(filters.to + 'T23:59:59');
    }

    const entries = await prisma.grn_items.findMany({
        where,
        include: {
            grn_records: {
                select: { grn_number: true, received_date: true, department_id: true, po_id: true }
            },
            inventory_items: { select: { item_code: true, item_name: true, unit_of_measure: true } }
        },
        orderBy: { created_at: 'desc' }
    });

    return entries.map(e => ({
        grn_item_id: Number(e.grn_item_id),
        grn_number: e.grn_records?.grn_number,
        received_date: e.grn_records?.received_date,
        item_code: e.inventory_items?.item_code,
        item_name: e.item_name,
        batch_number: e.batch_number,
        expiry_date: e.expiry_date,
        received_qty: e.received_qty,
        free_qty: e.free_qty,
        rejected_qty: e.rejected_qty,
        unit_price: e.unit_price ? Number(e.unit_price) : null,
        total_price: e.total_price ? Number(e.total_price) : null,
        department_id: e.grn_records?.department_id
    }));
}
