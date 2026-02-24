/**
 * Doctor Admin Module Routes Aggregator
 *
 * Purpose:
 * - Consolidates all doctor-admin routes
 * - Keeps globalroutes.js clean
 */

import doctorUpdatesRoutes from './doctor-updates/doctor-updates.routes.js';
import doctorDirectoryRoutes from './doctor-directory/doctor-directory.routes.js';
import scheduleManagementRoutes from './schedule-management/schedule-management.routes.js';
import reportsRoutes from './reports/reports.routes.js';
import exceptionReportsRoutes from './exception-reports/exception-reports.routes.js';

export default async function doctorAdminRoutes(fastify, opts) {
	// Enforce doctor-admin access on all doctor-admin routes
	fastify.addHook('onRequest', async (request, reply) => {
		await fastify.authenticate(request, reply);
		if (reply.sent) return;
		await fastify.authorizeRoles(['doctor-admin', 'doctor_admin', 'doctoradmin'])(request, reply);
	});

	await fastify.register(doctorUpdatesRoutes, { prefix: '/doctor-requests' });
	await fastify.register(doctorDirectoryRoutes, { prefix: '/doctor-directory' });
	await fastify.register(scheduleManagementRoutes, { prefix: '/schedule-management' });
	await fastify.register(reportsRoutes, { prefix: '/reports' });
	await fastify.register(exceptionReportsRoutes, { prefix: '/exception-reports' });
}
