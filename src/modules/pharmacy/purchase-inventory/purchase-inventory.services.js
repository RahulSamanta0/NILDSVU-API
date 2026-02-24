import {
  createHttpError,
  parseBigIntSearch,
  toSafeNumber,
} from "../pharmacy.common.js";
import { Prisma } from "../../../generated/prisma/index.js";
import { generateNumber } from "../../../utils/number-generator.js";

function parseDateBoundary(value, isEnd = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (isEnd) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

function parseDateOnly(value, fieldName) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(`${fieldName} must be a valid date in YYYY-MM-DD format`, 400);
  }
  return date;
}

function formatDateOnly(dateValue) {
  if (!dateValue) return null;
  return new Date(dateValue).toISOString().slice(0, 10);
}

async function generateGrnNumber(tx, tenant) {
  return await generateNumber(tx, "GRN", tenant);
}

async function generatePoNumber(tx, tenant) {
  return await generateNumber(tx, "PO", tenant);
}

export async function createPurchaseOrder(prisma, tenantId, userId, payload) {
  const tenant = BigInt(tenantId);
  const createdBy = BigInt(userId);
  const supplierId = BigInt(payload.supplierId);
  const poDate = payload.poDate
    ? parseDateOnly(payload.poDate, "poDate")
    : parseDateOnly(new Date().toISOString().slice(0, 10), "poDate");
  const expectedDeliveryDate = parseDateOnly(
    payload.expectedDeliveryDate,
    "expectedDeliveryDate",
  );

  if (expectedDeliveryDate < poDate) {
    throw createHttpError("expectedDeliveryDate cannot be before poDate", 400);
  }

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

  const supplier = await prisma.suppliers.findFirst({
    where: {
      tenant_id: tenant,
      supplier_id: supplierId,
      is_active: true,
    },
    select: { supplier_id: true },
  });

  if (!supplier) {
    throw createHttpError("Supplier not found or inactive for current tenant", 404);
  }

  const itemDrugIds = [...new Set(payload.items.map((item) => Number(item.drugId)))];
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
    const drugId = Number(item.drugId);
    const quantity = Number(item.quantity);
    const unitPrice = new Prisma.Decimal(item.unitPrice);

    const drug = drugById.get(drugId);
    if (!drug) {
      throw createHttpError(`Drug not found for drugId ${drugId}`, 404);
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

  const taxAmount = new Prisma.Decimal(payload.taxAmount || 0);
  const discountAmount = new Prisma.Decimal(payload.discountAmount || 0);
  const totalAmount = subtotal.add(taxAmount).sub(discountAmount);

  if (totalAmount.lessThan(0)) {
    throw createHttpError("totalAmount cannot be negative", 400);
  }

  if (payload.subtotalAmount !== undefined) {
    const requestSubtotal = Number(payload.subtotalAmount);
    const computedSubtotal = Number(subtotal);
    if (Math.abs(requestSubtotal - computedSubtotal) > 0.01) {
      throw createHttpError("subtotalAmount does not match cart items", 400);
    }
  }

  if (payload.totalAmount !== undefined) {
    const requestTotal = Number(payload.totalAmount);
    const computedTotal = Number(totalAmount);
    if (Math.abs(requestTotal - computedTotal) > 0.01) {
      throw createHttpError("totalAmount does not match computed total", 400);
    }
  }

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
        notes: payload.remarks?.trim() || null,
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
    expectedDeliveryDate: formatDateOnly(result.purchaseOrder.expected_delivery_date),
    status: result.purchaseOrder.status,
    itemsCount: Number(result.purchaseOrder.items_count || 0),
    subtotalAmount: toSafeNumber(result.purchaseOrder.subtotal_amount) || 0,
    taxAmount: toSafeNumber(result.purchaseOrder.tax_amount) || 0,
    discountAmount: toSafeNumber(result.purchaseOrder.discount_amount) || 0,
    totalAmount: toSafeNumber(result.purchaseOrder.total_amount) || 0,
    remarks: result.purchaseOrder.notes || null,
    createdBy: result.purchaseOrder.created_by.toString(),
    createdAt: result.purchaseOrder.created_at || null,
    items: result.createdItems.map((item) => ({
      poItemId: item.po_item_id.toString(),
      drugId: String(item.drug_id),
      drugName: item.drug_name,
      quantity: item.quantity,
      unitPrice: toSafeNumber(item.unit_price) || 0,
      totalPrice: toSafeNumber(item.total_price) || 0,
    })),
  };
}

