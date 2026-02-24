/**
 * Payroll Service
 */

import { normalizeEmployeeCode } from '../../../utils/employeeCodeGenerator.js';
import { generateNumber } from '../../../utils/number-generator.js';

function toIsoString(value) {
    return value ? new Date(value).toISOString() : null;
}

function parseBooleanFilter(value) {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        if (normalized === 'true') return true;
        if (normalized === 'false') return false;
    }
    return undefined;
}

function toAmount(value) {
    return Number(Number(value || 0).toFixed(2));
}

function mapSalaryComponent(component) {
    return {
        component_id: component.component_id,
        code: component.code,
        name: component.name,
        type: component.type,
        calc_type: component.calc_type,
        is_taxable: component.is_taxable,
        is_active: component.is_active,
        created_at: toIsoString(component.created_at),
        updated_at: toIsoString(component.updated_at)
    };
}

function mapStaffSalaryProfile(profile) {
    return {
        salary_profile_id: Number(profile.salary_profile_id),
        tenant_id: Number(profile.tenant_id),
        staff_id: Number(profile.staff_id),
        staff_name: profile.staff_profiles ? `${profile.staff_profiles.first_name} ${profile.staff_profiles.last_name}` : null,
        employee_code: normalizeEmployeeCode(profile.staff_profiles?.employee_code),
        effective_from: toIsoString(profile.effective_from),
        effective_to: toIsoString(profile.effective_to),
        is_active: profile.is_active,
        base_gross: toAmount(profile.base_gross),
        notes: profile.notes,
        created_at: toIsoString(profile.created_at),
        updated_at: toIsoString(profile.updated_at),
        components: (profile.staff_salary_component_values || []).map(componentValue => ({
            id: Number(componentValue.id),
            component_id: componentValue.component_id,
            component_code: componentValue.salary_components?.code || null,
            component_name: componentValue.salary_components?.name || null,
            component_type: componentValue.salary_components?.type || null,
            calc_type: componentValue.salary_components?.calc_type || null,
            value: toAmount(componentValue.value),
            percentage_base: componentValue.percentage_base,
            sort_order: componentValue.sort_order
        }))
    };
}

function mapCycle(cycle) {
    return {
        cycle_id: Number(cycle.cycle_id),
        tenant_id: Number(cycle.tenant_id),
        name: cycle.name,
        period_start: toIsoString(cycle.period_start),
        period_end: toIsoString(cycle.period_end),
        status: cycle.status,
        cutoff_date: toIsoString(cycle.cutoff_date),
        created_by: Number(cycle.created_by),
        created_at: toIsoString(cycle.created_at),
        updated_at: toIsoString(cycle.updated_at)
    };
}

async function getCycleOrThrow(prisma, tenantId, cycleId) {
    const cycle = await prisma.payroll_cycles.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            cycle_id: BigInt(cycleId)
        }
    });

    if (!cycle) {
        throw new Error('PAYROLL_CYCLE_NOT_FOUND');
    }

    return cycle;
}

async function getActiveSalaryProfilesForCycle(prisma, tenantId, periodStart, periodEnd) {
    return prisma.staff_salary_profiles.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            is_active: true,
            effective_from: { lte: periodEnd },
            OR: [
                { effective_to: null },
                { effective_to: { gte: periodStart } }
            ]
        },
        include: {
            staff_profiles: {
                select: {
                    profile_id: true,
                    first_name: true,
                    last_name: true,
                    employee_code: true,
                    is_active: true
                }
            },
            staff_salary_component_values: {
                include: {
                    salary_components: true
                },
                orderBy: {
                    sort_order: 'asc'
                }
            }
        }
    });
}

async function getAttendanceMapForCycle(prisma, tenantId, staffIds, periodStart, periodEnd) {
    if (!staffIds.length) {
        return new Map();
    }

    const rosters = await prisma.duty_roster.findMany({
        where: {
            tenant_id: BigInt(tenantId),
            staff_id: { in: staffIds.map(id => BigInt(id)) },
            duty_date: {
                gte: periodStart,
                lte: periodEnd
            }
        },
        select: {
            staff_id: true,
            is_available: true
        }
    });

    const map = new Map();
    for (const row of rosters) {
        const key = Number(row.staff_id);
        if (!map.has(key)) {
            map.set(key, { scheduled: 0, present: 0 });
        }
        const bucket = map.get(key);
        bucket.scheduled += 1;
        if (row.is_available) bucket.present += 1;
    }

    return map;
}

