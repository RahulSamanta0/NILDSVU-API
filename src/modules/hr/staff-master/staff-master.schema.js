/**
 * Staff Master Schema
 *
 * Purpose: Fastify JSON schemas for staff request submissions and staff listing
 */

const paginationSchema = {
    type: 'object',
    properties: {
        page: { type: 'integer', minimum: 1 },
        pageSize: { type: 'integer', minimum: 1, maximum: 100 },
        status: { type: 'string', enum: ['pending', 'approved', 'rejected'] }
    }
};

export const submitStaffRequestSchema = {
    body: {
        type: 'object',
        properties: {
            user_id: { type: 'integer' },
            username: { type: 'string', minLength: 3, maxLength: 100 },
            email: { type: 'string', format: 'email', maxLength: 255 },
            password: { type: 'string', minLength: 8, maxLength: 100 },
            role_id: { type: 'integer' },
            facility_id: { type: 'integer' },
            first_name: { type: 'string', maxLength: 100 },
            last_name: { type: 'string', maxLength: 100 },
            designation: { type: 'string', maxLength: 100 },
            department_id: { type: 'integer' },
            specialization: { type: 'string', maxLength: 255 },
            qualification: { type: 'string', maxLength: 255 },
            registration_number: { type: 'string', maxLength: 100 },
            date_of_joining: { type: 'string', format: 'date' },
            contact_number: { type: 'string', maxLength: 20 },
            emergency_contact: { type: 'string', maxLength: 20 },
            photo_url: { type: 'string', maxLength: 500 },
            room_number: { type: 'string', maxLength: 50 },
            current_status: { type: 'string', maxLength: 50 },
            is_active: { type: 'boolean' },
            request_type: { type: 'string', enum: ['new', 'update'] }
        },
        oneOf: [
            {
                required: ['user_id', 'first_name', 'last_name', 'request_type']
            },
            {
                required: ['username', 'email', 'password', 'role_id', 'first_name', 'last_name', 'request_type']
            }
        ]
    },
    response: {
        201: {
            type: 'object',
            properties: {
                profile_id: { type: 'integer' },
                user_id: { type: 'integer' },
                employee_code: { type: 'string' },
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                request_status: { type: 'string' },
                request_type: { type: 'string' },
                submitted_by: { type: 'integer' },
                created_at: { type: 'string' }
            }
        }
    }
};

export const listStaffRequestsSchema = {
    querystring: {
        ...paginationSchema
    },
    response: {
        200: {
            type: 'object',
            properties: {
                page: { type: 'integer' },
                pageSize: { type: 'integer' },
                total: { type: 'integer' },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            profile_id: { type: 'integer' },
                            user_id: { type: 'integer' },
                            employee_code: { type: 'string' },
                            full_name: { type: 'string' },
                            designation: { type: 'string' },
                            department_id: { type: 'integer' },
                            department_name: { type: 'string' },
                            specialization: { type: 'string' },
                            contact_number: { type: 'string' },
                            request_status: { type: 'string' },
                            request_type: { type: 'string' },
                            created_at: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
};

const staffListItemSchema = {
    type: 'object',
    properties: {
        profile_id: { type: 'integer' },
        user_id: { type: 'integer' },
        employee_code: { type: 'string' },
        full_name: { type: 'string' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        username: { type: ['string', 'null'] },
        email: { type: ['string', 'null'] },
        designation: { type: ['string', 'null'] },
        department_id: { type: ['integer', 'null'] },
        department_name: { type: ['string', 'null'] },
        facility_id: { type: ['integer', 'null'] },
        facility_name: { type: ['string', 'null'] },
        role_names: {
            type: 'array',
            items: { type: 'string' }
        },
        primary_role: { type: ['string', 'null'] },
        specialization: { type: ['string', 'null'] },
        qualification: { type: ['string', 'null'] },
        registration_number: { type: ['string', 'null'] },
        date_of_joining: { type: ['string', 'null'] },
        contact_number: { type: ['string', 'null'] },
        emergency_contact: { type: ['string', 'null'] },
        photo_url: { type: ['string', 'null'] },
        room_number: { type: ['string', 'null'] },
        current_status: { type: ['string', 'null'] },
        is_active: { type: ['boolean', 'null'] },
        request_status: { type: ['string', 'null'] },
        request_type: { type: ['string', 'null'] },
        submitted_by: { type: ['integer', 'null'] },
        submitted_by_name: { type: ['string', 'null'] },
        reviewed_by: { type: ['integer', 'null'] },
        reviewed_by_name: { type: ['string', 'null'] },
        created_at: { type: ['string', 'null'] },
        updated_at: { type: ['string', 'null'] }
    }
};

export const listAllStaffSchema = {
    querystring: {
        type: 'object',
        properties: {
            page: { type: 'integer', minimum: 1 },
            pageSize: { type: 'integer', minimum: 1, maximum: 100 },
            search: { type: 'string', maxLength: 100 },
            department_id: { type: 'integer' },
            designation: { type: 'string', maxLength: 100 },
            request_status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
            request_type: { type: 'string', enum: ['new', 'update'] },
            current_status: { type: 'string', maxLength: 50 },
            is_active: { type: 'boolean' },
            role_id: { type: 'integer' },
            facility_id: { type: 'integer' },
            submitted_by: { type: 'integer' },
            reviewed_by: { type: 'integer' },
            from_date: { type: 'string', format: 'date' },
            to_date: { type: 'string', format: 'date' },
            sort_by: {
                type: 'string',
                enum: ['created_at', 'updated_at', 'date_of_joining', 'first_name', 'last_name', 'employee_code']
            },
            sort_order: { type: 'string', enum: ['asc', 'desc'] }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                page: { type: 'integer' },
                pageSize: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                data: {
                    type: 'array',
                    items: staffListItemSchema
                }
            }
        }
    }
};

export const getStaffDetailsSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                profile_id: { type: 'integer' },
                tenant_id: { type: 'integer' },
                user_id: { type: 'integer' },
                employee_code: { type: 'string' },
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                designation: { type: ['string', 'null'] },
                department_id: { type: ['integer', 'null'] },
                department_name: { type: ['string', 'null'] },
                specialization: { type: ['string', 'null'] },
                qualification: { type: ['string', 'null'] },
                registration_number: { type: ['string', 'null'] },
                date_of_joining: { type: ['string', 'null'] },
                contact_number: { type: ['string', 'null'] },
                emergency_contact: { type: ['string', 'null'] },
                photo_url: { type: ['string', 'null'] },
                room_number: { type: ['string', 'null'] },
                current_status: { type: ['string', 'null'] },
                is_active: { type: ['boolean', 'null'] },
                request_status: { type: ['string', 'null'] },
                request_type: { type: ['string', 'null'] },
                request_notes: { type: ['string', 'null'] },
                submitted_by: { type: ['integer', 'null'] },
                submitted_by_name: { type: ['string', 'null'] },
                reviewed_by: { type: ['integer', 'null'] },
                reviewed_by_name: { type: ['string', 'null'] },
                reviewed_at: { type: ['string', 'null'] },
                created_at: { type: ['string', 'null'] },
                updated_at: { type: ['string', 'null'] },
                user: {
                    type: ['object', 'null'],
                    properties: {
                        user_id: { type: 'integer' },
                        username: { type: 'string' },
                        email: { type: 'string' },
                        employee_id: { type: ['string', 'null'] },
                        facility_id: { type: ['integer', 'null'] },
                        facility_name: { type: ['string', 'null'] },
                        is_active: { type: ['boolean', 'null'] },
                        is_verified: { type: ['boolean', 'null'] },
                        last_login_at: { type: ['string', 'null'] },
                        created_at: { type: ['string', 'null'] },
                        updated_at: { type: ['string', 'null'] },
                        roles: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    role_id: { type: ['integer', 'null'] },
                                    role_name: { type: ['string', 'null'] },
                                    role_code: { type: ['string', 'null'] },
                                    assigned_at: { type: ['string', 'null'] }
                                }
                            }
                        }
                    }
                },
                documents: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            document_id: { type: 'integer' },
                            document_type: { type: 'string' },
                            file_url: { type: 'string' },
                            file_name: { type: 'string' },
                            file_size: { type: ['integer', 'null'] },
                            uploaded_at: { type: ['string', 'null'] }
                        }
                    }
                }
            }
        }
    }
};