export async function getPurchaseOrdersList(prisma, tenantId, query = {}) {
  const tenant = BigInt(tenantId);
  const search = query.search?.trim();
  const status = query.status && query.status !== "all" ? query.status : null;
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Number(query.limit || 10));
  const skip = (page - 1) * limit;

  let supplierId = null;
  if (query.supplierId !== undefined && query.supplierId !== null) {
    supplierId = parseBigIntSearch(String(query.supplierId).trim());
    if (supplierId === null) {
      throw createHttpError("Invalid supplierId", 400);
    }
  }

  const dateFrom = parseDateBoundary(query.date, false);
  const dateTo = parseDateBoundary(query.date, true);
  if (query.date && (!dateFrom || !dateTo)) {
    throw createHttpError("Invalid date filter. Use YYYY-MM-DD format", 400);
  }

  const where = {
    tenant_id: tenant,
    is_active: true,
  };

  if (status) {
    where.status = status;
  }
  if (supplierId !== null) {
    where.supplier_id = supplierId;
  }
  if (dateFrom && dateTo) {
    where.po_date = {};
    where.po_date.gte = dateFrom;
    where.po_date.lte = dateTo;
  }
  if (search) {
    where.OR = [
      { po_number: { contains: search, mode: "insensitive" } },
      { suppliers: { supplier_name: { contains: search, mode: "insensitive" } } },
    ];
  }

  const canUsePrismaModels =
    prisma.purchase_orders &&
    typeof prisma.purchase_orders.findMany === "function" &&
    prisma.suppliers &&
    typeof prisma.suppliers.findMany === "function";

  let totalRecords = 0;
  let rows = [];

  if (canUsePrismaModels) {
    const result = await prisma.$transaction([
      prisma.purchase_orders.count({ where }),
      prisma.purchase_orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ po_date: "desc" }, { created_at: "desc" }],
        select: {
          po_id: true,
          po_number: true,
          supplier_id: true,
          po_date: true,
          total_amount: true,
          status: true,
          created_at: true,
          suppliers: {
            select: {
              supplier_name: true,
            },
          },
          grn: {
            select: {
              grn_id: true,
            },
          },
        },
      }),
    ]);
    totalRecords = result[0];
    rows = result[1];
  } else {
    const whereParts = [
      Prisma.sql`po.tenant_id = ${tenant}`,
      Prisma.sql`po.is_active = TRUE`,
    ];

    if (status) {
      whereParts.push(Prisma.sql`po.status = ${status}`);
    }
    if (supplierId !== null) {
      whereParts.push(Prisma.sql`po.supplier_id = ${supplierId}`);
    }
    if (dateFrom && dateTo) {
      whereParts.push(Prisma.sql`po.po_date >= ${dateFrom}`);
      whereParts.push(Prisma.sql`po.po_date <= ${dateTo}`);
    }
    if (search) {
      const searchLike = `%${search}%`;
      whereParts.push(
        Prisma.sql`(
          po.po_number ILIKE ${searchLike}
          OR s.supplier_name ILIKE ${searchLike}
        )`,
      );
    }

    const whereSql = Prisma.join(whereParts, " AND ");

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*)::BIGINT AS total
      FROM purchase_orders po
      INNER JOIN suppliers s
        ON s.supplier_id = po.supplier_id
        AND s.tenant_id = po.tenant_id
      WHERE ${whereSql};
    `;

    const rawRows = await prisma.$queryRaw`
      SELECT
        po.po_id,
        po.po_number,
        po.supplier_id,
        po.po_date,
        po.total_amount,
        po.status,
        s.supplier_name,
        (
          SELECT COUNT(*)::INT
          FROM grn g
          WHERE g.po_id = po.po_id
            AND g.tenant_id = po.tenant_id
            AND COALESCE(g.is_active, TRUE) = TRUE
        ) AS items
      FROM purchase_orders po
      INNER JOIN suppliers s
        ON s.supplier_id = po.supplier_id
        AND s.tenant_id = po.tenant_id
      WHERE ${whereSql}
      ORDER BY po.po_date DESC, po.created_at DESC
      OFFSET ${skip}
      LIMIT ${limit};
    `;

    totalRecords = Number(totalRows[0]?.total || 0);
    rows = rawRows.map((row) => ({
      po_id: row.po_id,
      po_number: row.po_number,
      supplier_id: row.supplier_id,
      po_date: row.po_date,
      total_amount: row.total_amount,
      status: row.status,
      suppliers: { supplier_name: row.supplier_name },
      items: Number(row.items || 0),
    }));
  }

  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

  return {
    totalRecords,
    totalPages,
    currentPage: page,
    pageSize: limit,
    data: rows.map((row) => ({
      poId: row.po_id.toString(),
      poNumber: row.po_number,
      supplierId: row.supplier_id.toString(),
      supplierName: row.suppliers?.supplier_name || null,
      items: typeof row.items === "number" ? row.items : row.grn?.length || 0,
      totalAmount: toSafeNumber(row.total_amount),
      date: row.po_date || null,
      status: row.status ? String(row.status) : null,
    })),
  };
}

export async function getPendingPurchaseOrdersList(prisma, tenantId, query = {}) {
  const tenant = BigInt(tenantId);
  const poNumber = query.poNumber?.trim() || query.search?.trim();
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Number(query.limit || 10));
  const skip = (page - 1) * limit;

  const where = {
    tenant_id: tenant,
    is_active: true,
    status: "pending_approval",
  };

  if (poNumber) {
    where.po_number = { contains: poNumber, mode: "insensitive" };
  }

  const canUsePrismaModels =
    prisma.purchase_orders &&
    typeof prisma.purchase_orders.findMany === "function";

  let totalRecords = 0;
  let rows = [];

  if (canUsePrismaModels) {
    const result = await prisma.$transaction([
      prisma.purchase_orders.count({ where }),
      prisma.purchase_orders.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ po_date: "desc" }, { created_at: "desc" }],
        select: {
          po_id: true,
          po_number: true,
          supplier_id: true,
          po_date: true,
          total_amount: true,
          status: true,
          suppliers: {
            select: {
              supplier_name: true,
            },
          },
        },
      }),
    ]);
    totalRecords = result[0];
    rows = result[1];
  } else {
    const whereParts = [
      Prisma.sql`po.tenant_id = ${tenant}`,
      Prisma.sql`po.is_active = TRUE`,
      Prisma.sql`po.status = 'pending_approval'`,
    ];
    if (poNumber) {
      const searchLike = `%${poNumber}%`;
      whereParts.push(Prisma.sql`po.po_number ILIKE ${searchLike}`);
    }
    const whereSql = Prisma.join(whereParts, " AND ");

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*)::BIGINT AS total
      FROM purchase_orders po
      WHERE ${whereSql};
    `;

    rows = await prisma.$queryRaw`
      SELECT
        po.po_id,
        po.po_number,
        po.supplier_id,
        po.po_date,
        po.total_amount,
        po.status,
        s.supplier_name
      FROM purchase_orders po
      LEFT JOIN suppliers s
        ON s.supplier_id = po.supplier_id
        AND s.tenant_id = po.tenant_id
      WHERE ${whereSql}
      ORDER BY po.po_date DESC, po.created_at DESC
      OFFSET ${skip}
      LIMIT ${limit};
    `;

    totalRecords = Number(totalRows[0]?.total || 0);
    rows = rows.map((row) => ({
      po_id: row.po_id,
      po_number: row.po_number,
      supplier_id: row.supplier_id,
      po_date: row.po_date,
      total_amount: row.total_amount,
      status: row.status,
      suppliers: {
        supplier_name: row.supplier_name,
      },
    }));
  }

  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

  return {
    totalRecords,
    totalPages,
    currentPage: page,
    pageSize: limit,
    data: rows.map((row) => ({
      poId: row.po_id.toString(),
      poNumber: row.po_number,
      supplierId: row.supplier_id.toString(),
      supplierName: row.suppliers?.supplier_name || null,
      totalAmount: toSafeNumber(row.total_amount),
      date: row.po_date || null,
      status: row.status ? String(row.status) : null,
    })),
  };
}

