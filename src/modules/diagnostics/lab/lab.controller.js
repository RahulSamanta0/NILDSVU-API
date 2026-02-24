/**
 * Lab Controller
 *
 * Purpose:
 * - Handles incoming HTTP requests for Lab module
 */
import * as labService from './lab.service.js';

// ── Serializer helpers ─────────────────────────────────
function serializeLabTest(test) {
    return {
        testId: test.test_id,
        testCode: test.test_code,
        testName: test.test_name,
        testCategory: test.test_category,
        sampleType: test.sample_type,
        turnaroundTime: test.turnaround_time,
        price: test.price ? parseFloat(test.price) : null,
        isActive: test.is_active,
        createdAt: test.created_at?.toISOString()
    };
}

function serializeLabOrder(order) {
    const s = {
        orderId: order.order_id.toString(),
        orderNumber: order.order_number,
        patientId: order.patient_id.toString(),
        orderDate: order.order_date?.toISOString(),
        priority: order.priority,
        status: order.status,
        sampleCollectedAt: order.sample_collected_at?.toISOString() || null,
        rejectionReason: order.rejection_reason || null,
        rejectedAt: order.rejected_at?.toISOString() || null,
        createdAt: order.created_at?.toISOString()
    };
    if (order.patients) {
        s.patientName = `${order.patients.first_name} ${order.patients.last_name || ''}`.trim();
        s.patientUpid = order.patients.upid;
        s.patientPhone = order.patients.mobile_primary;
    }
    if (order.users_lab_test_orders_ordering_doctor_idTousers?.staff_profiles) {
        const doc = order.users_lab_test_orders_ordering_doctor_idTousers.staff_profiles;
        s.doctorName = `Dr. ${doc.first_name} ${doc.last_name || ''}`.trim();
    }
    if (order.users_lab_test_orders_rejected_byTousers?.staff_profiles) {
        const rej = order.users_lab_test_orders_rejected_byTousers.staff_profiles;
        s.rejectedByName = `${rej.first_name} ${rej.last_name || ''}`.trim();
    }
    if (order.users_lab_test_orders_sample_collected_byTousers?.staff_profiles) {
        const col = order.users_lab_test_orders_sample_collected_byTousers.staff_profiles;
        s.collectedByName = `${col.first_name} ${col.last_name || ''}`.trim();
    }
    if (order.lab_test_items) {
        s.tests = order.lab_test_items.map(item => ({
            testItemId: item.test_item_id.toString(),
            testId: item.test_id,
            testName: item.test_name,
            sampleType: item.sample_type,
            resultValue: item.result_value,
            resultUnit: item.result_unit,
            referenceRange: item.reference_range,
            status: item.status,
            resultDate: item.result_date?.toISOString() || null,
            remarks: item.remarks || null,
            isCritical: item.is_critical || false,
            criticalAcknowledgedAt: item.critical_acknowledged_at?.toISOString() || null
        }));
    }
    return s;
}

function serializeTestItem(item) {
    const s = {
        testItemId: item.test_item_id.toString(),
        testId: item.test_id,
        testName: item.test_name,
        sampleType: item.sample_type,
        resultValue: item.result_value,
        resultUnit: item.result_unit,
        referenceRange: item.reference_range,
        status: item.status,
        resultDate: item.result_date?.toISOString() || null,
        remarks: item.remarks || null,
        isCritical: item.is_critical || false,
        criticalAcknowledgedAt: item.critical_acknowledged_at?.toISOString() || null,
        verifiedAt: item.verified_at?.toISOString() || null
    };
    if (item.lab_test_orders) {
        s.orderNumber = item.lab_test_orders.order_number;
        s.orderDate = item.lab_test_orders.order_date?.toISOString();
        if (item.lab_test_orders.patients) {
            s.patientName = `${item.lab_test_orders.patients.first_name} ${item.lab_test_orders.patients.last_name || ''}`.trim();
            s.patientUpid = item.lab_test_orders.patients.upid;
        }
        if (item.lab_test_orders.users_lab_test_orders_ordering_doctor_idTousers?.staff_profiles) {
            const doc = item.lab_test_orders.users_lab_test_orders_ordering_doctor_idTousers.staff_profiles;
            s.doctorName = `Dr. ${doc.first_name} ${doc.last_name || ''}`.trim();
        }
    }
    return s;
}

