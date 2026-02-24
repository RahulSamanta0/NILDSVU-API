/**
 * Appointments Service
 *
 * Core business logic for appointment management.
 * Handles appointment scheduling, status updates,
 * and divyangjan priority allocation.
 */

import { NotFoundError, BadRequestError, ConflictError } from '../../../utils/customErrors.js';
import { generateNumber } from '../../../utils/number-generator.js';

/**
 * Generate appointment number
 * Format: APT-YYYY-XXXXX
 */
async function generateAppointmentNumber(prisma, tenantId) {
    return await generateNumber(prisma, 'APT', tenantId);
}

/**
 * Resolve patient by UPID or numeric ID
 */
async function resolvePatient(prisma, identifier, tenantId) {
    const upidPattern = /^NILD-\d{8}-\d{4}$/;

    const where = { tenant_id: tenantId };

    if (upidPattern.test(identifier)) {
        where.upid = identifier;
    } else {
        where.patient_id = BigInt(identifier);
    }

    const patient = await prisma.patients.findFirst({
        where,
        include: {
            patient_disabilities: { where: { is_active: true } }
        }
    });

    if (!patient) {
        throw new NotFoundError('Patient not found');
    }

    return patient;
}

/**
 * Resolve appointment by appointment_number or numeric ID
 */
async function resolveAppointment(prisma, identifier, tenantId, includeRelations = false) {
    const appointmentNumberPattern = /^APT-\d{4}-\d{5}$/;

    const where = { tenant_id: tenantId };

    if (appointmentNumberPattern.test(identifier)) {
        where.appointment_number = identifier;
    } else {
        where.appointment_id = BigInt(identifier);
    }

    const includeClause = includeRelations ? {
        patients: true,
        departments: true,
        users_appointments_doctor_idTousers: {
            include: {
                staff_profiles: true
            }
        },
        users_appointments_therapist_idTousers: {
            include: {
                staff_profiles: true
            }
        },
        opd_visits: true
    } : undefined;

    const appointment = await prisma.appointments.findFirst({
        where,
        include: includeClause
    });

    if (!appointment) {
        throw new NotFoundError('Appointment not found');
    }

    return appointment;
}

/**
 * Validate department exists
 */
async function validateDepartment(prisma, departmentId) {
    const dept = await prisma.departments.findUnique({
        where: { department_id: departmentId }
    });

    if (!dept) {
        throw new NotFoundError('Department not found');
    }

    return dept;
}

/**
 * Generate OPD visit number
 * Format: VIS-YYYYMMDD-XXXX
 */
async function generateVisitNumber(prisma, tenantId) {
    return await generateNumber(prisma, 'VIS', tenantId);
}

/**
 * Map appointment type to visit_type enum (new, followup, review)
 */
function mapToVisitType(appointmentType) {
    if (!appointmentType) return 'new';
    const lower = appointmentType.toLowerCase();
    if (lower.includes('followup') || lower.includes('follow_up')) return 'followup';
    if (lower.includes('review')) return 'review';
    return 'new';
}

/**
 * Create an appointment
 */
export const createAppointment = async (prisma, data, tenantId) => {
    // 1. Resolve patient
    const patient = await resolvePatient(prisma, data.patientId, tenantId);

    // 2. Validate department
    await validateDepartment(prisma, data.departmentId);

    // 3. Validate appointment date (must be today or future)
    const appointmentDate = new Date(data.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
        throw new BadRequestError('Cannot book appointments in the past');
    }

    // 4. Check slot conflict
    const appointmentTimeObj = new Date(`1970-01-01T${data.appointmentTime}:00`);

    const conflict = await prisma.appointments.findFirst({
        where: {
            tenant_id: tenantId,
            department_id: data.departmentId,
            appointment_date: appointmentDate,
            appointment_time: appointmentTimeObj,
            status: { notIn: ['cancelled'] }
        }
    });

    if (conflict && data.doctorId && conflict.doctor_id === BigInt(data.doctorId)) {
        throw new ConflictError('This time slot is already booked for the selected doctor');
    }

    // 5. Generate appointment number
    const appointmentNumber = await generateAppointmentNumber(prisma, tenantId);

    // 6. Create appointment
    const appointment = await prisma.appointments.create({
        data: {
            tenant_id: tenantId,
            facility_id: data.facilityId ? BigInt(data.facilityId) : null,
            appointment_number: appointmentNumber,
            patient_id: patient.patient_id,
            appointment_date: appointmentDate,
            appointment_time: appointmentTimeObj,
            appointment_type: data.appointmentType,
            department_id: data.departmentId,
            doctor_id: data.doctorId ? BigInt(data.doctorId) : null,
            therapist_id: data.therapistId ? BigInt(data.therapistId) : null,
            reason: data.reason || null,
            status: 'scheduled',
            booked_by: data.bookedBy || null,
            confirmation_sent: false,
            reminder_sent: false
        },
        include: {
            patients: true,
            departments: true,
            users_appointments_doctor_idTousers: {
                include: { staff_profiles: true }
            }
        }
    });

    return appointment;
};