function buildComponentCalculation(profile) {
    const baseGross = toAmount(profile.base_gross);
    const calculatedByCode = new Map();
    const rows = [];

    for (const item of profile.staff_salary_component_values) {
        const component = item.salary_components;
        let amount = 0;

        if (component.calc_type === 'fixed') {
            amount = toAmount(item.value);
        } else {
            const percentageValue = Number(item.value || 0);
            const percentageBaseCode = item.percentage_base || null;
            let baseForPercentage = baseGross;
            if (percentageBaseCode && calculatedByCode.has(percentageBaseCode)) {
                baseForPercentage = calculatedByCode.get(percentageBaseCode);
            }
            amount = toAmount((baseForPercentage * percentageValue) / 100);
        }

        calculatedByCode.set(component.code, amount);

        rows.push({
            component_id: component.component_id,
            component_code: component.code,
            component_name: component.name,
            component_type: component.type,
            calc_type: component.calc_type,
            amount
        });
    }

    return rows;
}

function buildRunItemsPreview(cycle, profiles, attendanceMap) {
    const items = [];

    for (const profile of profiles) {
        if (!profile.staff_profiles?.is_active) continue;

        const staffId = Number(profile.staff_id);
        const attendance = attendanceMap.get(staffId) || { scheduled: 0, present: 0 };
        const components = buildComponentCalculation(profile);

        const earnings = components
            .filter(component => component.component_type === 'earning')
            .reduce((sum, component) => sum + component.amount, 0);

        const deductions = components
            .filter(component => component.component_type === 'deduction')
            .reduce((sum, component) => sum + component.amount, 0);

        const lopDays = Math.max(attendance.scheduled - attendance.present, 0);
        const lopAmount = attendance.scheduled > 0 ? toAmount((earnings / attendance.scheduled) * lopDays) : 0;
        const totalDeductions = toAmount(deductions + lopAmount);
        const netPay = toAmount(Math.max(earnings - totalDeductions, 0));

        items.push({
            staff_id: staffId,
            employee_code: normalizeEmployeeCode(profile.staff_profiles?.employee_code),
            staff_name: `${profile.staff_profiles?.first_name || ''} ${profile.staff_profiles?.last_name || ''}`.trim(),
            salary_profile_id: Number(profile.salary_profile_id),
            payable_days: attendance.present,
            lop_days: lopDays,
            scheduled_days: attendance.scheduled,
            gross_earnings: toAmount(earnings),
            total_deductions: totalDeductions,
            net_pay: netPay,
            components
        });
    }

    return {
        cycle: {
            cycle_id: Number(cycle.cycle_id),
            name: cycle.name,
            period_start: toIsoString(cycle.period_start),
            period_end: toIsoString(cycle.period_end)
        },
        totals: {
            staff_count: items.length,
            gross_earnings: toAmount(items.reduce((sum, item) => sum + item.gross_earnings, 0)),
            total_deductions: toAmount(items.reduce((sum, item) => sum + item.total_deductions, 0)),
            net_pay: toAmount(items.reduce((sum, item) => sum + item.net_pay, 0))
        },
        items
    };
}

function mapRun(run) {
    return {
        run_id: Number(run.run_id),
        tenant_id: Number(run.tenant_id),
        cycle_id: Number(run.cycle_id),
        cycle_name: run.payroll_cycles?.name || null,
        status: run.status,
        generated_by: Number(run.generated_by),
        generated_at: toIsoString(run.generated_at),
        approved_by: run.approved_by ? Number(run.approved_by) : null,
        approved_at: toIsoString(run.approved_at),
        created_at: toIsoString(run.created_at),
        updated_at: toIsoString(run.updated_at)
    };
}

