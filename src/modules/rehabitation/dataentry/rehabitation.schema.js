/**
 * Schema for creating a new rehabilitation entry
 */
export const createRehabilitationEntrySchema = {
    description: 'Create a new rehabilitation entry',
    tags: ['Rehabilitation'],
    body: {
        type: 'object',
        required: ['patientId'], // Only patientId is strictly required
        properties: {
            patientId: { type: 'string', description: 'Unique Patient ID' },
            patientName: { type: 'string' }, // Ignored, just validation
            assessmentDate: { type: 'string', format: 'date-time' }, // Mapped to assessment_date
            opdId: { type: 'string' }, // Mapped to visit_id (lookup)
            referringDoctor: { type: 'string' }, // Mapped to referring_doctor
            diagnosis: { type: 'string' }, // Mapped to diagnosis
            baselineStatus: { type: 'string' }, // Mapped to baseline_status
            impairments: { type: 'string' }, // Mapped to impairments
            
            goalDescription: { type: 'string' }, // Mapped to goal_description
            goalType: { type: 'string' }, // Mapped to goal_type
            targetDate: { type: 'string', format: 'date' }, // Mapped to target_date
            reviewDate: { type: 'string', format: 'date' }, // Mapped to review_date
            reviewOutcome: { type: 'string' }, // Mapped to review_outcome
            goal: { type: 'string' }, // Alias for goalDescription
            
            deviceType: { type: 'string' }, // Mapped to device_type
            side: { type: 'string' }, // Mapped to side_region
            fittingDetails: { type: 'string' }, // Mapped to fitting_details
            prescribed: { type: 'string', format: 'date' }, // Prescribed date
            
            dateGiven: { type: 'string', format: 'date' }, // Mapped to hep_date_given
            frequency: { type: 'string' }, // Mapped to hep_frequency
            exerciseList: { type: 'string' }, // Mapped to hep_exercise_list
            
            sessionDate: { type: 'string', format: 'date-time' }, // Optional, might be same as assessment
            therapyType: { type: 'string' }, // PT/OT/ST - Mapped to therapy_type
            sessionType: { type: 'string' }, // Mapped to session_type
            duration: { type: 'string' }, // Mapped to duration_minutes (needs int conversion)
            intensity: { type: 'string' }, // Mapped to intensity
            interventions: { type: 'string' }, // Mapped to interventions
            response: { type: 'string' }, // Mapped to patient_response
            therapistSignature: { type: 'string' }, // Mapped to therapist_signature
            medicine: { type: 'string' }, // Medicine name
            status: { type: 'string' }, // In Progress/Completed/Incomplete
            nextCheckup: { type: 'string', format: 'date' } // Next checkup date
        }
    },
    response: {
        201: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        entry_id: { type: 'string' }
                    }
                }
            }
        },
        400: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                message: { type: 'string' }
            }
        },
        404: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                message: { type: 'string' }
            }
        }
    }
};

/**
 * Schema for getting rehabilitation entries by sections
 */
export const getRehabilitationSectionsSchema = {
    description: 'Get all rehabilitation entries for a patient, organized by sections',
    tags: ['Rehabilitation'],
    params: {
        type: 'object',
        properties: {
            patientId: { type: 'string', description: 'Unique Patient ID (UPID)' }
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
                                therapy_sessions: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            entry_id: { type: 'string' },
                                            assessment_date: { type: 'string' },
                                            session_type: { type: 'string' },
                                            duration_minutes: { type: 'integer' },
                                            intensity: { type: 'string' },
                                            interventions: { type: 'string' },
                                            patient_response: { type: 'string' },
                                            therapist_signature: { type: 'string' },
                                            therapist: { 
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' }
                                                }
                                            },
                                            visit_number: { type: 'string' },
                                            created_at: { type: 'string' }
                                        }
                                    }
                                },
                                home_exercise_program: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            entry_id: { type: 'string' },
                                            assessment_date: { type: 'string' },
                                            date_given: { type: 'string' },
                                            frequency: { type: 'string' },
                                            exercise_list: { type: 'string' },
                                            therapist: { 
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' }
                                                }
                                            },
                                            visit_number: { type: 'string' },
                                            created_at: { type: 'string' }
                                        }
                                    }
                                },
                                patient_goals: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            entry_id: { type: 'string' },
                                            assessment_date: { type: 'string' },
                                            goal_description: { type: 'string' },
                                            goal_type: { type: 'string' },
                                            target_date: { type: 'string' },
                                            review_date: { type: 'string' },
                                            review_outcome: { type: 'string' },
                                            therapist: { 
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' }
                                                }
                                            },
                                            visit_number: { type: 'string' },
                                            created_at: { type: 'string' }
                                        }
                                    }
                                },
                                devices: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            entry_id: { type: 'string' },
                                            assessment_date: { type: 'string' },
                                            device_type: { type: 'string' },
                                            side_region: { type: 'string' },
                                            fitting_details: { type: 'string' },
                                            therapist: { 
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' }
                                                }
                                            },
                                            visit_number: { type: 'string' },
                                            created_at: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        total_entries: { type: 'integer' }
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
        }
    }
};

