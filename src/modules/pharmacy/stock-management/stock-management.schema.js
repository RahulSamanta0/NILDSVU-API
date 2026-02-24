
export const createPurchaseOrderSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["supplier_id", "po_date", "items"],
    properties: {
      supplier_id: { type: "integer", minimum: 1 },
      po_date: { type: "string", format: "date" },
      expected_delivery_date: { type: "string", format: "date" },
      notes: { type: "string", minLength: 1, maxLength: 2000 },
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["drug_id", "drug_name", "quantity", "unit_price"],
          properties: {
            drug_id: { type: "integer", minimum: 1 },
            drug_name: { type: "string", minLength: 1, maxLength: 255 },
            quantity: { type: "integer", minimum: 1 },
            unit_price: { type: "number", exclusiveMinimum: 0 },
          },
        },
      },
    },
  },
  response: {
    201: {
      type: "object",
      additionalProperties: false,
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: {
          type: "object",
          additionalProperties: false,
          properties: {
            poId: { type: "string" },
            poNumber: { type: "string" },
            supplierId: { type: "string" },
            poDate: { type: "string", format: "date" },
            expectedDeliveryDate: {
              type: ["string", "null"],
              format: "date",
            },
            status: { type: "string" },
            itemsCount: { type: "integer" },
            subtotalAmount: { type: "number" },
            taxAmount: { type: "number" },
            discountAmount: { type: "number" },
            totalAmount: { type: "number" },
            notes: { type: ["string", "null"] },
            createdBy: { type: "string" },
            createdAt: { type: ["string", "null"], format: "date-time" },
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  poItemId: { type: "string" },
                  drugId: { type: "string" },
                  drugName: { type: "string" },
                  quantity: { type: "integer" },
                  unitPrice: { type: "number" },
                  totalPrice: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const updateExistingMedicineQuantitySchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["drugId", "drugName", "batchNumber", "quantity"],
    properties: {
      drugId: { type: "integer", minimum: 1 },
      drugName: { type: "string", minLength: 1, maxLength: 255 },
      batchNumber: { type: "string", minLength: 1, maxLength: 100 },
      quantity: { type: "integer", minimum: 1 },
    },
  },
  response: {
    200: {
      type: "object",
      additionalProperties: false,
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: {
          type: "object",
          additionalProperties: false,
          properties: {
            stockId: { type: "string" },
            drugId: { type: "string" },
            drugName: { type: "string" },
            batchNumber: { type: "string" },
            previousQuantity: { type: "integer" },
            addedQuantity: { type: "integer" },
            newQuantity: { type: "integer" },
            updatedAt: { type: ["string", "null"], format: "date-time" },
          },
        },
      },
    },
  },
};

export const getStockInventoryListSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: { type: "string", minLength: 1, maxLength: 100 },
      status: {
        type: "string",
        enum: ["all", "current_stock", "out_of_stock", "expiry_soon"],
        default: "current_stock",
      },
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    },
  },
  response: {
    200: {
      type: "object",
      additionalProperties: false,
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        totalRecords: { type: "integer" },
        totalPages: { type: "integer" },
        currentPage: { type: "integer" },
        pageSize: { type: "integer" },
        data: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              drugId: { type: "string" },
              drugCode: { type: "string" },
              drugName: { type: "string" },
              batchNumber: { type: ["string", "null"] },
              quantity: { type: "integer" },
              unitPrice: { type: ["number", "null"] },
              location: { type: ["string", "null"] },
              supplierId: { type: ["string", "null"] },
              supplierName: { type: ["string", "null"] },
              status: {
                type: "string",
                enum: ["current_stock", "out_of_stock", "expiry_soon"],
              },
            },
          },
        },
      },
    },
  },
};

export const getStockStatusCountsSchema = {
  response: {
    200: {
      type: "object",
      additionalProperties: false,
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: {
          type: "object",
          additionalProperties: false,
          properties: {
            currentStock: { type: "integer" },
            outOfStock: { type: "integer" },
            expirySoon: { type: "integer" },
          },
        },
      },
    },
  },
};
