/**
 * Visitor Insider Service
 * 
 * Purpose:
 * - Business logic for visitor insider operations
 * - Fetch all visitors regardless of status
 * - Multi-tenant support with pagination
 */

import { generateNumber } from '../../../utils/number-generator.js';

async function generateVisitorPassNumber(prisma, tenantId) {
    return await generateNumber(prisma, 'VPASS', tenantId);
}

/**
 * Get all visitors with pagination and optional filters
 * @param {Object} prisma - Prisma client instance
 * @param {Object} user - Authenticated user (contains tenant_id)
 * @param {Object} filters - Filter options (page, limit, status, search)
 * @returns {Promise<Object>} Paginated list of all visitors
 */
export async function getAllVisitors(prisma, user, filters = {}) {
    const {
        page = 1,
        limit = 50,
        status,
        search,
        startDate,
        endDate
    } = filters;

    const skip = (page - 1) * limit;
    const tenant_id = BigInt(user.tenant_id);

    // Build where clause
    const where = {
        tenant_id
    };

    // Optional status filter
    if (status && status !== 'all') {
        where.status = status;
    }

    // Optional search by name, mobile, or pass number
    if (search) {
        where.OR = [
            { visitor_name: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search } },
            { visitor_pass_number: { contains: search } }
        ];
    }

    // Optional date range filter
    if (startDate || endDate) {
        where.entry_time = {};
        if (startDate) {
            where.entry_time.gte = new Date(startDate);
        }
        if (endDate) {
            where.entry_time.lte = new Date(endDate);
        }
    }

    // Fetch visitors with pagination
    const [visitors, total] = await Promise.all([
        prisma.visitor_entries.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                entry_time: 'desc'
            },
            select: {
                entry_id: true,
                visitor_pass_number: true,
                visitor_name: true,
                mobile: true,
                id_type: true,
                id_number: true,
                department: true,
                purpose: true,
                gate_number: true,
                entry_time: true,
                expected_exit_time: true,
                guard_name: true,
                status: true,
                created_at: true
            }
        }),
        prisma.visitor_entries.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
        success: true,
        data: visitors,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
}

/**
 * Get visitor statistics by status
 * @param {Object} prisma - Prisma client instance
 * @param {Object} user - Authenticated user (contains tenant_id)
 * @returns {Promise<Object>} Visitor statistics
 */
export async function getVisitorStats(prisma, user) {
    const tenant_id = BigInt(user.tenant_id);

    const [totalVisitors, checkedIn, checkedOut] = await Promise.all([
        // Total visitors
        prisma.visitor_entries.count({
            where: { tenant_id }
        }),
        // Currently checked in
        prisma.visitor_entries.count({
            where: {
                tenant_id,
                status: 'checkin'
            }
        }),
        // Checked out
        prisma.visitor_entries.count({
            where: {
                tenant_id,
                status: 'checkout'
            }
        })
    ]);

    return {
        totalVisitors,
        checkedIn,
        checkedOut
    };
}

/**
 * Checkout a visitor
 * @param {Object} prisma - Prisma client instance
 * @param {Object} user - Authenticated user (contains tenant_id)
 * @param {String} visitorPassNumber - Visitor pass number to checkout
 * @returns {Promise<Object>} Updated visitor entry
 */
export async function checkoutVisitor(prisma, user, visitorPassNumber) {
    const tenant_id = BigInt(user.tenant_id);

    // Find the visitor entry
    const visitor = await prisma.visitor_entries.findFirst({
        where: {
            tenant_id,
            visitor_pass_number: visitorPassNumber
        }
    });

    if (!visitor) {
        throw new Error('VISITOR_NOT_FOUND');
    }

    if (visitor.status === 'checkout') {
        throw new Error('ALREADY_CHECKED_OUT');
    }

    // Update status to checkout
    const updatedVisitor = await prisma.visitor_entries.update({
        where: {
            entry_id: visitor.entry_id
        },
        data: {
            status: 'checkout'
        }
    });

    return updatedVisitor;
}

