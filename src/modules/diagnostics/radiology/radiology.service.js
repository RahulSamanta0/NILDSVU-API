/**
 * Radiology Service
 *
 * Purpose:
 * - Business logic for Radiology module
 */

import { generateNumber } from '../../../utils/number-generator.js';

// ── Helper: Generate order number ──────────────────────
async function generateRadiologyOrderNumber(prisma, tenantId) {
    return await generateNumber(prisma, 'RAD', tenantId);
}

// ── Helper: Resolve patient ID ─────────────────────────
async function resolvePatientId(prisma, input, tenantId) {
    if (!isNaN(input)) return BigInt(input);
    const patient = await prisma.patients.findFirst({
        where: { upid: String(input), tenant_id: tenantId },
        select: { patient_id: true }
    });
    if (!patient) throw { statusCode: 404, error: 'Not Found', message: `Patient not found: ${input}` };
    return patient.patient_id;
}

// ══════════════════════════════════════════════════════
//  RADIOLOGY STUDIES MASTER CRUD
// ══════════════════════════════════════════════════════

export const createStudy = async (prisma, data, tenantId) => {
    return prisma.radiology_studies.create({
        data: {
            tenant_id: tenantId,
            study_code: data.studyCode,
            study_name: data.studyName,
            modality: data.modality || null,
            body_part: data.bodyPart || null,
            price: data.price || null,
            is_active: true
        }
    });
};

