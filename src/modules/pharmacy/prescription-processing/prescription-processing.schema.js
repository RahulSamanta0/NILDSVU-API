export const getPrescriptionProcessingListSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      tab: {
        type: "string",
        enum: ["queue", "completed", "cancelled"],
        default: "queue",
      },
      status: {
        type: "string",
        enum: ["pending", "processing", "completed", "cancelled"],
      },
      priority: {
        type: "string",
        enum: ["all", "normal", "urgent", "high"],
        default: "all",
      },
      search: { type: "string", minLength: 1, maxLength: 100 },
      token: { type: "string", minLength: 1, maxLength: 30 },
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    },
  },
  response: {
    200: {
      type: "object",
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
            properties: {
              prescriptionId: { type: "string" },
              patientId: { type: "string" },
              patientName: { type: "string" },
              patientUpid: { type: ["string", "null"] },
              doctorId: { type: "string" },
              doctorName: { type: "string" },
              tokenNumber: { type: ["integer", "null"] },
              visitNumber: { type: ["string", "null"] },
              dateTime: { type: ["string", "null"], format: "date-time" },
              priority: { type: "string" },
              drugItems: { type: "integer" },
              status: { type: "string" },
              medicines: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    medicineName: { type: ["string", "null"] },
                    quantity: { type: ["integer", "null"] },
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

export const getPrescriptionProcessingStatusCountsSchema = {
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: {
          type: "object",
          properties: {
            queue: { type: "integer" },
            pending: { type: "integer" },
            processing: { type: "integer" },
            completed: { type: "integer" },
            cancelled: { type: "integer" },
            todayPatients: { type: "integer" },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
};

export const getPrescriptionDetailsByIdSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["prescriptionId"],
    properties: {
      prescriptionId: {
        anyOf: [
          { type: "integer", minimum: 1 },
          { type: "string", pattern: "^[0-9]+$" },
        ],
      },
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
            prescriptionId: { type: "string" },
            patientId: { type: "string" },
            patientUpid: { type: ["string", "null"] },
            patientName: { type: "string" },
            gender: { type: ["string", "null"] },
            dateOfBirth: { type: ["string", "null"], format: "date-time" },
            nationality: { type: ["string", "null"] },
            location: { type: ["string", "null"] },
            allergies: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  allergen: { type: "string" },
                  severity: { type: ["string", "null"] },
                  reaction: { type: ["string", "null"] },
                },
              },
            },
            medicalAlerts: {
              type: "array",
              items: { type: "string" },
            },
            medicalSurgicalHistory: { type: ["string", "null"] },
            familyHistory: { type: ["string", "null"] },
            admissionDateTime: {
              type: ["string", "null"],
              format: "date-time",
            },
            principalDoctor: { type: ["string", "null"] },
            orderContext: { type: ["string", "null"] },
            medicationOrderList: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  medicineName: { type: "string" },
                  instructionFrequency: { type: ["string", "null"] },
                  dosage: { type: ["string", "null"] },
                  duration: { type: ["string", "null"] },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const updatePrescriptionDecisionSchema = {
  body: {
    type: "object",
    additionalProperties: false,
    required: ["prescriptionId", "decision"],
    properties: {
      prescriptionId: {
        anyOf: [
          { type: "integer", minimum: 1 },
          { type: "string", pattern: "^[0-9]+$" },
        ],
      },
      decision: {
        type: "string",
        enum: ["approved", "rejected"],
      },
      approvedBy: {
        type: "string",
        minLength: 1,
        maxLength: 255,
      },
      rejectedBy: {
        type: "string",
        minLength: 1,
        maxLength: 255,
      },
    },
    allOf: [
      {
        if: { properties: { decision: { const: "approved" } } },
        then: { required: ["approvedBy"] },
      },
      {
        if: { properties: { decision: { const: "rejected" } } },
        then: { required: ["rejectedBy"] },
      },
    ],
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
            prescriptionId: { type: "string" },
            status: { type: "string" },
            approvedByName: { type: ["string", "null"] },
            rejectedByName: { type: ["string", "null"] },
            approvedAt: { type: ["string", "null"], format: "date-time" },
            rejectedAt: { type: ["string", "null"], format: "date-time" },
          },
        },
      },
    },
  },
};
