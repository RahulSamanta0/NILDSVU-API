/**
 * Appointments API Schema Definitions
 *
 * JSON Schema validation for all appointment endpoints.
 * Follows Fastify schema pattern for request/response validation.
 */

// Appointment Types
const appointmentTypes = [
    'OPD_CONSULTATION',
    'IPD_FOLLOWUP',
    'DIAGNOSTIC',
    'REHABILITATION',
    'PROCEDURE',
    'TELECONSULTATION',
    'VACCINATION',
    'HEALTH_CHECKUP'
];

// Status Values (must match appointment_status DB enum)
const appointmentStatuses = [
    'scheduled',
    'confirmed',
    'checked_in',
    'completed',
    'cancelled',
    'no_show'
];

/**
 * 1. POST /appointments - Create Appointment
 */
export const createAppointmentSchema = {
    body: {
        anyOf: [
            {
                type: 'object',
                required: ['patientId', 'appointmentDate', 'appointmentTime', 'appointmentType', 'departmentId'],
                properties: {
                    patientId: {
                        type: 'string',
                        description: 'Patient UPID or numeric ID'
                    },
                    appointmentDate: {
                        type: 'string',
                        format: 'date',
                        description: 'Appointment date (YYYY-MM-DD)'
                    },
                    appointmentTime: {
                        type: 'string',
                        pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$',
                        description: 'Appointment time (HH:MM format)'
                    },
                    appointmentType: {
                        type: 'string',
                        enum: appointmentTypes
                    },
                    departmentId: {
                        type: 'integer',
                        minimum: 1
                    },
                    doctorId: {
                        type: 'string',
                        description: 'Doctor user ID (optional)'
                    },
                    therapistId: {
                        type: 'string',
                        description: 'Therapist user ID (optional)'
                    },
                    reason: {
                        type: 'string',
                        maxLength: 500,
                        description: 'Chief complaint or reason for visit'
                    },
                    facilityId: {
                        type: 'string',
                        description: 'Facility ID (optional)'
                    },
                    bookedBy: {
                        type: 'string',
                        maxLength: 50,
                        description: 'Staff member who booked the appointment'
                    }
                }
            },
            {
                type: 'object',
                required: ['patient_id', 'appointment_date', 'slot_start', 'appointment_type', 'department_id'],
                properties: {
                    patient_id: {
                        type: 'string',
                        description: 'Patient UPID or numeric ID'
                    },
                    appointment_date: {
                        type: 'string',
                        format: 'date',
                        description: 'Appointment date (YYYY-MM-DD)'
                    },
                    slot_start: {
                        type: 'string',
                        pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$',
                        description: 'Appointment start time (HH:MM format)'
                    },
                    slot_end: {
                        type: 'string',
                        pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$',
                        description: 'Appointment end time (HH:MM format)'
                    },
                    appointment_type: {
                        type: 'string',
                        enum: appointmentTypes
                    },
                    department_id: {
                        type: 'integer',
                        minimum: 1
                    },
                    doctor_id: {
                        type: 'string',
                        description: 'Doctor user ID (optional)'
                    },
                    therapist_id: {
                        type: 'string',
                        description: 'Therapist user ID (optional)'
                    },
                    reason: {
                        type: 'string',
                        maxLength: 500,
                        description: 'Chief complaint or reason for visit'
                    },
                    facility_id: {
                        type: 'string',
                        description: 'Facility ID (optional)'
                    },
                    booked_by: {
                        type: 'string',
                        maxLength: 50,
                        description: 'Staff member who booked the appointment'
                    }
                }
            }
        ]
    },
    response: {
        201: {
            type: 'object',
            properties: {
                appointmentId: { type: 'string' },
                appointmentNumber: { type: 'string' },
                patientId: { type: 'string' },
                patientName: { type: 'string' },
                patientUpid: { type: 'string' },
                appointmentDate: { type: 'string' },
                appointmentTime: { type: 'string' },
                appointmentType: { type: 'string' },
                status: { type: 'string' },
                departmentName: { type: 'string' },
                doctorName: { type: 'string' },
                createdAt: { type: 'string' }
            },
            additionalProperties: true
        }
    }
};

/**
 * 2. GET /appointments - List Appointments
 */
