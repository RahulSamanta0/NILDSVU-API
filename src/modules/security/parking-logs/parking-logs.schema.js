/**
 * Schema for POST /security/parking-logs/entry
 * Create a new parking entry
 */
const createParkingEntrySchema = {
  description: 'Create new parking entry',
  tags: ['Parking Logs'],
  security: [{ bearerAuth: [] }],
  body: {
    type: 'object',
    required: ['vehicleNumber', 'vehicleType', 'driverName', 'parkingSlot'],
    properties: {
      vehicleNumber: { 
        type: 'string',
        description: 'Vehicle registration number',
        maxLength: 50,
      },
      vehicleType: { 
        type: 'string',
        description: 'Type of vehicle (e.g., Car, Bike, Truck)',
        maxLength: 50,
      },
      driverName: { 
        type: 'string',
        description: 'Driver name',
        maxLength: 100,
      },
      parkingSlot: { 
        type: 'string',
        description: 'Assigned parking slot number',
        maxLength: 50,
      },
    },
  },
  response: {
    201: {
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
  },
};

/**
 * Schema for GET /security/parking-logs
 * Get all parked vehicles
 */
const getAllParkedVehiclesSchema = {
  description: 'Get all parked vehicles',
  tags: ['Parking Logs'],
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
              entry_id: { type: 'string' },
              number: { type: 'string' },
              type: { type: 'string' },
              driver: { type: 'string' },
              slot: { type: 'string' },
              entryTime: { type: 'string' },
              duration: { type: 'string' },
              status: { type: 'string' },
              tenant_id: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

/**
 * Schema for GET /security/parking-logs/stats
 * Get parking dashboard statistics
 */
const getParkingStatsSchema = {
  description: 'Get parking dashboard statistics',
  tags: ['Parking Logs'],
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            occupied: { type: 'number' },
            available: { type: 'number' },
            reserved: { type: 'number' },
          },
        },
      },
    },
  },
};

export default {
  createParkingEntrySchema,
  getAllParkedVehiclesSchema,
  getParkingStatsSchema,
};
