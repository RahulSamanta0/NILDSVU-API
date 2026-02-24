/**
 * Emergency Registration Module - Fastify JSON Schemas
 *
 * Validates request payloads for emergency patient registration.
 * Emergency cases allow minimal info (age + gender only),
 * unknown patients, and capture vitals/triage data.
 */

export const registerEmergencySchema = {
    body: {
        type: 'object',
        required: ['approximateAge', 'gender'],
        properties: {
            // Patient Demographics
            patientName: {
                type: 'string',
                maxLength: 200
            },
            isUnknownPatient: {
                type: 'boolean',
                default: false
            },
            approximateAge: {
                type: 'integer',
                minimum: 0,
                maximum: 150
            },
            gender: {
                type: 'string',
                enum: ['Male', 'Female', 'Other', 'Unknown']
            },
            mobileNumber: {
                type: 'string',
                pattern: '^[0-9]{10}$'
            },

            // Transport & Intake
            broughtBy: {
                type: 'string',
                enum: ['Self', 'Relative', 'Ambulance', 'Police', 'Bystander'],
                default: 'Ambulance'
            },
            broughtByContact: {
                type: 'string',
                pattern: '^[0-9]{10}$'
            },

            // Emergency Classification
            emergencyType: {
                type: 'string',
                enum: ['Trauma', 'Cardiac', 'Stroke', 'Respiratory', 'Burns', 'Septic', 'Neurological', 'Other'],
                default: 'Trauma'
            },
            priorityLevel: {
                type: 'string',
                enum: ['Critical', 'High', 'Moderate', 'Low'],
                default: 'Critical'
            },

            // Clinical Triage - Vitals
            vitals: {
                type: 'object',
                properties: {
                    pulse: { type: 'string' },
                    bp: { type: 'string' },
                    spo2: { type: 'string' },
                    temp: { type: 'string' },
                    resp: { type: 'string' }
                }
            },

            // Complaint
            complaintNotes: {
                type: 'string',
                maxLength: 1000
            },

            // Meta
            facilityId: {
                type: 'integer'
            }
        }
    },
    response: {
        201: {
            type: 'object',
            properties: {
                patient_id: { type: 'string' },
                upid: { type: 'string' },
                emergency_case_number: { type: 'string' },
                first_name: { type: 'string' },
                gender: { type: 'string' },
                is_emergency: { type: 'boolean' },
                is_unknown_patient: { type: 'boolean' },
                triage_priority: { type: 'string' },
                emergency_type: { type: 'string' },
                arrival_mode: { type: 'string' },
                arrival_time: { type: 'string', format: 'date-time' },
                vitals: { type: 'object' },
                created_at: { type: 'string', format: 'date-time' }
            }
        }
    }
};

export const getEmergencyByIdSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: {
                type: 'string',
                description: 'Patient ID (numeric) or Emergency Case Number (ERxxxxxxxx-xxxx)'
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                patient_id: { type: 'string' },
                upid: { type: 'string' },
                emergency_case_number: { type: 'string' },
                first_name: { type: 'string' },
                date_of_birth: { type: 'string' },
                gender: { type: 'string' },
                mobile_primary: { type: 'string' },
                is_emergency: { type: 'boolean' },
                is_unknown_patient: { type: 'boolean' },
                triage_priority: { type: 'string' },
                emergency_type: { type: 'string' },
                arrival_mode: { type: 'string' },
                arrival_time: { type: 'string', format: 'date-time' },
                brought_by_contact: { type: 'string' },
                vitals: { type: 'object' },
                complaint_notes: { type: 'string' },
                patient_disabilities: {
                    type: 'array',
                    items: { type: 'object' }
                },
                patient_allergies: {
                    type: 'array',
                    items: { type: 'object' }
                }
            },
            additionalProperties: true
        }
    }
};