export const listAppointmentsSchema = {
    querystring: {
        type: 'object',
        properties: {
            status: {
                type: 'string',
                enum: appointmentStatuses
            },
            departmentId: {
                type: 'integer'
            },
            doctorId: {
                type: 'string'
            },
            date: {
                type: 'string',
                format: 'date',
                description: 'Filter by specific date (YYYY-MM-DD)'
            },
            startDate: {
                type: 'string',
                format: 'date'
            },
            endDate: {
                type: 'string',
                format: 'date'
            },
            search: {
                type: 'string',
                description: 'Search token, patient name, phone, UPID'
            },
            limit: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 50
            },
            offset: {
                type: 'integer',
                minimum: 0,
                default: 0
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                appointments: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            appointmentId: { type: 'string' },
                            appointmentNumber: { type: 'string' },
                            patientName: { type: 'string' },
                            patientUpid: { type: 'string' },
                            patientPhone: { type: 'string' },
                            appointmentDate: { type: 'string' },
                            appointmentTime: { type: 'string' },
                            appointmentType: { type: 'string' },
                            status: { type: 'string' },
                            departmentName: { type: 'string' },
                            doctorName: { type: 'string' }
                        },
                        additionalProperties: true
                    }
                },
                total: { type: 'integer' },
                page: {
                    type: 'object',
                    properties: {
                        limit: { type: 'integer' },
                        offset: { type: 'integer' }
                    }
                }
            }
        }
    }
};

/**
 * 3. GET /appointments/:id - Get Appointment Details
 */
export const getAppointmentByIdSchema = {
    params: {
        type: 'object',
        required: ['patientId'],
        properties: {
            patientId: {
                type: 'string',
                description: 'Appointment number (APT-YYYY-XXXXX) or numeric ID'
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                appointmentId: { type: 'string' },
                appointmentNumber: { type: 'string' },
                patientId: { type: 'string' },
                patientName: { type: 'string' },
                patientUpid: { type: 'string' },
                patientPhone: { type: 'string' },
                patientEmail: { type: 'string' },
                appointmentDate: { type: 'string' },
                appointmentTime: { type: 'string' },
                appointmentType: { type: 'string' },
                status: { type: 'string' },
                reason: { type: 'string' },
                departmentId: { type: 'string' },
                departmentName: { type: 'string' },
                doctorId: { type: 'string' },
                doctorName: { type: 'string' },
                therapistId: { type: 'string' },
                therapistName: { type: 'string' },
                facilityId: { type: 'string' },
                bookedBy: { type: 'string' },
                confirmationSent: { type: 'boolean' },
                reminderSent: { type: 'boolean' },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' }
            },
            additionalProperties: true
        }
    }
};

/**
 * 4. PUT /appointments/:id - Update Appointment
 */
export const updateAppointmentSchema = {
    params: {
        type: 'object',
        required: ['patientId'],
        properties: {
            patientId: { type: 'string' }
        }
    },
    body: {
        type: 'object',
        properties: {
            appointmentDate: {
                type: 'string',
                format: 'date'
            },
            appointmentTime: {
                type: 'string',
                pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$'
            },
            appointmentType: {
                type: 'string',
                enum: appointmentTypes
            },
            doctorId: {
                type: 'string'
            },
            therapistId: {
                type: 'string'
            },
            reason: {
                type: 'string',
                maxLength: 500
            },
            status: {
                type: 'string',
                enum: appointmentStatuses
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                appointmentId: { type: 'string' },
                appointmentNumber: { type: 'string' },
                status: { type: 'string' },
                appointmentDate: { type: 'string' },
                appointmentTime: { type: 'string' },
                updatedAt: { type: 'string' }
            },
            additionalProperties: true
        }
    }
};

/**
 * 5. POST /appointments/:id/check-in - Check In Patient
 */
export const checkInAppointmentSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                appointmentId: { type: 'string' },
                appointmentNumber: { type: 'string' },
                status: { type: 'string' },
                opdVisitId: { type: 'string' },
                checkedInAt: { type: 'string' }
            },
            additionalProperties: true
        }
    }
};

/**
 * 6. POST /appointments/:id/complete - Complete Appointment
 */