export const listStudies = async (prisma, query, tenantId) => {
    const where = { tenant_id: tenantId };
    if (query.modality) where.modality = query.modality;
    if (query.active !== undefined) where.is_active = query.active === 'true' || query.active === true;
    if (query.search) {
        where.OR = [
            { study_name: { contains: query.search, mode: 'insensitive' } },
            { study_code: { contains: query.search, mode: 'insensitive' } }
        ];
    }
    const [studies, total] = await Promise.all([
        prisma.radiology_studies.findMany({
            where,
            orderBy: { study_name: 'asc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.radiology_studies.count({ where })
    ]);
    return { studies, total };
};

export const updateStudy = async (prisma, studyId, data, tenantId) => {
    const study = await prisma.radiology_studies.findFirst({ where: { study_id: parseInt(studyId), tenant_id: tenantId } });
    if (!study) throw { statusCode: 404, error: 'Not Found', message: 'Study not found' };
    const updateFields = {};
    if (data.studyName !== undefined) updateFields.study_name = data.studyName;
    if (data.modality !== undefined) updateFields.modality = data.modality;
    if (data.bodyPart !== undefined) updateFields.body_part = data.bodyPart;
    if (data.price !== undefined) updateFields.price = data.price;
    if (data.isActive !== undefined) updateFields.is_active = data.isActive;
    return prisma.radiology_studies.update({ where: { study_id: study.study_id }, data: updateFields });
};

// ══════════════════════════════════════════════════════
//  RADIOLOGY ORDER CRUD
// ══════════════════════════════════════════════════════

export const createOrder = async (prisma, data, tenantId) => {
    const patientId = await resolvePatientId(prisma, data.patientId, tenantId);
    const orderNumber = await generateRadiologyOrderNumber(prisma, tenantId);

    // Validate studies exist
    const studyIds = data.studies.map(s => s.studyId);
    const studies = await prisma.radiology_studies.findMany({
        where: { study_id: { in: studyIds }, tenant_id: tenantId, is_active: true }
    });
    if (studies.length !== studyIds.length) {
        throw { statusCode: 400, error: 'Bad Request', message: 'One or more study IDs are invalid or inactive' };
    }

    const order = await prisma.$transaction(async (tx) => {
        const newOrder = await tx.radiology_orders.create({
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

        for (const s of data.studies) {
            const studyDef = studies.find(sd => sd.study_id === s.studyId);
            await tx.radiology_order_items.create({
                data: {
                    tenant_id: tenantId,
                    order_id: newOrder.order_id,
                    study_id: s.studyId,
                    study_name: studyDef.study_name,
                    body_part: s.bodyPart || studyDef.body_part,
                    clinical_indication: s.clinicalIndication || null,
                    status: 'pending'
                }
            });
        }

        return newOrder;
    });

    return prisma.radiology_orders.findUnique({
        where: { order_id: order.order_id },
        include: {
            patients: { select: { first_name: true, last_name: true, upid: true } },
            radiology_order_items: { include: { radiology_studies: true } },
            users_radiology_orders_ordering_doctor_idTousers: { include: { staff_profiles: { select: { first_name: true, last_name: true } } } }
        }
    });
};

export const listOrders = async (prisma, query, tenantId) => {
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
        prisma.radiology_orders.findMany({
            where,
            include: {
                patients: { select: { first_name: true, last_name: true, upid: true } },
                radiology_order_items: true,
                users_radiology_orders_ordering_doctor_idTousers: { include: { staff_profiles: { select: { first_name: true, last_name: true } } } }
            },
            orderBy: { order_date: 'desc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.radiology_orders.count({ where })
    ]);
    return { orders, total };
};

export const getOrderById = async (prisma, orderId, tenantId) => {
    let order = null;
    if (!isNaN(orderId)) {
        order = await prisma.radiology_orders.findFirst({
            where: { order_id: BigInt(orderId), tenant_id: tenantId },
            include: {
                patients: { select: { first_name: true, last_name: true, upid: true, mobile_primary: true } },
                radiology_order_items: { include: { radiology_studies: true } },
                users_radiology_orders_ordering_doctor_idTousers: { include: { staff_profiles: { select: { first_name: true, last_name: true } } } }
            }
        });
    }
    if (!order) {
        order = await prisma.radiology_orders.findFirst({
            where: { order_number: String(orderId), tenant_id: tenantId },
            include: {
                patients: { select: { first_name: true, last_name: true, upid: true, mobile_primary: true } },
                radiology_order_items: { include: { radiology_studies: true } },
                users_radiology_orders_ordering_doctor_idTousers: { include: { staff_profiles: { select: { first_name: true, last_name: true } } } }
            }
        });
    }
    if (!order) throw { statusCode: 404, error: 'Not Found', message: 'Radiology order not found' };
    return order;
};

export const cancelOrder = async (prisma, orderId, tenantId) => {
    const order = await getOrderById(prisma, orderId, tenantId);
    if (order.status === 'completed') {
        throw { statusCode: 400, error: 'Bad Request', message: 'Cannot cancel a completed order' };
    }
    return prisma.$transaction(async (tx) => {
        await tx.radiology_order_items.updateMany({
            where: { order_id: order.order_id, tenant_id: tenantId },
            data: { status: 'cancelled' }
        });
        return tx.radiology_orders.update({
            where: { order_id: order.order_id },
            data: { status: 'cancelled' }
        });
    });
};

export const updateReport = async (prisma, tenantId, data) => {
    const order = await getOrderById(prisma, data.orderId, tenantId);
    const items = data.results || [];
    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
        for (const res of items) {
            const item = await tx.radiology_order_items.findFirst({
                where: {
                    order_id: order.order_id,
                    study_id: res.studyId,
                    tenant_id: tenantId
                }
            });
            if (item) {
                await tx.radiology_order_items.update({
                    where: { item_id: item.item_id },
                    data: {
                        report_text: res.reportText || item.report_text,
                        impressions: res.impressions || item.impressions,
                        report_url: res.reportUrl || item.report_url,
                        images_url: res.imagesUrl || item.images_url,
                        status: res.status || 'completed',
                        performed_by: res.performedBy ? BigInt(res.performedBy) : item.performed_by,
                        performed_at: res.performedBy ? new Date() : item.performed_at,
                        radiologist_id: res.radiologistId ? BigInt(res.radiologistId) : item.radiologist_id,
                        verified_at: res.radiologistId ? new Date() : item.verified_at
                    }
                });
                updatedCount++;
            }
        }
    });

    return { success: true, message: 'Reports updated successfully', updatedCount };
};

export const getPatientHistory = async (prisma, patientId, query, tenantId) => {
    const pid = await resolvePatientId(prisma, patientId, tenantId);
    const where = { tenant_id: tenantId, patient_id: pid };
    if (query.status) where.status = query.status;

    const [orders, total] = await Promise.all([
        prisma.radiology_orders.findMany({
            where,
            include: {
                radiology_order_items: true,
                users_radiology_orders_ordering_doctor_idTousers: { include: { staff_profiles: { select: { first_name: true, last_name: true } } } }
            },
            orderBy: { order_date: 'desc' },
            take: query.limit || 50,
            skip: query.offset || 0
        }),
        prisma.radiology_orders.count({ where })
    ]);
    return { orders, total };
};

// ══════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════

export const getDashboardStats = async (prisma, tenantId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, scheduledToday, inProgress, completed, cancelled] = await Promise.all([
        prisma.radiology_orders.count({ where: { tenant_id: tenantId, status: 'pending' } }),
        prisma.radiology_orders.count({
            where: { tenant_id: tenantId, order_date: { gte: today } }
        }),
        prisma.radiology_orders.count({ where: { tenant_id: tenantId, status: 'in_progress' } }),
        prisma.radiology_orders.count({ where: { tenant_id: tenantId, status: 'completed' } }),
        prisma.radiology_orders.count({ where: { tenant_id: tenantId, status: 'cancelled' } })
    ]);

    return { pending, scheduledToday, inProgress, completed, cancelled };
};
