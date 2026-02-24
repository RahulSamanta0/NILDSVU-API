/**
 * Reception Module - Fastify JSON Schemas
 * 
 * Purpose:
 * - Validates request payloads for patient registration
 * - Serializes responses for performance optimization
 * - Documents API contracts
 */

export const registerPatientSchema = {
    body: {
        type: 'object',
        required: ['firstName', 'dateOfBirth', 'gender', 'mobileNumber', 'emergencyContactPhone', 'department', 'patientType'],
        properties: {
            // Personal Information
            title: {
                type: 'string',
                enum: ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Master', 'Baby', '']
            },
            firstName: {
                type: 'string',
                minLength: 2,
                maxLength: 100
            },
            middleName: {
                type: 'string',
                maxLength: 100
            },
            lastName: {
                type: 'string',
                maxLength: 100
            },
            initial: {
                type: 'string',
                maxLength: 10
            },
            dateOfBirth: {
                type: 'string',
                format: 'date'
            },
            gender: {
                type: 'string',
                enum: ['Male', 'Female', 'Ambiguous']
            },
            maritalStatus: {
                type: 'string',
                enum: ['Single', 'Married', 'Divorced', 'Widowed', 'Other', '']
            },
            nationality: {
                type: 'string',
                maxLength: 100
            },
            religion: {
                type: 'string',
                enum: ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Parsi', 'Other', '']
            },
            occupation: {
                type: 'string',
                maxLength: 100
            },
            fatherMotherHusbandName: {
                type: 'string',
                maxLength: 100
            },
            relationship: {
                type: 'string',
                enum: ['Father', 'Mother', 'Husband', 'Wife', 'Son', 'Daughter', 'Guardian', 'Other', '']
            },

            // Medical Information
            bloodGroup: {
                type: 'string',
                enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', '']
            },
            patientType: {
                type: 'string',
                enum: ['OPD', 'IPD']
            },
            department: {
                type: 'string',
                minLength: 1
            },
            referredBy: {
                type: 'string',
                maxLength: 255
            },

            // Divyangjan Information
            isDivyangjan: {
                type: 'boolean',
                default: false
            },
            disabilityType: {
                type: 'string',
                enum: ['Locomotor Disability', 'Visual Impairment', 'Hearing Impairment', 'Intellectual Disability', 'Multiple Disabilities', 'Other', '']
            },

            // Contact Information
            mobileNumber: {
                type: 'string',
                pattern: '^[0-9]{10}$'
            },
            mobileSecondary: {
                type: 'string',
                pattern: '^[0-9]{10}$'
            },
            landlineNo: {
                type: 'string',
                maxLength: 20
            },
            whatsappNumber: {
                type: 'string',
                pattern: '^[0-9]{10}$'
            },
            whatsappCountryCode: {
                type: 'string',
                default: '+91'
            },
            email: {
                type: 'string',
                format: 'email',
                maxLength: 255
            },

            // Emergency Contact
            emergencyContactName: {
                type: 'string',
                maxLength: 100
            },
            emergencyContactPhone: {
                type: 'string',
                pattern: '^[0-9]{10}$'
            },
            emergencyContactRelation: {
                type: 'string',
                maxLength: 50
            },

            // Address Information
            doorNoStreet: {
                type: 'string',
                maxLength: 255
            },
            area: {
                type: 'string',
                maxLength: 255
            },
            country: {
                type: 'string',
                maxLength: 100,
                default: 'India'
            },
            state: {
                type: 'string',
                maxLength: 100
            },
            district: {
                type: 'string',
                maxLength: 100
            },
            taluk: {
                type: 'string',
                maxLength: 100
            },
            pincode: {
                type: 'string',
                pattern: '^[0-9]{6}$'
            },

            // Identity
            aadhaarNumber: {
                type: 'string',
                pattern: '^[0-9]{12}$'
            },

            // Additional
            guardianName: {
                type: 'string',
                maxLength: 100
            },
            guardianRelation: {
                type: 'string',
                maxLength: 50
            },
            monthlyIncome: {
                type: 'string',
                maxLength: 50
            },
            bplCardNumber: {
                type: 'string',
                maxLength: 100
            },
            category: {
                type: 'string',
                enum: ['General', 'SC', 'ST', 'OBC', 'EWS', '']
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
                first_name: { type: 'string' },
                middle_name: { type: 'string' },
                last_name: { type: 'string' },
                date_of_birth: { type: 'string' },
                gender: { type: 'string' },
                mobile_primary: { type: 'string' },
                email: { type: 'string' },
                is_divyangjan: { type: 'boolean' },
                registration_date: { type: 'string', format: 'date-time' },
                created_at: { type: 'string', format: 'date-time' }
            }
        }
    }
};

