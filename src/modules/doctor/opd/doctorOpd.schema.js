export const createPrescriptionSchema = {
    body: {
        type: 'object',
        description: 'Create a new OPD prescription for a patient visit',
        required: [
            'patientId',
            'visitDate',
            'diseaseSummary',
            'symptomAndHistory',
            'prescribedMedicines'
        ],
        additionalProperties: false,
        properties: {
            patientId: {
                type: 'integer',
                description: 'Unique identifier of the patient'
            },

            visitId: {
                type: 'integer',
                description: 'Unique identifier of the OPD visit (optional if visitDate is provided)'
            },

            doctorId: {
                type: 'integer',
                description: 'Doctor ID creating the prescription (optional, fallback to logged-in doctor)'
            },

            visitDate: {
                type: 'string',
                format: 'date',
                description: 'Date of the OPD visit in YYYY-MM-DD format'
            },

            patientName: {
                type: 'string',
                minLength: 1,
                maxLength: 255
            },

            age: {
                type: 'integer',
                minimum: 0,
                maximum: 150
            },

            gender: {
                type: 'string',
                minLength: 1,
                maxLength: 50
            },

            mobileNumber: {
                type: 'string',
                minLength: 6,
                maxLength: 20
            },

            address: {
                type: 'string',
                maxLength: 500
            },

            diseaseSummary: {
                type: 'string',
                minLength: 1,
                description: 'Provisional diagnosis for the visit'
            },

            symptomAndHistory: {
                type: 'string',
                minLength: 1,
                description: 'Clinical notes including symptoms and medical history'
            },

            prescribedMedicines: {
                type: 'array',
                minItems: 1,
                description: 'List of medicines prescribed during the consultation',
                items: {
                    type: 'object',
                    required: ['medicineName', 'dose', 'duration'],
                    additionalProperties: false,
                    properties: {
                        medicineName: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 255,
                            description: 'Name of the prescribed medicine'
                        },

                        dose: {
                            type: 'integer',
                            minimum: 1,
                            description: 'Dosage strength in milligrams (e.g., 500 for 500mg)'
                        },

                        frequency: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                            description: 'How often the medicine should be taken (e.g., Twice daily)'
                        },

                        duration: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100,
                            description: 'Duration for which medicine should be taken (e.g., 5 days)'
                        }
                    }
                }
            },

            recommendedTests: {
                type: 'array',
                items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 255
                },
                default: []
            }
        }
    },

    response: {
        201: {
            type: 'object',
            description: 'Prescription created successfully',
            properties: {
                prescriptionId: { type: 'string' },
                patientId: { type: 'string' },
                visitId: { type: 'string' },
                doctorId: { type: 'string' },
                visitDate: { type: 'string', format: 'date-time' },
                patientName: { type: 'string' },
                age: { type: 'integer' },
                gender: { type: 'string' },
                mobileNumber: { type: 'string' },
                address: { type: 'string' },
                diseaseSummary: { type: 'string' },
                symptomAndHistory: { type: 'string' },
                prescribedMedicines: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            medicineName: { type: 'string' },
                            dose: { type: 'integer' },
                            frequency: { type: 'string' },
                            duration: { type: 'string' }
                        }
                    }
                },
                recommendedTests: {
                    type: 'array',
                    items: { type: 'string' }
                },
                labOrderId: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' }
            }
        }
    }
};
export const getOpdPatientsSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      dateType: {
        type: "string",
        enum: ["current", "range", "previous", "all"],
        default: "current",
      },
      fromDate: {
        type: "string",
        format: "date",
      },
      toDate: {
        type: "string",
        format: "date",
      },
      type: {
        type: "string",
        enum: ["all", "new", "followup", "review"],
        default: "all",
      },
      page: {
        type: "integer",
        minimum: 1,
        default: 1,
      },
      offset: {
        type: "integer",
        minimum: 1,
        maximum: 100,
        default: 10,
      },
    },
    allOf: [
      {
        if: {
          properties: {
            dateType: { const: "range" },
          },
        },
        then: {
          required: ["fromDate", "toDate"],
        },
      },
    ],
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
              patientId: { type: "string" },
              patientName: { type: "string" },
              age: { type: ["integer", "null"] },
              gender: { type: "string" },
              mobile: { type: "string" },
              visitDate: {
                type: "string",
                format: "date-time",
              },
              diseaseSummary: { type: "string" },
              visitType: { type: "string" },
            },
          },
        },
      },
    },
  },
};



export const getOpdDashboardSchema = {
  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: {
          type: "object",
          properties: {
            todaysVisitedPatients: { type: "integer" },
            overallPatients: { type: "integer" },
            revisitRate: { type: "number" },
            revisitGrowth: { type: "number" }
          },
          additionalProperties: false
        }
      }
    }
  }
};


export const getOpdLabTestsSchema = {
  description: "Get Lab Tests List",
  tags: ["Lab Tests"],

  response: {
    200: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        data: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
    },
  },
};


export const getOpdVisitHistorySchema = {
  description: "Get OPD Visit History by Patient",
  tags: ["OPD"],

  querystring: {
    type: "object",
    required: ["patient_id"],
    properties: {
      patient_id: { type: "integer" },
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
        data: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
        pagination: {
          type: "object",
          properties: {
            total: { type: "number" },
            page: { type: "number" },
            limit: { type: "number" },
            totalPages: { type: "number" },
          },
        },
      },
    },
  },
};

export const getDiagnosticReportsByUpidSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["upid"],
    properties: {
      upid: {
        type: "string",
        pattern: "^NILD-[0-9]{8}(-(?:OPD|IPD))?-[0-9]{4}$",
      },
    },
  },
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    },
  },
  response: {
    200: {
      type: "object",
      additionalProperties: false,
      properties: {
        patientId: { type: "string" },
        upid: { type: "string" },
        patientName: { type: "string" },
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
              reportId: { type: "string" },
              type: { type: "string", enum: ["radiology", "investigation"] },
              title: { type: "string" },
              reportDate: { type: ["string", "null"], format: "date-time" },
              summary: { type: "string" },
              status: { type: "string" },
              severity: { type: "string", enum: ["normal", "warning", "critical"] },
            },
            required: ["reportId", "type", "title", "summary", "status", "severity"],
          },
        },
      },
      required: [
        "patientId",
        "upid",
        "patientName",
        "totalRecords",
        "totalPages",
        "currentPage",
        "pageSize",
        "data",
      ],
    },
  },
};

export const getPatientDetailsByUpidSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["upid"],
    properties: {
      upid: {
        type: "string",
        pattern: "^NILD-[0-9]{8}(-(?:OPD|IPD))?-[0-9]{4}$",
      },
    },
  },
  response: {
    200: {
      type: "object",
      additionalProperties: true,
    },
  },
};

export const getPatientLabResultsByUpidSchema = {
  params: {
    type: "object",
    additionalProperties: false,
    required: ["upid"],
    properties: {
      upid: {
        type: "string",
        pattern: "^NILD-[0-9]{8}(-(?:OPD|IPD))?-[0-9]{4}$",
      },
    },
  },
  response: {
    200: {
      type: "object",
      additionalProperties: true,
    },
  },
};





