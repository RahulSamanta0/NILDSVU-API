/**
 * Attendance Schema
 */

const attendanceRecordBodyProperties = {
    staff_id: { type: 'integer' },
    attendance_date: { type: 'string', format: 'date' },
    roster_id: { type: 'integer' },
    status: { type: 'string', enum: ['present', 'absent', 'leave', 'half_day', 'weekoff', 'holiday'] },
    check_in_time: { type: 'string', format: 'date-time' },
    check_out_time: { type: 'string', format: 'date-time' },
    late_minutes: { type: 'integer', minimum: 0 },
    early_exit_minutes: { type: 'integer', minimum: 0 },
    overtime_minutes: { type: 'integer', minimum: 0 },
    source: { type: 'string', enum: ['manual', 'biometric', 'import', 'system'] },
    is_manual: { type: 'boolean' },
    remarks: { type: 'string' }
};

export const upsertAttendanceRecordSchema = {
    body: {
        type: 'object',
        required: ['staff_id', 'attendance_date', 'status'],
        additionalProperties: false,
        properties: attendanceRecordBodyProperties
    }
};

export const bulkUpsertAttendanceRecordsSchema = {
    body: {
        type: 'object',
        required: ['records'],
        additionalProperties: false,
        properties: {
            records: {
                type: 'array',
                minItems: 1,
                items: {
                    type: 'object',
                    required: ['staff_id', 'attendance_date', 'status'],
                    additionalProperties: false,
                    properties: attendanceRecordBodyProperties
                }
            }
        }
    }
};

export const listAttendanceRecordsSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100 },
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' },
            department_id: { type: 'integer' },
            staff_id: { type: 'integer' },
            status: { type: 'string', enum: ['present', 'absent', 'leave', 'half_day', 'weekoff', 'holiday'] }
        }
    }
};

export const autoMarkAttendanceForDateSchema = {
    body: {
        type: 'object',
        required: ['date'],
        additionalProperties: false,
        properties: {
            date: { type: 'string', format: 'date' }
        }
    }
};

export const attendanceSummarySchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100 },
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' },
            department_id: { type: 'integer' },
            staff_id: { type: 'integer' }
        }
    }
};

export const attendanceByStaffSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    },
    querystring: {
        type: 'object',
        properties: {
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' }
        }
    }
};
