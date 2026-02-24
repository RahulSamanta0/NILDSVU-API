/**
 * Diet Plans Service
 * 
 * Purpose:
 * - Manages diet plan workflows (approval, cancellation, modification)
 * - Provides dashboard statistics
 * - Handles diet plan listing with filters
 */

/**
 * Get dashboard statistics
 * @param {Object} prisma - Prisma client instance
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @returns {Promise<Object>} Stats object
 */
export const getDashboardStats = async (prisma, tenantId) => {
    const [totalNew, urgent, emergency, normal] = await Promise.all([
        // Total new (pending status)
        prisma.diet_entries.count({
            where: {
                tenant_id: tenantId,
                status: 'pending'
            }
        }),
        // Urgent
        prisma.diet_entries.count({
            where: {
                tenant_id: tenantId,
                status: 'pending',
                priority: 'urgent'
            }
        }),
        // Emergency (mapped as "high" in response)
        prisma.diet_entries.count({
            where: {
                tenant_id: tenantId,
                status: 'pending',
                priority: 'emergency'
            }
        }),
        // Normal
        prisma.diet_entries.count({
            where: {
                tenant_id: tenantId,
                status: 'pending',
                priority: 'normal'
            }
        })
    ]);

    return {
        totalNew,
        urgent,
        high: emergency,
        normal
    };
};

/**
 * Get all diet plans with pagination
 * @param {Object} prisma - Prisma client instance
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @param {Object} filters - Pagination and filter options (page, limit, status)
 * @returns {Promise<Object>} Paginated diet plans
 */