export async function getPoReceiptDetails(prisma, tenantId, poNumberInput) {
  const tenant = BigInt(tenantId);
  const poNumber = String(poNumberInput || "").trim();

  if (!poNumber) {
    throw createHttpError("poNumber is required", 400);
  }

  const rows = await prisma.$queryRaw`
    SELECT
      po.po_id,
      po.po_number,
      po.supplier_id,
      po.status,
      s.supplier_name,
      COALESCE(SUM(poi.quantity), 0)::INT AS ordered_quantity,
      latest_grn.invoice_number AS invoice_number,
      latest_stock.batch_number AS batch_number,
      latest_stock.expiry_date AS expiry_date
    FROM purchase_orders po
    INNER JOIN suppliers s
      ON s.supplier_id = po.supplier_id
      AND s.tenant_id = po.tenant_id
    LEFT JOIN purchase_order_items poi
      ON poi.po_id = po.po_id
      AND poi.tenant_id = po.tenant_id
    LEFT JOIN LATERAL (
      SELECT g.invoice_number
      FROM grn g
      WHERE g.tenant_id = po.tenant_id
        AND g.po_id = po.po_id
        AND COALESCE(g.is_active, TRUE) = TRUE
      ORDER BY g.created_at DESC, g.grn_id DESC
      LIMIT 1
    ) latest_grn ON TRUE
    LEFT JOIN LATERAL (
      SELECT ps.batch_number, ps.expiry_date
      FROM pharmacy_stock ps
      INNER JOIN purchase_order_items poi2
        ON poi2.drug_id = ps.drug_id
        AND poi2.po_id = po.po_id
        AND poi2.tenant_id = po.tenant_id
      WHERE ps.tenant_id = po.tenant_id
      ORDER BY ps.updated_at DESC NULLS LAST, ps.created_at DESC NULLS LAST, ps.stock_id DESC
      LIMIT 1
    ) latest_stock ON TRUE
    WHERE po.tenant_id = ${tenant}
      AND po.po_number = ${poNumber}
      AND po.is_active = TRUE
    GROUP BY
      po.po_id,
      po.po_number,
      po.supplier_id,
      po.status,
      s.supplier_name,
      latest_grn.invoice_number,
      latest_stock.batch_number,
      latest_stock.expiry_date;
  `;

  const row = rows[0];
  if (!row) {
    throw createHttpError("Purchase order not found for provided poNumber", 404);
  }

  return {
    poId: row.po_id.toString(),
    poNumber: row.po_number,
    supplierId: row.supplier_id.toString(),
    supplierName: row.supplier_name || null,
    invoiceNumber: row.invoice_number || null,
    batchNumber: row.batch_number || null,
    quantity: Number(row.ordered_quantity || 0),
    expiryDate: formatDateOnly(row.expiry_date),
    status: row.status ? String(row.status) : null,
  };
}

