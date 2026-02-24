/**
 * Patient Details Schemas
 * Defines validation schemas for patient rehabilitation details endpoints
 */

/**
 * Schema for getting rehabilitation entries organized by sections for a specific patient
 */
export const getRehabilitationSectionsSchema = {
    description: 'Get rehabilitation entries for a patient organized by sections (Therapy Sessions, Home Exercise Program, Patient Goals, Devices)',
    tags: ['Rehabilitation - Patient Details'],
    params: {
        type: 'object',
        properties: {
            patientId: { 
                type: 'string', 
                description: 'Unique Patient ID (UPID)' 
            }
        },
        required: ['patientId']
    },
    response: {
        200: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        patient: {
                            type: 'object',
                            properties: {
                                patient_id: { type: 'string' },
                                upid: { type: 'string' },
                                name: { type: 'string' }
                            }
                        },
                        sections: {
                            type: 'object',
                            properties: {
                                therapy_sessions: { type: 'array' },
                                home_exercise_program: { type: 'array' },
                                patient_goals: { type: 'array' },
                                devices: { type: 'array' }
                            }
                        },
                        total_entries: { type: 'number' }
                    }
                }
            }
        },
        404: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                message: { type: 'string' }
            }
        },
        500: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'string' }
            }
        }
    }
};

/**
 * Schema for getting all patients with rehabilitation entries organized by sections
 */
export const getAllPatientsSchema = {
    description: 'Get all patients with rehabilitation entries organized by sections (Therapy Sessions, Home Exercise Program, Patient Goals, Devices)',
    tags: ['Rehabilitation - Patient Details'],
    response: {
        200: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        total_patients: { type: 'number' },
                        patients: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    patient: {
                                        type: 'object',
                                        properties: {
                                            patient_id: { type: 'string' },
                                            upid: { type: 'string' },
                                            name: { type: 'string' },
                                            date_of_birth: { type: 'string' },
                                            gender: { type: 'string' },
                                            mobile: { type: 'string' }
                                        }
                                    },
                                    sections: {
                                        type: 'object',
                                        properties: {
                                            therapy_sessions: { type: 'array' },
                                            home_exercise_program: { type: 'array' },
                                            patient_goals: { type: 'array' },
                                            devices: { type: 'array' }
                                        }
                                    },
                                    total_entries: { type: 'number' },
                                    latest_assessment_date: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        },
        500: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'string' }
            }
        }
    }
};
