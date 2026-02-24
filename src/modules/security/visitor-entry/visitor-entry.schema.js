/**
 * Visitor Entry Schemas
 * 
 * Purpose:
 * - Define JSON schemas for request/response validation
 * - Ensure data integrity and type safety
 * - Provide automatic API documentation
 */

// Create Visitor Entry Schema
export const createVisitorEntrySchema = {
    description: 'Create a new visitor entry',
    tags: ['Security - Visitor Entry'],
    body: {
        type: 'object',
        required: ['visitorName', 'mobile', 'idType', 'idNumber', 'department', 'purpose', 'gateNumber'],
        properties: {
            visitorName: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
                description: 'Name of the visitor'
            },
            mobile: {
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
            gateNumber: {
                type: 'string',
                maxLength: 50,
                description: 'Gate number for entry'
            },
            entryTime: {
                type: 'string',
                format: 'date-time',
                description: 'Entry time (ISO 8601 format, defaults to current time)'
            },
            expectedExitTime: {
                type: 'string',
                maxLength: 50,
                description: 'Expected exit time (optional)'
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
                        entryId: { type: 'integer' },
                        tenantId: { type: 'integer' },
                        visitorPassNumber: { type: 'string', description: 'Auto-generated visitor pass number (e.g., VP-20260219-0001)' },
                        visitorName: { type: 'string' },
                        mobile: { type: 'string' },
                        idType: { type: 'string' },
                        idNumber: { type: 'string' },
                        department: { type: 'string' },
                        purpose: { type: 'string' },
                        gateNumber: { type: 'string' },
                        entryTime: { type: 'string' },
                        expectedExitTime: { type: 'string' },
                        guardName: { type: 'string' },
                        status: { type: 'string' },
                        createdAt: { type: 'string' }
                    }
                }
            }
        }
    }
};
