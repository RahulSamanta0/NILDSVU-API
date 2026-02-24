/**
 * Vendor Entry Schemas
 * 
 * Purpose:
 * - Define JSON schemas for request/response validation
 * - Ensure data integrity and type safety
 * - Provide automatic API documentation
 */

// Create Vendor Entry Schema
export const createVendorEntrySchema = {
    description: 'Create a new vendor entry',
    tags: ['Security - Vendor Entry'],
    body: {
        type: 'object',
        required: ['vendorName', 'contactNumber', 'gate'],
        properties: {
            vendorName: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
                description: 'Name of the vendor'
            },
            company: {
                type: 'string',
                maxLength: 255,
                description: 'Company name (optional)'
            },
            contactNumber: {
                type: 'string',
                pattern: '^[0-9]{10,15}$',
                description: 'Mobile number (10-15 digits)'
            },
            idType: {
                type: 'string',
                maxLength: 50,
                enum: ['Aadhaar', 'PAN', 'Driving License', 'Voter ID', 'Passport', 'Other'],
                description: 'Type of ID proof'
            },
            idNumber: {
                type: 'string',
                maxLength: 50,
                description: 'ID proof number'
            },
            department: {
                type: 'string',
                maxLength: 100,
                description: 'Department to visit'
            },
            purpose: {
                type: 'string',
                description: 'Purpose of visit'
            },
            gate: {
                type: 'string',
                maxLength: 50,
                description: 'Gate number for entry'
            },
            expectedExit: {
                type: 'string',
                maxLength: 50,
                description: 'Expected exit time (optional)'
            },
            vendorType: {
                type: 'string',
                maxLength: 50,
                description: 'Type of vendor (e.g., Supplier, Contractor, Maintenance)'
            },
            guardName: {
                type: 'string',
                maxLength: 100,
                description: 'Name of the security guard (optional)'
            }
        }
    },
    response: {
        201: {
            description: 'Successful response',
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    properties: {
                        entry_id: { type: 'integer' },
                        tenant_id: { type: 'integer' },
                        visitor_pass_number: { type: 'string', description: 'Auto-generated vendor pass number (e.g., VND-17158942)' },
                        visitor_name: { type: 'string' },
                        mobile: { type: 'string' },
                        id_type: { type: 'string' },
                        id_number: { type: 'string' },
                        department: { type: 'string' },
                        purpose: { type: 'string' },
                        gate_number: { type: 'string' },
                        entry_time: { type: 'string' },
                        expected_exit_time: { type: 'string' },
                        guard_name: { type: 'string' },
                        status: { type: 'string' },
                        visitor_type: { type: 'string' },
                        company_name: { type: 'string' },
                        created_at: { type: 'string' }
                    }
                }
            }
        }
    }
};
