export const getAvailableAmbulancesSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: { type: "string", minLength: 1, maxLength: 100 },
      facility_id: { type: "integer", minimum: 1 },
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
              ambulance_id: { type: "integer" },
              vehicle_number: { type: "string" },
              vehicle_type: { type: "string" },
              type_label: { type: "string" },
              label: { type: "string" },
            },
          },
        },
      },
    },
  },
};

export const getAmbulanceDashboardCountsSchema = {
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
            pending_assignment: { type: "integer" },
            active_trips: { type: "integer" },
            trips_completed_today: { type: "integer" },
            cancelled_trip: { type: "integer" },
          },
        },
        meta: {
          type: "object",
          additionalProperties: false,
          properties: {
            from: { type: "string" },
            to: { type: "string" },
          },
        },
      },
    },
  },
};

export const getAvailableDriversSchema = {
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
              driver_id: { type: "integer" },
              full_name: { type: "string" },
            },
          },
        },
      },
    },
  },
};

export const cancelAmbulanceCallSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["call_id", "cancellation_reason"],
    properties: {
      call_id: { type: "integer", minimum: 1 },
      cancellation_reason: { type: "string", minLength: 1, maxLength: 500 },
      additional_remarks: { type: "string", minLength: 1, maxLength: 1000 },
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
            call_id: { type: "integer" },
            call_number: { type: "string" },
            call_status: { type: "string" },
            cancellation_reason: { type: "string" },
            additional_remarks: { type: ["string", "null"] },
            trip_id: { type: ["integer", "null"] },
            trip_status: { type: ["string", "null"] },
            cancelled_at: { type: "string" },
          },
        },
      },
    },
  },
};

export const assignAmbulanceSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: [
      "call_id",
      "ambulance_id",
      "driver_id",
      "dispatch_time",
      "estimated_arrival_time",
    ],
    properties: {
      call_id: { type: "integer", minimum: 1 },
      ambulance_id: { type: "integer", minimum: 1 },
      ambulance_name: { type: "string", minLength: 1, maxLength: 150 },
      driver_id: { type: "integer", minimum: 1 },
      driver_name: { type: "string", minLength: 1, maxLength: 150 },
      dispatch_time: { type: "string", format: "date-time" },
      estimated_arrival_time: { type: "string", format: "date-time" },
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
            call_id: { type: "integer" },
            call_number: { type: "string" },
            ambulance_id: { type: "integer" },
            ambulance_name: { type: "string" },
            driver_id: { type: "integer" },
            driver_name: { type: "string" },
            dispatch_time: { type: ["string", "null"] },
            estimated_arrival_time: { type: ["string", "null"] },
            trip_id: { type: "integer" },
            trip_status: { type: "string" },
            call_status: { type: "string" },
          },
        },
      },
    },
  },
};

export const listAmbulanceCallsSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      page: { type: "integer", minimum: 1, default: 1 },
      pageSize: { type: "integer", minimum: 1, maximum: 100, default: 10 },
      search: { type: "string", minLength: 1, maxLength: 100 },
      tab: {
        type: "string",
        enum: ["requested", "in_progress", "completed", "cancelled", "all"],
      },
      status: {
        type: "string",
        enum: ["pending", "assigned", "completed", "cancelled", "all"],
      },
      from_date: { type: "string", format: "date" },
      to_date: { type: "string", format: "date" },
      type: {
        type: "string",
        enum: ["emergency", "scheduled", "transfer", "non-patient", "non_patient"],
      },
      types: { type: "string", minLength: 1, maxLength: 100 },
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
              status: { type: "string" },
            },
          },
        },
        data: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              call_id: { type: "integer" },
              call_number: { type: "string" },
              patient_id: { type: ["integer", "null"] },
              patient_name: { type: ["string", "null"] },
              patient_uhid: { type: ["string", "null"] },
              pickup_location: { type: "string" },
              drop_location: { type: "string" },
              call_type: { type: "string" },
              priority: { type: ["string", "null"] },
              db_priority: { type: ["string", "null"] },
              status: { type: "string" },
              latest_trip_status: { type: ["string", "null"] },
              trip_id: { type: ["integer", "null"] },
              requested_by: { type: ["integer", "null"] },
              created_at: { type: ["string", "null"] },
              trip_details: {
                type: "object",
                additionalProperties: false,
                properties: {
                  call_number: { type: "string" },
                  call_time: { type: ["string", "null"] },
                },
              },
              patient_info: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: ["string", "null"] },
                  upid: { type: ["string", "null"] },
                },
              },
              route: {
                type: "object",
                additionalProperties: false,
                properties: {
                  pickup: { type: "string" },
                  drop: { type: "string" },
                },
              },
              type: { type: "string" },
            },
          },
        },
      },
    },
  },
};