export const getPatientByIdSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: {
                type: 'string',
                description: 'Patient ID (numeric) or UPID (NILD-YYYYMMDD-SEQN)'
                // No pattern validation - service layer will auto-detect
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                patient_id: { type: 'string' },
                upid: { type: 'string' },
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                mobile_primary: { type: 'string' },
                email: { type: 'string' },
                is_divyangjan: { type: 'boolean' }
            }
        }
    }
};

export const getPatientByUPIDSchema = {
    params: {
        type: 'object',
        required: ['upid'],
        properties: {
            upid: {
                type: 'string',
                pattern: '^NILD-[0-9]{8}-(OPD|IPD)-[0-9]{4}$'
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                patient_id: { type: 'string' },
                upid: { type: 'string' },
                first_name: { type: 'string' },
                last_name: { type: 'string' }
            }
        }
    }
};

export const getAllPatientsSchema = {
    querystring: {
        type: 'object',
        properties: {
            search: { type: 'string' },
            isDivyangjan: { type: 'boolean' },
            patientType: { type: 'string', enum: ['OPD', 'IPD'] },
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
                patients: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            patient_id: { type: 'string' },
                            upid: { type: 'string' },
                            first_name: { type: 'string' },
                            middle_name: { type: 'string' },
                            last_name: { type: 'string' },
                            date_of_birth: { type: 'string' },
                            gender: { type: 'string' },
                            mobile_primary: { type: 'string' },
                            mobile_secondary: { type: 'string' },
                            email: { type: 'string' },
                            aadhaar_number: { type: 'string' },
                            address_line1: { type: 'string' },
                            address_line2: { type: 'string' },
                            city: { type: 'string' },
                            state: { type: 'string' },
                            pincode: { type: 'string' },
                            emergency_contact_name: { type: 'string' },
                            emergency_contact_phone: { type: 'string' },
                            is_divyangjan: { type: 'boolean' },
                            registration_date: { type: 'string' },
                            patient_disabilities: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        disability_id: { type: 'string' },
                                        disability_type: { type: 'string' },
                                        disability_subtype: { type: 'string' },
                                        severity: { type: 'string' },
                                        certificate_number: { type: 'string' },
                                        is_active: { type: 'boolean' }
                                    }
                                }
                            },
                            patient_allergies: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        allergy_id: { type: 'string' },
                                        allergen: { type: 'string' },
                                        allergy_type: { type: 'string' },
                                        severity: { type: 'string' },
                                        reaction: { type: 'string' },
                                        is_active: { type: 'boolean' }
                                    }
                                }
                            }
                        },
                        additionalProperties: true
                    },
                },
                total: { type: 'integer' }
            }
        }
    }
};

export const updatePatientSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: {
                type: 'string',
                description: 'Patient ID (numeric) or UPID'
            }
        }
    },
    body: {
        type: 'object',
        properties: {
            // Personal Information
            title: { type: 'string' },
            firstName: { type: 'string', minLength: 2 },
            middleName: { type: 'string' },
            lastName: { type: 'string' },
            initial: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date' },
            gender: { type: 'string', enum: ['Male', 'Female', 'Ambiguous'] },
            maritalStatus: { type: 'string' },
            nationality: { type: 'string' },
            religion: { type: 'string' },
            occupation: { type: 'string' },
            fatherMotherHusbandName: { type: 'string' },
            relationship: { type: 'string' },

            // Medical
            bloodGroup: { type: 'string' },
            department: { type: 'string' },
            referredBy: { type: 'string' },

            // Contact
            mobileNumber: { type: 'string', pattern: '^[0-9]{10}$' },
            mobileSecondary: { type: 'string' },
            landlineNo: { type: 'string' },
            whatsappNumber: { type: 'string' },
            email: { type: 'string', format: 'email' },

            // Address
            doorNoStreet: { type: 'string' },
            area: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            district: { type: 'string' },
            pincode: { type: 'string' },

            // Emergency
            emergencyContactName: { type: 'string' },
            emergencyContactPhone: { type: 'string' },
            emergencyContactRelation: { type: 'string' },

            // Identity
            aadhaarNumber: { type: 'string' },

            // Meta
            isDivyangjan: { type: 'boolean' },
            disabilityType: { type: 'string' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                patient_id: { type: 'string' },
                upid: { type: 'string' },
                updated_at: { type: 'string', format: 'date-time' }
            }
        }
    }
};
