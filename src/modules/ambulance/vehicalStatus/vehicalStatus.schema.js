export const getVehicleTypesSchema = {
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
              value: { type: "string" },
              label: { type: "string" },
            },
          },
        },
      },
    },
  },
};

export const getStatusTypesSchema = {
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
              value: { type: "string" },
              label: { type: "string" },
            },
          },
        },
      },
    },
  },
};

export const createAmbulanceSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["vehicleRegNumber", "vehicleType", "driverName", "initialStatus"],
    properties: {
      vehicleRegNumber: { type: "string", minLength: 3, maxLength: 50 },
      vehicleType: {
        type: "string",
        enum: ["als", "bls", "patient_transport", "icu", "neonatal"],
      },
      driverName: { type: "string", minLength: 2, maxLength: 100 },
      initialStatus: {
        type: "string",
        enum: ["available", "on_trip", "maintenance", "reserved", "inactive"],
      },
      equipmentNotes: { type: "string", minLength: 1, maxLength: 1000 },
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
            ambulanceId: { type: "string" },
            vehicleRegNumber: { type: "string" },
            vehicleType: { type: "string" },
            driverId: { type: "string" },
            driverName: { type: "string" },
            initialStatus: { type: "string" },
            equipmentNotes: { type: ["string", "null"] },
            createdAt: { type: ["string", "null"], format: "date-time" },
          },
        },
      },
    },
  },
};

export const getAmbulanceStatusCountsSchema = {
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
            available: { type: "integer" },
            onTrip: { type: "integer" },
            maintenance: { type: "integer" },
            reserved: { type: "integer" },
            inactive: { type: "integer" },
            total: { type: "integer" },
          },
        },
      },
    },
  },
};

export const getFleetUtilizationDailySchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      date: { type: "string", format: "date" },
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
            date: { type: "string", format: "date" },
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  vehicleId: { type: "string" },
                  vehicleRegNumber: { type: "string" },
                  hoursUsed: { type: "number" },
                  tripsCount: { type: "integer" },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const getVehicleDashboardSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      date: { type: "string", format: "date" },
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
            counts: {
              type: "object",
              additionalProperties: false,
              properties: {
                available: { type: "integer" },
                onTrip: { type: "integer" },
                maintenance: { type: "integer" },
                reserved: { type: "integer" },
                inactive: { type: "integer" },
                total: { type: "integer" },
              },
            },
            fleetUtilization: {
              type: "object",
              additionalProperties: false,
              properties: {
                date: { type: "string", format: "date" },
                items: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      vehicleId: { type: "string" },
                      vehicleRegNumber: { type: "string" },
                      hoursUsed: { type: "number" },
                      tripsCount: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const getAmbulanceInventorySchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: { type: "string", minLength: 1, maxLength: 100 },
      fromDate: { type: "string", format: "date" },
      toDate: { type: "string", format: "date" },
      vehicleType: {
        type: "string",
        enum: ["all", "als", "bls", "patient_transport", "icu", "neonatal"],
      },
      status: {
        type: "string",
        enum: ["all", "available", "on_trip", "maintenance", "reserved", "inactive"],
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
        fromDate: { type: "string", format: "date" },
        toDate: { type: "string", format: "date" },
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
              vehicleId: { type: "string" },
              vehicleRegNumber: { type: "string" },
              vehicleType: { type: "string" },
              vehicleTypeLabel: { type: "string" },
              currentStatus: { type: "string" },
              currentStatusLabel: { type: "string" },
              locationOrReason: { type: ["string", "null"] },
              hoursUsed: { type: "number" },
              tripsCount: { type: "integer" },
              lastUpdate: { type: ["string", "null"], format: "date-time" },
            },
          },
        },
      },
    },
  },
};

export const updateAmbulanceStatusSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["vehicleRegNumber", "changeStatusTo", "statusChangeTime"],
    properties: {
      vehicleRegNumber: { type: "string", minLength: 3, maxLength: 50 },
      changeStatusTo: {
        type: "string",
        enum: ["available", "on_trip", "maintenance", "reserved", "inactive"],
      },
      statusChangeTime: { type: "string", format: "date-time" },
      reason: { type: "string", minLength: 1, maxLength: 500 },
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
            statusId: { type: "string" },
            ambulanceId: { type: "string" },
            vehicleRegNumber: { type: "string" },
            previousStatus: { type: ["string", "null"] },
            currentStatus: { type: "string" },
            statusChangeTime: { type: "string", format: "date-time" },
            reason: { type: ["string", "null"] },
            changedBy: { type: "string" },
          },
        },
      },
    },
  },
};