function mapPayslip(row) {
    return {
        payslip_id: Number(row.payslip_id),
        tenant_id: Number(row.tenant_id),
        run_id: Number(row.run_id),
        staff_id: Number(row.staff_id),
        staff_name: row.staff_profiles ? `${row.staff_profiles.first_name} ${row.staff_profiles.last_name}` : null,
        employee_code: normalizeEmployeeCode(row.staff_profiles?.employee_code),
        payslip_number: row.payslip_number,
        issued_at: toIsoString(row.issued_at),
        pdf_url: row.pdf_url,
        email_sent_at: toIsoString(row.email_sent_at),
        created_at: toIsoString(row.created_at)
    };
}

export async function createSalaryComponent(prisma, tenantId, data) {
    const component = await prisma.salary_components.create({
        data: {
            tenant_id: BigInt(tenantId),
            code: data.code,
            name: data.name,
            type: data.type,
            calc_type: data.calc_type,
            is_taxable: data.is_taxable ?? false,
            is_active: data.is_active ?? true
        }
    });

    return mapSalaryComponent(component);
}

export async function listSalaryComponents(prisma, tenantId, filters = {}) {
    const where = {
        tenant_id: BigInt(tenantId)
    };

    if (filters.type) where.type = filters.type;

    const isActive = parseBooleanFilter(filters.is_active);
    if (isActive !== undefined) where.is_active = isActive;

    if (filters.search) {
        where.OR = [
            { code: { contains: filters.search, mode: 'insensitive' } },
            { name: { contains: filters.search, mode: 'insensitive' } }
        ];
    }

    const rows = await prisma.salary_components.findMany({
        where,
        orderBy: [{ type: 'asc' }, { name: 'asc' }]
    });

    return rows.map(mapSalaryComponent);
}

export async function updateSalaryComponent(prisma, tenantId, componentId, data) {
    const existing = await prisma.salary_components.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            component_id: Number(componentId)
        },
        select: { component_id: true }
    });

    if (!existing) throw new Error('SALARY_COMPONENT_NOT_FOUND');

    const updated = await prisma.salary_components.update({
        where: { component_id: Number(componentId) },
        data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.type !== undefined ? { type: data.type } : {}),
            ...(data.calc_type !== undefined ? { calc_type: data.calc_type } : {}),
            ...(data.is_taxable !== undefined ? { is_taxable: data.is_taxable } : {}),
            ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
            updated_at: new Date()
        }
    });

    return mapSalaryComponent(updated);
}

export async function createStaffSalaryProfile(prisma, tenantId, data) {
    const staff = await prisma.staff_profiles.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            profile_id: BigInt(data.staff_id)
        },
        select: { profile_id: true }
    });
    if (!staff) throw new Error('STAFF_PROFILE_NOT_FOUND');

    const componentIds = [...new Set(data.components.map(item => Number(item.component_id)))];
    const componentCount = await prisma.salary_components.count({
        where: {
            tenant_id: BigInt(tenantId),
            component_id: { in: componentIds }
        }
    });
    if (componentCount !== componentIds.length) {
        throw new Error('SALARY_COMPONENT_NOT_FOUND');
    }

    if (data.is_active !== false) {
        await prisma.staff_salary_profiles.updateMany({
            where: {
                tenant_id: BigInt(tenantId),
                staff_id: BigInt(data.staff_id),
                is_active: true
            },
            data: {
                is_active: false,
                updated_at: new Date()
            }
        });
    }

    const created = await prisma.staff_salary_profiles.create({
        data: {
            tenant_id: BigInt(tenantId),
            staff_id: BigInt(data.staff_id),
            effective_from: new Date(data.effective_from),
            effective_to: data.effective_to ? new Date(data.effective_to) : null,
            is_active: data.is_active ?? true,
            base_gross: toAmount(data.base_gross),
            notes: data.notes || null,
            staff_salary_component_values: {
                create: data.components.map(component => ({
                    component_id: Number(component.component_id),
                    value: toAmount(component.value),
                    percentage_base: component.percentage_base || null,
                    sort_order: component.sort_order ?? null
                }))
            }
        },
        include: {
            staff_profiles: {
                select: {
                    first_name: true,
                    last_name: true,
                    employee_code: true
                }
            },
            staff_salary_component_values: {
                include: {
                    salary_components: true
                },
                orderBy: {
                    sort_order: 'asc'
                }
            }
        }
    });

    return mapStaffSalaryProfile(created);
}

