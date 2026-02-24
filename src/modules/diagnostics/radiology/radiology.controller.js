/**
 * Radiology Controller
 *
 * Purpose:
 * - Handles incoming HTTP requests for Radiology module
 */
import * as radiologyService from './radiology.service.js';

// ── Serializer helpers ─────────────────────────────────
function serializeStudy(study) {
    return {
        studyId: study.study_id,
        studyCode: study.study_code,
        studyName: study.study_name,
        modality: study.modality,
        bodyPart: study.body_part,
        price: study.price ? parseFloat(study.price) : null,
        isActive: study.is_active,
        createdAt: study.created_at?.toISOString()
    };
}

function serializeOrder(order) {
    const s = {
        orderId: order.order_id.toString(),
        orderNumber: order.order_number,
        patientId: order.patient_id.toString(),
        orderDate: order.order_date?.toISOString(),
        priority: order.priority,
        status: order.status,
        createdAt: order.created_at?.toISOString()
    };
    if (order.patients) {
        s.patientName = `${order.patients.first_name} ${order.patients.last_name || ''}`.trim();
        s.patientUpid = order.patients.upid;
        s.patientPhone = order.patients.mobile_primary;
    }
    if (order.users_radiology_orders_ordering_doctor_idTousers?.staff_profiles) {
        const doc = order.users_radiology_orders_ordering_doctor_idTousers.staff_profiles;
        s.doctorName = `Dr. ${doc.first_name} ${doc.last_name || ''}`.trim();
    }
    if (order.radiology_order_items) {
        s.studies = order.radiology_order_items.map(item => ({
            itemId: item.item_id.toString(),
            studyId: item.study_id,
            studyName: item.study_name,
            bodyPart: item.body_part,
            clinicalIndication: item.clinical_indication,
            status: item.status,
            reportText: item.report_text,
            impressions: item.impressions,
            reportUrl: item.report_url,
            imagesUrl: item.images_url,
            performedAt: item.performed_at?.toISOString() || null,
            verifiedAt: item.verified_at?.toISOString() || null
        }));
    }
    return s;
}

export default class RadiologyController {
    constructor(fastify) {
        this.prisma = fastify.prisma;
    }

    // ── Studies Master CRUD ────────────────────────────
    createStudy = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const study = await radiologyService.createStudy(this.prisma, request.body, tenantId);
            return reply.code(201).send(serializeStudy(study));
        } catch (error) {
            request.log.error(error);
            if (error.code === 'P2002') return reply.code(409).send({ error: 'Conflict', message: 'Study code already exists' });
            if (error.statusCode) return reply.code(error.statusCode).send({ error: error.error, message: error.message });
            reply.code(500).send({ error: 'Internal Server Error' });
        }
    };

    listStudies = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { studies, total } = await radiologyService.listStudies(this.prisma, request.query, tenantId);
            return { studies: studies.map(serializeStudy), total };
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({ error: 'Internal Server Error' });
        }
    };

    updateStudy = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const study = await radiologyService.updateStudy(this.prisma, request.params.studyId, request.body, tenantId);
            return serializeStudy(study);
        } catch (error) {
            request.log.error(error);
            if (error.statusCode) return reply.code(error.statusCode).send({ error: error.error, message: error.message });
            reply.code(500).send({ error: 'Internal Server Error' });
        }
    };

    // ── Order CRUD ─────────────────────────────────────
    createOrder = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const order = await radiologyService.createOrder(this.prisma, request.body, tenantId);
            return reply.code(201).send(serializeOrder(order));
        } catch (error) {
            request.log.error(error);
            if (error.statusCode) return reply.code(error.statusCode).send({ error: error.error, message: error.message });
            reply.code(500).send({ error: 'Internal Server Error' });
        }
    };

    listOrders = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { orders, total } = await radiologyService.listOrders(this.prisma, request.query, tenantId);
            return {
                orders: orders.map(serializeOrder),
                total,
                page: { limit: request.query.limit || 50, offset: request.query.offset || 0 }
            };
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({ error: 'Internal Server Error' });
        }
    };

    getOrderById = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const order = await radiologyService.getOrderById(this.prisma, request.params.orderId, tenantId);
            return serializeOrder(order);
        } catch (error) {
            request.log.error(error);
            if (error.statusCode) return reply.code(error.statusCode).send({ error: error.error, message: error.message });
            reply.code(500).send({ error: 'Internal Server Error' });
        }
    };

    cancelOrder = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const order = await radiologyService.cancelOrder(this.prisma, request.params.orderId, tenantId);
            return {
                orderId: order.order_id.toString(),
                orderNumber: order.order_number,
                status: order.status
            };
        } catch (error) {
            request.log.error(error);
            if (error.statusCode) return reply.code(error.statusCode).send({ error: error.error, message: error.message });
            reply.code(500).send({ error: 'Internal Server Error' });
        }
    };

    updateReport = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const result = await radiologyService.updateReport(this.prisma, tenantId, request.body);
            return result;
        } catch (error) {
            request.log.error(error);
            if (error.statusCode) return reply.code(error.statusCode).send({ error: error.error, message: error.message });
            reply.code(500).send({ error: error.message });
        }
    };

    getPatientHistory = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const { orders, total } = await radiologyService.getPatientHistory(this.prisma, request.params.patientId, request.query, tenantId);
            return {
                orders: orders.map(serializeOrder),
                total,
                page: { limit: request.query.limit || 50, offset: request.query.offset || 0 }
            };
        } catch (error) {
            request.log.error(error);
            if (error.statusCode) return reply.code(error.statusCode).send({ error: error.error, message: error.message });
            reply.code(500).send({ error: 'Internal Server Error' });
        }
    };

    // ── Dashboard ──────────────────────────────────────
    getDashboardStats = async (request, reply) => {
        try {
            const tenantId = BigInt(request.user?.tenant_id || 1);
            const stats = await radiologyService.getDashboardStats(this.prisma, tenantId);
            return stats;
        } catch (error) {
            request.log.error(error);
            reply.code(500).send({ error: 'Internal Server Error' });
        }
    };
}
