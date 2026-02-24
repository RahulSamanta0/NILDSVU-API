/**
 * Radiology Module Schema
 *
 * Purpose:
 * - JSON Schema validation for Radiology API
 */

const orderStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
const priorityLevels = ['normal', 'urgent', 'emergency'];

// ══════════════════════════════════════════════════════
//  STUDIES MASTER SCHEMAS
// ══════════════════════════════════════════════════════

export const createStudySchema = {
    body: {
        type: 'object',
        required: ['studyCode', 'studyName'],
        properties: {
            studyCode: { type: 'string', maxLength: 50 },
            studyName: { type: 'string', maxLength: 255 },
            modality: { type: 'string', maxLength: 50, description: 'e.g. X-Ray, CT, MRI, Ultrasound' },
            bodyPart: { type: 'string', maxLength: 100 },
            price: { type: 'number' }
        }
    },
    response: {
        201: {
            type: 'object',
            properties: {
                studyId: { type: 'integer' },
                studyCode: { type: 'string' },
                studyName: { type: 'string' },
                modality: { type: 'string' },
                bodyPart: { type: 'string' },
                price: { type: 'number' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string' }
            },
            additionalProperties: true
        }
    }
};

export const listStudiesSchema = {
    querystring: {
        type: 'object',
        properties: {
            modality: { type: 'string' },
            active: { type: 'string' },
            search: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'integer', minimum: 0, default: 0 }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                studies: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            studyId: { type: 'integer' },
                            studyCode: { type: 'string' },
                            studyName: { type: 'string' },
                            modality: { type: 'string' },
                            bodyPart: { type: 'string' },
                            price: { type: 'number' },
                            isActive: { type: 'boolean' }
                        },
                        additionalProperties: true
                    }
                },
                total: { type: 'integer' }
            }
        }
    }
};

export const updateStudySchema = {
    params: {
        type: 'object',
        required: ['studyId'],
        properties: {
            studyId: { type: 'string' }
        }
    },
    body: {
        type: 'object',
        properties: {
            studyName: { type: 'string', maxLength: 255 },
            modality: { type: 'string', maxLength: 50 },
            bodyPart: { type: 'string', maxLength: 100 },
            price: { type: 'number' },
            isActive: { type: 'boolean' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                studyId: { type: 'integer' },
                studyCode: { type: 'string' },
                studyName: { type: 'string' },
                modality: { type: 'string' },
                bodyPart: { type: 'string' },
                price: { type: 'number' },
                isActive: { type: 'boolean' }
            },
            additionalProperties: true
        }
    }
};

// ══════════════════════════════════════════════════════
//  ORDER SCHEMAS
// ══════════════════════════════════════════════════════

export const createOrderSchema = {
    body: {
        type: 'object',
        required: ['patientId', 'doctorId', 'studies'],
        properties: {
            patientId: { type: 'string', description: 'Patient UPID or numeric ID' },
            doctorId: { type: 'string', description: 'Ordering doctor user ID' },
            visitId: { type: 'string' },
            admissionId: { type: 'string' },
            facilityId: { type: 'string' },
            priority: { type: 'string', enum: priorityLevels, default: 'normal' },
            studies: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['studyId'],
                    properties: {
                        studyId: { type: 'integer', minimum: 1 },
                        bodyPart: { type: 'string', maxLength: 100 },
                        clinicalIndication: { type: 'string' }
                    }
                }
            }
        }
    },
    response: {
        201: {
            type: 'object',
            properties: {
                orderId: { type: 'string' },
                orderNumber: { type: 'string' },
                patientId: { type: 'string' },
                patientName: { type: 'string' },
                orderDate: { type: 'string' },
                priority: { type: 'string' },
                status: { type: 'string' },
                doctorName: { type: 'string' },
                studies: { type: 'array' }
            },
            additionalProperties: true
        }
    }
};

export const listOrdersSchema = {
    querystring: {
        type: 'object',
        properties: {
            status: { type: 'string', enum: orderStatuses },
            priority: { type: 'string', enum: priorityLevels },
            date: { type: 'string', format: 'date' },
            search: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'integer', minimum: 0, default: 0 }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                orders: { type: 'array' },
                total: { type: 'integer' },
                page: {
                    type: 'object',
                    properties: {
                        limit: { type: 'integer' },
                        offset: { type: 'integer' }
                    }
                }
            },
            additionalProperties: true
        }
    }
};

export const getOrderByIdSchema = {
    params: {
        type: 'object',
        required: ['orderId'],
        properties: {
            orderId: { type: 'string', description: 'Order number (RAD-YYYY-XXXXX) or numeric ID' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                orderId: { type: 'string' },
                orderNumber: { type: 'string' },
                patientId: { type: 'string' },
                patientName: { type: 'string' },
                orderDate: { type: 'string' },
                priority: { type: 'string' },
                status: { type: 'string' },
                doctorName: { type: 'string' },
                studies: { type: 'array' }
            },
            additionalProperties: true
        }
    }
};

export const cancelOrderSchema = {
    params: {
        type: 'object',
        required: ['orderId'],
        properties: {
            orderId: { type: 'string' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                orderId: { type: 'string' },
                orderNumber: { type: 'string' },
                status: { type: 'string' }
            },
            additionalProperties: true
        }
    }
};

export const updateReportSchema = {
    body: {
        type: 'object',
        required: ['orderId', 'results'],
        properties: {
            orderId: { type: 'string' },
            results: {
                type: 'array',
                items: {
                    type: 'object',
                    required: ['studyId'],
                    properties: {
                        studyId: { type: 'integer' },
                        reportText: { type: 'string' },
                        impressions: { type: 'string' },
                        reportUrl: { type: 'string' },
                        imagesUrl: { type: 'array', items: { type: 'string' } },
                        status: { type: 'string', enum: ['completed', 'pending', 'in_progress'] },
                        performedBy: { type: 'integer' },
                        radiologistId: { type: 'integer' }
                    }
                }
            }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                updatedCount: { type: 'integer' }
            }
        }
    }
};

export const getPatientHistorySchema = {
    params: {
        type: 'object',
        required: ['patientId'],
        properties: {
            patientId: { type: 'string', description: 'Patient UPID or numeric ID' }
        }
    },
    querystring: {
        type: 'object',
        properties: {
            status: { type: 'string', enum: orderStatuses },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'integer', minimum: 0, default: 0 }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                orders: { type: 'array' },
                total: { type: 'integer' },
                page: {
                    type: 'object',
                    properties: {
                        limit: { type: 'integer' },
                        offset: { type: 'integer' }
                    }
                }
            },
            additionalProperties: true
        }
    }
};

// ══════════════════════════════════════════════════════
//  DASHBOARD SCHEMA
// ══════════════════════════════════════════════════════

export const getDashboardStatsSchema = {
    response: {
        200: {
            type: 'object',
            properties: {
                pending: { type: 'integer' },
                scheduledToday: { type: 'integer' },
                inProgress: { type: 'integer' },
                completed: { type: 'integer' },
                cancelled: { type: 'integer' }
            }
        }
    }
};