export async function listStaffSalaryProfiles(prisma, tenantId, filters = {}) {
    const where = {
        tenant_id: BigInt(tenantId)
    };

    if (filters.staff_id !== undefined) {
        where.staff_id = BigInt(filters.staff_id);
    }

    const isActive = parseBooleanFilter(filters.is_active);
    if (isActive !== undefined) {
        where.is_active = isActive;
    }

    const rows = await prisma.staff_salary_profiles.findMany({
        where,
        include: {
            staff_profiles: {
                select: {
                    first_name: true,
                    last_name: true,
                    employee_code: true
                }
            },
            staff_salary_component_values: {
                include: {
                    salary_components: true
                },
                orderBy: {
                    sort_order: 'asc'
                }
            }
        },
        orderBy: [{ created_at: 'desc' }]
    });

    return rows.map(mapStaffSalaryProfile);
}

export async function getStaffSalaryProfile(prisma, tenantId, salaryProfileId) {
    const row = await prisma.staff_salary_profiles.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            salary_profile_id: BigInt(salaryProfileId)
        },
        include: {
            staff_profiles: {
                select: {
                    first_name: true,
                    last_name: true,
                    employee_code: true
                }
            },
            staff_salary_component_values: {
                include: {
                    salary_components: true
                },
                orderBy: {
                    sort_order: 'asc'
                }
            }
        }
    });

    if (!row) throw new Error('SALARY_PROFILE_NOT_FOUND');
    return mapStaffSalaryProfile(row);
}

export async function createPayrollCycle(prisma, tenantId, userId, data) {
    const created = await prisma.payroll_cycles.create({
        data: {
            tenant_id: BigInt(tenantId),
            name: data.name,
            period_start: new Date(data.period_start),
            period_end: new Date(data.period_end),
            cutoff_date: data.cutoff_date ? new Date(data.cutoff_date) : null,
            status: 'draft',
            created_by: BigInt(userId)
        }
    });

    return mapCycle(created);
}

export async function listPayrollCycles(prisma, tenantId, filters = {}) {
    const where = {
        tenant_id: BigInt(tenantId)
    };
    if (filters.status) where.status = filters.status;

    const rows = await prisma.payroll_cycles.findMany({
        where,
        orderBy: [{ period_start: 'desc' }, { cycle_id: 'desc' }]
    });

    return rows.map(mapCycle);
}

export async function updatePayrollCycleStatus(prisma, tenantId, cycleId, status) {
    const cycle = await getCycleOrThrow(prisma, tenantId, cycleId);

    const updated = await prisma.payroll_cycles.update({
        where: { cycle_id: cycle.cycle_id },
        data: {
            status,
            updated_at: new Date()
        }
    });

    return mapCycle(updated);
}

export async function previewPayrollRun(prisma, tenantId, cycleId) {
    const cycle = await getCycleOrThrow(prisma, tenantId, cycleId);

    const profiles = await getActiveSalaryProfilesForCycle(
        prisma,
        tenantId,
        new Date(cycle.period_start),
        new Date(cycle.period_end)
    );

    const staffIds = profiles.map(profile => Number(profile.staff_id));
    const attendanceMap = await getAttendanceMapForCycle(
        prisma,
        tenantId,
        staffIds,
        new Date(cycle.period_start),
        new Date(cycle.period_end)
    );

    return buildRunItemsPreview(cycle, profiles, attendanceMap);
}

