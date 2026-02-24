/**
 * Doctor Admin Reports Routes
 */

import * as reportsController from './reports.controller.js';
import * as reportsSchema from './reports.schema.js';

export default async function reportsRoutes(fastify, opts) {
    fastify.get('/all-doctors/overview', {
        schema: reportsSchema.allDoctorsOverviewSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return reportsController.getAllDoctorsOverview(request, reply);
        }
    });

    fastify.get('/doctor-wise', {
        schema: reportsSchema.doctorWiseReportSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return reportsController.getDoctorWiseReport(request, reply);
        }
    });

    fastify.get('/doctor/:doctor_ref/patients', {
        schema: reportsSchema.doctorPatientsReportSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return reportsController.getDoctorPatientsReport(request, reply);
        }
    });

    fastify.get('/follow-up-due', {
        schema: reportsSchema.followUpDueReportSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return reportsController.getFollowUpDueReport(request, reply);
        }
    });

    fastify.get('/all-doctors/department-workload', {
        schema: reportsSchema.departmentWorkloadSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return reportsController.getDepartmentWorkload(request, reply);
        }
    });

    fastify.get('/all-doctors/wait-time-summary', {
        schema: reportsSchema.waitTimeSummarySchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return reportsController.getWaitTimeSummary(request, reply);
        }
    });

    fastify.get('/all-doctors/revenue-linked-activity', {
        schema: reportsSchema.revenueLinkedActivitySchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return reportsController.getRevenueLinkedActivity(request, reply);
        }
    });

    fastify.get('/all-doctors/patient-mix', {
        schema: reportsSchema.patientMixSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return reportsController.getPatientMixReport(request, reply);
        }
    });

    fastify.get('/doctor/:doctor_ref/calendar-summary', {
        schema: reportsSchema.doctorCalendarSummarySchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return reportsController.getDoctorCalendarSummary(request, reply);
        }
    });

    fastify.get('/doctor/:doctor_ref/slot-effectiveness', {
        schema: reportsSchema.doctorSlotEffectivenessSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return reportsController.getDoctorSlotEffectiveness(request, reply);
        }
    });

    fastify.get('/doctor/:doctor_ref/leave-impact', {
        schema: reportsSchema.doctorLeaveImpactSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return reportsController.getDoctorLeaveImpact(request, reply);
        }
    });

    fastify.get('/patients/chronic-repeat', {
        schema: reportsSchema.chronicRepeatPatientsSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return reportsController.getChronicRepeatPatients(request, reply);
        }
    });

    fastify.get('/patients/referral-handover', {
        schema: reportsSchema.referralHandoverSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return reportsController.getReferralHandoverReport(request, reply);
        }
    });

    fastify.get('/patients/high-risk-followups', {
        schema: reportsSchema.highRiskFollowUpSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return reportsController.getHighRiskFollowUpReport(request, reply);
        }
    });
}