export const completeAppointmentSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string' }
        }
    },
    body: {
        type: 'object',
        properties: {
            notes: {
                type: 'string',
                maxLength: 1000,
                description: 'Completion notes or summary'
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                appointmentId: { type: 'string' },
                appointmentNumber: { type: 'string' },
                status: { type: 'string' },
                completedAt: { type: 'string' }
            },
            additionalProperties: true
        }
    }
};

/**
 * 7. POST /appointments/:id/cancel - Cancel Appointment
 */
export const cancelAppointmentSchema = {
    params: {
        type: 'object',
        required: ['patientId'],
        properties: {
            patientId: { type: 'string' }
        }
    },
    body: {
        type: 'object',
        properties: {
            cancellationReason: {
                type: 'string',
                minLength: 10,
                maxLength: 500
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                appointmentId: { type: 'string' },
                appointmentNumber: { type: 'string' },
                status: { type: 'string' },
                cancellationReason: { type: 'string' },
                cancelledAt: { type: 'string' }
            }
        }
    }
};

/**
 * 8. POST /appointments/:id/reschedule - Reschedule Appointment
 */
export const rescheduleAppointmentSchema = {
    params: {
        type: 'object',
        required: ['patientId'],
        properties: {
            patientId: { type: 'string' }
        }
    },
    body: {
        type: 'object',
        required: ['newDate', 'newTime'],
        properties: {
            newDate: {
                type: 'string',
                format: 'date'
            },
            newTime: {
                type: 'string',
                pattern: '^([01]\\d|2[0-3]):([0-5]\\d)$'
            },
            reason: {
                type: 'string',
                maxLength: 500,
                description: 'Reason for rescheduling'
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                appointmentId: { type: 'string' },
                appointmentNumber: { type: 'string' },
                appointmentDate: { type: 'string' },
                appointmentTime: { type: 'string' },
                status: { type: 'string' },
                rescheduledAt: { type: 'string' }
            },
            additionalProperties: true
        }
    }
};

/**
 * 9. POST /appointments/:id/reminder - Send Reminder
 */
export const sendReminderSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'string' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                appointmentId: { type: 'string' },
                appointmentNumber: { type: 'string' },
                reminderSent: { type: 'boolean' },
                sentAt: { type: 'string' }
            }
        }
    }
};

/**
 * 10. GET /appointments/slots/available - Check Slot Availability
 */
export const checkSlotAvailabilitySchema = {
    querystring: {
        type: 'object',
        required: ['departmentId', 'date'],
        properties: {
            departmentId: {
                type: 'integer',
                minimum: 1
            },
            doctorId: {
                type: 'string',
                description: 'Optional: Filter by specific doctor'
            },
            date: {
                type: 'string',
                format: 'date'
            },
            isDivyangjan: {
                type: 'boolean',
                default: false,
                description: 'Check divyangjan priority slots'
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                date: { type: 'string' },
                departmentName: { type: 'string' },
                doctorName: { type: 'string' },
                slots: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            time: { type: 'string' },
                            available: { type: 'boolean' },
                            divyangjanReserved: { type: 'boolean' },
                            bookedBy: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
};

/**
 * 11. GET /appointments/patient/:patientId - Patient Appointment History
 */
export const getPatientAppointmentsSchema = {
    params: {
        type: 'object',
        required: ['patientId'],
        properties: {
            patientId: {
                type: 'string',
                description: 'Patient UPID or numeric ID'
            }
        }
    },
    querystring: {
        type: 'object',
        properties: {
            status: {
                type: 'string',
                enum: appointmentStatuses
            },
            limit: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
                default: 50
            },
            offset: {
                type: 'integer',
                minimum: 0,
                default: 0
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                patientUpid: { type: 'string' },
                patientName: { type: 'string' },
                appointments: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            appointmentId: { type: 'string' },
                            appointmentNumber: { type: 'string' },
                            appointmentDate: { type: 'string' },
                            appointmentTime: { type: 'string' },
                            appointmentType: { type: 'string' },
                            status: { type: 'string' },
                            departmentName: { type: 'string' },
                            doctorName: { type: 'string' }
                        },
                        additionalProperties: true
                    }
                },
                total: { type: 'integer' }
            }
        }
    }
};