export async function generatePayrollRun(prisma, tenantId, userId, cycleId) {
    const cycle = await getCycleOrThrow(prisma, tenantId, cycleId);

    const existingRun = await prisma.payroll_runs.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            cycle_id: BigInt(cycleId),
            status: { in: ['draft', 'locked', 'approved'] }
        },
        select: {
            run_id: true
        }
    });

    if (existingRun) {
        throw new Error('PAYROLL_RUN_ALREADY_EXISTS');
    }

    const preview = await previewPayrollRun(prisma, tenantId, cycleId);

    const createdRun = await prisma.payroll_runs.create({
        data: {
            tenant_id: BigInt(tenantId),
            cycle_id: BigInt(cycleId),
            status: 'draft',
            generated_by: BigInt(userId)
        }
    });

    for (const item of preview.items) {
        const createdItem = await prisma.payroll_run_items.create({
            data: {
                run_id: createdRun.run_id,
                staff_id: BigInt(item.staff_id),
                payable_days: toAmount(item.payable_days),
                lop_days: toAmount(item.lop_days),
                gross_earnings: toAmount(item.gross_earnings),
                total_deductions: toAmount(item.total_deductions),
                net_pay: toAmount(item.net_pay),
                remarks: null
            }
        });

        if (item.components.length) {
            await prisma.payroll_run_item_components.createMany({
                data: item.components.map(component => ({
                    item_id: createdItem.item_id,
                    component_id: component.component_id,
                    amount: toAmount(component.amount)
                }))
            });
        }

        const payslipNumber = await generateNumber(prisma, 'PSLP', tenantId);
        await prisma.payslips.create({
            data: {
                tenant_id: BigInt(tenantId),
                run_id: createdRun.run_id,
                staff_id: BigInt(item.staff_id),
                payslip_number: payslipNumber,
                issued_at: new Date()
            }
        });
    }

    return {
        run_id: Number(createdRun.run_id),
        cycle_id: Number(createdRun.cycle_id),
        status: createdRun.status,
        generated_at: toIsoString(createdRun.generated_at),
        generated_items: preview.items.length,
        totals: preview.totals
    };
}

export async function finalizePayrollRun(prisma, tenantId, runId, approverUserId) {
    const run = await prisma.payroll_runs.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            run_id: BigInt(runId)
        }
    });

    if (!run) throw new Error('PAYROLL_RUN_NOT_FOUND');
    if (run.status !== 'draft') throw new Error('PAYROLL_RUN_NOT_IN_DRAFT');

    const updated = await prisma.payroll_runs.update({
        where: { run_id: run.run_id },
        data: {
            status: 'locked',
            approved_by: BigInt(approverUserId),
            approved_at: new Date(),
            updated_at: new Date()
        }
    });

    return {
        run_id: Number(updated.run_id),
        status: updated.status,
        approved_by: Number(updated.approved_by),
        approved_at: toIsoString(updated.approved_at)
    };
}

export async function listPayrollRuns(prisma, tenantId, filters = {}) {
    const where = {
        tenant_id: BigInt(tenantId)
    };
    if (filters.cycle_id !== undefined) where.cycle_id = BigInt(filters.cycle_id);
    if (filters.status) where.status = filters.status;

    const rows = await prisma.payroll_runs.findMany({
        where,
        include: {
            payroll_cycles: {
                select: {
                    name: true
                }
            }
        },
        orderBy: [{ created_at: 'desc' }, { run_id: 'desc' }]
    });

    return rows.map(mapRun);
}