export async function confirmPoReceipt(prisma, tenantId, payload) {
  const tenant = BigInt(tenantId);
  const receivedByName = String(payload.receivedByName || "").trim();
  if (!receivedByName) {
    throw createHttpError("receivedByName is required", 400);
  }
  const poNumber = payload.poNumber.trim();
  const invoiceNumber = payload.invoiceNumber.trim();
  const batchNumber = payload.batchNumber.trim();
  const receivedQty = Number(payload.quantity);
  const expiryDate = parseDateOnly(payload.expiryDate, "expiryDate");
  const now = new Date();

  if (!prisma?.grn || !prisma?.purchase_orders || !prisma?.purchase_order_items) {
    throw createHttpError(
      "Prisma client is out of date for GRN models. Run 'npx prisma generate' and restart the server.",
      500,
    );
  }

  const receiverUser = await prisma.users.findFirst({
    where: {
      tenant_id: tenant,
      is_active: true,
      username: {
        equals: receivedByName,
        mode: "insensitive",
      },
    },
    select: {
      user_id: true,
      username: true,
    },
  });

  if (!receiverUser) {
    throw createHttpError("receivedByName does not match an active user", 404);
  }

  const receivedBy = receiverUser.user_id;

  const result = await prisma.$transaction(async (tx) => {
    const po = await tx.purchase_orders.findFirst({
      where: {
        tenant_id: tenant,
        po_number: poNumber,
        is_active: true,
      },
      select: {
        po_id: true,
        supplier_id: true,
        status: true,
      },
    });

    if (!po) {
      throw createHttpError("Purchase order not found for provided poNumber", 404);
    }

    if (po.status === "cancelled" || po.status === "closed") {
      throw createHttpError("Receipt cannot be confirmed for cancelled/closed PO", 400);
    }

    const qtyRow = await tx.purchase_order_items.aggregate({
      where: {
        tenant_id: tenant,
        po_id: po.po_id,
      },
      _sum: {
        quantity: true,
      },
    });

    const orderedQty = Number(qtyRow._sum.quantity || 0);
    const fullyReceived = orderedQty > 0 ? receivedQty >= orderedQty : true;
    const grnStatus = fullyReceived ? "accepted" : "partial_accept";
    const poStatus = fullyReceived ? "received" : "partially_received";

    const grnNumber = await generateGrnNumber(tx, tenant);

    const grn = await tx.grn.create({
      data: {
        tenant_id: tenant,
        grn_number: grnNumber,
        po_id: po.po_id,
        supplier_id: po.supplier_id,
        received_date: now,
        received_at: now,
        invoice_number: invoiceNumber,
        invoice_date: now,
        status: grnStatus,
        remarks: payload.receivedByRemark?.trim() || null,
        received_notes: JSON.stringify({
          batchNumber,
          quantity: receivedQty,
          expiryDate: formatDateOnly(expiryDate),
          receivedByName: receiverUser.username,
        }),
        received_by: receivedBy,
      },
      select: {
        grn_id: true,
        grn_number: true,
      },
    });

    await tx.purchase_orders.update({
      where: {
        po_id: po.po_id,
      },
      data: {
        status: poStatus,
        updated_at: now,
      },
    });

    return {
      grn,
      poId: po.po_id,
      poStatus,
      grnStatus,
    };
  });

  return {
    grnId: result.grn.grn_id.toString(),
    grnNumber: result.grn.grn_number,
    poId: result.poId.toString(),
    poNumber,
    invoiceNumber,
    batchNumber,
    quantity: receivedQty,
    expiryDate: formatDateOnly(expiryDate),
    receivedBy: receivedBy.toString(),
    receivedByName: receiverUser.username,
    grnStatus: result.grnStatus,
    poStatus: result.poStatus,
    receivedDate: formatDateOnly(now),
  };
}

