/**
 * Appointments Routes
 *
 * Defines all appointment management endpoints.
 * Fastify route registration with schema validation.
 */

import * as controller from './appointments.controller.js';
import * as schema from './appointments.schema.js';

export default async function appointmentRoutes(fastify, opts) {
    /**
     * Core CRUD Endpoints
     */

    // 1. Create Appointment
    fastify.post('/appointments', {
        schema: schema.createAppointmentSchema,
        onRequest: [fastify.authenticate],
        handler: controller.createAppointment
    });

    // 2. List Appointments (with filters)
    fastify.get('/appointments', {
        schema: schema.listAppointmentsSchema,
        onRequest: [fastify.authenticate],
        handler: controller.listAppointments
    });

    // 10. Check Slot Availability (must be before /:id route)
    fastify.get('/appointments/slots/available', {
        schema: schema.checkSlotAvailabilitySchema,
        onRequest: [fastify.authenticate],
        handler: controller.checkSlotAvailability
    });

    // 11. Get Patient Appointment History (must be before /:id route)
    fastify.get('/appointments/patient/:patientId', {
        schema: schema.getPatientAppointmentsSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getPatientAppointments
    });

    // 3. Get Appointment Details
    fastify.get('/appointments/:patientId', {
        schema: schema.getAppointmentByIdSchema,
        onRequest: [fastify.authenticate],
        handler: controller.getAppointmentById
    });

    // 4. Update Appointment
    fastify.put('/appointments/:patientId', {
        schema: schema.updateAppointmentSchema,
        onRequest: [fastify.authenticate],
        handler: controller.updateAppointment
    });

    /**
     * Status Management Endpoints
     */

    // 5. Cancel Appointment
    fastify.post('/appointments/:patientId/cancel', {
        schema: schema.cancelAppointmentSchema,
        onRequest: [fastify.authenticate],
        handler: controller.cancelAppointment
    });

    // 6. Reschedule Appointment
    fastify.post('/appointments/:patientId/reschedule', {
        schema: schema.rescheduleAppointmentSchema,
        onRequest: [fastify.authenticate],
        handler: controller.rescheduleAppointment
    });

}