// ── Paginated list response helper ─────────────────────
function paginatedResponse(data, key, request) {
    return {
        [key]: data,
        page: { limit: request.query.limit || 50, offset: request.query.offset || 0 }
    };
}

// ── Error response helper ─────────────────────────────
function handleError(error, request, reply) {
    request.log.error(error);
    if (error.statusCode) {
        return reply.code(error.statusCode).send({ error: error.error, message: error.message });
    }
    if (error.code === 'P2002') {
        return reply.code(409).send({ error: 'Conflict', message: 'Duplicate record' });
    }
    reply.code(500).send({ error: 'Internal Server Error', message: error.message || 'Unknown error' });
}

export default class LabController {
    constructor(fastify) {
        this.prisma = fastify.prisma;
    }

    // ── Test Master CRUD ───────────────────────────────
    createLabTest = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const test = await labService.createLabTest(this.prisma, request.body, tenantId);
            return reply.code(201).send(serializeLabTest(test));
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    listLabTests = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { tests, total } = await labService.listLabTests(this.prisma, request.query, tenantId);
            return { tests: tests.map(serializeLabTest), total };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    updateLabTest = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const test = await labService.updateLabTest(this.prisma, request.params.testId, request.body, tenantId);
            return serializeLabTest(test);
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    // ── Order CRUD ─────────────────────────────────────
    createLabOrder = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const order = await labService.createLabOrder(this.prisma, request.body, tenantId);
            return reply.code(201).send(serializeLabOrder(order));
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    listLabOrders = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { orders, total } = await labService.listLabOrders(this.prisma, request.query, tenantId);
            return {
                orders: orders.map(serializeLabOrder),
                total,
                page: { limit: request.query.limit || 50, offset: request.query.offset || 0 }
            };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    getLabOrderById = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const order = await labService.getLabOrderById(this.prisma, request.params.orderId, tenantId);
            return serializeLabOrder(order);
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    collectSample = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const order = await labService.collectSample(this.prisma, request.params.orderId, request.body, tenantId);
            return {
                orderId: order.order_id.toString(),
                orderNumber: order.order_number,
                status: order.status,
                sampleCollectedAt: order.sample_collected_at?.toISOString()
            };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    cancelLabOrder = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const order = await labService.cancelLabOrder(this.prisma, request.params.orderId, request.body, tenantId);
            return {
                orderId: order.order_id.toString(),
                orderNumber: order.order_number,
                status: order.status
            };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    rejectSample = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const body = { ...request.body };
            if (!body.rejectedBy && request.user?.user_id) {
                body.rejectedBy = String(request.user.user_id);
            }
            const order = await labService.rejectSample(this.prisma, request.params.orderId, body, tenantId);
            return {
                orderId: order.order_id.toString(),
                orderNumber: order.order_number,
                status: order.status,
                rejectionReason: order.rejection_reason,
                rejectedAt: order.rejected_at?.toISOString()
            };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    getPatientLabHistory = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { orders, total } = await labService.getPatientLabHistory(this.prisma, request.params.patientId, request.query, tenantId);
            return {
                orders: orders.map(serializeLabOrder),
                total,
                page: { limit: request.query.limit || 50, offset: request.query.offset || 0 }
            };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    // ── Sample Collection Lists ────────────────────────
    getCollectedSamples = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { orders, total } = await labService.getCollectedSamples(this.prisma, request.query, tenantId);
            return { orders: orders.map(serializeLabOrder), total, page: { limit: request.query.limit || 50, offset: request.query.offset || 0 } };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    getRejectedSamples = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { orders, total } = await labService.getRejectedSamples(this.prisma, request.query, tenantId);
            return { orders: orders.map(serializeLabOrder), total, page: { limit: request.query.limit || 50, offset: request.query.offset || 0 } };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    // ── Dashboard ──────────────────────────────────────
    getDashboardStats = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const stats = await labService.getDashboardStats(this.prisma, tenantId);
            return stats;
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    getPendingSamples = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const samples = await labService.getPendingSamples(this.prisma, tenantId);
            return samples;
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    getCollectionTrend = async (request, reply) => {
        return [
            { date: "1 Jan", count: 120 }, { date: "5 Jan", count: 145 }, { date: "10 Jan", count: 132 },
            { date: "15 Jan", count: 155 }, { date: "20 Jan", count: 140 }, { date: "25 Jan", count: 160 }, { date: "30 Jan", count: 150 },
        ];
    };

