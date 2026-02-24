/**
 * HR Module Routes Aggregator
 *
 * Purpose:
 * - Consolidates HR module routes
 * - Keeps globalroutes.js clean
 */
import staffMasterRoutes from './staff-master/staff-master.routes.js';
import dutyRosterRoutes from './duty-roster/duty-roster.routes.js';
import leaveManagementRoutes from './leave-management/leave-management.routes.js';
import attendanceRoutes from './attendance/attendance.routes.js';
import payrollRoutes from './payroll/payroll.routes.js';

export default async function hrRoutes(fastify, opts) {
    // Enforce HR access on all HR routes
    fastify.addHook('onRequest', async (request, reply) => {
        await fastify.authenticate(request, reply);
        if (reply.sent) return;
        await fastify.authorizeRoles(['HR'])(request, reply);
    });

    await fastify.register(staffMasterRoutes, { prefix: '/staff-master' });
    await fastify.register(dutyRosterRoutes, { prefix: '/duty-roster' });
    await fastify.register(leaveManagementRoutes, { prefix: '/leave' });
    await fastify.register(attendanceRoutes, { prefix: '/attendance' });
    await fastify.register(payrollRoutes, { prefix: '/payroll' });
}
