import { Prisma } from "../../../generated/prisma/index.js";
import {
  createHttpError,
  toSafeInteger,
  toSafeNumber,
} from "../pharmacy.common.js";
import { generateNumber } from "../../../utils/number-generator.js";

function parseDateOnly(dateString, fieldName) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(`${fieldName} must be a valid date in YYYY-MM-DD format`, 400);
  }
  return date;
}

function formatDateOnly(dateValue) {
  if (!dateValue) return null;
  return new Date(dateValue).toISOString().slice(0, 10);
}

async function generatePoNumber(tx, tenant) {
  return await generateNumber(tx, 'PO', tenant);
}

export async function createPurchaseOrder(prisma, tenantId, createdByUserId, payload) {
  const tenant = BigInt(tenantId);
  const createdBy = BigInt(createdByUserId);
  const supplierId = BigInt(payload.supplier_id);

  if (
    !prisma?.suppliers ||
    !prisma?.purchase_orders ||
    !prisma?.purchase_order_items
  ) {
    throw createHttpError(
      "Prisma client is out of date for purchase order models. Run 'npx prisma generate' and restart the server.",
      500,
    );
  }

  const poDate = parseDateOnly(payload.po_date, "po_date");
  const expectedDeliveryDate = payload.expected_delivery_date
    ? parseDateOnly(payload.expected_delivery_date, "expected_delivery_date")
    : null;

  if (expectedDeliveryDate && expectedDeliveryDate < poDate) {
    throw createHttpError("expected_delivery_date cannot be before po_date", 400);
  }

  const supplier = await prisma.suppliers.findFirst({
    where: {
      tenant_id: tenant,
      supplier_id: supplierId,
      is_active: true,
    },
    select: {
      supplier_id: true,
    },
  });

  if (!supplier) {
    throw createHttpError("Supplier not found or inactive for current tenant", 404);
  }

  const itemDrugIds = [...new Set(payload.items.map((item) => Number(item.drug_id)))];
  const drugs = await prisma.drugs.findMany({
    where: {
      tenant_id: tenant,
      is_active: true,
      drug_id: { in: itemDrugIds },
    },
    select: {
      drug_id: true,
      drug_name: true,
    },
  });

  const drugById = new Map(drugs.map((drug) => [drug.drug_id, drug]));

  let subtotal = new Prisma.Decimal(0);
  const itemsToInsert = payload.items.map((item) => {
    const drugId = Number(item.drug_id);
    const inputDrugName = item.drug_name.trim();
    const quantity = Number(item.quantity);
    const unitPrice = new Prisma.Decimal(item.unit_price);

    const drug = drugById.get(drugId);
    if (!drug) {
      throw createHttpError(`Drug not found for drug_id ${drugId}`, 404);
    }

    if (drug.drug_name.toLowerCase() !== inputDrugName.toLowerCase()) {
      throw createHttpError(`drug_name does not match drug_id ${drugId}`, 400);
    }

    const totalPrice = unitPrice.mul(quantity);
    subtotal = subtotal.add(totalPrice);

    return {
      tenant_id: tenant,
      drug_id: drugId,
      drug_name: drug.drug_name,
      quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
    };
  });

  const taxAmount = new Prisma.Decimal(0);
  const discountAmount = new Prisma.Decimal(0);
  const totalAmount = subtotal.add(taxAmount).sub(discountAmount);

  const result = await prisma.$transaction(async (tx) => {
    const poNumber = await generatePoNumber(tx, tenant);

    const purchaseOrder = await tx.purchase_orders.create({
      data: {
        tenant_id: tenant,
        po_number: poNumber,
        supplier_id: supplierId,
        po_date: poDate,
        expected_delivery_date: expectedDeliveryDate,
        status: "pending_approval",
        subtotal_amount: subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        items_count: itemsToInsert.length,
        notes: payload.notes?.trim() || null,
        created_by: createdBy,
      },
      select: {
        po_id: true,
        po_number: true,
        supplier_id: true,
        po_date: true,
        expected_delivery_date: true,
        status: true,
        items_count: true,
        subtotal_amount: true,
        tax_amount: true,
        discount_amount: true,
        total_amount: true,
        notes: true,
        created_by: true,
        created_at: true,
      },
    });

    const createdItems = await Promise.all(
      itemsToInsert.map((item) =>
        tx.purchase_order_items.create({
          data: {
            po_id: purchaseOrder.po_id,
            ...item,
          },
          select: {
            po_item_id: true,
            drug_id: true,
            drug_name: true,
            quantity: true,
            unit_price: true,
            total_price: true,
          },
        }),
      ),
    );

    return { purchaseOrder, createdItems };
  });

  return {
    poId: result.purchaseOrder.po_id.toString(),
    poNumber: result.purchaseOrder.po_number,
    supplierId: result.purchaseOrder.supplier_id.toString(),
    poDate: formatDateOnly(result.purchaseOrder.po_date),
    expectedDeliveryDate: formatDateOnly(
      result.purchaseOrder.expected_delivery_date,
    ),
    status: result.purchaseOrder.status,
    itemsCount: toSafeInteger(result.purchaseOrder.items_count),
    subtotalAmount: toSafeNumber(result.purchaseOrder.subtotal_amount),
    taxAmount: toSafeNumber(result.purchaseOrder.tax_amount) || 0,
    discountAmount: toSafeNumber(result.purchaseOrder.discount_amount) || 0,
    totalAmount: toSafeNumber(result.purchaseOrder.total_amount),
    notes: result.purchaseOrder.notes || null,
    createdBy: result.purchaseOrder.created_by.toString(),
    createdAt: result.purchaseOrder.created_at || null,
    items: result.createdItems.map((item) => ({
      poItemId: item.po_item_id.toString(),
      drugId: String(item.drug_id),
      drugName: item.drug_name,
      quantity: item.quantity,
      unitPrice: toSafeNumber(item.unit_price),
      totalPrice: toSafeNumber(item.total_price),
    })),
  };
}