/**
 * Revisit - Create a new entry based on previous visit
 * @param {Object} prisma - Prisma client instance
 * @param {Object} user - Authenticated user (contains tenant_id)
 * @param {Object} data - Contains previousPassNumber and optional new data
 * @returns {Promise<Object>} New visitor entry
 */
export async function createRevisit(prisma, user, data) {
    const { previousPassNumber, department, purpose, gateNumber, guardName } = data;
    const tenant_id = BigInt(user.tenant_id);

    // Find the previous visitor entry
    const previousVisitor = await prisma.visitor_entries.findFirst({
        where: {
            tenant_id,
            visitor_pass_number: previousPassNumber
        }
    });

    if (!previousVisitor) {
        throw new Error('PREVIOUS_VISIT_NOT_FOUND');
    }

    // Generate new visitor pass number
    const newVisitorPassNumber = await generateVisitorPassNumber(prisma, tenant_id);

    // Create new entry with copied data and new pass number
    const newVisitor = await prisma.visitor_entries.create({
        data: {
            tenant_id,
            visitor_pass_number: newVisitorPassNumber,
            visitor_name: previousVisitor.visitor_name,
            mobile: previousVisitor.mobile,
            id_type: previousVisitor.id_type,
            id_number: previousVisitor.id_number,
            department: department || previousVisitor.department,
            purpose: purpose || previousVisitor.purpose,
            gate_number: gateNumber || previousVisitor.gate_number,
            entry_time: new Date(),
            expected_exit_time: null,
            guard_name: guardName || previousVisitor.guard_name,
            status: 'checkin'
        }
    });

    return newVisitor;
}

/**
 * Get visitor dashboard statistics
 * @param {Object} prisma - Prisma client instance
 * @param {Object} user - Authenticated user (contains tenant_id)
 * @returns {Promise<Object>} Dashboard statistics
 */
export async function getVisitorDashboardStats(prisma, user) {
    const tenant_id = BigInt(user.tenant_id);

    // 1. Fetch all visitors currently inside
    const activeVisitors = await prisma.visitor_entries.findMany({
        where: {
            tenant_id,
            status: 'checkin'
        },
        select: {
            entry_time: true
        }
    });

    const now = new Date();
    let totalDurationMs = 0;
    let overstayingCount = 0;
    let extremeOverstayCount = 0;

    // Define thresholds for status calculation
    const OVERSTAY_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours
    const FLAGGED_THRESHOLD_MS = 8 * 60 * 60 * 1000;  // 8 hours (Extreme overstay)

    // Calculate durations and statuses
    activeVisitors.forEach((visitor) => {
        const entryTime = new Date(visitor.entry_time);
        const durationMs = now.getTime() - entryTime.getTime();

        totalDurationMs += durationMs;

        if (durationMs >= FLAGGED_THRESHOLD_MS) {
            extremeOverstayCount++;
            overstayingCount++; // They are also overstaying if they are flagged
        } else if (durationMs >= OVERSTAY_THRESHOLD_MS) {
            overstayingCount++;
        }
    });

    // 2. Calculate Average Duration
    let avgDurationStr = '0h 0m';
    if (activeVisitors.length > 0) {
        const avgDurationMs = totalDurationMs / activeVisitors.length;
        const avgHours = Math.floor(avgDurationMs / (1000 * 60 * 60));
        const avgMinutes = Math.floor((avgDurationMs % (1000 * 60 * 60)) / (1000 * 60));
        avgDurationStr = `${avgHours}h ${avgMinutes}m`;
    }

    // 3. Fetch actual open security incidents for the day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const openIncidentsCount = await prisma.security_incidents.count({
        where: {
            tenant_id,
            status: 'open',
            incident_date: {
                gte: startOfDay
            }
        }
    });

    // Combine extreme overstays with actual security incidents for the final Alert count
    const totalAlerts = extremeOverstayCount + openIncidentsCount;

    return {
        totalInside: activeVisitors.length,
        avgDuration: avgDurationStr,
        overstaying: overstayingCount,
        flaggedAlerts: totalAlerts
    };
}
