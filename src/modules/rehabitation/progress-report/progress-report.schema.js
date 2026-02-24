/**
 * Progress Report Schemas
 * 
 * Purpose:
 * - Define Swagger/OpenAPI schemas for progress report endpoints
 * - Document request/response structures
 */

export const updateProgressReportSchema = {
    description: 'Update progress scores, session count, and status for a rehabilitation entry',
    tags: ['Rehabilitation - Progress Report'],
    security: [{ bearerAuth: [] }],
    params: {
        type: 'object',
        required: ['entry_id'],
        properties: {
            entry_id: {
                type: 'string',
                description: 'The primary key of the rehabilitation_entries record'
            }
        }
    },
    body: {
        type: 'object',
        required: ['current_session', 'goal_scores'],
        properties: {
            current_session: {
                type: 'number',
                minimum: 1,
                description: 'Current session number (will be stored as "Session #{value}" in session_type)'
            },
            goal_scores: {
                type: 'object',
                description: 'Key-value pair of goals and their 0-100 scores (e.g., {"Range of Motion": 65, "Muscle Strength": 70})',
                additionalProperties: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100
                }
            },
            calculated_status: {
                type: 'string',
                enum: ['Improving', 'Stable', 'Needs Attention'],
                description: 'Status (auto-calculated if not provided based on average score)'
            },
            next_checkup_date: {
                type: 'string',
                format: 'date',
                description: 'Next checkup date'
            }
        }
    },
    response: {
        200: {
            description: 'Progress report updated successfully',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        entry_id: { type: 'string' },
                        patient: {
                            type: 'object',
                            properties: {
                                upid: { type: 'string' },
                                name: { type: 'string' }
                            }
                        },
                        session_number: { type: 'number' },
                        session_type: { type: 'string' },
                        progress_scores: { type: 'object' },
                        overall_score: { type: 'number' },
                        status: { type: 'string' },
                        next_checkup: { type: 'string', format: 'date' },
                        updated_at: { type: 'string', format: 'date-time' },
                        therapist: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                name: { type: 'string' },
                                specialization: { type: 'string' }
                            }
                        }
                    }
                }
            }
        },
        404: {
            description: 'Entry not found',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' }
            }
        },
        500: {
            description: 'Internal server error',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                error: { type: 'string' }
            }
        }
    }
};

export const getAllPatientsSchema = {
    description: 'Get all patients with rehabilitation entries',
    tags: ['Rehabilitation - Progress Report'],
    security: [{ bearerAuth: [] }],
    response: {
        200: {
            description: 'Successful response',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        total_patients: { type: 'number' },
                        patients: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    patient_id: { type: 'string' },
                                    upid: { type: 'string' },
                                    name: { type: 'string' },
                                    first_name: { type: 'string' },
                                    last_name: { type: 'string' },
                                    date_of_birth: { type: 'string', format: 'date' },
                                    gender: { type: 'string' },
                                    mobile_primary: { type: 'string' },
                                    total_entries: { type: 'number' },
                                    latest_entry_date: { type: 'string', format: 'date-time' },
                                    current_status: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        },
        500: {
            description: 'Internal server error',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                error: { type: 'string' }
            }
        }
    }
};

export const getPatientProgressSchema = {
    description: 'Get detailed progress report for a specific patient',
    tags: ['Rehabilitation - Progress Report'],
    security: [{ bearerAuth: [] }],
    params: {
        type: 'object',
        required: ['patientId'],
        properties: {
            patientId: {
                type: 'string',
                description: 'Patient UPID'
            }
        }
    },
    response: {
        200: {
            description: 'Successful response',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        patient: {
                            type: 'object',
                            properties: {
                                upid: { type: 'string' },
                                name: { type: 'string' },
                                first_name: { type: 'string' },
                                last_name: { type: 'string' },
                                date_of_birth: { type: 'string', format: 'date' },
                                gender: { type: 'string' },
                                mobile_primary: { type: 'string' }
                            }
                        },
                        progress_summary: {
                            type: 'object',
                            properties: {
                                total_entries: { type: 'number' },
                                total_sessions: { type: 'number' },
                                completed_goals: { type: 'number' },
                                active_goals: { type: 'number' },
                                devices_issued: { type: 'number' },
                                hep_plans: { type: 'number' },
                                therapy_breakdown: { type: 'object' },
                                first_visit: { type: 'string', format: 'date-time' },
                                latest_visit: { type: 'string', format: 'date-time' }
                            }
                        },
                        entries: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    entry_id: { type: 'string' },
                                    created_at: { type: 'string', format: 'date-time' },
                                    updated_at: { type: 'string', format: 'date-time' },
                                    status: { type: 'string' },
                                    assessment: { type: 'object', nullable: true },
                                    goal: { type: 'object', nullable: true },
                                    session: { type: 'object', nullable: true },
                                    device: { type: 'object', nullable: true },
                                    hep: { type: 'object', nullable: true },
                                    therapist: { type: 'object', nullable: true },
                                    visit: { type: 'object', nullable: true },
                                    next_checkup: { type: 'string', format: 'date', nullable: true },
                                    medicine: { type: 'string', nullable: true }
                                }
                            }
                        }
                    }
                }
            }
        },
        404: {
            description: 'Patient not found',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' }
            }
        },
        500: {
            description: 'Internal server error',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                error: { type: 'string' }
            }
        }
    }
};
