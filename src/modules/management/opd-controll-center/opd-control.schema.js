/**
 * OPD Control Center Schema
 *
 * Purpose: Fastify JSON schemas for OPD control center snapshot APIs
 */

const paginationSchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', minimum: 1 },
        pageSize: { type: 'integer', minimum: 1, maximum: 100 }
    }
};

const commonFiltersSchema = {
    type: 'object',
    properties: {
        date: { type: 'string', format: 'date' },
        facility_id: { type: 'integer' },
        department_id: { type: 'integer' },
        doctor_id: { type: 'integer' }
    }
};

export const metricsSchema = {
    querystring: {
        ...commonFiltersSchema
    },
    response: {
        200: {
            type: 'object',
            properties: {
                date: { type: 'string' },
                total_registrations: { type: 'integer' },
                doctors_on_duty: { type: 'integer' },
                doctors_total: { type: 'integer' },
                avg_wait_minutes: { type: 'number' }
            }
        }
    }
};

export const departmentsSchema = {
    querystring: {
        ...commonFiltersSchema
    },
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    department_id: { type: 'integer' },
                    department_name: { type: 'string' },
                    department_code: { type: 'string' },
                    location: { type: 'string' },
                    waiting_count: { type: 'integer' },
                    avg_wait_minutes: { type: 'number' },
                    active_doctors: { type: 'integer' },
                    total_doctors: { type: 'integer' },
                    load_status: { type: 'string' }
                }
            }
        }
    }
};

export const doctorsSchema = {
    querystring: {
        ...commonFiltersSchema,
        ...paginationSchema
    },
    response: {
        200: {
            type: 'object',
            properties: {
                page: { type: 'integer' },
                pageSize: { type: 'integer' },
                total: { type: 'integer' },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            doctor_id: { type: 'integer' },
                            doctor_name: { type: 'string' },
                            department_id: { type: 'integer' },
                            department_name: { type: 'string' },
                            room_number: { type: 'string' },
                            status: { type: 'string' },
                            queue_count: { type: 'integer' },
                            patients_seen: { type: 'integer' },
                            avg_consult_minutes: { type: 'number' }
                        }
                    }
                }
            }
        }
    }
};

export const departmentDoctorsSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    },
    querystring: {
        ...commonFiltersSchema
    },
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    doctor_id: { type: 'integer' },
                    doctor_name: { type: 'string' },
                    department_id: { type: 'integer' },
                    department_name: { type: 'string' },
                    room_number: { type: 'string' },
                    status: { type: 'string' },
                    queue_count: { type: 'integer' },
                    avg_wait_minutes: { type: 'number' }
                }
            }
        }
    }
};

export const doctorExaminedSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    },
    querystring: {
        ...commonFiltersSchema,
        ...paginationSchema
    },
    response: {
        200: {
            type: 'object',
            properties: {
                page: { type: 'integer' },
                pageSize: { type: 'integer' },
                total: { type: 'integer' },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            visit_id: { type: 'integer' },
                            uhid: { type: 'string' },
                            patient_name: { type: 'string' },
                            age: { type: 'integer' },
                            gender: { type: 'string' },
                            issue: { type: 'string' },
                            diagnosis: { type: 'string' },
                            vitals: { type: ['object', 'string', 'null'] },
                            visit_type: { type: 'string' },
                            visit_time: { type: 'string' },
                            status: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
};
