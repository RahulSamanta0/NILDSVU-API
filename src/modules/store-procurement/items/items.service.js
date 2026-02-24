/**
 * Indents Service Layer
 *
 * Purpose:
 * - Business logic for indent requests with auto-stock-check on approval
 * - Manages status transitions and stock issuing logic
 */

export async function createItem(prisma, tenantId, data) {
    const { item_code, item_name, category_id, description,
        unit_of_measure, reorder_level, unit_price, is_active } = data;

    const existing = await prisma.inventory_items.findFirst({
        where: { item_code }
    });
    if (existing) throw new Error('ITEM_CODE_EXISTS');

    const item = await prisma.inventory_items.create({
        data: {
            tenant_id: BigInt(tenantId),
            item_code,
            item_name,
            category_id: category_id ? Number(category_id) : null,
            description: description || null,
            unit_of_measure: unit_of_measure || null,
            reorder_level: reorder_level !== undefined ? reorder_level : 10,
            current_stock: 0,
            unit_price: unit_price !== undefined ? unit_price : null,
            is_active: is_active !== undefined ? is_active : true
        }
    });

    return serializeItem(item);
}

export async function listItems(prisma, tenantId, filters = {}) {
    const where = { tenant_id: BigInt(tenantId) };

    if (filters.is_active !== undefined) where.is_active = filters.is_active;
    if (filters.category_id !== undefined) where.category_id = Number(filters.category_id);
    if (filters.search) {
        where.OR = [
            { item_name: { contains: filters.search, mode: 'insensitive' } },
            { item_code: { contains: filters.search, mode: 'insensitive' } }
        ];
    }
    if (filters.low_stock === true || filters.low_stock === 'true') {
        where.AND = [
            { current_stock: { not: null } },
            { reorder_level: { not: null } }
        ];
    }

    const items = await prisma.inventory_items.findMany({
        where,
        include: {
            inventory_categories: {
                select: { category_id: true, category_name: true }
            }
        },
        orderBy: { item_name: 'asc' }
    });

    let result = items.map(i => ({
        ...serializeItem(i),
        category_name: i.inventory_categories?.category_name || null
    }));

    // Post-filter low_stock (current_stock <= reorder_level)
    if (filters.low_stock === true || filters.low_stock === 'true') {
        result = result.filter(i => i.current_stock <= (i.reorder_level ?? 10));
    }

    return result;
}

export async function getItemById(prisma, tenantId, itemId) {
    const item = await prisma.inventory_items.findFirst({
        where: { tenant_id: BigInt(tenantId), item_id: BigInt(itemId) },
        include: {
            inventory_categories: {
                select: { category_id: true, category_name: true }
            }
        }
    });

    if (!item) throw new Error('ITEM_NOT_FOUND');

    return {
        ...serializeItem(item),
        category_name: item.inventory_categories?.category_name || null
    };
}

export async function updateItem(prisma, tenantId, itemId, data) {
    const existing = await prisma.inventory_items.findFirst({
        where: { tenant_id: BigInt(tenantId), item_id: BigInt(itemId) }
    });
    if (!existing) throw new Error('ITEM_NOT_FOUND');

    const updateData = {};
    const fields = ['item_name', 'description', 'unit_of_measure', 'reorder_level', 'unit_price', 'is_active'];
    for (const f of fields) {
        if (data[f] !== undefined) updateData[f] = data[f];
    }
    if (data.category_id !== undefined) updateData.category_id = Number(data.category_id);
    updateData.updated_at = new Date();

    const updated = await prisma.inventory_items.update({
        where: { item_id: BigInt(itemId) },
        data: updateData
    });

    return serializeItem(updated);
}

// ── Helpers ─────────────────────────────────────────────

function serializeItem(i) {
    return {
        item_id: Number(i.item_id),
        item_code: i.item_code,
        item_name: i.item_name,
        category_id: i.category_id,
        description: i.description,
        unit_of_measure: i.unit_of_measure,
        reorder_level: i.reorder_level,
        current_stock: i.current_stock,
        unit_price: i.unit_price ? Number(i.unit_price) : null,
        is_active: i.is_active,
        created_at: i.created_at,
        updated_at: i.updated_at
    };
}