export async function getPayrollRun(prisma, tenantId, runId) {
    const row = await prisma.payroll_runs.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            run_id: BigInt(runId)
        },
        include: {
            payroll_cycles: {
                select: {
                    name: true,
                    period_start: true,
                    period_end: true
                }
            },
            payroll_run_items: {
                include: {
                    staff_profiles: {
                        select: {
                            first_name: true,
                            last_name: true,
                            employee_code: true
                        }
                    },
                    payroll_run_item_components: {
                        include: {
                            salary_components: {
                                select: {
                                    code: true,
                                    name: true,
                                    type: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    item_id: 'asc'
                }
            }
        }
    });

    if (!row) throw new Error('PAYROLL_RUN_NOT_FOUND');

    const items = row.payroll_run_items.map(item => ({
        item_id: Number(item.item_id),
        staff_id: Number(item.staff_id),
        staff_name: item.staff_profiles ? `${item.staff_profiles.first_name} ${item.staff_profiles.last_name}` : null,
        employee_code: normalizeEmployeeCode(item.staff_profiles?.employee_code),
        payable_days: toAmount(item.payable_days),
        lop_days: toAmount(item.lop_days),
        gross_earnings: toAmount(item.gross_earnings),
        total_deductions: toAmount(item.total_deductions),
        net_pay: toAmount(item.net_pay),
        remarks: item.remarks,
        components: item.payroll_run_item_components.map(component => ({
            id: Number(component.id),
            component_id: component.component_id,
            component_code: component.salary_components?.code || null,
            component_name: component.salary_components?.name || null,
            component_type: component.salary_components?.type || null,
            amount: toAmount(component.amount)
        }))
    }));

    return {
        ...mapRun(row),
        cycle: {
            name: row.payroll_cycles?.name || null,
            period_start: toIsoString(row.payroll_cycles?.period_start),
            period_end: toIsoString(row.payroll_cycles?.period_end)
        },
        totals: {
            staff_count: items.length,
            gross_earnings: toAmount(items.reduce((sum, item) => sum + item.gross_earnings, 0)),
            total_deductions: toAmount(items.reduce((sum, item) => sum + item.total_deductions, 0)),
            net_pay: toAmount(items.reduce((sum, item) => sum + item.net_pay, 0))
        },
        items
    };
}

export async function listPayslips(prisma, tenantId, filters = {}) {
    const where = {
        tenant_id: BigInt(tenantId)
    };

    if (filters.run_id !== undefined) {
        where.run_id = BigInt(filters.run_id);
    }

    if (filters.staff_id !== undefined) {
        where.staff_id = BigInt(filters.staff_id);
    }

    const rows = await prisma.payslips.findMany({
        where,
        include: {
            staff_profiles: {
                select: {
                    first_name: true,
                    last_name: true,
                    employee_code: true
                }
            }
        },
        orderBy: [{ issued_at: 'desc' }, { payslip_id: 'desc' }]
    });

    return rows.map(mapPayslip);
}

export async function getPayslip(prisma, tenantId, payslipId) {
    const row = await prisma.payslips.findFirst({
        where: {
            tenant_id: BigInt(tenantId),
            payslip_id: BigInt(payslipId)
        },
        include: {
            staff_profiles: {
                select: {
                    first_name: true,
                    last_name: true,
                    employee_code: true
                }
            },
            payroll_runs: {
                include: {
                    payroll_cycles: {
                        select: {
                            name: true,
                            period_start: true,
                            period_end: true
                        }
                    }
                }
            }
        }
    });

    if (!row) throw new Error('PAYSLIP_NOT_FOUND');

    const runItem = await prisma.payroll_run_items.findFirst({
        where: {
            run_id: row.run_id,
            staff_id: row.staff_id
        },
        include: {
            payroll_run_item_components: {
                include: {
                    salary_components: {
                        select: {
                            code: true,
                            name: true,
                            type: true
                        }
                    }
                }
            }
        }
    });

    return {
        ...mapPayslip(row),
        cycle: {
            cycle_id: Number(row.payroll_runs.cycle_id),
            name: row.payroll_runs.payroll_cycles?.name || null,
            period_start: toIsoString(row.payroll_runs.payroll_cycles?.period_start),
            period_end: toIsoString(row.payroll_runs.payroll_cycles?.period_end)
        },
        run_status: row.payroll_runs.status,
        breakdown: runItem
            ? {
                payable_days: toAmount(runItem.payable_days),
                lop_days: toAmount(runItem.lop_days),
                gross_earnings: toAmount(runItem.gross_earnings),
                total_deductions: toAmount(runItem.total_deductions),
                net_pay: toAmount(runItem.net_pay),
                components: runItem.payroll_run_item_components.map(component => ({
                    id: Number(component.id),
                    component_id: component.component_id,
                    component_code: component.salary_components?.code || null,
                    component_name: component.salary_components?.name || null,
                    component_type: component.salary_components?.type || null,
                    amount: toAmount(component.amount)
                }))
            }
            : null
    };
}
