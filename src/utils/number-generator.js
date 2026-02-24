/**
 * Number Generator Utility
 * 
 * Purpose:
 * - Generate unique, sequential document numbers (PO-2026-00001, etc.)
 * - Centralized logic to avoid duplication across modules.
 * - Robust sequence generation using max-plus-one logic.
 */

// ── Prefix Configuration ──────────────────────────────────────────
const PREFIX_CONFIG = {
    // Prefix: { model: prisma_model_name, field: field_name, dateFormat: 'YYYY' | 'YYYYMMDD', padding: 4|5 }
    'PO': { model: 'purchase_orders', field: 'po_number', dateFormat: 'YYYY', padding: 5 },
    'INDENT': { model: 'indent_requests', field: 'indent_number', dateFormat: 'YYYY', padding: 5 },
    'GRN': { model: 'grn', field: 'grn_number', dateFormat: 'YYYY', padding: 5 },
    'BILL': { model: 'bills', field: 'bill_number', dateFormat: 'YYYY', padding: 5 },
    'APP': { model: 'appointments', field: 'appointment_number', dateFormat: 'YYYY', padding: 5 },
    'APT': { model: 'appointments', field: 'appointment_number', dateFormat: 'YYYY', padding: 5 },
    'VIS': { model: 'opd_visits', field: 'visit_number', dateFormat: 'YYYYMMDD', padding: 4 },
    'LAB': { model: 'lab_test_orders', field: 'order_number', dateFormat: 'YYYY', padding: 5 },
    'RAD': { model: 'radiology_orders', field: 'order_number', dateFormat: 'YYYY', padding: 5 },
    'RECP': { model: 'payments', field: 'payment_number', dateFormat: 'YYYY', padding: 5 },
    'SALE': { model: 'pharmacy_sales', field: 'sale_number', dateFormat: 'YYYY', padding: 5 },
    'PSLP': { model: 'payslips', field: 'payslip_number', dateFormat: 'YYYY', padding: 5 },
    'ACALL': { model: 'ambulance_calls', field: 'call_number', dateFormat: 'YYYY', padding: 5 },
    'VPASS': { model: 'visitor_entries', field: 'visitor_pass_number', dateFormat: 'YYYY', padding: 5 },
    'REQ': { model: 'staff_requests', field: 'request_number', dateFormat: 'YYYY', padding: 5 },
    'NILD': { model: 'patients', field: 'upid', dateFormat: 'YYYYMMDD', padding: 4 },
    'ER': { model: 'patients', field: 'emergency_case_number', dateFormat: 'YYYYMMDD', padding: 4 }
};

/**
 * Generate a sequential document number.
 * Default Format: PREFIX-YYYY-NNNNN
 * 
 * @param {object} prisma - Prisma Client instance
 * @param {string} prefix - The document prefix (e.g., 'PO', 'LAB')
 * @param {bigint|number} tenantId - The tenant ID
 * @returns {promise<string>} The generated number
 */
export const generateNumber = async (prisma, prefix, tenantId) => {
    const config = PREFIX_CONFIG[prefix];
    if (!config) {
        throw new Error(`Unsupported prefix: ${prefix}`);
    }

    const now = new Date();
    const year = now.getFullYear();
    let datePart = year.toString();

    if (config.dateFormat === 'YYYYMMDD') {
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        datePart = `${year}${month}${day}`;
    }

    const fullPrefix = `${prefix}-${datePart}-`;

    // Find the latest record for this prefix and tenant in the current date context
    const latest = await prisma[config.model].findFirst({
        where: {
            tenant_id: tenantId,
            [config.field]: { startsWith: fullPrefix }
        },
        orderBy: { [config.field]: 'desc' },
        select: { [config.field]: true }
    });

    let sequence = 1;

    if (latest) {
        const val = latest[config.field];
        const parts = val.split('-');
        const lastPart = parts[parts.length - 1];
        const lastSeq = parseInt(lastPart, 10);

        if (!isNaN(lastSeq)) {
            sequence = lastSeq + 1;
        }
    }

    // Format final string
    const padding = config.padding || 5;
    return `${fullPrefix}${String(sequence).padStart(padding, '0')}`;
};

// Also export a legacy function for backward compatibility if needed, 
// but encourage migration to the new one.
export const generateDocumentNumber = generateNumber;
