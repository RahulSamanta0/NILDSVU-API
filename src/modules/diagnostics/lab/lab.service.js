/**
 * Lab Service
 *
 * Purpose:
 * - Business logic for Lab module
 */

import { generateNumber } from '../../../utils/number-generator.js';

// ── Helper: Generate order number ──────────────────────
async function generateLabOrderNumber(prisma, tenantId) {
    return await generateNumber(prisma, 'LAB', tenantId);
}

// ── Helper: Resolve patient ID (UPID or numeric) ──────
async function resolvePatientId(prisma, input, tenantId) {
    if (!isNaN(input)) return BigInt(input);
    const patient = await prisma.patients.findFirst({
        where: { upid: String(input), tenant_id: tenantId },
        select: { patient_id: true }
    });
    if (!patient) throw { statusCode: 404, error: 'Not Found', message: `Patient not found: ${input}` };
    return patient.patient_id;
}

// ── Helper: common order include for list endpoints ────
const orderListInclude = {
    patients: { select: { first_name: true, last_name: true, upid: true } },
    lab_test_items: true,
    users_lab_test_orders_ordering_doctor_idTousers: {
        include: { staff_profiles: { select: { first_name: true, last_name: true } } }
    }
};

// ══════════════════════════════════════════════════════
//  LAB TEST MASTER CRUD
// ══════════════════════════════════════════════════════

export const createLabTest = async (prisma, data, tenantId) => {
    return prisma.lab_tests.create({
        data: {
            tenant_id: tenantId,
            test_code: data.testCode,
            test_name: data.testName,
            test_category: data.testCategory || null,
            sample_type: data.sampleType || null,
            turnaround_time: data.turnaroundTime || null,
            price: data.price || null,
            is_active: true
        }
    });
};

