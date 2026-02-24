/**
 * Payroll Routes
 */

import * as payrollController from './payroll.controller.js';
import * as payrollSchema from './payroll.schema.js';

export default async function payrollRoutes(fastify, opts) {
    fastify.post('/components', {
        schema: payrollSchema.createSalaryComponentSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.createSalaryComponent(request, reply);
        }
    });

    fastify.get('/components', {
        schema: payrollSchema.listSalaryComponentsSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.listSalaryComponents(request, reply);
        }
    });

    fastify.post('/components/:id/update', {
        schema: payrollSchema.updateSalaryComponentSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.updateSalaryComponent(request, reply);
        }
    });

    fastify.post('/staff-salary-profiles', {
        schema: payrollSchema.createStaffSalaryProfileSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.createStaffSalaryProfile(request, reply);
        }
    });

    fastify.get('/staff-salary-profiles', {
        schema: payrollSchema.listStaffSalaryProfilesSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.listStaffSalaryProfiles(request, reply);
        }
    });

    fastify.get('/staff-salary-profiles/:id', {
        schema: payrollSchema.getStaffSalaryProfileSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.getStaffSalaryProfile(request, reply);
        }
    });

    fastify.post('/cycles', {
        schema: payrollSchema.createPayrollCycleSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.createPayrollCycle(request, reply);
        }
    });

    fastify.get('/cycles', {
        schema: payrollSchema.listPayrollCyclesSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.listPayrollCycles(request, reply);
        }
    });

    fastify.post('/cycles/:id/update-status', {
        schema: payrollSchema.updatePayrollCycleStatusSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.updatePayrollCycleStatus(request, reply);
        }
    });

    fastify.post('/runs/preview', {
        schema: payrollSchema.previewPayrollRunSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.previewPayrollRun(request, reply);
        }
    });

    fastify.post('/runs/generate', {
        schema: payrollSchema.generatePayrollRunSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.generatePayrollRun(request, reply);
        }
    });

    fastify.post('/runs/:id/finalize', {
        schema: payrollSchema.finalizePayrollRunSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.finalizePayrollRun(request, reply);
        }
    });

    fastify.get('/runs', {
        schema: payrollSchema.listPayrollRunsSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.listPayrollRuns(request, reply);
        }
    });

    fastify.get('/runs/:id', {
        schema: payrollSchema.getPayrollRunSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.getPayrollRun(request, reply);
        }
    });

    fastify.get('/payslips', {
        schema: payrollSchema.listPayslipsSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.listPayslips(request, reply);
        }
    });

    fastify.get('/payslips/:id', {
        schema: payrollSchema.getPayslipSchema,
        handler: async (request, reply) => {
            request.prisma = fastify.prisma;
            return payrollController.getPayslip(request, reply);
        }
    });
}
