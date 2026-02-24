/**
 * Lab Module Schema
 *
 * Purpose:
 * - JSON Schema validation for Lab API
 */

const orderStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
const priorityLevels = ['normal', 'urgent', 'emergency'];

// ══════════════════════════════════════════════════════
//  TEST MASTER SCHEMAS
// ══════════════════════════════════════════════════════

export const createLabTestSchema = {
    body: {
        type: 'object',
        required: ['testCode', 'testName'],
        properties: {
            testCode: { type: 'string', maxLength: 50 },
            testName: { type: 'string', maxLength: 255 },
            testCategory: { type: 'string', maxLength: 100 },
            sampleType: { type: 'string', maxLength: 100 },
            turnaroundTime: { type: 'integer', description: 'Turnaround time in minutes' },
            price: { type: 'number' }
        }
    },
    response: {
        201: {
            type: 'object',
            properties: {
                testId: { type: 'integer' },
                testCode: { type: 'string' },
                testName: { type: 'string' },
                testCategory: { type: 'string' },
                sampleType: { type: 'string' },
                turnaroundTime: { type: 'integer' },
                price: { type: 'number' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string' }
            },
            additionalProperties: true
        }
    }
};

export const listLabTestsSchema = {
    querystring: {
        type: 'object',
        properties: {
            category: { type: 'string' },
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
                tests: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            testId: { type: 'integer' },
                            testCode: { type: 'string' },
                            testName: { type: 'string' },
                            testCategory: { type: 'string' },
                            sampleType: { type: 'string' },
                            turnaroundTime: { type: 'integer' },
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

export const updateLabTestSchema = {
    params: {
        type: 'object',
        required: ['testId'],
        properties: {
            testId: { type: 'string' }
        }
    },
    body: {
        type: 'object',
        properties: {
            testName: { type: 'string', maxLength: 255 },
            testCategory: { type: 'string', maxLength: 100 },
            sampleType: { type: 'string', maxLength: 100 },
            turnaroundTime: { type: 'integer' },
            price: { type: 'number' },
            isActive: { type: 'boolean' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                testId: { type: 'integer' },
                testCode: { type: 'string' },
                testName: { type: 'string' },
                testCategory: { type: 'string' },
                sampleType: { type: 'string' },
                turnaroundTime: { type: 'integer' },
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

export const createLabOrderSchema = {
    body: {
        type: 'object',
        required: ['patientId', 'doctorId', 'tests'],
        properties: {
            patientId: { type: 'string', description: 'Patient UPID or numeric ID' },
            doctorId: { type: 'string', description: 'Ordering doctor user ID' },
            visitId: { type: 'string', description: 'OPD visit ID (optional)' },
            admissionId: { type: 'string', description: 'IPD admission ID (optional)' },
            facilityId: { type: 'string', description: 'Facility ID (optional)' },
            priority: { type: 'string', enum: priorityLevels, default: 'normal' },
            tests: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['testId'],
                    properties: {
                        testId: { type: 'integer', minimum: 1 }
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
                patientUpid: { type: 'string' },
                orderDate: { type: 'string' },
                priority: { type: 'string' },
                status: { type: 'string' },
                doctorName: { type: 'string' },
                tests: { type: 'array' }
            },
            additionalProperties: true
        }
    }
};

export const listLabOrdersSchema = {
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

export const getLabOrderByIdSchema = {
    params: {
        type: 'object',
        required: ['orderId'],
        properties: {
            orderId: { type: 'string', description: 'Order number (LAB-YYYY-XXXXX) or numeric ID' }
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
                patientUpid: { type: 'string' },
                orderDate: { type: 'string' },
                priority: { type: 'string' },
                status: { type: 'string' },
                doctorName: { type: 'string' },
                tests: { type: 'array' }
            },
            additionalProperties: true
        }
    }
};

export const collectSampleSchema = {
    params: {
        type: 'object',
        required: ['orderId'],
        properties: {
            orderId: { type: 'string' }
        }
    },
    body: {
        type: 'object',
        properties: {
            collectedBy: { type: 'string', description: 'User ID of sample collector' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                orderId: { type: 'string' },
                orderNumber: { type: 'string' },
                status: { type: 'string' },
                sampleCollectedAt: { type: 'string' }
            },
            additionalProperties: true
        }
    }
};

export const cancelLabOrderSchema = {
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

export const getPatientLabHistorySchema = {
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
//  DASHBOARD SCHEMAS (existing)
// ══════════════════════════════════════════════════════

export const getDashboardStatsSchema = {
    response: {
        200: {
            type: 'object',
            properties: {
                pendingCollection: { type: 'integer' },
                collectedToday: { type: 'integer' },
                rejected: { type: 'integer' },
                pendingProcessing: { type: 'integer' },
                inProcess: { type: 'integer' },
                pendingEntry: { type: 'integer' },
                pendingVerification: { type: 'integer' },
                critical: { type: 'integer' }
            }
        }
    }
};

export const getPendingSamplesSchema = {
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    patient: { type: 'string' },
                    test: { type: 'string' },
                    status: { type: 'string' },
                    time: { type: 'string' },
                    priority: { type: 'string' }
                }
            }
        }
    }
};

export const getCollectionTrendSchema = {
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    date: { type: 'string' },
                    count: { type: 'number' }
                }
            }
        }
    }
};

export const getProcessingLoadSchema = {
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    value: { type: 'number' }
                }
            }
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
                    required: ['testId', 'result'],
                    properties: {
                        testId: { type: 'integer' },
                        result: { type: 'string' },
                        referenceRange: { type: 'string' },
                        unit: { type: 'string' },
                        status: { type: 'string', enum: ['completed', 'pending', 'verified'] },
                        notes: { type: 'string' },
                        verifiedBy: { type: 'integer' },
                        remarks: { type: 'string', description: 'Doctor remarks/opinion for this test' },
                        isCritical: { type: 'boolean', description: 'Mark result as critical' }
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

// ══════════════════════════════════════════════════════
//  COMMON REUSABLE SCHEMAS
// ══════════════════════════════════════════════════════

const dateRangeQuerystring = {
    type: 'object',
    properties: {
        fromDate: { type: 'string', format: 'date' },
        toDate: { type: 'string', format: 'date' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
        offset: { type: 'integer', minimum: 0, default: 0 }
    }
};

const paginatedListResponse = {
    type: 'object',
    properties: {
        orders: { type: 'array' },
        total: { type: 'integer' },
        page: { type: 'object', properties: { limit: { type: 'integer' }, offset: { type: 'integer' } } }
    },
    additionalProperties: true
};

const paginatedItemsResponse = {
    type: 'object',
    properties: {
        items: { type: 'array' },
        total: { type: 'integer' },
        page: { type: 'object', properties: { limit: { type: 'integer' }, offset: { type: 'integer' } } }
    },
    additionalProperties: true
};

// ══════════════════════════════════════════════════════
//  SAMPLE COLLECTION SCHEMAS
// ══════════════════════════════════════════════════════

export const rejectSampleSchema = {
    params: {
        type: 'object',
        required: ['orderId'],
        properties: { orderId: { type: 'string' } }
    },
    body: {
        type: 'object',
        required: ['reason'],
        properties: {
            reason: { type: 'string', maxLength: 500 },
            rejectedBy: { type: 'string', description: 'User ID of person rejecting' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                orderId: { type: 'string' },
                orderNumber: { type: 'string' },
                status: { type: 'string' },
                rejectionReason: { type: 'string' },
                rejectedAt: { type: 'string' }
            },
            additionalProperties: true
        }
    }
};

export const getCollectedSamplesSchema = {
    querystring: dateRangeQuerystring,
    response: { 200: paginatedListResponse }
};

export const getRejectedSamplesSchema = {
    querystring: dateRangeQuerystring,
    response: { 200: paginatedListResponse }
};

export const acknowledgeCriticalSchema = {
    params: {
        type: 'object',
        required: ['testItemId'],
        properties: { testItemId: { type: 'string' } }
    },
    body: {
        type: 'object',
        properties: {
            acknowledgedBy: { type: 'string', description: 'User ID acknowledging the critical result' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                testItemId: { type: 'string' },
                testName: { type: 'string' },
                isCritical: { type: 'boolean' },
                criticalAcknowledgedAt: { type: 'string' }
            },
            additionalProperties: true
        }
    }
};

// ══════════════════════════════════════════════════════
//  INDIVIDUAL TEST RESULT ENTRY SCHEMAS
// ══════════════════════════════════════════════════════

export const getPendingResultEntrySchema = {
    querystring: {
        type: 'object',
        properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'integer', minimum: 0, default: 0 }
        }
    },
    response: { 200: paginatedItemsResponse }
};

export const enterTestResultSchema = {
    params: {
        type: 'object',
        required: ['testItemId'],
        properties: { testItemId: { type: 'string' } }
    },
    body: {
        type: 'object',
        required: ['resultValue'],
        properties: {
            resultValue: { type: 'string', maxLength: 500, description: 'Test result value' },
            resultUnit: { type: 'string', maxLength: 50, description: 'Unit of measurement' },
            referenceRange: { type: 'string', maxLength: 100, description: 'Normal reference range' },
            remarks: { type: 'string', description: 'Doctor/lab tech opinion or remarks for this test' },
            isCritical: { type: 'boolean', description: 'Mark result as critical' },
            status: { type: 'string', enum: ['completed', 'pending', 'verified'], default: 'completed' },
            verifiedBy: { type: 'string', description: 'User ID of verifier (optional)' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                testItemId: { type: 'string' },
                testId: { type: 'integer' },
                testName: { type: 'string' },
                sampleType: { type: 'string' },
                resultValue: { type: 'string' },
                resultUnit: { type: 'string' },
                referenceRange: { type: 'string' },
                status: { type: 'string' },
                resultDate: { type: 'string' },
                remarks: { type: 'string' },
                isCritical: { type: 'boolean' },
                orderNumber: { type: 'string' },
                patientName: { type: 'string' },
                patientUpid: { type: 'string' },
                doctorName: { type: 'string' }
            },
            additionalProperties: true
        }
    }
};

// ══════════════════════════════════════════════════════
//  REPORTS SECTION SCHEMAS
// ══════════════════════════════════════════════════════

export const getReportSampleCollectionSchema = {
    querystring: dateRangeQuerystring,
    response: { 200: paginatedListResponse }
};

export const getReportProcessingLogSchema = {
    querystring: dateRangeQuerystring,
    response: { 200: paginatedListResponse }
};

export const getReportResultEntrySchema = {
    querystring: dateRangeQuerystring,
    response: { 200: paginatedItemsResponse }
};

export const getReportRejectionsSchema = {
    querystring: {
        type: 'object',
        properties: {
            type: { type: 'string', enum: ['rejected', 'cancelled', 'all'], description: 'Filter by type: rejected only, cancelled only, or all' },
            fromDate: { type: 'string', format: 'date' },
            toDate: { type: 'string', format: 'date' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'integer', minimum: 0, default: 0 }
        }
    },
    response: { 200: paginatedListResponse }
};

// ══════════════════════════════════════════════════════
//  EXCEPTION REPORTS SCHEMAS
// ══════════════════════════════════════════════════════

export const getExceptionDelayedTestsSchema = {
    querystring: {
        type: 'object',
        properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'integer', minimum: 0, default: 0 }
        }
    },
    response: { 200: paginatedItemsResponse }
};

export const getExceptionNotCollectedSchema = {
    querystring: {
        type: 'object',
        properties: {
            thresholdMinutes: { type: 'integer', default: 120, description: 'Minutes since order to consider as exception' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'integer', minimum: 0, default: 0 }
        }
    },
    response: { 200: paginatedListResponse }
};

export const getExceptionNotProcessedSchema = {
    querystring: {
        type: 'object',
        properties: {
            thresholdMinutes: { type: 'integer', default: 60, description: 'Minutes since collection to consider as exception' },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'integer', minimum: 0, default: 0 }
        }
    },
    response: { 200: paginatedListResponse }
};

export const getExceptionUnverifiedSchema = {
    querystring: dateRangeQuerystring,
    response: { 200: paginatedItemsResponse }
};

export const getExceptionCriticalUnacknowledgedSchema = {
    querystring: {
        type: 'object',
        properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'integer', minimum: 0, default: 0 }
        }
    },
    response: { 200: paginatedItemsResponse }
};
