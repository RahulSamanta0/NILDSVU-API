const purchaseOrderStatusEnum = [
  "all",
  "draft",
  "pending_approval",
  "approved",
  "partially_received",
  "received",
  "cancelled",
  "closed",
];

const grnStatusEnum = [
  "all",
  "draft",
  "pending_qc",
  "accepted",
  "partial_accept",
  "rejected",
  "cancelled",
];
const returnStatusEnum = [
  "all",
  "awaiting_pickup",
  "picked_up",
  "rejected",
  "completed",
];

export const getPurchaseOrdersSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: { type: "string", minLength: 1, maxLength: 100 },
      supplierId: { type: "string", minLength: 1, maxLength: 30 },
      status: {
        type: "string",
        enum: purchaseOrderStatusEnum,
        default: "all",
      },
      date: { type: "string", format: "date" },
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
              poId: { type: "string" },
              poNumber: { type: "string" },
              supplierId: { type: "string" },
              supplierName: { type: ["string", "null"] },
              items: { type: "integer" },
              totalAmount: { type: ["number", "null"] },
              date: { type: ["string", "null"], format: "date-time" },
              status: { type: ["string", "null"] },
            },
          },
        },
      },
    },
  },
};

export const createPurchaseOrderSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["supplierId", "expectedDeliveryDate", "items"],
    properties: {
      supplierId: { type: "integer", minimum: 1 },
      poDate: { type: "string", format: "date" },
      expectedDeliveryDate: { type: "string", format: "date" },
      subtotalAmount: { type: "number", minimum: 0 },
      taxAmount: { type: "number", minimum: 0 },
      discountAmount: { type: "number", minimum: 0 },
      totalAmount: { type: "number", minimum: 0 },
      remarks: { type: "string", minLength: 1, maxLength: 2000 },
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["drugId", "quantity", "unitPrice"],
          properties: {
            drugId: { type: "integer", minimum: 1 },
            quantity: { type: "integer", minimum: 1 },
            unitPrice: { type: "number", exclusiveMinimum: 0 },
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
            expectedDeliveryDate: { type: "string", format: "date" },
            status: { type: "string" },
            itemsCount: { type: "integer" },
            subtotalAmount: { type: "number" },
            taxAmount: { type: "number" },
            discountAmount: { type: "number" },
            totalAmount: { type: "number" },
            remarks: { type: ["string", "null"] },
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

export const getPendingPurchaseOrdersSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: { type: "string", minLength: 1, maxLength: 100 },
      poNumber: { type: "string", minLength: 1, maxLength: 100 },
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
              poId: { type: "string" },
              poNumber: { type: "string" },
              supplierId: { type: "string" },
              supplierName: { type: ["string", "null"] },
              totalAmount: { type: ["number", "null"] },
              date: { type: ["string", "null"], format: "date-time" },
              status: { type: ["string", "null"] },
            },
          },
        },
      },
    },
  },
};

export const getPoReceiptDetailsSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    required: ["poNumber"],
    properties: {
      poNumber: { type: "string", minLength: 1, maxLength: 100 },
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
            poId: { type: "string" },
            poNumber: { type: "string" },
            supplierId: { type: "string" },
            supplierName: { type: ["string", "null"] },
            invoiceNumber: { type: ["string", "null"] },
            batchNumber: { type: ["string", "null"] },
            quantity: { type: "integer" },
            expiryDate: { type: ["string", "null"], format: "date" },
            status: { type: ["string", "null"] },
          },
        },
      },
    },
  },
};

export const confirmPoReceiptSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["poNumber", "invoiceNumber", "quantity", "batchNumber", "expiryDate", "receivedByName"],
    properties: {
      poNumber: { type: "string", minLength: 1, maxLength: 100 },
      invoiceNumber: { type: "string", minLength: 1, maxLength: 100 },
      quantity: { type: "integer", minimum: 1 },
      batchNumber: { type: "string", minLength: 1, maxLength: 100 },
      expiryDate: { type: "string", format: "date" },
      receivedByName: { type: "string", minLength: 1, maxLength: 100 },
      receivedByRemark: { type: "string", minLength: 1, maxLength: 1000 },
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
            grnId: { type: "string" },
            grnNumber: { type: "string" },
            poId: { type: "string" },
            poNumber: { type: "string" },
            invoiceNumber: { type: "string" },
            batchNumber: { type: "string" },
            quantity: { type: "integer" },
            expiryDate: { type: "string", format: "date" },
            receivedBy: { type: "string" },
            receivedByName: { type: "string" },
            grnStatus: { type: "string" },
            poStatus: { type: "string" },
            receivedDate: { type: "string", format: "date" },
          },
        },
      },
    },
  },
};

export const getGrnListSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: { type: "string", minLength: 1, maxLength: 100 },
      date: { type: "string", format: "date" },
      supplierId: { type: "string", minLength: 1, maxLength: 30 },
      status: {
        type: "string",
        enum: grnStatusEnum,
        default: "all",
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
              grnId: { type: "string" },
              grnNumber: { type: "string" },
              poRef: { type: ["string", "null"] },
              supplierId: { type: "string" },
              supplierName: { type: ["string", "null"] },
              receivedDate: { type: ["string", "null"], format: "date-time" },
              receivedByName: { type: ["string", "null"] },
              status: { type: ["string", "null"] },
            },
          },
        },
      },
    },
  },
};

export const getSuppliersForFilterSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: { type: "string", minLength: 1, maxLength: 100 },
    },
  },
  response: {
    200: {
      type: "object",
      additionalProperties: false,
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        total: { type: "integer" },
        data: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              supplierId: { type: "string" },
              supplierCode: { type: "string" },
              supplierName: { type: "string" },
              status: { type: ["string", "null"] },
            },
          },
        },
      },
    },
  },
};

export const getSupplierDirectorySchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: { type: "string", minLength: 1, maxLength: 100 },
      date: { type: "string", format: "date" },
      supplierId: { type: "string", minLength: 1, maxLength: 30 },
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
              supplierId: { type: "string" },
              supplierName: { type: "string" },
              category: { type: ["string", "null"] },
              rating: { type: ["number", "null"] },
              location: { type: ["string", "null"] },
              leadTime: { type: ["string", "null"] },
              contact: { type: ["string", "null"] },
            },
          },
        },
      },
    },
  },
};

export const getReturnsDamagedListSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: { type: "string", minLength: 1, maxLength: 100 },
      date: { type: "string", format: "date" },
      supplierId: { type: "string", minLength: 1, maxLength: 30 },
      status: {
        type: "string",
        enum: returnStatusEnum,
        default: "all",
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
              transactionId: { type: "string" },
              returnId: { type: "string" },
              item: { type: ["string", "null"] },
              supplierId: { type: ["string", "null"] },
              supplierName: { type: ["string", "null"] },
              reason: { type: ["string", "null"] },
              qty: { type: "integer" },
              status: { type: ["string", "null"] },
              date: { type: ["string", "null"], format: "date-time" },
            },
          },
        },
      },
    },
  },
};

export const getPurchaseStockItemsSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: { type: "string", minLength: 1, maxLength: 100 },
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
              stockId: { type: "string" },
              drugId: { type: "string" },
              drugCode: { type: "string" },
              drugName: { type: "string" },
              batchNumber: { type: "string" },
              expiryDate: { type: ["string", "null"], format: "date" },
              quantityAvailable: { type: "integer" },
              unitPrice: { type: ["number", "null"] },
              location: { type: ["string", "null"] },
            },
          },
        },
      },
    },
  },
};
