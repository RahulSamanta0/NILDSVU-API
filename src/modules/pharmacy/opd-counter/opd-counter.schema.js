export const getMedicinesSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: {
        type: "string",
        minLength: 1,
        maxLength: 100,
      },
      inStockOnly: {
        type: "boolean",
        default: false,
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        totalRecords: { type: "integer" },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              medicineId: { type: "string" },
              drugCode: { type: "string" },
              medicineName: { type: "string" },
              genericName: { type: ["string", "null"] },
              drugCategory: { type: ["string", "null"] },
              dosageForm: { type: ["string", "null"] },
              strength: { type: ["string", "null"] },
              manufacturer: { type: ["string", "null"] },
              batchNumber: { type: ["string", "null"] },
              quantityAvailable: { type: "integer" },
              inStock: { type: "boolean" },
              unitPrice: { type: ["number", "null"] },
              mrp: { type: ["number", "null"] },
            },
          },
        },
      },
    },
  },
};
export const getDoctorsSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      search: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        total: { type: "integer" },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              doctorId: { type: "string" },
              doctorName: { type: "string" },
              email: { type: "string" },
              employeeId: { type: ["string", "null"] },
              designation: { type: ["string", "null"] },
              specialization: { type: ["string", "null"] },
              roleId: { type: ["integer", "null"] },
              roleName: { type: ["string", "null"] },
              roleCode: { type: ["string", "null"] },
            },
          },
        },
      },
    },
  },
};
export const getPrescriptionByPatientUpidSchema = {
  params: {
    type: "object",
    required: ["upid"],
    additionalProperties: false,
    properties: {
      upid: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        patientUpid: { type: "string" },
        patientId: { type: "string" },
        patientName: { type: "string" },
        doctorId: { type: "string" },
        doctorName: { type: ["string", "null"] },
        prescriptionId: { type: "string" },
        prescriptionDate: { type: ["string", "null"], format: "date-time" },
        medicines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              medicineName: { type: ["string", "null"] },
              quantity: { type: ["integer", "null"] },
              price: { type: ["number", "null"] },
            },
          },
        },
      },
    },
  },
};
export const getPrescriptionByIdSchema = {
  params: {
    type: "object",
    required: ["prescriptionId"],
    additionalProperties: false,
    properties: {
      prescriptionId: { type: "string", minLength: 1 },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        prescriptionId: { type: "string" },
        patientId: { type: "string" },
        patientUpid: { type: ["string", "null"] },
        patientName: { type: "string" },
        doctorId: { type: "string" },
        doctorName: { type: ["string", "null"] },
        tokenNumber: { type: ["integer", "null"] },
        visitNumber: { type: ["string", "null"] },
        prescriptionDate: { type: ["string", "null"], format: "date-time" },
        status: { type: ["string", "null"] },
        priority: { type: ["string", "null"] },
        medicines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              medicineName: { type: ["string", "null"] },
              quantity: { type: ["integer", "null"] },
              price: { type: ["number", "null"] },
            },
          },
        },
      },
    },
  },
};