export async function updateExistingMedicineQuantity(prisma, tenantId, payload) {
  const tenant = BigInt(tenantId);
  const drugId = Number(payload.drugId);
  const batchNumber = payload.batchNumber.trim();
  const quantityToAdd = Number(payload.quantity);
  const inputDrugName = payload.drugName.trim();

  const drug = await prisma.drugs.findFirst({
    where: {
      tenant_id: tenant,
      drug_id: drugId,
      is_active: true,
    },
    select: {
      drug_id: true,
      drug_name: true,
    },
  });

  if (!drug) {
    throw createHttpError("Medicine not found for provided drugId", 404);
  }

  if (drug.drug_name.toLowerCase() !== inputDrugName.toLowerCase()) {
    throw createHttpError("drugName does not match provided drugId", 400);
  }

  const stock = await prisma.pharmacy_stock.findFirst({
    where: {
      tenant_id: tenant,
      drug_id: drugId,
      batch_number: batchNumber,
    },
    select: {
      stock_id: true,
      quantity_available: true,
    },
  });

  if (!stock) {
    throw createHttpError(
      "Stock batch not found for provided drugId and batchNumber",
      404,
    );
  }

  const updatedStock = await prisma.pharmacy_stock.update({
    where: {
      stock_id: stock.stock_id,
    },
    data: {
      quantity_available: {
        increment: quantityToAdd,
      },
      updated_at: new Date(),
    },
    select: {
      stock_id: true,
      drug_id: true,
      batch_number: true,
      quantity_available: true,
      updated_at: true,
      drugs: {
        select: {
          drug_name: true,
        },
      },
    },
  });

  return {
    stockId: updatedStock.stock_id.toString(),
    drugId: String(updatedStock.drug_id),
    drugName: updatedStock.drugs.drug_name,
    batchNumber: updatedStock.batch_number,
    previousQuantity: stock.quantity_available,
    addedQuantity: quantityToAdd,
    newQuantity: updatedStock.quantity_available,
    updatedAt: updatedStock.updated_at || null,
  };
}