export const getAllEmergenciesSchema = {
    querystring: {
        type: 'object',
        properties: {
            search: { type: 'string' },
            priorityLevel: { type: 'string', enum: ['Critical', 'High', 'Moderate', 'Low'] },
            emergencyType: { type: 'string', enum: ['Trauma', 'Cardiac', 'Stroke', 'Respiratory', 'Burns', 'Septic', 'Neurological', 'Other'] },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'integer', minimum: 0, default: 0 }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                emergencies: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            patient_id: { type: 'string' },
                            upid: { type: 'string' },
                            emergency_case_number: { type: 'string' },
                            first_name: { type: 'string' },
                            date_of_birth: { type: 'string' },
                            gender: { type: 'string' },
                            mobile_primary: { type: 'string' },
                            is_emergency: { type: 'boolean' },
                            is_unknown_patient: { type: 'boolean' },
                            triage_priority: { type: 'string' },
                            emergency_type: { type: 'string' },
                            arrival_mode: { type: 'string' },
                            arrival_time: { type: 'string', format: 'date-time' },
                            vitals: { type: 'object' },
                            complaint_notes: { type: 'string' },
                            registration_date: { type: 'string' }
                        },
                        additionalProperties: true
                    }
                },
                total: { type: 'integer' }
            }
        }
    }
};

export const updateEmergencySchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: {
                type: 'string',
                description: 'Patient ID (numeric) or Emergency Case Number'
            }
        }
    },
    body: {
        type: 'object',
        properties: {
            // Frontend field names (camelCase)
            patientName: { type: 'string' },
            isUnknownPatient: { type: 'boolean' },
            approximateAge: { type: 'integer', minimum: 0, maximum: 150 },
            gender: { type: 'string' },
            mobileNumber: { type: 'string' },
            broughtBy: { type: 'string', enum: ['Self', 'Relative', 'Ambulance', 'Police', 'Bystander'] },
            broughtByContact: { type: 'string' },
            emergencyType: { type: 'string', enum: ['Trauma', 'Cardiac', 'Stroke', 'Respiratory', 'Burns', 'Septic', 'Neurological', 'Other'] },
            priorityLevel: { type: 'string', enum: ['Critical', 'High', 'Moderate', 'Low'] },
            vitals: {
                type: 'object',
                properties: {
                    pulse: { type: 'string' },
                    bp: { type: 'string' },
                    spo2: { type: 'string' },
                    temp: { type: 'string' },
                    resp: { type: 'string' }
                }
            },
            complaintNotes: { type: 'string' },

            // DB field names (snake_case) - accepted for direct updates
            first_name: { type: 'string' },
            middle_name: { type: 'string' },
            last_name: { type: 'string' },
            date_of_birth: { type: 'string' },
            mobile_primary: { type: 'string' },
            mobile_secondary: { type: 'string' },
            email: { type: 'string' },
            blood_group: { type: 'string' },
            aadhaar_number: { type: 'string' },
            address_line1: { type: 'string' },
            address_line2: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            pincode: { type: 'string' },
            emergency_contact_name: { type: 'string' },
            emergency_contact_phone: { type: 'string' },
            emergency_contact_relation: { type: 'string' },
            is_unknown_patient: { type: 'boolean' },
            is_divyangjan: { type: 'boolean' },
            triage_priority: { type: 'string' },
            emergency_type: { type: 'string' },
            arrival_mode: { type: 'string' },
            brought_by_contact: { type: 'string' },
            complaint_notes: { type: 'string' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                patient_id: { type: 'string' },
                upid: { type: 'string' },
                emergency_case_number: { type: 'string' },
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                date_of_birth: { type: 'string' },
                gender: { type: 'string' },
                mobile_primary: { type: 'string' },
                is_emergency: { type: 'boolean' },
                is_unknown_patient: { type: 'boolean' },
                triage_priority: { type: 'string' },
                emergency_type: { type: 'string' },
                arrival_mode: { type: 'string' },
                arrival_time: { type: 'string', format: 'date-time' },
                brought_by_contact: { type: 'string' },
                vitals: { type: 'object' },
                complaint_notes: { type: 'string' },
                updated_at: { type: 'string', format: 'date-time' },
                patient_disabilities: {
                    type: 'array',
                    items: { type: 'object' }
                },
                patient_allergies: {
                    type: 'array',
                    items: { type: 'object' }
                }
            },
            additionalProperties: true
        }
    }
};