export const listLabTests = async (prisma, query, tenantId) => {
    const where = { tenant_id: tenantId };
    if (query.category) where.test_category = query.category;
    if (query.active !== undefined) where.is_active = query.active === 'true' || query.active === true;
    if (query.search) {
        where.OR = [
            { test_name: { contains: query.search, mode: 'insensitive' } },
            { test_code: { contains: query.search, mode: 'insensitive' } }
        ];
    }
    const [tests, total] = await Promise.all([
        prisma.lab_tests.findMany({
            where,
            orderBy: { test_name: 'asc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.lab_tests.count({ where })
    ]);
    return { tests, total };
};

export const updateLabTest = async (prisma, testId, data, tenantId) => {
    const test = await prisma.lab_tests.findFirst({ where: { test_id: parseInt(testId), tenant_id: tenantId } });
    if (!test) throw { statusCode: 404, error: 'Not Found', message: 'Test not found' };
    const updateFields = {};
    if (data.testName !== undefined) updateFields.test_name = data.testName;
    if (data.testCategory !== undefined) updateFields.test_category = data.testCategory;
    if (data.sampleType !== undefined) updateFields.sample_type = data.sampleType;
    if (data.turnaroundTime !== undefined) updateFields.turnaround_time = data.turnaroundTime;
    if (data.price !== undefined) updateFields.price = data.price;
    if (data.isActive !== undefined) updateFields.is_active = data.isActive;
    return prisma.lab_tests.update({ where: { test_id: test.test_id }, data: updateFields });
};

// ══════════════════════════════════════════════════════
//  LAB ORDER CRUD
// ══════════════════════════════════════════════════════

export const createLabOrder = async (prisma, data, tenantId) => {
    const patientId = await resolvePatientId(prisma, data.patientId, tenantId);
    const orderNumber = await generateLabOrderNumber(prisma, tenantId);

    const testIds = data.tests.map(t => t.testId);
    const tests = await prisma.lab_tests.findMany({
        where: { test_id: { in: testIds }, tenant_id: tenantId, is_active: true }
    });
    if (tests.length !== testIds.length) {
        throw { statusCode: 400, error: 'Bad Request', message: 'One or more test IDs are invalid or inactive' };
    }

    const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.lab_test_orders.create({
            data: {
                tenant_id: tenantId,
                order_number: orderNumber,
                patient_id: patientId,
                visit_id: data.visitId ? BigInt(data.visitId) : null,
                admission_id: data.admissionId ? BigInt(data.admissionId) : null,
                facility_id: data.facilityId ? BigInt(data.facilityId) : null,
                ordering_doctor_id: BigInt(data.doctorId),
                priority: data.priority || 'normal',
                status: 'pending'
            }
        });

        for (const t of data.tests) {
            const testDef = tests.find(td => td.test_id === t.testId);
            await tx.lab_test_items.create({
                data: {
                    tenant_id: tenantId,
                    order_id: newOrder.order_id,
                    test_id: t.testId,
                    test_name: testDef.test_name,
                    sample_type: testDef.sample_type,
                    status: 'pending'
                }
            });
        }

        return newOrder;
    });

    return prisma.lab_test_orders.findUnique({
        where: { order_id: order.order_id },
        include: {
            patients: { select: { first_name: true, last_name: true, upid: true } },
            lab_test_items: { include: { lab_tests: true } },
            users_lab_test_orders_ordering_doctor_idTousers: {
                include: { staff_profiles: { select: { first_name: true, last_name: true } } }
            }
        }
    });
};

export const listLabOrders = async (prisma, query, tenantId) => {
    const where = { tenant_id: tenantId };
    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.date) {
        const d = new Date(query.date);
        const next = new Date(d); next.setDate(next.getDate() + 1);
        where.order_date = { gte: d, lt: next };
    }
    if (query.search) {
        where.OR = [
            { order_number: { contains: query.search, mode: 'insensitive' } },
            { patients: { first_name: { contains: query.search, mode: 'insensitive' } } },
            { patients: { upid: { contains: query.search, mode: 'insensitive' } } }
        ];
    }

    const [orders, total] = await Promise.all([
        prisma.lab_test_orders.findMany({
            where,
            include: orderListInclude,
            orderBy: { order_date: 'desc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.lab_test_orders.count({ where })
    ]);
    return { orders, total };
};

export const getLabOrderById = async (prisma, orderId, tenantId) => {
    let order = null;
    if (!isNaN(orderId)) {
        order = await prisma.lab_test_orders.findFirst({
            where: { order_id: BigInt(orderId), tenant_id: tenantId },
            include: {
                patients: { select: { first_name: true, last_name: true, upid: true, mobile_primary: true } },
                lab_test_items: { include: { lab_tests: true } },
                users_lab_test_orders_ordering_doctor_idTousers: {
                    include: { staff_profiles: { select: { first_name: true, last_name: true } } }
                }
            }
        });
    }
    if (!order) {
        order = await prisma.lab_test_orders.findFirst({
            where: { order_number: String(orderId), tenant_id: tenantId },
            include: {
                patients: { select: { first_name: true, last_name: true, upid: true, mobile_primary: true } },
                lab_test_items: { include: { lab_tests: true } },
                users_lab_test_orders_ordering_doctor_idTousers: {
                    include: { staff_profiles: { select: { first_name: true, last_name: true } } }
                }
            }
        });
    }
    if (!order) throw { statusCode: 404, error: 'Not Found', message: 'Lab order not found' };
    return order;
};

export const collectSample = async (prisma, orderId, data, tenantId) => {
    const order = await getLabOrderById(prisma, orderId, tenantId);
    if (order.sample_collected_at) {
        throw { statusCode: 400, error: 'Bad Request', message: 'Sample already collected' };
    }
    return prisma.lab_test_orders.update({
        where: { order_id: order.order_id },
        data: {
            sample_collected_at: new Date(),
            sample_collected_by: data.collectedBy ? BigInt(data.collectedBy) : null,
            status: 'in_progress'
        }
    });
};

export const cancelLabOrder = async (prisma, orderId, data, tenantId) => {
    const order = await getLabOrderById(prisma, orderId, tenantId);
    if (order.status === 'completed') {
        throw { statusCode: 400, error: 'Bad Request', message: 'Cannot cancel a completed order' };
    }
    return prisma.$transaction(async (tx) => {
        await tx.lab_test_items.updateMany({
            where: { order_id: order.order_id, tenant_id: tenantId },
            data: { status: 'cancelled' }
        });
        return tx.lab_test_orders.update({
            where: { order_id: order.order_id },
            data: { status: 'cancelled' }
        });
    });
};

// ── Reject Sample ──────────────────────────────────────
export const rejectSample = async (prisma, orderId, data, tenantId) => {
    const order = await getLabOrderById(prisma, orderId, tenantId);
    if (order.status === 'completed') {
        throw { statusCode: 400, error: 'Bad Request', message: 'Cannot reject a completed order' };
    }
    if (order.status === 'cancelled') {
        throw { statusCode: 400, error: 'Bad Request', message: 'Order is already cancelled/rejected' };
    }
    return prisma.$transaction(async (tx) => {
        await tx.lab_test_items.updateMany({
            where: { order_id: order.order_id, tenant_id: tenantId },
            data: { status: 'cancelled' }
        });
        return tx.lab_test_orders.update({
            where: { order_id: order.order_id },
            data: {
                status: 'cancelled',
                rejection_reason: data.reason,
                rejected_by: data.rejectedBy ? BigInt(data.rejectedBy) : null,
                rejected_at: new Date()
            }
        });
    });
};

export const getPatientLabHistory = async (prisma, patientId, query, tenantId) => {
    const pid = await resolvePatientId(prisma, patientId, tenantId);
    const where = { tenant_id: tenantId, patient_id: pid };
    if (query.status) where.status = query.status;

    const [orders, total] = await Promise.all([
        prisma.lab_test_orders.findMany({
            where,
            include: {
                lab_test_items: true,
                users_lab_test_orders_ordering_doctor_idTousers: {
                    include: { staff_profiles: { select: { first_name: true, last_name: true } } }
                }
            },
            orderBy: { order_date: 'desc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.lab_test_orders.count({ where })
    ]);
    return { orders, total };
};

// ══════════════════════════════════════════════════════
//  SAMPLE COLLECTION LISTS
// ══════════════════════════════════════════════════════

export const getCollectedSamples = async (prisma, query, tenantId) => {
    const where = {
        tenant_id: tenantId,
        sample_collected_at: { not: null },
        rejection_reason: null
    };
    if (query.fromDate || query.toDate) {
        const dateFilter = { not: null };
        if (query.fromDate) dateFilter.gte = new Date(query.fromDate);
        if (query.toDate) {
            const to = new Date(query.toDate);
            to.setDate(to.getDate() + 1);
            dateFilter.lt = to;
        }
        where.sample_collected_at = dateFilter;
    }

    const [orders, total] = await Promise.all([
        prisma.lab_test_orders.findMany({
            where,
            include: {
                ...orderListInclude,
                users_lab_test_orders_sample_collected_byTousers: {
                    include: { staff_profiles: { select: { first_name: true, last_name: true } } }
                }
            },
            orderBy: { sample_collected_at: 'desc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.lab_test_orders.count({ where })
    ]);
    return { orders, total };
};

export const getRejectedSamples = async (prisma, query, tenantId) => {
    const where = {
        tenant_id: tenantId,
        status: 'cancelled',
        rejection_reason: { not: null }
    };
    if (query.fromDate || query.toDate) {
        where.rejected_at = {};
        if (query.fromDate) where.rejected_at.gte = new Date(query.fromDate);
        if (query.toDate) {
            const to = new Date(query.toDate);
            to.setDate(to.getDate() + 1);
            where.rejected_at.lt = to;
        }
    }

    const [orders, total] = await Promise.all([
        prisma.lab_test_orders.findMany({
            where,
            include: {
                ...orderListInclude,
                users_lab_test_orders_rejected_byTousers: {
                    include: { staff_profiles: { select: { first_name: true, last_name: true } } }
                }
            },
            orderBy: { rejected_at: 'desc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.lab_test_orders.count({ where })
    ]);
    return { orders, total };
};

// ══════════════════════════════════════════════════════
//  DASHBOARD & REPORTING
// ══════════════════════════════════════════════════════

export const getDashboardStats = async (prisma, tenantId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
        pendingCollection,
        collectedToday,
        rejected,
        pendingProcessing,
        inProcess,
        pendingEntry,
        pendingVerification,
        critical
    ] = await Promise.all([
        prisma.lab_test_orders.count({
            where: { tenant_id: tenantId, status: 'pending', sample_collected_at: null }
        }),
        prisma.lab_test_orders.count({
            where: { tenant_id: tenantId, sample_collected_at: { gte: today } }
        }),
        prisma.lab_test_orders.count({
            where: { tenant_id: tenantId, status: 'cancelled', rejection_reason: { not: null } }
        }),
        prisma.lab_test_orders.count({
            where: { tenant_id: tenantId, status: 'pending', sample_collected_at: { not: null } }
        }),
        prisma.lab_test_orders.count({
            where: { tenant_id: tenantId, status: 'in_progress' }
        }),
        prisma.lab_test_items.count({
            where: { tenant_id: tenantId, status: 'pending', result_value: null }
        }),
        prisma.lab_test_items.count({
            where: { tenant_id: tenantId, result_value: { not: null }, verified_by: null, status: { not: 'cancelled' } }
        }),
        prisma.lab_test_items.count({
            where: { tenant_id: tenantId, is_critical: true, critical_acknowledged_at: null }
        })
    ]);

    return {
        pendingCollection,
        collectedToday,
        rejected,
        pendingProcessing,
        inProcess,
        pendingEntry,
        pendingVerification,
        critical
    };
};

export const getPendingSamples = async (prisma, tenantId) => {
    const orders = await prisma.lab_test_orders.findMany({
        where: {
            tenant_id: tenantId,
            status: 'pending',
            sample_collected_at: null
        },
        include: {
            patients: { select: { first_name: true, last_name: true } },
            lab_test_items: { include: { lab_tests: true } }
        },
        orderBy: { order_date: 'asc' },
        take: 50
    });

    return orders.map(order => ({
        id: order.order_number,
        patient: `${order.patients.first_name} ${order.patients.last_name}`,
        test: order.lab_test_items.map(item => item.lab_tests.test_name).join(', '),
        status: order.status,
        time: order.order_date ? new Date(order.order_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        priority: order.priority
    }));
};

export const updateReport = async (prisma, tenantId, data, userId) => {
    let order = null;
    const orderIdInput = data.orderId;

    if (!isNaN(orderIdInput)) {
        order = await prisma.lab_test_orders.findFirst({
            where: { order_id: BigInt(orderIdInput), tenant_id: tenantId }
        });
    }

    if (!order) {
        order = await prisma.lab_test_orders.findFirst({
            where: { order_number: String(orderIdInput), tenant_id: tenantId }
        });
    }

    if (!order || order.tenant_id !== tenantId) throw new Error("Order not found or access denied");

    const results = data.results || [];
    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
        for (const res of results) {
            const item = await tx.lab_test_items.findFirst({
                where: { order_id: order.order_id, test_id: res.testId, tenant_id: tenantId }
            });

            if (item) {
                await tx.lab_test_items.update({
                    where: { test_item_id: item.test_item_id },
                    data: {
                        result_value: res.result,
                        result_unit: res.unit || item.result_unit,
                        reference_range: res.referenceRange || item.reference_range,
                        status: res.status || 'completed',
                        verified_by: res.verifiedBy ? BigInt(res.verifiedBy) : null,
                        verified_at: res.verifiedBy ? new Date() : null,
                        result_date: new Date(),
                        remarks: res.remarks !== undefined ? res.remarks : item.remarks,
                        is_critical: res.isCritical !== undefined ? res.isCritical : item.is_critical
                    }
                });
                updatedCount++;
            }
        }
    });

    return { success: true, message: "Reports updated successfully", updatedCount };
};

// ── Acknowledge Critical Result ────────────────────────
export const acknowledgeCritical = async (prisma, testItemId, data, tenantId) => {
    const item = await prisma.lab_test_items.findFirst({
        where: { test_item_id: BigInt(testItemId), tenant_id: tenantId }
    });
    if (!item) throw { statusCode: 404, error: 'Not Found', message: 'Test item not found' };
    if (!item.is_critical) {
        throw { statusCode: 400, error: 'Bad Request', message: 'Test item is not marked as critical' };
    }
    if (item.critical_acknowledged_at) {
        throw { statusCode: 400, error: 'Bad Request', message: 'Already acknowledged' };
    }
    return prisma.lab_test_items.update({
        where: { test_item_id: item.test_item_id },
        data: {
            critical_acknowledged_by: data.acknowledgedBy ? BigInt(data.acknowledgedBy) : null,
            critical_acknowledged_at: new Date()
        }
    });
};

// ══════════════════════════════════════════════════════
//  INDIVIDUAL TEST RESULT ENTRY
// ══════════════════════════════════════════════════════

export const getPendingResultEntry = async (prisma, query, tenantId) => {
    const where = {
        tenant_id: tenantId,
        result_value: null,
        status: { in: ['pending', 'in_progress'] }
    };

    const [items, total] = await Promise.all([
        prisma.lab_test_items.findMany({
            where,
            include: {
                lab_test_orders: {
                    include: {
                        patients: { select: { first_name: true, last_name: true, upid: true } },
                        users_lab_test_orders_ordering_doctor_idTousers: {
                            include: { staff_profiles: { select: { first_name: true, last_name: true } } }
                        }
                    }
                }
            },
            orderBy: { created_at: 'asc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.lab_test_items.count({ where })
    ]);
    return { items, total };
};

export const enterTestResult = async (prisma, testItemId, data, tenantId) => {
    const item = await prisma.lab_test_items.findFirst({
        where: { test_item_id: BigInt(testItemId), tenant_id: tenantId }
    });
    if (!item) throw { statusCode: 404, error: 'Not Found', message: 'Test item not found' };
    if (item.status === 'cancelled') {
        throw { statusCode: 400, error: 'Bad Request', message: 'Cannot enter result for a cancelled test' };
    }

    const updateData = {
        result_value: data.resultValue,
        result_date: new Date(),
        status: data.status || 'completed'
    };
    if (data.resultUnit !== undefined) updateData.result_unit = data.resultUnit;
    if (data.referenceRange !== undefined) updateData.reference_range = data.referenceRange;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;
    if (data.isCritical !== undefined) updateData.is_critical = data.isCritical;
    if (data.verifiedBy) {
        updateData.verified_by = BigInt(data.verifiedBy);
        updateData.verified_at = new Date();
    }

    return prisma.lab_test_items.update({
        where: { test_item_id: item.test_item_id },
        data: updateData,
        include: {
            lab_test_orders: {
                include: {
                    patients: { select: { first_name: true, last_name: true, upid: true } },
                    users_lab_test_orders_ordering_doctor_idTousers: {
                        include: { staff_profiles: { select: { first_name: true, last_name: true } } }
                    }
                }
            }
        }
    });
};

// ══════════════════════════════════════════════════════
//  REPORTS SECTION
// ══════════════════════════════════════════════════════

// Helper for date range filters
function buildDateRange(query, field) {
    const filter = {};
    if (query.fromDate) filter.gte = new Date(query.fromDate);
    if (query.toDate) {
        const to = new Date(query.toDate);
        to.setDate(to.getDate() + 1);
        filter.lt = to;
    }
    return Object.keys(filter).length ? { [field]: filter } : {};
}

// Report: Sample Collection
export const getReportSampleCollection = async (prisma, query, tenantId) => {
    const where = {
        tenant_id: tenantId,
        sample_collected_at: { not: null }
    };
    if (query.fromDate || query.toDate) {
        const dateFilter = { not: null };
        if (query.fromDate) dateFilter.gte = new Date(query.fromDate);
        if (query.toDate) {
            const to = new Date(query.toDate);
            to.setDate(to.getDate() + 1);
            dateFilter.lt = to;
        }
        where.sample_collected_at = dateFilter;
    }

    const [orders, total] = await Promise.all([
        prisma.lab_test_orders.findMany({
            where,
            include: {
                ...orderListInclude,
                users_lab_test_orders_sample_collected_byTousers: {
                    include: { staff_profiles: { select: { first_name: true, last_name: true } } }
                }
            },
            orderBy: { sample_collected_at: 'desc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.lab_test_orders.count({ where })
    ]);
    return { orders, total };
};

// Report: Processing Log
export const getReportProcessingLog = async (prisma, query, tenantId) => {
    const where = {
        tenant_id: tenantId,
        status: { in: ['in_progress', 'completed'] },
        sample_collected_at: { not: null }
    };
    if (query.fromDate || query.toDate) {
        where.order_date = {};
        if (query.fromDate) where.order_date.gte = new Date(query.fromDate);
        if (query.toDate) {
            const to = new Date(query.toDate);
            to.setDate(to.getDate() + 1);
            where.order_date.lt = to;
        }
    }

    const [orders, total] = await Promise.all([
        prisma.lab_test_orders.findMany({
            where,
            include: orderListInclude,
            orderBy: { order_date: 'desc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.lab_test_orders.count({ where })
    ]);
    return { orders, total };
};

// Report: Result Entry
export const getReportResultEntry = async (prisma, query, tenantId) => {
    const where = {
        tenant_id: tenantId,
        result_value: { not: null }
    };
    if (query.fromDate || query.toDate) {
        where.result_date = {};
        if (query.fromDate) where.result_date.gte = new Date(query.fromDate);
        if (query.toDate) {
            const to = new Date(query.toDate);
            to.setDate(to.getDate() + 1);
            where.result_date.lt = to;
        }
    }

    const [items, total] = await Promise.all([
        prisma.lab_test_items.findMany({
            where,
            include: {
                lab_test_orders: {
                    include: {
                        patients: { select: { first_name: true, last_name: true, upid: true } },
                        users_lab_test_orders_ordering_doctor_idTousers: {
                            include: { staff_profiles: { select: { first_name: true, last_name: true } } }
                        }
                    }
                }
            },
            orderBy: { result_date: 'desc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.lab_test_items.count({ where })
    ]);
    return { items, total };
};

// Report: Rejections
export const getReportRejections = async (prisma, query, tenantId) => {
    const where = { tenant_id: tenantId, status: 'cancelled' };
    if (query.type === 'rejected') {
        where.rejection_reason = { not: null };
    } else if (query.type === 'cancelled') {
        where.rejection_reason = null;
    }
    if (query.fromDate || query.toDate) {
        where.created_at = {};
        if (query.fromDate) where.created_at.gte = new Date(query.fromDate);
        if (query.toDate) {
            const to = new Date(query.toDate);
            to.setDate(to.getDate() + 1);
            where.created_at.lt = to;
        }
    }

    const [orders, total] = await Promise.all([
        prisma.lab_test_orders.findMany({
            where,
            include: {
                ...orderListInclude,
                users_lab_test_orders_rejected_byTousers: {
                    include: { staff_profiles: { select: { first_name: true, last_name: true } } }
                }
            },
            orderBy: { created_at: 'desc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.lab_test_orders.count({ where })
    ]);
    return { orders, total };
};

// ══════════════════════════════════════════════════════
//  EXCEPTION REPORTS
// ══════════════════════════════════════════════════════

// Exception: Delayed Tests (uses raw SQL for cross-table time comparison)
export const getExceptionDelayedTests = async (prisma, query, tenantId) => {
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const tenantIdNum = Number(tenantId);

    const items = await prisma.$queryRaw`
        SELECT
            lti.test_item_id::text as "testItemId",
            lti.test_name as "testName",
            lti.status as "itemStatus",
            lti.result_value as "resultValue",
            lto.order_id::text as "orderId",
            lto.order_number as "orderNumber",
            lto.order_date as "orderDate",
            lto.sample_collected_at as "sampleCollectedAt",
            lto.status as "orderStatus",
            lto.priority as "priority",
            lt.turnaround_time as "turnaroundTime",
            p.first_name as "firstName",
            p.last_name as "lastName",
            p.upid as "upid",
            EXTRACT(EPOCH FROM (NOW() - COALESCE(lto.sample_collected_at, lto.order_date))) / 60 as "elapsedMinutes"
        FROM lab_test_items lti
        JOIN lab_test_orders lto ON lti.order_id = lto.order_id
        JOIN lab_tests lt ON lti.test_id = lt.test_id
        JOIN patients p ON lto.patient_id = p.patient_id
        WHERE lti.tenant_id = ${tenantIdNum}
          AND lti.status IN ('pending', 'in_progress')
          AND lt.turnaround_time IS NOT NULL
          AND EXTRACT(EPOCH FROM (NOW() - COALESCE(lto.sample_collected_at, lto.order_date))) / 60 > lt.turnaround_time
        ORDER BY "elapsedMinutes" DESC
        LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await prisma.$queryRaw`
        SELECT COUNT(*)::int as total
        FROM lab_test_items lti
        JOIN lab_test_orders lto ON lti.order_id = lto.order_id
        JOIN lab_tests lt ON lti.test_id = lt.test_id
        WHERE lti.tenant_id = ${tenantIdNum}
          AND lti.status IN ('pending', 'in_progress')
          AND lt.turnaround_time IS NOT NULL
          AND EXTRACT(EPOCH FROM (NOW() - COALESCE(lto.sample_collected_at, lto.order_date))) / 60 > lt.turnaround_time
    `;

    return { items, total: countResult[0]?.total || 0 };
};

// Exception: Not Collected
export const getExceptionNotCollected = async (prisma, query, tenantId) => {
    const thresholdMinutes = query.thresholdMinutes || 120;
    const thresholdDate = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const where = {
        tenant_id: tenantId,
        status: 'pending',
        sample_collected_at: null,
        order_date: { lt: thresholdDate }
    };

    const [orders, total] = await Promise.all([
        prisma.lab_test_orders.findMany({
            where,
            include: orderListInclude,
            orderBy: { order_date: 'asc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.lab_test_orders.count({ where })
    ]);
    return { orders, total };
};

// Exception: Not Processed
export const getExceptionNotProcessed = async (prisma, query, tenantId) => {
    const thresholdMinutes = query.thresholdMinutes || 60;
    const thresholdDate = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const where = {
        tenant_id: tenantId,
        sample_collected_at: { not: null, lt: thresholdDate },
        status: 'in_progress',
        lab_test_items: { every: { result_value: null } }
    };

    const [orders, total] = await Promise.all([
        prisma.lab_test_orders.findMany({
            where,
            include: orderListInclude,
            orderBy: { sample_collected_at: 'asc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.lab_test_orders.count({ where })
    ]);
    return { orders, total };
};

// Exception: Unverified Results
export const getExceptionUnverified = async (prisma, query, tenantId) => {
    const where = {
        tenant_id: tenantId,
        result_value: { not: null },
        verified_by: null,
        status: { not: 'cancelled' }
    };
    if (query.fromDate || query.toDate) {
        where.result_date = {};
        if (query.fromDate) where.result_date.gte = new Date(query.fromDate);
        if (query.toDate) {
            const to = new Date(query.toDate);
            to.setDate(to.getDate() + 1);
            where.result_date.lt = to;
        }
    }

    const [items, total] = await Promise.all([
        prisma.lab_test_items.findMany({
            where,
            include: {
                lab_test_orders: {
                    include: {
                        patients: { select: { first_name: true, last_name: true, upid: true } },
                        users_lab_test_orders_ordering_doctor_idTousers: {
                            include: { staff_profiles: { select: { first_name: true, last_name: true } } }
                        }
                    }
                }
            },
            orderBy: { result_date: 'asc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.lab_test_items.count({ where })
    ]);
    return { items, total };
};

// Exception: Critical Unacknowledged
export const getExceptionCriticalUnacknowledged = async (prisma, query, tenantId) => {
    const where = {
        tenant_id: tenantId,
        is_critical: true,
        critical_acknowledged_at: null
    };

    const [items, total] = await Promise.all([
        prisma.lab_test_items.findMany({
            where,
            include: {
                lab_test_orders: {
                    include: {
                        patients: { select: { first_name: true, last_name: true, upid: true } },
                        users_lab_test_orders_ordering_doctor_idTousers: {
                            include: { staff_profiles: { select: { first_name: true, last_name: true } } }
                        }
                    }
                }
            },
            orderBy: { result_date: 'asc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.lab_test_items.count({ where })
    ]);
    return { items, total };
};