/**
 * List appointments with filters
 */
export const listAppointments = async (prisma, filters, tenantId) => {
    const { status, departmentId, doctorId, date, startDate, endDate, search, limit = 50, offset = 0 } = filters;

    const where = { tenant_id: tenantId };

    // Status filter
    if (status) {
        where.status = status;
    }

    // Department filter
    if (departmentId) {
        where.department_id = parseInt(departmentId, 10);
    }

    // Doctor filter
    if (doctorId) {
        where.doctor_id = BigInt(doctorId);
    }

    // Date filters
    if (date) {
        const specificDate = new Date(date);
        where.appointment_date = specificDate;
    } else if (startDate || endDate) {
        where.appointment_date = {};
        if (startDate) where.appointment_date.gte = new Date(startDate);
        if (endDate) where.appointment_date.lte = new Date(endDate);
    }

    // Search filter
    if (search) {
        where.OR = [
            { appointment_number: { contains: search, mode: 'insensitive' } },
            { reason: { contains: search, mode: 'insensitive' } },
            {
                patients: {
                    OR: [
                        { first_name: { contains: search, mode: 'insensitive' } },
                        { last_name: { contains: search, mode: 'insensitive' } },
                        { mobile_primary: { contains: search } },
                        { upid: { contains: search, mode: 'insensitive' } }
                    ]
                }
            }
        ];
    }

    const [total, appointments] = await Promise.all([
        prisma.appointments.count({ where }),
        prisma.appointments.findMany({
            where,
            include: {
                patients: true,
                departments: true,
                users_appointments_doctor_idTousers: {
                    include: { staff_profiles: true }
                }
            },
            orderBy: [
                { appointment_date: 'asc' },
                { appointment_time: 'asc' }
            ],
            skip: offset,
            take: limit
        })
    ]);

    return { appointments, total };
};

/**
 * Get appointment by ID or appointment_number
 */
export const getAppointmentById = async (prisma, identifier, tenantId) => {
    return await resolveAppointment(prisma, identifier, tenantId, true);
};

/**
 * Update appointment
 */
