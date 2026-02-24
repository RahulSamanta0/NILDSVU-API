/**
 * Doctor Admin Controllers
 *
 * Purpose: Request handlers for doctor-specific pending staff approvals
 */

import * as doctorUpdatesService from './doctor-updates.service.js';

/**
 * GET /doctor-admin/doctor-requests/pending
 */
export async function listPendingDoctorStaff(request, reply) {
    try {
        const tenantId = request.user?.tenant_id;

        const result = await doctorUpdatesService.listPendingDoctorStaff(
            request.server.prisma,
            tenantId,
            request.query
        );

        return reply.code(200).send(result);
    } catch (error) {
        request.log.error(error, 'Error fetching pending doctor staff requests');
        return reply.code(500).send({
            error: 'Failed to fetch pending doctor staff requests',
            message: error.message
        });
    }
}