export const updateStaffDetailsSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    },
    body: {
        type: 'object',
        additionalProperties: false,
        minProperties: 1,
        properties: {
            first_name: { type: 'string', maxLength: 100 },
            last_name: { type: 'string', maxLength: 100 },
            designation: { type: 'string', maxLength: 100 },
            department_id: { type: 'integer' },
            specialization: { type: 'string', maxLength: 255 },
            qualification: { type: 'string', maxLength: 255 },
            registration_number: { type: 'string', maxLength: 100 },
            date_of_joining: { type: 'string', format: 'date' },
            contact_number: { type: 'string', maxLength: 20 },
            emergency_contact: { type: 'string', maxLength: 20 },
            photo_url: { type: 'string', maxLength: 500 },
            room_number: { type: 'string', maxLength: 50 },
            current_status: { type: 'string', maxLength: 50 },
            is_active: { type: 'boolean' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                profile_id: { type: 'integer' },
                user_id: { type: 'integer' },
                employee_code: { type: 'string' },
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                designation: { type: ['string', 'null'] },
                department_id: { type: ['integer', 'null'] },
                specialization: { type: ['string', 'null'] },
                qualification: { type: ['string', 'null'] },
                registration_number: { type: ['string', 'null'] },
                date_of_joining: { type: ['string', 'null'] },
                contact_number: { type: ['string', 'null'] },
                emergency_contact: { type: ['string', 'null'] },
                photo_url: { type: ['string', 'null'] },
                room_number: { type: ['string', 'null'] },
                current_status: { type: ['string', 'null'] },
                is_active: { type: ['boolean', 'null'] },
                updated_at: { type: ['string', 'null'] }
            }
        }
    }
};

export const addStaffRequestDocumentSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    },
    body: {
        type: 'object',
        required: ['document_type', 'file_url', 'file_name'],
        properties: {
            document_type: { type: 'string', maxLength: 100 },
            file_url: { type: 'string', maxLength: 500 },
            file_name: { type: 'string', maxLength: 255 },
            file_size: { type: 'integer' }
        }
    },
    response: {
        201: {
            type: 'object',
            properties: {
                document_id: { type: 'integer' },
                profile_id: { type: 'integer' },
                document_type: { type: 'string' },
                file_url: { type: 'string' },
                file_name: { type: 'string' },
                file_size: { type: 'integer' },
                uploaded_at: { type: 'string' }
            }
        }
    }
};

export const listStaffRequestDocumentsSchema = {
    params: {
        type: 'object',
        required: ['id'],
        properties: {
            id: { type: 'integer' }
        }
    },
    response: {
        200: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    document_id: { type: 'integer' },
                    profile_id: { type: 'integer' },
                    document_type: { type: 'string' },
                    file_url: { type: 'string' },
                    file_name: { type: 'string' },
                    file_size: { type: 'integer' },
                    uploaded_at: { type: 'string' }
                }
            }
        }
    }
};