export const updateAppointment = async (prisma, identifier, updateData, tenantId) => {
    const existing = await resolveAppointment(prisma, identifier, tenantId);

    // Validate status transitions
    if (updateData.status) {
        if (existing.status === 'completed' || existing.status === 'cancelled') {
            throw new BadRequestError(`Cannot update ${existing.status} appointments`);
        }
    }

    const updateFields = {};

    // Update date/time
    if (updateData.appointmentDate) {
        const newDate = new Date(updateData.appointmentDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (newDate < today) {
            throw new BadRequestError('Cannot reschedule to a past date');
        }

        updateFields.appointment_date = newDate;
    }

    if (updateData.appointmentTime) {
        updateFields.appointment_time = new Date(`1970-01-01T${updateData.appointmentTime}:00`);
    }

    // Update other fields
    if (updateData.appointmentType) updateFields.appointment_type = updateData.appointmentType;
    if (updateData.doctorId) updateFields.doctor_id = BigInt(updateData.doctorId);
    if (updateData.therapistId) updateFields.therapist_id = BigInt(updateData.therapistId);
    if (updateData.status) updateFields.status = updateData.status;

    // Update reason field (plain text, no token)
    if (updateData.reason !== undefined) {
        updateFields.reason = updateData.reason;
    }

    updateFields.updated_at = new Date();

    const updated = await prisma.appointments.update({
        where: { appointment_id: existing.appointment_id },
        data: updateFields,
        include: {
            patients: true,
            departments: true,
            users_appointments_doctor_idTousers: {
                include: { staff_profiles: true }
            }
        }
    });

    return updated;
};

/**
 * Check-in appointment
 */
export const checkInAppointment = async (prisma, identifier, tenantId) => {
    const appointment = await resolveAppointment(prisma, identifier, tenantId, true);

    // Validate status
    if (!['scheduled', 'confirmed'].includes(appointment.status)) {
        throw new BadRequestError(`Cannot check-in appointment with status: ${appointment.status}`);
    }

    // Validate date (must be today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(appointment.appointment_date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate.getTime() !== today.getTime()) {
        throw new BadRequestError('Can only check-in appointments scheduled for today');
    }

    // Generate visit number for OPD visit
    const visitNumber = await generateVisitNumber(prisma, tenantId);

    // Use transaction to update appointment and create OPD visit
    const result = await prisma.$transaction(async (tx) => {
        // Update appointment status
        const updated = await tx.appointments.update({
            where: { appointment_id: appointment.appointment_id },
            data: {
                status: 'checked_in',
                updated_at: new Date()
            }
        });

        // Create OPD visit record
        const now = new Date();
        const visitTime = new Date(`1970-01-01T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`);

        const opdVisit = await tx.opd_visits.create({
            data: {
                tenant_id: tenantId,
                visit_number: visitNumber,
                patient_id: appointment.patient_id,
                appointment_id: appointment.appointment_id,
                visit_date: now,
                visit_time: visitTime,
                visit_type: mapToVisitType(appointment.appointment_type),
                department_id: appointment.department_id,
                doctor_id: appointment.doctor_id,
                status: 'waiting',
                checked_in_at: now,
                reason_for_visit: appointment.reason
            }
        });

        return { updated, opdVisit };
    });

    return {
        ...result.updated,
        opdVisitId: result.opdVisit.visit_id,
        checkedInAt: result.updated.updated_at
    };
};

/**
 * Complete appointment
 */
export const completeAppointment = async (prisma, identifier, data, tenantId) => {
    const appointment = await resolveAppointment(prisma, identifier, tenantId);

    // Validate status
    if (!['checked_in'].includes(appointment.status)) {
        throw new BadRequestError(`Cannot complete appointment with status: ${appointment.status}`);
    }

    // Update appointment
    const updated = await prisma.appointments.update({
        where: { appointment_id: appointment.appointment_id },
        data: {
            status: 'completed',
            updated_at: new Date()
        },
        include: {
            patients: true,
            opd_visits: true
        }
    });

    // Update OPD visit if exists
    if (updated.opd_visits.length > 0) {
        await prisma.opd_visits.updateMany({
            where: {
                appointment_id: appointment.appointment_id,
                status: { not: 'completed' }
            },
            data: {
                status: 'completed',
                updated_at: new Date()
            }
        });
    }

    return updated;
};

/**
 * Cancel appointment
 */
export const cancelAppointment = async (prisma, identifier, data, tenantId) => {
    const appointment = await resolveAppointment(prisma, identifier, tenantId);

    // Validate status
    if (appointment.status === 'completed') {
        throw new BadRequestError('Cannot cancel completed appointments');
    }

    if (appointment.status === 'cancelled') {
        throw new BadRequestError('Appointment is already cancelled');
    }

    const updated = await prisma.appointments.update({
        where: { appointment_id: appointment.appointment_id },
        data: {
            status: 'cancelled',
            updated_at: new Date()
        },
        include: {
            patients: true
        }
    });

    // Log cancellation reason in audit_logs
    await prisma.audit_logs.create({
        data: {
            tenant_id: tenantId,
            table_name: 'appointments',
            record_id: appointment.appointment_id,
            action: 'cancel',
            new_values: { cancellation_reason: data.cancellationReason }
        }
    });

    return {
        ...updated,
        cancellationReason: data.cancellationReason,
        cancelledAt: updated.updated_at
    };
};

/**
 * Reschedule appointment
 */