export const getDietPlans = async (prisma, tenantId, filters = {}) => {
    const {
        page = 1,
        limit = 10,
        status
    } = filters;

    const skip = (page - 1) * limit;

    const where = {
        tenant_id: tenantId
    };

    // Filter by status if provided (approved, modified, cancelled)
    // If status is 'all' or not provided, show all statuses
    if (status && status !== 'all') {
        where.status = status;
    }

    const [dietPlans, total] = await Promise.all([
        prisma.diet_entries.findMany({
            where,
            skip,
            take: limit,
            include: {
                patients: {
                    select: {
                        upid: true,
                        first_name: true,
                        middle_name: true,
                        last_name: true,
                        ipd_admissions: {
                            where: {
                                status: 'admitted'
                            },
                            select: {
                                wards: {
                                    select: {
                                        ward_name: true
                                    }
                                }
                            },
                            take: 1
                        }
                    }
                },
                users: {
                    select: {
                        username: true,
                        staff_profiles: {
                            select: {
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                },
                approved_by_user: {
                    select: {
                        username: true,
                        staff_profiles: {
                            select: {
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                },
                cancelled_by_user: {
                    select: {
                        username: true,
                        staff_profiles: {
                            select: {
                                first_name: true,
                                last_name: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { priority: 'desc' },
                { entry_date: 'desc' }
            ]
        }),
        prisma.diet_entries.count({ where })
    ]);

    // Helper function to format staff name
    const formatStaffName = (user) => {
        if (!user) return null;
        if (user.staff_profiles) {
            return `${user.staff_profiles.first_name} ${user.staff_profiles.last_name}`;
        }
        return user.username;
    };

    // Transform response to match API spec
    const transformedPlans = dietPlans.map(plan => ({
        id: plan.entry_id.toString(),
        patientName: `${plan.patients.first_name} ${plan.patients.middle_name || ''} ${plan.patients.last_name || ''}`.trim(),
        upid: plan.patients.upid,
        ward: plan.patients.ipd_admissions?.[0]?.wards?.ward_name || 'N/A',
        dietType: plan.diet_type,
        meal: plan.meal_type || 'All Meals',
        priority: plan.priority === 'emergency' ? 'high' : plan.priority,
        status: plan.status,
        entryDate: plan.entry_date,
        createdBy: plan.users?.staff_profiles 
            ? `${plan.users.staff_profiles.first_name} ${plan.users.staff_profiles.last_name}`
            : plan.users?.username || 'Unknown',
        approvedBy: plan.status === 'approved' ? formatStaffName(plan.approved_by_user) : null,
        cancelledBy: plan.status === 'cancelled' ? formatStaffName(plan.cancelled_by_user) : null,
        cancellationReason: plan.status === 'cancelled' ? plan.cancellation_reason : null,
        calories: plan.calories,
        protein: plan.protein ? Number(plan.protein) : null,
        notes: plan.notes
    }));

    return {
        data: transformedPlans,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get a specific diet plan by ID
 * @param {Object} prisma - Prisma client instance
 * @param {BigInt} entryId - Diet entry ID
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @returns {Promise<Object|null>} Diet plan details or null
 */
export const getDietPlanById = async (prisma, entryId, tenantId) => {
    const plan = await prisma.diet_entries.findFirst({
        where: {
            entry_id: BigInt(entryId),
            tenant_id: tenantId
        },
        include: {
            patients: {
                select: {
                    upid: true,
                    first_name: true,
                    middle_name: true,
                    last_name: true,
                    date_of_birth: true,
                    gender: true,
                    ipd_admissions: {
                        where: {
                            status: 'admitted'
                        },
                        select: {
                            provisional_diagnosis: true,
                            wards: {
                                select: {
                                    ward_name: true
                                }
                            }
                        },
                        take: 1
                    }
                }
            },
            users: {
                select: {
                    username: true,
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            },
            approved_by_user: {
                select: {
                    username: true,
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            },
            cancelled_by_user: {
                select: {
                    username: true,
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            }
        }
    });

    if (!plan) {
        return null;
    }

    // Transform response
    return {
        id: plan.entry_id.toString(),
        patientInfo: {
            upid: plan.patients.upid,
            name: `${plan.patients.first_name} ${plan.patients.middle_name || ''} ${plan.patients.last_name || ''}`.trim(),
            age: plan.age,
            gender: plan.gender,
            ward: plan.patients.ipd_admissions?.[0]?.wards?.ward_name || 'N/A',
            diagnosis: plan.patients.ipd_admissions?.[0]?.provisional_diagnosis || 'N/A'
        },
        anthropometrics: {
            height: plan.height ? Number(plan.height) : null,
            weight: plan.weight ? Number(plan.weight) : null,
            bmi: plan.bmi ? Number(plan.bmi) : null,
            mobility: plan.mobility
        },
        labResults: {
            glucose: plan.glucose ? Number(plan.glucose) : null,
            hba1c: plan.hba1c ? Number(plan.hba1c) : null
        },
        prescription: {
            dietType: plan.diet_type,
            calories: plan.calories,
            protein: plan.protein ? Number(plan.protein) : null
        },
        schedule: {
            breakfast: plan.breakfast_time,
            lunch: plan.lunch_time,
            dinner: plan.dinner_time,
            mealType: plan.meal_type
        },
        status: plan.status,
        priority: plan.priority === 'emergency' ? 'high' : plan.priority,
        notes: plan.notes,
        entryDate: plan.entry_date,
        createdBy: plan.users?.staff_profiles 
            ? `${plan.users.staff_profiles.first_name} ${plan.users.staff_profiles.last_name}`
            : plan.users?.username || 'Unknown',
        createdAt: plan.created_at,
        updatedAt: plan.updated_at,
        approvedBy: plan.approved_by_user?.staff_profiles 
            ? `${plan.approved_by_user.staff_profiles.first_name} ${plan.approved_by_user.staff_profiles.last_name}`
            : plan.approved_by_user?.username || null,
        approvedAt: plan.approved_at,
        cancelledBy: plan.cancelled_by_user?.staff_profiles 
            ? `${plan.cancelled_by_user.staff_profiles.first_name} ${plan.cancelled_by_user.staff_profiles.last_name}`
            : plan.cancelled_by_user?.username || null,
        cancelledAt: plan.cancelled_at,
        cancellationReason: plan.cancellation_reason
    };
};

/**
 * Approve a diet plan
 * @param {Object} prisma - Prisma client instance
 * @param {BigInt} entryId - Diet entry ID
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @param {BigInt} approvedBy - User ID of the approver
 * @returns {Promise<Object|null>} Updated diet plan or null
 */
export const approveDietPlan = async (prisma, entryId, tenantId, approvedBy) => {
    const result = await prisma.diet_entries.updateMany({
        where: {
            entry_id: BigInt(entryId),
            tenant_id: tenantId,
            status: { in: ['pending', 'modified'] }
        },
        data: {
            status: 'approved',
            approved_by: approvedBy,
            approved_at: new Date()
        }
    });

    if (result.count === 0) {
        return null;
    }

    return getDietPlanById(prisma, entryId, tenantId);
};

/**
 * Modify a diet plan
 * @param {Object} prisma - Prisma client instance
 * @param {BigInt} entryId - Diet entry ID
 * @param {Object} updateData - Updated diet type and notes
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @returns {Promise<Object|null>} Updated diet plan or null
 */
export const modifyDietPlan = async (prisma, entryId, updateData, tenantId) => {
    const { dietType, notes } = updateData;

    const data = {
        status: 'modified'
    };

    if (dietType) {
        data.diet_type = dietType;
    }

    if (notes !== undefined) {
        data.notes = notes;
    }

    const result = await prisma.diet_entries.updateMany({
        where: {
            entry_id: BigInt(entryId),
            tenant_id: tenantId,
            status: { not: 'cancelled' }
        },
        data
    });

    if (result.count === 0) {
        return null;
    }

    return getDietPlanById(prisma, entryId, tenantId);
};

/**
 * Cancel a diet plan
 * @param {Object} prisma - Prisma client instance
 * @param {BigInt} entryId - Diet entry ID
 * @param {String} reason - Cancellation reason
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @param {BigInt} cancelledBy - User ID of the canceller
 * @returns {Promise<Object|null>} Updated diet plan or null
 */
export const cancelDietPlan = async (prisma, entryId, reason, tenantId, cancelledBy) => {
    const result = await prisma.diet_entries.updateMany({
        where: {
            entry_id: BigInt(entryId),
            tenant_id: tenantId,
            status: { not: 'cancelled' }
        },
        data: {
            status: 'cancelled',
            cancelled_by: cancelledBy,
            cancelled_at: new Date(),
            cancellation_reason: reason
        }
    });

    if (result.count === 0) {
        return null;
    }

    return getDietPlanById(prisma, entryId, tenantId);
};

/**
 * Get status statistics based on view mode (daily/monthly)
 * @param {Object} prisma - Prisma client instance
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @param {String} view - View mode ('daily' or 'monthly')
 * @returns {Promise<Object>} Status statistics
 */
export const getStatusStats = async (prisma, tenantId, view) => {
    // Calculate date range based on view
    const now = new Date();
    let dateFilter;

    if (view === 'daily') {
        // Today's date at 00:00:00
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = {
            gte: startOfDay
        };
    } else if (view === 'monthly') {
        // First day of current month at 00:00:00
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = {
            gte: startOfMonth
        };
    }

    const where = {
        tenant_id: tenantId,
        created_at: dateFilter
    };

    const [total, approved, modified, cancelled] = await Promise.all([
        // Total entries in the period
        prisma.diet_entries.count({ where }),
        
        // Approved
        prisma.diet_entries.count({
            where: {
                ...where,
                status: 'approved'
            }
        }),
        
        // Modified
        prisma.diet_entries.count({
            where: {
                ...where,
                status: 'modified'
            }
        }),
        
        // Cancelled
        prisma.diet_entries.count({
            where: {
                ...where,
                status: 'cancelled'
            }
        })
    ]);

    return {
        total,
        approved,
        modified,
        cancelled
    };
};

/**
 * Get diet plan history with filters
 * @param {Object} prisma - Prisma client instance
 * @param {BigInt} tenantId - Tenant ID for isolation
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} List of diet plan history
 */
export const getDietPlanHistory = async (prisma, tenantId, filters = {}) => {
    const {
        tab,
        view,
        ward,
        meal,
        dietType,
        search
    } = filters;

    // Calculate date range based on view
    const now = new Date();
    let dateFilter;

    if (view === 'daily') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        dateFilter = {
            gte: startOfDay
        };
    } else if (view === 'monthly') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = {
            gte: startOfMonth
        };
    }

    // Build where clause
    const where = {
        tenant_id: tenantId,
        created_at: dateFilter
    };

    // Filter by status tab
    if (tab && tab !== 'all') {
        where.status = tab;
    }

    // Filter by diet type
    if (dietType) {
        where.diet_type = { contains: dietType, mode: 'insensitive' };
    }

    // Filter by meal
    if (meal) {
        where.meal_type = meal;
    }

    // For patient name search
    if (search) {
        where.patients = {
            OR: [
                { first_name: { contains: search, mode: 'insensitive' } },
                { last_name: { contains: search, mode: 'insensitive' } },
                { upid: { contains: search, mode: 'insensitive' } }
            ]
        };
    }

    // For ward filter
    if (ward) {
        where.patients = {
            ...where.patients,
            ipd_admissions: {
                some: {
                    status: 'admitted',
                    wards: {
                        ward_name: { contains: ward, mode: 'insensitive' }
                    }
                }
            }
        };
    }

    const dietPlans = await prisma.diet_entries.findMany({
        where,
        include: {
            patients: {
                select: {
                    upid: true,
                    first_name: true,
                    middle_name: true,
                    last_name: true,
                    ipd_admissions: {
                        where: { status: 'admitted' },
                        select: {
                            wards: {
                                select: {
                                    ward_name: true
                                }
                            }
                        },
                        take: 1
                    }
                }
            },
            users: {
                select: {
                    username: true,
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            },
            approved_by_user: {
                select: {
                    username: true,
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            },
            cancelled_by_user: {
                select: {
                    username: true,
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true
                        }
                    }
                }
            }
        },
        orderBy: [
            { created_at: 'desc' }
        ]
    });

    // Helper function to format staff name
    const formatStaffName = (user) => {
        if (!user) return null;
        if (user.staff_profiles) {
            return `${user.staff_profiles.first_name} ${user.staff_profiles.last_name}`;
        }
        return user.username;
    };

    // Helper function to format meal time
    const formatMealTime = (plan) => {
        if (plan.meal_type === 'Breakfast') return plan.breakfast_time;
        if (plan.meal_type === 'Lunch') return plan.lunch_time;
        if (plan.meal_type === 'Dinner') return plan.dinner_time;
        return 'All Day';
    };

    // Transform response
    return dietPlans.map(plan => {
        const patientName = `${plan.patients.first_name} ${plan.patients.middle_name || ''} ${plan.patients.last_name || ''}`.trim();
        const wardName = plan.patients.ipd_admissions?.[0]?.wards?.ward_name || 'N/A';
        
        // Map status to display format
        const statusMap = {
            'approved': 'Approved',
            'modified': 'Modified',
            'cancelled': 'Cancelled',
            'pending': 'Pending'
        };

        return {
            id: plan.entry_id.toString(),
            patient: patientName,
            ward: wardName,
            diet: plan.diet_type || 'N/A',
            meal: plan.meal_type || 'All Meals',
            time: formatMealTime(plan),
            status: statusMap[plan.status] || plan.status,
            approvedBy: plan.status === 'approved' ? formatStaffName(plan.approved_by_user) : null,
            modifiedBy: plan.status === 'modified' ? formatStaffName(plan.users) : null,
            cancelledBy: plan.status === 'cancelled' ? formatStaffName(plan.cancelled_by_user) : null,
            originalDiet: plan.status === 'modified' ? plan.diet_type : null,
            newDiet: plan.status === 'modified' ? plan.diet_type : null,
            reason: plan.status === 'cancelled' ? plan.cancellation_reason : null,
            date: plan.created_at ? plan.created_at.toISOString() : null
        };
    });
};