/**
 * Schema for getting all patients with rehabilitation entries
 */
export const getAllPatientsSchema = {
    description: 'Get all patients with rehabilitation entries, organized by sections',
    tags: ['Rehabilitation'],
    response: {
        200: {
            type: 'object',
            properties: {
                status: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        total_patients: { type: 'integer' },
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
                                    total_entries: { type: 'integer' },
                                    latest_assessment_date: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

/**
 * Schema for updating a rehabilitation entry
 */
export const updateRehabilitationEntrySchema = {
    description: 'Update an existing rehabilitation entry',
    tags: ['Rehabilitation'],
    params: {
        type: 'object',
        properties: {
            entryId: { type: 'string', description: 'Rehabilitation Entry ID' }
        },
        required: ['entryId']
    },
    body: {
        type: 'object',
        properties: {
            patientId: { type: 'string', description: 'Unique Patient ID' },
            opdId: { type: 'string' },
            assessmentDate: { type: 'string', format: 'date-time' },
            referringDoctor: { type: 'string' },
            diagnosis: { type: 'string' },
            baselineStatus: { type: 'string' },
            impairments: { type: 'string' },
            
            goalDescription: { type: 'string' },
            goalType: { type: 'string' },
            targetDate: { type: 'string', format: 'date' },
            reviewDate: { type: 'string', format: 'date' },
            reviewOutcome: { type: 'string' },
            
            deviceType: { type: 'string' },
            side: { type: 'string' },
            fittingDetails: { type: 'string' },
            prescribed: { type: 'string', format: 'date' },
            
            dateGiven: { type: 'string', format: 'date' },
            frequency: { type: 'string' },
            exerciseList: { type: 'string' },
            
            therapyType: { type: 'string' },
            sessionType: { type: 'string' },
            duration: { type: 'string' },
            intensity: { type: 'string' },
            interventions: { type: 'string' },
            response: { type: 'string' },
            therapistSignature: { type: 'string' },
            medicine: { type: 'string' },
            
            status: { type: 'string' },
            nextCheckup: { type: 'string', format: 'date' },
            goal: { type: 'string' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                status: { type: 'string' },
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
                        therapist: {
                            type: 'object',
                            properties: {
                                name: { type: 'string' }
                            }
                        },
                        updated_at: { type: 'string' }
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
        }
    }
};

/**
 * Schema for getting rehabilitation entries by patient UPID
 */
export const getRehabilitationEntriesByPatientSchema = {
    description: 'Get all rehabilitation entries for a patient by UPID',
    tags: ['Rehabilitation'],
    params: {
        type: 'object',
        properties: {
            upid: { 
                type: 'string', 
                description: 'Unique Patient ID (e.g., NILD-20260223-0001)' 
            }
        },
        required: ['upid']
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
                                name: { type: 'string' },
                                date_of_birth: { type: 'string' },
                                gender: { type: 'string' },
                                mobile: { type: 'string' }
                            }
                        },
                        entries: {
                            type: 'array',
                            items: { type: 'object' }
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
