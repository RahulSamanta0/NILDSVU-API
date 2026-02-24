/**
 * Schema for GET /security/vendor-logs
 * Returns all vendor logs with formatted data
 */
const getAllVendorLogsSchema = {
  description: 'Get all vendor logs',
  tags: ['Vendor Logs'],
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              vendorName: { type: 'string' },
              company: { type: 'string' },
              contactNumber: { type: 'string' },
              vendorType: { type: 'string' },
              department: { type: 'string' },
              entryTime: { type: 'string' },
              exitTime: { type: 'string' },
              duration: { type: 'string' },
              status: { type: 'string' },
              purpose: { type: 'string' },
              gate: { type: 'string' },
              entry_id: { type: 'string' },
              tenant_id: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

/**
 * Schema for PUT /security/vendor-logs/checkout/:passNumber
 * Checkout a vendor and record exit time
 */
const checkoutVendorSchema = {
  description: 'Checkout vendor',
  tags: ['Vendor Logs'],
  security: [{ bearerAuth: [] }],
  params: {
    type: 'object',
    required: ['passNumber'],
    properties: {
      passNumber: { 
        type: 'string',
        description: 'Vendor pass number (e.g., VND-1234567890123)',
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: { type: 'object' },
      },
    },
    400: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' },
      },
    },
    404: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        error: { type: 'string' },
      },
    },
  },
};

/**
 * Schema for GET /security/vendor-logs/dashboard-stats
 * Get vendor dashboard statistics
 */
const getVendorDashboardStatsSchema = {
  description: 'Get vendor dashboard statistics',
  tags: ['Vendor Logs'],
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            vendorsInside: { type: 'string' },
            totalEntriesToday: { type: 'string' },
            completedVisits: { type: 'string' },
            overstays: { type: 'string' },
          },
        },
      },
    },
  },
};

export default {
  getAllVendorLogsSchema,
  checkoutVendorSchema,
  getVendorDashboardStatsSchema,
};
