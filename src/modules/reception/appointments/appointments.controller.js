/**
 * Appointments Controller
 *
 * HTTP request handlers for appointment endpoints.
 * Handles BigInt serialization and request/response mapping.
 */

import * as service from './appointments.service.js';

function normalizeAppointmentPayload(body) {
    if (!body || typeof body !== 'object') {
        return body;
    }

    const normalized = { ...body };

    if (body.patient_id !== undefined) normalized.patientId = body.patient_id;
    if (body.appointment_date !== undefined) normalized.appointmentDate = body.appointment_date;
    if (body.appointment_time !== undefined) normalized.appointmentTime = body.appointment_time;
    if (body.slot_start !== undefined) normalized.appointmentTime = body.slot_start;
    if (body.appointment_type !== undefined) normalized.appointmentType = body.appointment_type;
    if (body.department_id !== undefined) normalized.departmentId = body.department_id;
    if (body.doctor_id !== undefined) normalized.doctorId = body.doctor_id;
    if (body.therapist_id !== undefined) normalized.therapistId = body.therapist_id;
    if (body.facility_id !== undefined) normalized.facilityId = body.facility_id;
    if (body.booked_by !== undefined) normalized.bookedBy = body.booked_by;

    return normalized;
}

/**
 * Serialize appointment object (convert BigInt to string)
 */
function serializeAppointment(appointment) {
    const serialized = {
        appointmentId: appointment.appointment_id.toString(),
        appointmentNumber: appointment.appointment_number,
        patientId: appointment.patient_id.toString(),
        appointmentDate: appointment.appointment_date.toISOString().split('T')[0],
        appointmentTime: appointment.appointment_time.toTimeString().substring(0, 5),
        appointmentType: appointment.appointment_type,
        status: appointment.status,
        reason: appointment.reason,
        departmentId: appointment.department_id?.toString(),
        doctorId: appointment.doctor_id?.toString(),
        therapistId: appointment.therapist_id?.toString(),
        facilityId: appointment.facility_id?.toString(),
        tenantId: appointment.tenant_id.toString(),
        bookedBy: appointment.booked_by,
        confirmationSent: appointment.confirmation_sent,
        reminderSent: appointment.reminder_sent,
        createdAt: appointment.created_at?.toISOString(),
        updatedAt: appointment.updated_at?.toISOString()
    };

    // Add patient details if included
    if (appointment.patients) {
        serialized.patientName = `${appointment.patients.first_name} ${appointment.patients.last_name || ''}`.trim();
        serialized.patientUpid = appointment.patients.upid;
        serialized.patientPhone = appointment.patients.mobile_primary;
        serialized.patientEmail = appointment.patients.email;
    }

    // Add department details if included
    if (appointment.departments) {
        serialized.departmentName = appointment.departments.department_name;
        serialized.departmentCode = appointment.departments.department_code;
    }

    // Add doctor details if included
    if (appointment.users_appointments_doctor_idTousers) {
        const doctor = appointment.users_appointments_doctor_idTousers;
        if (doctor.staff_profiles) {
            serialized.doctorName = `Dr. ${doctor.staff_profiles.first_name} ${doctor.staff_profiles.last_name || ''}`.trim();
        }
    }

    // Add therapist details if included
    if (appointment.users_appointments_therapist_idTousers) {
        const therapist = appointment.users_appointments_therapist_idTousers;
        if (therapist.staff_profiles) {
            serialized.therapistName = `${therapist.staff_profiles.first_name} ${therapist.staff_profiles.last_name || ''}`.trim();
        }
    }

    // Add OPD visit details if included
    if (appointment.opd_visits && appointment.opd_visits.length > 0) {
        serialized.opdVisitId = appointment.opd_visits[0].visit_id.toString();
        serialized.opdVisitStatus = appointment.opd_visits[0].status;
    }

    return serialized;
}

/**
 * 1. POST /appointments - Create Appointment
 */
export const createAppointment = async (request, reply) => {
    const tenantId = BigInt(1); // TODO: Extract from JWT token

    const payload = normalizeAppointmentPayload(request.body);

    const appointment = await service.createAppointment(
        request.server.prisma,
        payload,
        tenantId
    );

    const response = serializeAppointment(appointment);

    return reply.code(201).send(response);
};

/**
 * 2. GET /appointments - List Appointments
 */
export const listAppointments = async (request, reply) => {
    const tenantId = BigInt(1); // TODO: Extract from JWT token

    const { appointments, total } = await service.listAppointments(
        request.server.prisma,
        request.query,
        tenantId
    );

    const serialized = appointments.map(serializeAppointment);

    return reply.code(200).send({
        appointments: serialized,
        total,
        page: {
            limit: request.query.limit || 50,
            offset: request.query.offset || 0
        }
    });
};

/**
 * 3. GET /appointments/:id - Get Appointment Details
 */
export const getAppointmentById = async (request, reply) => {
    const tenantId = BigInt(1); // TODO: Extract from JWT token

    const appointment = await service.getAppointmentById(
        request.server.prisma,
        request.params.patientId,
        tenantId
    );

    const response = serializeAppointment(appointment);

    return reply.code(200).send(response);
};

