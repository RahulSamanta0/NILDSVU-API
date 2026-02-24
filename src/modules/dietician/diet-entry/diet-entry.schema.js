/**
 * Diet Entry Validation Schemas
 * 
 * Purpose:
 * - Defines JSON Schema validation for diet entry endpoints
 * - Ensures request/response data integrity
 * - Provides API documentation through schemas
 */

/**
 * Schema for getting patient by UPID
 */
export const getPatientByUPIDSchema = {
    description: 'Get patient details by UPID for auto-fill',
    tags: ['Dietician'],
    params: {
        type: 'object',
        required: ['upid'],
        properties: {
            upid: {
                type: 'string',
                description: 'Universal Patient ID'
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        patientName: { type: 'string' },
                        age: { type: 'number' },
                        gender: { type: 'string' },
                        admissionReason: { type: 'string' },
                        mobility: { type: ['string', 'null'] },
                        height: { type: ['number', 'null'] },
                        weight: { type: ['number', 'null'] }
                    }
                }
            }
        },
        404: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                message: { type: 'string' }
            }
        }
    }
};

/**
 * Schema for creating a new diet entry
 */
export const createDietEntrySchema = {
    description: 'Create a new diet chart entry',
    tags: ['Dietician'],
    body: {
        type: 'object',
        required: ['patientId'],
        properties: {
            patientId: {
                type: 'string',
                description: 'Patient UPID'
            },
            patientName: {
                type: 'string',
                description: 'Patient full name (auto-filled)'
            },
            anthropometrics: {
                type: 'object',
                properties: {
                    age: { type: 'number' },
                    gender: { type: 'string' },
                    height: { type: 'number', description: 'Height in cm' },
                    weight: { type: 'number', description: 'Weight in kg' },
                    mobility: { type: 'string' }
                }
            },
            labResults: {
                type: 'object',
                properties: {
                    glucose: { type: 'number', description: 'Glucose level' },
                    hba1c: { type: 'number', description: 'HbA1c percentage' }
                }
            },
            prescription: {
                type: 'object',
                properties: {
                    dietType: { type: 'string' },
                    calories: { type: 'number', description: 'Daily calorie target' },
                    protein: { type: 'number', description: 'Daily protein in grams' }
                }
            },
            schedule: {
                type: 'object',
                properties: {
                    breakfast: { type: 'string', description: 'Breakfast time' },
                    lunch: { type: 'string', description: 'Lunch time' },
                    dinner: { type: 'string', description: 'Dinner time' }
                }
            },
            notes: {
                type: 'string',
                description: 'Additional notes'
            },
            tenantId: { type: 'string' },
            createdBy: { type: 'string' }
        }
    },
    response: {
        201: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        entry_id: { type: 'string' },
                        patient_id: { type: 'string' },
                        entry_date: { type: 'string' }
                    }
                }
            }
        },
        404: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                message: { type: 'string' }
            }
        }
    }
};

/**
 * Schema for getting diet entries by patient UPID
 */
export const getDietEntriesByPatientSchema = {
    description: 'Get all diet entries for a specific patient',
    tags: ['Dietician'],
    params: {
        type: 'object',
        required: ['upid'],
        properties: {
            upid: {
                type: 'string',
                description: 'Universal Patient ID'
            }
        }
    },
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
                            entry_id: { type: 'string' },
                            entry_date: { type: 'string' },
                            height: { type: ['number', 'null'] },
                            weight: { type: ['number', 'null'] },
                            bmi: { type: ['number', 'null'] }
                        }
                    }
                }
            }
        }
    }
};

/**
 * Schema for getting a single diet entry by ID
 */
export const getDietEntryByIdSchema = {
    description: 'Get a specific diet entry by ID',
    tags: ['Dietician'],
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: {
                type: 'string',
                description: 'Diet entry ID'
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: { type: 'object' }
            }
        },
        404: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                message: { type: 'string' }
            }
        }
    }
};

/**
 * Schema for updating a diet entry
 */
export const updateDietEntrySchema = {
    description: 'Update an existing diet entry',
    tags: ['Dietician'],
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: {
                type: 'string',
                description: 'Diet entry ID'
            }
        }
    },
    body: {
        type: 'object',
        properties: {
            anthropometrics: {
                type: 'object',
                properties: {
                    age: { type: 'number' },
                    gender: { type: 'string' },
                    height: { type: 'number' },
                    weight: { type: 'number' },
                    mobility: { type: 'string' }
                }
            },
            labResults: {
                type: 'object',
                properties: {
                    glucose: { type: 'number' },
                    hba1c: { type: 'number' }
                }
            },
            prescription: {
                type: 'object',
                properties: {
                    dietType: { type: 'string' },
                    calories: { type: 'number' },
                    protein: { type: 'number' }
                }
            },
            schedule: {
                type: 'object',
                properties: {
                    breakfast: { type: 'string' },
                    lunch: { type: 'string' },
                    dinner: { type: 'string' }
                }
            },
            notes: { type: 'string' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: { type: 'object' }
            }
        }
    }
};

/**
 * Schema for deleting a diet entry
 */
export const deleteDietEntrySchema = {
    description: 'Delete a diet entry',
    tags: ['Dietician'],
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: {
                type: 'string',
                description: 'Diet entry ID'
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' }
            }
        }
    }
};