    getProcessingLoad = async (request, reply) => {
        return [
            { name: "Biochem", value: 450 }, { name: "Hemat", value: 320 }, { name: "Micro", value: 150 }, { name: "Immuno", value: 80 },
        ];
    };

    updateReport = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const result = await labService.updateReport(this.prisma, tenantId, request.body, request.user?.user_id);
            return result;
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    // ── Acknowledge Critical Result ────────────────────
    acknowledgeCritical = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const body = { ...request.body };
            if (!body.acknowledgedBy && request.user?.user_id) {
                body.acknowledgedBy = String(request.user.user_id);
            }
            const item = await labService.acknowledgeCritical(this.prisma, request.params.testItemId, body, tenantId);
            return {
                testItemId: item.test_item_id.toString(),
                testName: item.test_name,
                isCritical: item.is_critical,
                criticalAcknowledgedAt: item.critical_acknowledged_at?.toISOString()
            };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    // ── Individual Test Result Entry ────────────────────
    getPendingResultEntry = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { items, total } = await labService.getPendingResultEntry(this.prisma, request.query, tenantId);
            return { items: items.map(serializeTestItem), total, page: { limit: request.query.limit || 50, offset: request.query.offset || 0 } };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    enterTestResult = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const item = await labService.enterTestResult(this.prisma, request.params.testItemId, request.body, tenantId);
            return serializeTestItem(item);
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    // ── Reports Section ────────────────────────────────
    getReportSampleCollection = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { orders, total } = await labService.getReportSampleCollection(this.prisma, request.query, tenantId);
            return { orders: orders.map(serializeLabOrder), total, page: { limit: request.query.limit || 50, offset: request.query.offset || 0 } };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    getReportProcessingLog = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { orders, total } = await labService.getReportProcessingLog(this.prisma, request.query, tenantId);
            return { orders: orders.map(serializeLabOrder), total, page: { limit: request.query.limit || 50, offset: request.query.offset || 0 } };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    getReportResultEntry = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { items, total } = await labService.getReportResultEntry(this.prisma, request.query, tenantId);
            return { items: items.map(serializeTestItem), total, page: { limit: request.query.limit || 50, offset: request.query.offset || 0 } };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    getReportRejections = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { orders, total } = await labService.getReportRejections(this.prisma, request.query, tenantId);
            return { orders: orders.map(serializeLabOrder), total, page: { limit: request.query.limit || 50, offset: request.query.offset || 0 } };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    // ── Exception Reports ──────────────────────────────
    getExceptionDelayedTests = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const result = await labService.getExceptionDelayedTests(this.prisma, request.query, tenantId);
            return result;
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    getExceptionNotCollected = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { orders, total } = await labService.getExceptionNotCollected(this.prisma, request.query, tenantId);
            return { orders: orders.map(serializeLabOrder), total, page: { limit: request.query.limit || 50, offset: request.query.offset || 0 } };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    getExceptionNotProcessed = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { orders, total } = await labService.getExceptionNotProcessed(this.prisma, request.query, tenantId);
            return { orders: orders.map(serializeLabOrder), total, page: { limit: request.query.limit || 50, offset: request.query.offset || 0 } };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    getExceptionUnverified = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { items, total } = await labService.getExceptionUnverified(this.prisma, request.query, tenantId);
            return { items: items.map(serializeTestItem), total, page: { limit: request.query.limit || 50, offset: request.query.offset || 0 } };
        } catch (error) {
            handleError(error, request, reply);
        }
    };

    getExceptionCriticalUnacknowledged = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { items, total } = await labService.getExceptionCriticalUnacknowledged(this.prisma, request.query, tenantId);
            return { items: items.map(serializeTestItem), total, page: { limit: request.query.limit || 50, offset: request.query.offset || 0 } };
        } catch (error) {
            handleError(error, request, reply);
        }
    };
}