export const rescheduleAppointment = async (prisma, identifier, data, tenantId) => {
    const appointment = await resolveAppointment(prisma, identifier, tenantId, true);

    // Validate status
    if (['completed', 'cancelled'].includes(appointment.status)) {
        throw new BadRequestError(`Cannot reschedule ${appointment.status} appointments`);
    }

    const newDate = new Date(data.newDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (newDate < today) {
        throw new BadRequestError('Cannot reschedule to a past date');
    }

    const newTimeObj = new Date(`1970-01-01T${data.newTime}:00`);

    const updateFields = {
        appointment_date: newDate,
        appointment_time: newTimeObj,
        status: 'scheduled',
        updated_at: new Date()
    };

    // Update reason if provided
    if (data.reason !== undefined) {
        updateFields.reason = data.reason;
    }

    const updated = await prisma.appointments.update({
        where: { appointment_id: appointment.appointment_id },
        data: updateFields,
        include: {
            patients: true,
            departments: true
        }
    });

    return {
        ...updated,
        rescheduledAt: updated.updated_at
    };
};

/**
 * Send reminder
 */
export const sendReminder = async (prisma, identifier, tenantId) => {
    const appointment = await resolveAppointment(prisma, identifier, tenantId, true);

    // Validate status
    if (['completed', 'cancelled'].includes(appointment.status)) {
        throw new BadRequestError(`Cannot send reminder for ${appointment.status} appointments`);
    }

    const updated = await prisma.appointments.update({
        where: { appointment_id: appointment.appointment_id },
        data: {
            reminder_sent: true,
            updated_at: new Date()
        }
    });

    // Log reminder action
    await prisma.audit_logs.create({
        data: {
            tenant_id: tenantId,
            table_name: 'appointments',
            record_id: appointment.appointment_id,
            action: 'send_reminder',
            new_values: { reminder_sent_at: new Date() }
        }
    });

    return {
        ...updated,
        sentAt: updated.updated_at
    };
};

/**
 * Check slot availability
 */
export const checkSlotAvailability = async (prisma, filters, tenantId) => {
    const { departmentId, doctorId, date } = filters;

    const department = await prisma.departments.findUnique({
        where: { department_id: parseInt(departmentId, 10) }
    });

    if (!department) {
        throw new NotFoundError('Department not found');
    }

    const targetDate = new Date(date);

    // Query existing appointments for this date
    const where = {
        tenant_id: tenantId,
        department_id: parseInt(departmentId, 10),
        appointment_date: targetDate,
        status: { notIn: ['cancelled'] }
    };

    if (doctorId) {
        where.doctor_id = BigInt(doctorId);
    }

    const existingAppointments = await prisma.appointments.findMany({
        where,
        include: {
            patients: true
        }
    });

    // Generate time slots (9:00 AM to 5:00 PM, 30-minute intervals)
    const slots = [];
    for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

            // Check if slot is booked
            const booking = existingAppointments.find(apt => {
                const aptTime = new Date(apt.appointment_time);
                return aptTime.getHours() === hour && aptTime.getMinutes() === minute;
            });

            slots.push({
                time,
                available: !booking,
                bookedBy: booking ? `${booking.patients.first_name} ${booking.patients.last_name || ''}`.trim() : null
            });
        }
    }

    return {
        date: date,
        departmentName: department.department_name,
        slots
    };
};

/**
 * Get patient appointment history
 */
export const getPatientAppointments = async (prisma, patientId, filters, tenantId) => {
    const patient = await resolvePatient(prisma, patientId, tenantId);

    const { status, limit = 50, offset = 0 } = filters;

    const where = {
        tenant_id: tenantId,
        patient_id: patient.patient_id
    };

    if (status) {
        where.status = status;
    }

    const [total, appointments] = await Promise.all([
        prisma.appointments.count({ where }),
        prisma.appointments.findMany({
            where,
            include: {
                departments: true,
                users_appointments_doctor_idTousers: {
                    include: { staff_profiles: true }
                }
            },
            orderBy: [
                { appointment_date: 'desc' },
                { appointment_time: 'desc' }
            ],
            skip: offset,
            take: limit
        })
    ]);

    return {
        patientUpid: patient.upid,
        patientName: `${patient.first_name} ${patient.last_name || ''}`.trim(),
        appointments,
        total
    };
};