export async function getStockInventoryList(prisma, tenantId, query = {}) {
  const tenant = BigInt(tenantId);
  const search = query.search?.trim();
  const status = query.status || "current_stock";
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Number(query.limit || 10));
  const skip = (page - 1) * limit;

  const searchLike = search ? `%${search}%` : null;
  const whereParts = [
    Prisma.sql`d.tenant_id = ${tenant}`,
    Prisma.sql`d.is_active = TRUE`,
  ];

  if (searchLike) {
    whereParts.push(Prisma.sql`(
      d.drug_name ILIKE ${searchLike}
      OR COALESCE(d.manufacturer, '') ILIKE ${searchLike}
    )`);
  }

  const whereSql = Prisma.join(whereParts, " AND ");

  let statusSql = Prisma.empty;
  if (status === "current_stock") {
    statusSql = Prisma.sql`WHERE inv.status = 'current_stock'`;
  } else if (status === "out_of_stock") {
    statusSql = Prisma.sql`WHERE inv.status = 'out_of_stock'`;
  } else if (status === "expiry_soon") {
    statusSql = Prisma.sql`WHERE inv.status = 'expiry_soon'`;
  }

  const totalRows = await prisma.$queryRaw`
    WITH latest_supplier AS (
      SELECT
        poi.drug_id,
        po.supplier_id,
        s.supplier_name,
        ROW_NUMBER() OVER (
          PARTITION BY poi.drug_id
          ORDER BY po.po_date DESC, po.po_id DESC, poi.po_item_id DESC
        ) AS rn
      FROM purchase_order_items poi
      INNER JOIN purchase_orders po
        ON po.po_id = poi.po_id
        AND po.tenant_id = poi.tenant_id
        AND po.is_active = TRUE
      INNER JOIN suppliers s
        ON s.supplier_id = po.supplier_id
        AND s.tenant_id = po.tenant_id
      WHERE poi.tenant_id = ${tenant}
    ),
    inv AS (
      SELECT
        d.drug_id,
        d.drug_code,
        d.drug_name,
        d.manufacturer,
        COALESCE(SUM(ps.quantity_available), 0)::BIGINT AS quantity,
        NULLIF(STRING_AGG(DISTINCT ps.batch_number, ', '), '') AS batch_number,
        MAX(ps.location) AS location,
        MAX(ps.unit_price) AS unit_price,
        ls.supplier_id,
        ls.supplier_name,
        MIN(ps.expiry_date) FILTER (WHERE ps.quantity_available > 0) AS nearest_expiry,
        CASE
          WHEN COALESCE(SUM(ps.quantity_available), 0) = 0 THEN 'out_of_stock'
          WHEN MIN(ps.expiry_date) FILTER (WHERE ps.quantity_available > 0) <= CURRENT_DATE + INTERVAL '7 days' THEN 'expiry_soon'
          ELSE 'current_stock'
        END AS status
      FROM drugs d
      LEFT JOIN pharmacy_stock ps
        ON ps.drug_id = d.drug_id
        AND ps.tenant_id = d.tenant_id
      LEFT JOIN latest_supplier ls
        ON ls.drug_id = d.drug_id
        AND ls.rn = 1
      WHERE ${whereSql}
      GROUP BY
        d.drug_id,
        d.drug_code,
        d.drug_name,
        d.manufacturer,
        ls.supplier_id,
        ls.supplier_name
    )
    SELECT COUNT(*)::BIGINT AS total
    FROM inv
    ${statusSql};
  `;

  const rows = await prisma.$queryRaw`
    WITH latest_supplier AS (
      SELECT
        poi.drug_id,
        po.supplier_id,
        s.supplier_name,
        ROW_NUMBER() OVER (
          PARTITION BY poi.drug_id
          ORDER BY po.po_date DESC, po.po_id DESC, poi.po_item_id DESC
        ) AS rn
      FROM purchase_order_items poi
      INNER JOIN purchase_orders po
        ON po.po_id = poi.po_id
        AND po.tenant_id = poi.tenant_id
        AND po.is_active = TRUE
      INNER JOIN suppliers s
        ON s.supplier_id = po.supplier_id
        AND s.tenant_id = po.tenant_id
      WHERE poi.tenant_id = ${tenant}
    ),
    inv AS (
      SELECT
        d.drug_id,
        d.drug_code,
        d.drug_name,
        d.manufacturer,
        COALESCE(SUM(ps.quantity_available), 0)::BIGINT AS quantity,
        NULLIF(STRING_AGG(DISTINCT ps.batch_number, ', '), '') AS batch_number,
        MAX(ps.location) AS location,
        MAX(ps.unit_price) AS unit_price,
        ls.supplier_id,
        ls.supplier_name,
        MIN(ps.expiry_date) FILTER (WHERE ps.quantity_available > 0) AS nearest_expiry,
        CASE
          WHEN COALESCE(SUM(ps.quantity_available), 0) = 0 THEN 'out_of_stock'
          WHEN MIN(ps.expiry_date) FILTER (WHERE ps.quantity_available > 0) <= CURRENT_DATE + INTERVAL '7 days' THEN 'expiry_soon'
          ELSE 'current_stock'
        END AS status
      FROM drugs d
      LEFT JOIN pharmacy_stock ps
        ON ps.drug_id = d.drug_id
        AND ps.tenant_id = d.tenant_id
      LEFT JOIN latest_supplier ls
        ON ls.drug_id = d.drug_id
        AND ls.rn = 1
      WHERE ${whereSql}
      GROUP BY
        d.drug_id,
        d.drug_code,
        d.drug_name,
        d.manufacturer,
        ls.supplier_id,
        ls.supplier_name
    )
    SELECT
      inv.drug_id,
      inv.drug_code,
      inv.drug_name,
      inv.quantity,
      inv.batch_number,
      inv.unit_price,
      inv.location,
      inv.supplier_id,
      inv.supplier_name,
      inv.manufacturer,
      inv.status
    FROM inv
    ${statusSql}
    ORDER BY inv.drug_name ASC
    OFFSET ${skip}
    LIMIT ${limit};
  `;

  const totalRecords = toSafeInteger(totalRows[0]?.total);
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

  return {
    totalRecords,
    totalPages,
    currentPage: page,
    pageSize: limit,
    data: rows.map((row) => ({
      drugId: row.drug_id.toString(),
      drugCode: row.drug_code,
      drugName: row.drug_name,
      batchNumber: row.batch_number || null,
      quantity: toSafeInteger(row.quantity),
      unitPrice: toSafeNumber(row.unit_price),
      location: row.location || null,
      supplierId: row.supplier_id ? row.supplier_id.toString() : null,
      supplierName: row.supplier_name || row.manufacturer || null,
      status: row.status,
    })),
  };
}