/**
 * 4. PUT /appointments/:patientId - Update Appointment
 */
export const updateAppointment = async (request, reply) => {
    try {
        const tenantId = BigInt(1); // TODO: Extract from JWT token
        const updateData = request.body;

        const appointment = await service.updateAppointment(
            request.server.prisma,
            request.params.patientId,
            updateData,
            tenantId
        );

        const response = serializeAppointment(appointment);

        return reply.code(200).send(response);
    } catch (error) {
        request.log.error(error);
        if (error.statusCode) {
            return reply.code(error.statusCode).send({
                error: error.error,
                message: error.message
            });
        }
        return reply.code(500).send({
            error: 'Update Failed',
            message: 'Unable to update appointment'
        });
    }
};

/**
 * 5. POST /appointments/:id/check-in - Check In Patient
 */
export const checkInAppointment = async (request, reply) => {
    const tenantId = BigInt(1); // TODO: Extract from JWT token

    const result = await service.checkInAppointment(
        request.server.prisma,
        request.params.id,
        tenantId
    );

    const response = {
        appointmentId: result.appointment_id.toString(),
        appointmentNumber: result.appointment_number,
        status: result.status,
        opdVisitId: result.opdVisitId?.toString(),
        checkedInAt: result.checkedInAt?.toISOString()
    };

    return reply.code(200).send(response);
};

/**
 * 6. POST /appointments/:id/complete - Complete Appointment
 */
export const completeAppointment = async (request, reply) => {
    const tenantId = BigInt(1); // TODO: Extract from JWT token

    const appointment = await service.completeAppointment(
        request.server.prisma,
        request.params.id,
        request.body,
        tenantId
    );

    const response = {
        appointmentId: appointment.appointment_id.toString(),
        appointmentNumber: appointment.appointment_number,
        status: appointment.status,
        completedAt: appointment.updated_at?.toISOString()
    };

    return reply.code(200).send(response);
};

/**
 * 7. POST /appointments/:id/cancel - Cancel Appointment
 */
export const cancelAppointment = async (request, reply) => {
    try {
        const tenantId = BigInt(1); // TODO: Extract from JWT token

        const result = await service.cancelAppointment(
            request.server.prisma,
            request.params.patientId,
            request.body,
            tenantId
        );

        const response = {
            appointmentId: result.appointment_id.toString(),
            appointmentNumber: result.appointment_number,
            status: result.status,
            cancellationReason: result.cancellationReason,
            cancelledAt: result.cancelledAt?.toISOString()
        };

        return reply.code(200).send(response);
    } catch (error) {
        request.log.error(error);
        if (error.statusCode) {
            return reply.code(error.statusCode).send({
                error: error.error,
                message: error.message
            });
        }
        return reply.code(500).send({
            error: 'Cancel Failed',
            message: 'Unable to cancel appointment'
        });
    }
};

/**
 * 8. POST /appointments/:id/reschedule - Reschedule Appointment
 */
export const rescheduleAppointment = async (request, reply) => {
    const tenantId = BigInt(1); // TODO: Extract from JWT token

    const appointment = await service.rescheduleAppointment(
        request.server.prisma,
        request.params.patientId,
        request.body,
        tenantId
    );

    const response = {
        appointmentId: appointment.appointment_id.toString(),
        appointmentNumber: appointment.appointment_number,
        appointmentDate: appointment.appointment_date.toISOString().split('T')[0],
        appointmentTime: appointment.appointment_time.toTimeString().substring(0, 5),
        status: appointment.status,
        rescheduledAt: appointment.rescheduledAt?.toISOString()
    };

    return reply.code(200).send(response);
};

/**
 * 9. POST /appointments/:id/reminder - Send Reminder
 */
export const sendReminder = async (request, reply) => {
    const tenantId = BigInt(1); // TODO: Extract from JWT token

    const result = await service.sendReminder(
        request.server.prisma,
        request.params.id,
        tenantId
    );

    const response = {
        appointmentId: result.appointment_id.toString(),
        appointmentNumber: result.appointment_number,
        reminderSent: result.reminder_sent,
        sentAt: result.sentAt?.toISOString()
    };

    return reply.code(200).send(response);
};

/**
 * 10. GET /appointments/slots/available - Check Slot Availability
 */
export const checkSlotAvailability = async (request, reply) => {
    const tenantId = BigInt(1); // TODO: Extract from JWT token

    const result = await service.checkSlotAvailability(
        request.server.prisma,
        request.query,
        tenantId
    );

    return reply.code(200).send(result);
};

/**
 * 11. GET /appointments/patient/:patientId - Patient Appointment History
 */
export const getPatientAppointments = async (request, reply) => {
    const tenantId = BigInt(1); // TODO: Extract from JWT token

    const result = await service.getPatientAppointments(
        request.server.prisma,
        request.params.patientId,
        request.query,
        tenantId
    );

    const serialized = result.appointments.map(serializeAppointment);

    return reply.code(200).send({
        patientUpid: result.patientUpid,
        patientName: result.patientName,
        appointments: serialized,
        total: result.total
    });
};
