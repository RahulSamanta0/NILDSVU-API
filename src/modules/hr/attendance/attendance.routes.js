/**
 * Attendance Routes
 */

import * as attendanceController from './attendance.controller.js';
import * as attendanceSchema from './attendance.schema.js';

export default async function attendanceRoutes(fastify, opts) {
    fastify.post('/records', {
        schema: attendanceSchema.upsertAttendanceRecordSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return attendanceController.upsertAttendanceRecord(request, reply);
        }
    });

    fastify.post('/records/bulk-upsert', {
        schema: attendanceSchema.bulkUpsertAttendanceRecordsSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return attendanceController.bulkUpsertAttendanceRecords(request, reply);
        }
    });

    fastify.get('/records', {
        schema: attendanceSchema.listAttendanceRecordsSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return attendanceController.listAttendanceRecords(request, reply);
        }
    });

    fastify.post('/records/auto-mark-date', {
        schema: attendanceSchema.autoMarkAttendanceForDateSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return attendanceController.autoMarkAttendanceForDate(request, reply);
        }
    });

    fastify.get('/summary', {
        schema: attendanceSchema.attendanceSummarySchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return attendanceController.attendanceSummary(request, reply);
        }
    });

    fastify.get('/staff/:id', {
        schema: attendanceSchema.attendanceByStaffSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return attendanceController.attendanceByStaff(request, reply);
        }
    });
}
