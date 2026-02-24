/**
 * Stock Service Layer
 *
 * Purpose: Business logic for department stock views and reorder management
 */

import { createPO } from '../purchase-orders/purchase-orders.service.js';

export async function listStock(prisma, tenantId, filters = {}) {
    const where = { tenant_id: BigInt(tenantId) };

    if (filters.department_id) where.department_id = Number(filters.department_id);
    if (filters.item_id) where.item_id = BigInt(filters.item_id);

    const stocks = await prisma.department_stock.findMany({
        where,
        include: {
            inventory_items: {
                select: {
                    item_code: true, item_name: true,
                    unit_of_measure: true, reorder_level: true,
                    unit_price: true
                }
            }
        },
        orderBy: [{ department_id: 'asc' }, { item_id: 'asc' }]
    });

    let result = stocks.map(s => serializeStock(s));

    if (filters.low_stock === true || filters.low_stock === 'true') {
        result = result.filter(s => s.current_qty <= s.reorder_level);
    }

    return result;
}

export async function getStockById(prisma, tenantId, stockId) {
    const stock = await prisma.department_stock.findFirst({
        where: { tenant_id: BigInt(tenantId), stock_id: BigInt(stockId) },
        include: {
            inventory_items: {
                select: {
                    item_code: true, item_name: true,
                    unit_of_measure: true, reorder_level: true, unit_price: true
                }
            }
        }
    });
    if (!stock) throw new Error('STOCK_NOT_FOUND');
    return serializeStock(stock);
}

export async function getReorderList(prisma, tenantId, filters = {}) {
    const where = { tenant_id: BigInt(tenantId) };
    if (filters.department_id) where.department_id = Number(filters.department_id);

    const stocks = await prisma.department_stock.findMany({
        where,
        include: {
            inventory_items: {
                select: {
                    item_code: true, item_name: true,
                    unit_of_measure: true, reorder_level: true, unit_price: true
                }
            }
        }
    });

    return stocks
        .filter(s => s.current_qty <= (s.reorder_level ?? 10))
        .map(serializeStock);
}

export async function createReorderPO(prisma, tenantId, userId, data) {
    const { vendor_id, items } = data;

    // Enrich items with names from inventory
    const enrichedItems = [];
    for (const it of items) {
        const inv = await prisma.inventory_items.findFirst({
            where: { tenant_id: BigInt(tenantId), item_id: BigInt(it.item_id) }
        });
        if (!inv) throw new Error(`ITEM_NOT_FOUND:${it.item_id}`);
        enrichedItems.push({
            item_id: it.item_id,
            item_name: inv.item_name,
            quantity: it.quantity,
            unit: inv.unit_of_measure,
            unit_price: it.unit_price
        });
    }

    return createPO(prisma, tenantId, userId, { vendor_id, items: enrichedItems });
}

// ── Helpers ─────────────────────────────────────────────

function serializeStock(s) {
    return {
        stock_id: Number(s.stock_id),
        department_id: s.department_id,
        item_id: Number(s.item_id),
        item_code: s.inventory_items?.item_code || null,
        item_name: s.inventory_items?.item_name || null,
        unit: s.inventory_items?.unit_of_measure || null,
        current_qty: s.current_qty,
        reorder_level: s.reorder_level ?? 10,
        unit_price: s.inventory_items?.unit_price ? Number(s.inventory_items.unit_price) : null,
        last_updated: s.last_updated,
        is_low_stock: s.current_qty <= (s.reorder_level ?? 10)
    };
}
