export const listTripLogsSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      page: { type: "integer", minimum: 1, default: 1 },
      pageSize: { type: "integer", minimum: 1, maximum: 100, default: 10 },
      search: { type: "string", minLength: 1, maxLength: 100 },
      tab: {
        type: "string",
        enum: ["incoming", "outgoing", "non_patient", "all"],
      },
      call_type: {
        type: "string",
        enum: ["emergency", "scheduled", "transfer", "non-patient", "non_patient"],
      },
      call_types: { type: "string", minLength: 1, maxLength: 100 },
      priority: {
        type: "string",
        enum: ["critical", "high", "normal", "emergency", "urgent"],
      },
      priorities: { type: "string", minLength: 1, maxLength: 100 },
    },
  },
  response: {
    200: {
      type: "object",
      additionalProperties: false,
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        page: { type: "integer" },
        pageSize: { type: "integer" },
        total: { type: "integer" },
        totalPages: { type: "integer" },
        tabs: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              key: { type: "string" },
              label: { type: "string" },
            },
          },
        },
        data: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              trip_id: { type: ["integer", "null"] },
              vehicle_id: { type: ["integer", "null"] },
              vehicle_type: { type: ["string", "null"] },
              vehicle_number: { type: ["string", "null"] },
              driver_id: { type: ["integer", "null"] },
              driver_name: { type: ["string", "null"] },
              call_id: { type: ["integer", "null"] },
              start_point: { type: ["string", "null"] },
              end_point: { type: ["string", "null"] },
              start_time: { type: ["string", "null"] },
              end_time: { type: ["string", "null"] },
              status: { type: "string" },
              call_type: { type: ["string", "null"] },
              priority: { type: ["string", "null"] },
            },
          },
        },
      },
    },
  },
};

export const getTripDashboardSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      endDate: { type: "string", format: "date" },
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
            dateRange: {
              type: "object",
              additionalProperties: false,
              properties: {
                startDate: { type: "string", format: "date" },
                endDate: { type: "string", format: "date" },
              },
            },
            summary: {
              type: "object",
              additionalProperties: false,
              properties: {
                totalTripsToday: { type: "integer" },
                activeTrips: { type: "integer" },
              },
            },
            trend: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  date: { type: "string", format: "date" },
                  day: { type: "string" },
                  incoming: { type: "integer" },
                  outgoing: { type: "integer" },
                },
              },
            },
          },
        },
      },
    },
  },
};