export async function getPurchaseStockItemsList(prisma, tenantId, query = {}) {
  const tenant = BigInt(tenantId);
  const search = query.search?.trim();
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Number(query.limit || 10));
  const skip = (page - 1) * limit;

  const whereParts = [
    Prisma.sql`ps.tenant_id = ${tenant}`,
  ];

  if (search) {
    const searchLike = `%${search}%`;
    whereParts.push(
      Prisma.sql`(
        d.drug_name ILIKE ${searchLike}
        OR d.drug_code ILIKE ${searchLike}
        OR ps.batch_number ILIKE ${searchLike}
      )`,
    );
  }

  const whereSql = Prisma.join(whereParts, " AND ");

  const totalRows = await prisma.$queryRaw`
    SELECT COUNT(*)::BIGINT AS total
    FROM pharmacy_stock ps
    INNER JOIN drugs d
      ON d.drug_id = ps.drug_id
      AND d.tenant_id = ps.tenant_id
    WHERE ${whereSql};
  `;

  const rows = await prisma.$queryRaw`
    SELECT
      ps.stock_id,
      ps.drug_id,
      d.drug_code,
      d.drug_name,
      ps.batch_number,
      ps.expiry_date,
      ps.quantity_available,
      ps.unit_price,
      ps.location
    FROM pharmacy_stock ps
    INNER JOIN drugs d
      ON d.drug_id = ps.drug_id
      AND d.tenant_id = ps.tenant_id
    WHERE ${whereSql}
    ORDER BY ps.updated_at DESC NULLS LAST, ps.created_at DESC NULLS LAST, ps.stock_id DESC
    OFFSET ${skip}
    LIMIT ${limit};
  `;

  const totalRecords = Number(totalRows[0]?.total || 0);
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

  return {
    totalRecords,
    totalPages,
    currentPage: page,
    pageSize: limit,
    data: rows.map((row) => ({
      stockId: row.stock_id.toString(),
      drugId: String(row.drug_id),
      drugCode: row.drug_code,
      drugName: row.drug_name,
      batchNumber: row.batch_number,
      expiryDate: formatDateOnly(row.expiry_date),
      quantityAvailable: Number(row.quantity_available || 0),
      unitPrice: toSafeNumber(row.unit_price),
      location: row.location || null,
    })),
  };
}

export async function getSupplierFilterList(prisma, tenantId, query = {}) {
  const tenant = BigInt(tenantId);
  const search = query.search?.trim();

  let rows = [];
  if (prisma.suppliers && typeof prisma.suppliers.findMany === "function") {
    rows = await prisma.suppliers.findMany({
      where: {
        tenant_id: tenant,
        is_active: true,
        ...(search
          ? {
            OR: [
              { supplier_name: { contains: search, mode: "insensitive" } },
              { supplier_code: { contains: search, mode: "insensitive" } },
            ],
          }
          : {}),
      },
      orderBy: [{ supplier_name: "asc" }],
      select: {
        supplier_id: true,
        supplier_code: true,
        supplier_name: true,
        status: true,
      },
    });
  } else {
    const whereParts = [
      Prisma.sql`tenant_id = ${tenant}`,
      Prisma.sql`is_active = TRUE`,
    ];
    if (search) {
      const searchLike = `%${search}%`;
      whereParts.push(
        Prisma.sql`(
          supplier_name ILIKE ${searchLike}
          OR supplier_code ILIKE ${searchLike}
        )`,
      );
    }
    const whereSql = Prisma.join(whereParts, " AND ");

    rows = await prisma.$queryRaw`
      SELECT supplier_id, supplier_code, supplier_name, status
      FROM suppliers
      WHERE ${whereSql}
      ORDER BY supplier_name ASC;
    `;
  }

  return {
    total: rows.length,
    data: rows.map((row) => ({
      supplierId: row.supplier_id.toString(),
      supplierCode: row.supplier_code,
      supplierName: row.supplier_name,
      status: row.status ? String(row.status) : null,
    })),
  };
}