export async function getStockStatusCounts(prisma, tenantId) {
  const tenant = BigInt(tenantId);

  const rows = await prisma.$queryRaw`
    WITH inv AS (
      SELECT
        d.drug_id,
        COALESCE(SUM(ps.quantity_available), 0)::BIGINT AS quantity,
        MIN(ps.expiry_date) FILTER (WHERE ps.quantity_available > 0) AS nearest_expiry
      FROM drugs d
      LEFT JOIN pharmacy_stock ps
        ON ps.drug_id = d.drug_id
        AND ps.tenant_id = d.tenant_id
      WHERE d.tenant_id = ${tenant}
        AND d.is_active = TRUE
      GROUP BY d.drug_id
    )
    SELECT
      COUNT(*) FILTER (WHERE quantity > 0 AND (nearest_expiry IS NULL OR nearest_expiry > CURRENT_DATE + INTERVAL '7 days'))::BIGINT AS current_stock,
      COUNT(*) FILTER (WHERE quantity = 0)::BIGINT AS out_of_stock,
      COUNT(*) FILTER (WHERE quantity > 0 AND nearest_expiry IS NOT NULL AND nearest_expiry <= CURRENT_DATE + INTERVAL '7 days')::BIGINT AS expiry_soon
    FROM inv;
  `;

  const summary = rows[0] || {};

  return {
    currentStock: toSafeInteger(summary.current_stock),
    outOfStock: toSafeInteger(summary.out_of_stock),
    expirySoon: toSafeInteger(summary.expiry_soon),
  };
}
