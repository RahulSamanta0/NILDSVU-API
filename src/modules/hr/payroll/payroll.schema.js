/**
 * Payroll Schema
 */

export const createSalaryComponentSchema = {
    body: {
        type: 'object',
        required: ['code', 'name', 'type', 'calc_type'],
        properties: {
            code: { type: 'string', maxLength: 50 },
            name: { type: 'string', maxLength: 255 },
            type: { type: 'string', enum: ['earning', 'deduction'] },
            calc_type: { type: 'string', enum: ['fixed', 'percentage'] },
            is_taxable: { type: 'boolean' },
            is_active: { type: 'boolean' }
        }
    }
};

export const listSalaryComponentsSchema = {
    querystring: {
        type: 'object',
        properties: {
            type: { type: 'string', enum: ['earning', 'deduction'] },
            is_active: { type: 'boolean' },
            search: { type: 'string', maxLength: 100 }
        }
    }
};

export const updateSalaryComponentSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    },
    body: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
            name: { type: 'string', maxLength: 255 },
            type: { type: 'string', enum: ['earning', 'deduction'] },
            calc_type: { type: 'string', enum: ['fixed', 'percentage'] },
            is_taxable: { type: 'boolean' },
            is_active: { type: 'boolean' }
        }
    }
};

export const createStaffSalaryProfileSchema = {
    body: {
        type: 'object',
        required: ['staff_id', 'effective_from', 'base_gross', 'components'],
        properties: {
            staff_id: { type: 'integer' },
            effective_from: { type: 'string', format: 'date' },
            effective_to: { type: 'string', format: 'date' },
            is_active: { type: 'boolean' },
            base_gross: { type: 'number' },
            notes: { type: 'string' },
            components: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['component_id', 'value'],
                    properties: {
                        component_id: { type: 'integer' },
                        value: { type: 'number' },
                        percentage_base: { type: 'string', maxLength: 50 },
                        sort_order: { type: 'integer' }
                    }
                }
            }
        }
    }
};

export const listStaffSalaryProfilesSchema = {
    querystring: {
        type: 'object',
        properties: {
            staff_id: { type: 'integer' },
            is_active: { type: 'boolean' }
        }
    }
};

export const getStaffSalaryProfileSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    }
};

export const createPayrollCycleSchema = {
    body: {
        type: 'object',
        required: ['name', 'period_start', 'period_end'],
        properties: {
            name: { type: 'string', maxLength: 255 },
            period_start: { type: 'string', format: 'date' },
            period_end: { type: 'string', format: 'date' },
            cutoff_date: { type: 'string', format: 'date' }
        }
    }
};

export const listPayrollCyclesSchema = {
    querystring: {
        type: 'object',
        properties: {
            status: { type: 'string', enum: ['draft', 'processing', 'finalized', 'paid'] }
        }
    }
};

export const updatePayrollCycleStatusSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    },
    body: {
        type: 'object',
        required: ['status'],
        properties: {
            status: { type: 'string', enum: ['draft', 'processing', 'finalized', 'paid'] }
        }
    }
};

const payrollCycleRefBody = {
    type: 'object',
    required: ['cycle_id'],
    properties: {
        cycle_id: { type: 'integer' }
    }
};

export const previewPayrollRunSchema = { body: payrollCycleRefBody };
export const generatePayrollRunSchema = { body: payrollCycleRefBody };

export const finalizePayrollRunSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    }
};

export const listPayrollRunsSchema = {
    querystring: {
        type: 'object',
        properties: {
            cycle_id: { type: 'integer' },
            status: { type: 'string', enum: ['draft', 'locked', 'approved', 'paid'] }
        }
    }
};

export const getPayrollRunSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    }
};

export const listPayslipsSchema = {
    querystring: {
        type: 'object',
        properties: {
            run_id: { type: 'integer' },
            staff_id: { type: 'integer' }
        }
    }
};

export const getPayslipSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'integer' } }
    }
};