export async function getGrnList(prisma, tenantId, query = {}) {
  const tenant = BigInt(tenantId);
  const search = query.search?.trim();
  const status = query.status && query.status !== "all" ? query.status : null;
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Number(query.limit || 10));
  const skip = (page - 1) * limit;

  let supplierId = null;
  if (query.supplierId !== undefined && query.supplierId !== null) {
    supplierId = parseBigIntSearch(String(query.supplierId).trim());
    if (supplierId === null) {
      throw createHttpError("Invalid supplierId", 400);
    }
  }

  const date = parseDateBoundary(query.date, false);
  if (query.date && !date) {
    throw createHttpError("Invalid date filter. Use YYYY-MM-DD format", 400);
  }
  const dateEnd = date ? parseDateBoundary(query.date, true) : null;

  const where = {
    tenant_id: tenant,
    is_active: true,
  };

  if (status) {
    where.status = status;
  }
  if (supplierId !== null) {
    where.supplier_id = supplierId;
  }
  if (date && dateEnd) {
    where.received_date = {
      gte: date,
      lte: dateEnd,
    };
  }
  if (search) {
    where.OR = [
      { grn_number: { contains: search, mode: "insensitive" } },
      { suppliers: { supplier_name: { contains: search, mode: "insensitive" } } },
      {
        purchase_orders: {
          po_number: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  const canUsePrismaModels =
    prisma.grn &&
    typeof prisma.grn.findMany === "function" &&
    prisma.suppliers &&
    typeof prisma.suppliers.findMany === "function";

  let totalRecords = 0;
  let rows = [];

  if (canUsePrismaModels) {
    const result = await prisma.$transaction([
      prisma.grn.count({ where }),
      prisma.grn.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ received_date: "desc" }, { created_at: "desc" }],
        select: {
          grn_id: true,
          grn_number: true,
          supplier_id: true,
          received_date: true,
          status: true,
          suppliers: {
            select: {
              supplier_name: true,
            },
          },
          purchase_orders: {
            select: {
              po_number: true,
            },
          },
          users_grn_received_byTousers: {
            select: {
              username: true,
            },
          },
        },
      }),
    ]);
    totalRecords = result[0];
    rows = result[1];
  } else {
    const whereParts = [
      Prisma.sql`g.tenant_id = ${tenant}`,
      Prisma.sql`g.is_active = TRUE`,
    ];

    if (status) {
      whereParts.push(Prisma.sql`g.status = ${status}`);
    }
    if (supplierId !== null) {
      whereParts.push(Prisma.sql`g.supplier_id = ${supplierId}`);
    }
    if (date && dateEnd) {
      whereParts.push(Prisma.sql`g.received_date >= ${date}`);
      whereParts.push(Prisma.sql`g.received_date <= ${dateEnd}`);
    }
    if (search) {
      const searchLike = `%${search}%`;
      whereParts.push(
        Prisma.sql`(
          g.grn_number ILIKE ${searchLike}
          OR s.supplier_name ILIKE ${searchLike}
          OR COALESCE(po.po_number, '') ILIKE ${searchLike}
        )`,
      );
    }

    const whereSql = Prisma.join(whereParts, " AND ");

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*)::BIGINT AS total
      FROM grn g
      INNER JOIN suppliers s
        ON s.supplier_id = g.supplier_id
        AND s.tenant_id = g.tenant_id
      INNER JOIN purchase_orders po
        ON po.po_id = g.po_id
        AND po.tenant_id = g.tenant_id
      WHERE ${whereSql};
    `;

    rows = await prisma.$queryRaw`
      SELECT
        g.grn_id,
        g.grn_number,
        g.supplier_id,
        g.received_date,
        g.status,
        s.supplier_name,
        po.po_number,
        u.username AS received_by_username
      FROM grn g
      INNER JOIN suppliers s
        ON s.supplier_id = g.supplier_id
        AND s.tenant_id = g.tenant_id
      INNER JOIN purchase_orders po
        ON po.po_id = g.po_id
        AND po.tenant_id = g.tenant_id
      LEFT JOIN users u
        ON u.user_id = g.received_by
      WHERE ${whereSql}
      ORDER BY g.received_date DESC, g.created_at DESC
      OFFSET ${skip}
      LIMIT ${limit};
    `;

    totalRecords = Number(totalRows[0]?.total || 0);
    rows = rows.map((row) => ({
      grn_id: row.grn_id,
      grn_number: row.grn_number,
      supplier_id: row.supplier_id,
      received_date: row.received_date,
      status: row.status,
      suppliers: { supplier_name: row.supplier_name },
      purchase_orders: { po_number: row.po_number },
      users_grn_received_byTousers: {
        username: row.received_by_username,
      },
    }));
  }

  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

  return {
    totalRecords,
    totalPages,
    currentPage: page,
    pageSize: limit,
    data: rows.map((row) => ({
      grnId: row.grn_id.toString(),
      grnNumber: row.grn_number,
      poRef: row.purchase_orders?.po_number || null,
      supplierId: row.supplier_id.toString(),
      supplierName: row.suppliers?.supplier_name || null,
      receivedDate: row.received_date || null,
      receivedByName: row.users_grn_received_byTousers?.username || null,
      status: row.status ? String(row.status) : null,
    })),
  };
}

export async function getSupplierDirectoryList(prisma, tenantId, query = {}) {
  const tenant = BigInt(tenantId);
  const search = query.search?.trim();
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Number(query.limit || 10));
  const skip = (page - 1) * limit;

  let supplierId = null;
  if (query.supplierId !== undefined && query.supplierId !== null) {
    supplierId = parseBigIntSearch(String(query.supplierId).trim());
    if (supplierId === null) {
      throw createHttpError("Invalid supplierId", 400);
    }
  }

  const dateFrom = parseDateBoundary(query.date, false);
  const dateTo = parseDateBoundary(query.date, true);
  if (query.date && (!dateFrom || !dateTo)) {
    throw createHttpError("Invalid date filter. Use YYYY-MM-DD format", 400);
  }

  const where = {
    tenant_id: tenant,
    is_active: true,
  };
  if (supplierId !== null) {
    where.supplier_id = supplierId;
  }
  if (search) {
    where.supplier_name = { contains: search, mode: "insensitive" };
  }
  if (dateFrom && dateTo) {
    where.created_at = { gte: dateFrom, lte: dateTo };
  }

  let totalRecords = 0;
  let rows = [];

  if (prisma.suppliers && typeof prisma.suppliers.findMany === "function") {
    const result = await prisma.$transaction([
      prisma.suppliers.count({ where }),
      prisma.suppliers.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ supplier_name: "asc" }],
        select: {
          supplier_id: true,
          supplier_name: true,
          city: true,
          state: true,
          phone: true,
        },
      }),
    ]);
    totalRecords = result[0];
    rows = result[1];
  } else {
    const whereParts = [
      Prisma.sql`tenant_id = ${tenant}`,
      Prisma.sql`is_active = TRUE`,
    ];
    if (supplierId !== null) {
      whereParts.push(Prisma.sql`supplier_id = ${supplierId}`);
    }
    if (search) {
      const searchLike = `%${search}%`;
      whereParts.push(Prisma.sql`supplier_name ILIKE ${searchLike}`);
    }
    if (dateFrom && dateTo) {
      whereParts.push(Prisma.sql`created_at >= ${dateFrom}`);
      whereParts.push(Prisma.sql`created_at <= ${dateTo}`);
    }
    const whereSql = Prisma.join(whereParts, " AND ");

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*)::BIGINT AS total
      FROM suppliers
      WHERE ${whereSql};
    `;
    rows = await prisma.$queryRaw`
      SELECT supplier_id, supplier_name, city, state, phone
      FROM suppliers
      WHERE ${whereSql}
      ORDER BY supplier_name ASC
      OFFSET ${skip}
      LIMIT ${limit};
    `;
    totalRecords = Number(totalRows[0]?.total || 0);
  }

  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

  return {
    totalRecords,
    totalPages,
    currentPage: page,
    pageSize: limit,
    data: rows.map((row) => ({
      supplierId: row.supplier_id.toString(),
      supplierName: row.supplier_name,
      category: null,
      rating: null,
      location: [row.city, row.state].filter(Boolean).join(", ") || null,
      leadTime: null,
      contact: row.phone || null,
    })),
  };
}

export async function getReturnsDamagedList(prisma, tenantId, query = {}) {
  const tenant = BigInt(tenantId);
  const search = query.search?.trim();
  const status = query.status && query.status !== "all" ? query.status : null;
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Number(query.limit || 10));
  const skip = (page - 1) * limit;

  let supplierId = null;
  if (query.supplierId !== undefined && query.supplierId !== null) {
    supplierId = parseBigIntSearch(String(query.supplierId).trim());
    if (supplierId === null) {
      throw createHttpError("Invalid supplierId", 400);
    }
  }

  const dateFrom = parseDateBoundary(query.date, false);
  const dateTo = parseDateBoundary(query.date, true);
  if (query.date && (!dateFrom || !dateTo)) {
    throw createHttpError("Invalid date filter. Use YYYY-MM-DD format", 400);
  }

  const where = {
    tenant_id: tenant,
    transaction_type: "return",
  };

  if (status) {
    where.status = status;
  }
  if (supplierId !== null) {
    where.supplier_id = supplierId;
  }
  if (dateFrom && dateTo) {
    where.transaction_date = { gte: dateFrom, lte: dateTo };
  }
  if (search) {
    const parsedReturnId = parseBigIntSearch(search.replace(/\D/g, ""));
    where.OR = [
      { reference_number: { contains: search, mode: "insensitive" } },
      {
        suppliers: {
          supplier_name: { contains: search, mode: "insensitive" },
        },
      },
    ];
    if (parsedReturnId !== null) {
      where.OR.push({ return_id: parsedReturnId });
    }
  }

  const canUsePrismaModel =
    prisma.inventory_transactions &&
    typeof prisma.inventory_transactions.findMany === "function";

  let totalRecords = 0;
  let rows = [];
  let fallbackToRawSql = !canUsePrismaModel;

  if (canUsePrismaModel) {
    try {
      const result = await prisma.$transaction([
        prisma.inventory_transactions.count({ where }),
        prisma.inventory_transactions.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ transaction_date: "desc" }, { created_at: "desc" }],
          select: {
            transaction_id: true,
            return_id: true,
            quantity: true,
            reason: true,
            status: true,
            transaction_date: true,
            reference_number: true,
            inventory_items: {
              select: {
                item_name: true,
              },
            },
            suppliers: {
              select: {
                supplier_id: true,
                supplier_name: true,
              },
            },
          },
        }),
      ]);
      totalRecords = result[0];
      rows = result[1];
    } catch (error) {
      const message = String(error?.message || "");
      const shouldFallback =
        message.includes("Unknown argument `status`") ||
        message.includes("Unknown argument `supplier_id`") ||
        message.includes("Unknown argument `return_id`") ||
        message.includes("Unknown argument `suppliers`") ||
        message.includes("Unknown field `return_id`") ||
        message.includes("Unknown field `status`") ||
        message.includes("Unknown field `supplier_id`") ||
        message.includes("Unknown field `suppliers`");

      if (!shouldFallback) {
        throw error;
      }
      fallbackToRawSql = true;
    }
  }

  if (fallbackToRawSql) {
    const whereParts = [
      Prisma.sql`it.tenant_id = ${tenant}`,
      Prisma.sql`it.transaction_type = 'return'`,
    ];

    if (status) {
      whereParts.push(Prisma.sql`it.status = ${status}`);
    }
    if (supplierId !== null) {
      whereParts.push(Prisma.sql`it.supplier_id = ${supplierId}`);
    }
    if (dateFrom && dateTo) {
      whereParts.push(Prisma.sql`it.transaction_date >= ${dateFrom}`);
      whereParts.push(Prisma.sql`it.transaction_date <= ${dateTo}`);
    }
    if (search) {
      const searchLike = `%${search}%`;
      const parsedReturnId = parseBigIntSearch(search.replace(/\D/g, ""));
      if (parsedReturnId !== null) {
        whereParts.push(
          Prisma.sql`(
            it.reference_number ILIKE ${searchLike}
            OR COALESCE(s.supplier_name, '') ILIKE ${searchLike}
            OR it.return_id = ${parsedReturnId}
          )`,
        );
      } else {
        whereParts.push(
          Prisma.sql`(
            it.reference_number ILIKE ${searchLike}
            OR COALESCE(s.supplier_name, '') ILIKE ${searchLike}
          )`,
        );
      }
    }

    const whereSql = Prisma.join(whereParts, " AND ");

    const totalRows = await prisma.$queryRaw`
      SELECT COUNT(*)::BIGINT AS total
      FROM inventory_transactions it
      INNER JOIN inventory_items ii
        ON ii.item_id = it.item_id
        AND ii.tenant_id = it.tenant_id
      LEFT JOIN suppliers s
        ON s.supplier_id = it.supplier_id
        AND s.tenant_id = it.tenant_id
      WHERE ${whereSql};
    `;

    rows = await prisma.$queryRaw`
      SELECT
        it.transaction_id,
        it.return_id,
        it.quantity,
        it.reason,
        it.status,
        it.transaction_date,
        it.reference_number,
        ii.item_name,
        s.supplier_id,
        s.supplier_name
      FROM inventory_transactions it
      INNER JOIN inventory_items ii
        ON ii.item_id = it.item_id
        AND ii.tenant_id = it.tenant_id
      LEFT JOIN suppliers s
        ON s.supplier_id = it.supplier_id
        AND s.tenant_id = it.tenant_id
      WHERE ${whereSql}
      ORDER BY it.transaction_date DESC, it.created_at DESC
      OFFSET ${skip}
      LIMIT ${limit};
    `;

    totalRecords = Number(totalRows[0]?.total || 0);
    rows = rows.map((row) => ({
      transaction_id: row.transaction_id,
      return_id: row.return_id,
      quantity: row.quantity,
      reason: row.reason,
      status: row.status,
      transaction_date: row.transaction_date,
      reference_number: row.reference_number,
      inventory_items: {
        item_name: row.item_name,
      },
      suppliers: row.supplier_id
        ? {
          supplier_id: row.supplier_id,
          supplier_name: row.supplier_name,
        }
        : null,
    }));
  }

  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

  return {
    totalRecords,
    totalPages,
    currentPage: page,
    pageSize: limit,
    data: rows.map((row) => {
      let returnId = row.reference_number || null;
      if (!returnId && row.return_id !== null && row.return_id !== undefined) {
        returnId = `RET-${row.return_id}`;
      }
      if (!returnId) {
        returnId = `RET-${row.transaction_id}`;
      }

      return {
        transactionId: row.transaction_id.toString(),
        returnId,
        item: row.inventory_items?.item_name || null,
        supplierId: row.suppliers?.supplier_id?.toString() || null,
        supplierName: row.suppliers?.supplier_name || null,
        reason: row.reason || null,
        qty: Number(row.quantity || 0),
        status: row.status ? String(row.status) : null,
        date: row.transaction_date || null,
      };
    }),
  };
}
