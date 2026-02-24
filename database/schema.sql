-- Hospital Management System Schema
-- PostgreSQL 14+ Compatible

BEGIN;

-- ==========================================
-- 1. ENUMERATED TYPES
-- ==========================================

CREATE TYPE gender_type AS ENUM (
  'male',
  'female',
  'other',
  'unknown'
);

CREATE TYPE visit_type AS ENUM (
  'new',
  'followup',
  'review'
);

CREATE TYPE priority_level AS ENUM (
  'normal',
  'urgent',
  'emergency'
);

CREATE TYPE appointment_status AS ENUM (
  'scheduled',
  'confirmed',
  'checked_in',
  'completed',
  'cancelled',
  'no_show'
);

CREATE TYPE visit_status AS ENUM (
  'waiting',
  'in_consultation',
  'completed',
  'cancelled'
);

CREATE TYPE admission_status AS ENUM (
  'admitted',
  'transferred',
  'discharged',
  'cancelled'
);

CREATE TYPE billing_status AS ENUM (
  'unpaid',
  'partial',
  'paid',
  'refunded'
);

CREATE TYPE payment_mode AS ENUM (
  'cash',
  'card',
  'upi',
  'netbanking',
  'cheque'
);

CREATE TYPE order_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE therapy_type AS ENUM (
  'physiotherapy',
  'occupational',
  'speech',
  'prosthetics',
  'orthotics',
  'other'
);

CREATE TYPE shift_type AS ENUM (
  'morning',
  'afternoon',
  'night'
);

CREATE TYPE leave_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

CREATE TYPE inventory_txn_type AS ENUM (
  'purchase',
  'issue',
  'return',
  'adjustment'
);

CREATE TYPE incident_status AS ENUM (
  'open',
  'investigating',
  'resolved',
  'closed'
);

CREATE TYPE request_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE tenant_status AS ENUM (
  'active',
  'suspended',
  'decommissioned'
);

-- ==========================================
-- 2. TABLES
-- ==========================================

CREATE TABLE tenants (
  tenant_id BIGSERIAL PRIMARY KEY,
  tenant_code VARCHAR(50) NOT NULL UNIQUE,
  tenant_name VARCHAR(255) NOT NULL,
  status tenant_status DEFAULT 'active',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE facilities (
  facility_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_code VARCHAR(50) NOT NULL UNIQUE,
  facility_name VARCHAR(255) NOT NULL,
  facility_type VARCHAR(100),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  contact_number VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tenant_settings (
  setting_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_settings (
  setting_id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  user_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_id BIGINT,
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  employee_id VARCHAR(50) UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
  role_id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  role_code VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  permission_id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  permission_name VARCHAR(100) NOT NULL,
  permission_code VARCHAR(50) NOT NULL,
  module VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
  user_role_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role_id INT NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by BIGINT
);

CREATE TABLE role_permissions (
  role_permission_id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patients (
  patient_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_id BIGINT,
  upid VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender gender_type NOT NULL,
  blood_group VARCHAR(10),
  mobile_primary VARCHAR(20) NOT NULL,
  mobile_secondary VARCHAR(20),
  email VARCHAR(255),
  aadhaar_number VARCHAR(12) UNIQUE,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relation VARCHAR(50),
  photo_url VARCHAR(500),
  is_divyangjan BOOLEAN DEFAULT FALSE,
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patient_disabilities (
  disability_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  patient_id BIGINT NOT NULL,
  disability_type VARCHAR(100) NOT NULL,
  disability_subtype VARCHAR(100),
  severity VARCHAR(50),
  onset_type VARCHAR(50),
  certificate_number VARCHAR(100),
  issuing_authority VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,
  certificate_url VARCHAR(500),
  assistive_devices TEXT,
  support_needs TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patient_allergies (
  allergy_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  patient_id BIGINT NOT NULL,
  allergen VARCHAR(255) NOT NULL,
  allergy_type VARCHAR(50),
  severity VARCHAR(50),
  reaction TEXT,
  identified_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE departments (
  department_id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_id BIGINT,
  department_name VARCHAR(100) NOT NULL,
  department_code VARCHAR(50) NOT NULL,
  department_type VARCHAR(50),
  head_of_department BIGINT,
  contact_number VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff_profiles (
  profile_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL UNIQUE,
  employee_code VARCHAR(50) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  designation VARCHAR(100),
  department_id INT,
  specialization VARCHAR(255),
  qualification VARCHAR(255),
  registration_number VARCHAR(100),
  date_of_joining DATE,
  contact_number VARCHAR(20),
  emergency_contact VARCHAR(20),
  photo_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE duty_roster (
  roster_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  staff_id BIGINT NOT NULL,
  duty_date DATE NOT NULL,
  shift_type shift_type,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  department_id INT,
  is_available BOOLEAN DEFAULT TRUE,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leave_applications (
  leave_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  staff_id BIGINT NOT NULL,
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INT NOT NULL,
  reason TEXT,
  status leave_status DEFAULT 'pending',
  applied_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by BIGINT,
  approved_on TIMESTAMP,
  remarks TEXT
);

CREATE TABLE opd_visits (
  visit_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_id BIGINT,
  visit_number VARCHAR(50) NOT NULL UNIQUE,
  patient_id BIGINT NOT NULL,
  visit_date DATE NOT NULL,
  visit_time TIME NOT NULL,
  department_id INT,
  doctor_id BIGINT,
  visit_type visit_type NOT NULL,
  priority priority_level DEFAULT 'normal',
  token_number INT,
  appointment_id BIGINT,
  referral_source VARCHAR(100),
  reason_for_visit TEXT,
  status visit_status DEFAULT 'waiting',
  checked_in_at TIMESTAMP,
  consultation_start_at TIMESTAMP,
  consultation_end_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE opd_consultations (
  consultation_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  visit_id BIGINT NOT NULL UNIQUE,
  chief_complaint TEXT,
  history_present_illness TEXT,
  past_medical_history TEXT,
  past_surgical_history TEXT,
  family_history TEXT,
  social_history TEXT,
  examination_findings TEXT,
  provisional_diagnosis TEXT,
  final_diagnosis TEXT,
  icd_codes VARCHAR(255)[],
  clinical_notes TEXT,
  follow_up_date DATE,
  follow_up_instructions TEXT,
  doctor_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prescriptions (
  prescription_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  visit_id BIGINT NOT NULL,
  patient_id BIGINT NOT NULL,
  doctor_id BIGINT NOT NULL,
  prescription_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prescription_items (
  prescription_item_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  prescription_id BIGINT NOT NULL,
  drug_id INT,
  drug_name VARCHAR(255) NOT NULL,
  strength VARCHAR(100),
  dosage_form VARCHAR(50),
  route VARCHAR(50),
  frequency VARCHAR(100),
  duration VARCHAR(100),
  quantity INT,
  instructions TEXT,
  is_free_text BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wards (
  ward_id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_id BIGINT,
  ward_name VARCHAR(100) NOT NULL,
  ward_code VARCHAR(50) NOT NULL,
  ward_type VARCHAR(50),
  floor_number INT,
  total_beds INT DEFAULT 0,
  available_beds INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE beds (
  bed_id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  ward_id INT NOT NULL,
  bed_number VARCHAR(50) NOT NULL,
  bed_type VARCHAR(50),
  is_occupied BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ipd_admissions (
  admission_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_id BIGINT,
  admission_number VARCHAR(50) NOT NULL UNIQUE,
  patient_id BIGINT NOT NULL,
  ward_id INT,
  bed_id INT,
  admission_date TIMESTAMP NOT NULL,
  admission_type VARCHAR(50) NOT NULL,
  admitting_doctor_id BIGINT,
  provisional_diagnosis TEXT,
  priority priority_level,
  status admission_status DEFAULT 'admitted',
  discharge_date TIMESTAMP,
  discharge_type VARCHAR(50),
  discharge_summary_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ipd_progress_notes (
  note_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  admission_id BIGINT NOT NULL,
  note_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  note_type VARCHAR(50) NOT NULL,
  note_content TEXT NOT NULL,
  vitals JSONB,
  doctor_id BIGINT,
  nurse_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE discharge_summaries (
  summary_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  admission_id BIGINT NOT NULL UNIQUE,
  patient_id BIGINT NOT NULL,
  final_diagnosis TEXT,
  procedures_performed TEXT,
  treatment_summary TEXT,
  medications_at_discharge TEXT,
  follow_up_instructions TEXT,
  discharge_advice TEXT,
  doctor_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lab_tests (
  test_id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  test_code VARCHAR(50) NOT NULL UNIQUE,
  test_name VARCHAR(255) NOT NULL,
  test_category VARCHAR(100),
  sample_type VARCHAR(100),
  turnaround_time INT,
  price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lab_test_orders (
  order_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_id BIGINT,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  patient_id BIGINT NOT NULL,
  visit_id BIGINT,
  admission_id BIGINT,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ordering_doctor_id BIGINT NOT NULL,
  priority priority_level DEFAULT 'normal',
  status order_status DEFAULT 'pending',
  sample_collected_at TIMESTAMP,
  sample_collected_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lab_test_items (
  test_item_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  test_id INT NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  sample_type VARCHAR(100),
  result_value VARCHAR(500),
  result_unit VARCHAR(50),
  reference_range VARCHAR(100),
  status order_status DEFAULT 'pending',
  result_date TIMESTAMP,
  verified_by BIGINT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE radiology_studies (
  study_id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  study_code VARCHAR(50) NOT NULL UNIQUE,
  study_name VARCHAR(255) NOT NULL,
  modality VARCHAR(50),
  body_part VARCHAR(100),
  price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE radiology_orders (
  order_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_id BIGINT,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  patient_id BIGINT NOT NULL,
  visit_id BIGINT,
  admission_id BIGINT,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ordering_doctor_id BIGINT NOT NULL,
  priority priority_level DEFAULT 'normal',
  status order_status DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE radiology_order_items (
  item_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  study_id INT NOT NULL,
  study_name VARCHAR(255) NOT NULL,
  body_part VARCHAR(100),
  clinical_indication TEXT,
  status order_status DEFAULT 'pending',
  scheduled_at TIMESTAMP,
  performed_at TIMESTAMP,
  performed_by BIGINT,
  radiologist_id BIGINT,
  report_text TEXT,
  impressions TEXT,
  report_url VARCHAR(500),
  images_url VARCHAR(500)[],
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE therapy_orders (
  order_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_id BIGINT,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  patient_id BIGINT NOT NULL,
  visit_id BIGINT,
  admission_id BIGINT,
  therapy_type therapy_type NOT NULL,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ordering_doctor_id BIGINT NOT NULL,
  diagnosis TEXT,
  goals TEXT,
  precautions TEXT,
  session_count INT DEFAULT 1,
  sessions_completed INT DEFAULT 0,
  priority priority_level DEFAULT 'normal',
  status order_status DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE therapy_sessions (
  session_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  order_id BIGINT NOT NULL,
  patient_id BIGINT NOT NULL,
  session_number INT NOT NULL,
  scheduled_date DATE,
  scheduled_time TIME,
  therapist_id BIGINT,
  session_date TIMESTAMP,
  duration_minutes INT,
  attendance_status VARCHAR(50),
  treatment_provided TEXT,
  patient_response TEXT,
  progress_notes TEXT,
  next_session_plan TEXT,
  status order_status DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE appointments (
  appointment_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_id BIGINT,
  appointment_number VARCHAR(50) NOT NULL UNIQUE,
  patient_id BIGINT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  appointment_type VARCHAR(50),
  department_id INT,
  doctor_id BIGINT,
  therapist_id BIGINT,
  reason TEXT,
  status appointment_status DEFAULT 'scheduled',
  booked_by VARCHAR(50),
  confirmation_sent BOOLEAN DEFAULT FALSE,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bills (
  bill_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_id BIGINT,
  bill_number VARCHAR(50) NOT NULL UNIQUE,
  patient_id BIGINT NOT NULL,
  visit_id BIGINT,
  admission_id BIGINT,
  bill_type VARCHAR(50) NOT NULL,
  bill_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  balance_amount DECIMAL(12,2) DEFAULT 0,
  payment_status billing_status DEFAULT 'unpaid',
  concession_type VARCHAR(100),
  concession_reason TEXT,
  generated_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bill_items (
  bill_item_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  bill_id BIGINT NOT NULL,
  service_type VARCHAR(100) NOT NULL,
  service_id INT,
  service_name VARCHAR(255) NOT NULL,
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  payment_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_id BIGINT,
  payment_number VARCHAR(50) NOT NULL UNIQUE,
  bill_id BIGINT NOT NULL,
  patient_id BIGINT NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  amount DECIMAL(12,2) NOT NULL,
  payment_mode payment_mode NOT NULL,
  transaction_reference VARCHAR(255),
  received_by BIGINT,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drugs (
  drug_id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  drug_code VARCHAR(50) NOT NULL UNIQUE,
  drug_name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255),
  drug_category VARCHAR(100),
  dosage_form VARCHAR(50),
  strength VARCHAR(100),
  manufacturer VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pharmacy_stock (
  stock_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_id BIGINT,
  drug_id INT NOT NULL,
  batch_number VARCHAR(100) NOT NULL,
  expiry_date DATE NOT NULL,
  quantity_available INT NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2),
  mrp DECIMAL(10,2),
  location VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pharmacy_sales (
  sale_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  facility_id BIGINT,
  sale_number VARCHAR(50) NOT NULL UNIQUE,
  patient_id BIGINT,
  prescription_id BIGINT,
  sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_amount DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,
  payment_mode payment_mode,
  sold_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE pharmacy_sale_items (
  sale_item_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  sale_id BIGINT NOT NULL,
  stock_id BIGINT NOT NULL,
  drug_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_categories (
  category_id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  category_code VARCHAR(50) NOT NULL,
  parent_category_id INT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_items (
  item_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  item_code VARCHAR(50) NOT NULL UNIQUE,
  item_name VARCHAR(255) NOT NULL,
  category_id INT,
  description TEXT,
  unit_of_measure VARCHAR(50),
  reorder_level INT DEFAULT 10,
  current_stock INT DEFAULT 0,
  unit_price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE inventory_transactions (
  transaction_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  item_id BIGINT NOT NULL,
  transaction_type inventory_txn_type NOT NULL,
  transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  quantity INT NOT NULL,
  reference_number VARCHAR(100),
  department_id INT,
  issued_to BIGINT,
  remarks TEXT,
  performed_by BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE security_incidents (
  incident_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  incident_number VARCHAR(50) NOT NULL UNIQUE,
  incident_type VARCHAR(100) NOT NULL,
  incident_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  location VARCHAR(255),
  description TEXT NOT NULL,
  severity VARCHAR(50),
  reported_by BIGINT,
  assigned_to BIGINT,
  status incident_status DEFAULT 'open',
  resolution TEXT,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE visitor_logs (
  visitor_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  visitor_name VARCHAR(255) NOT NULL,
  contact_number VARCHAR(20),
  id_type VARCHAR(50),
  id_number VARCHAR(100),
  purpose VARCHAR(255),
  person_to_meet VARCHAR(255),
  department_id INT,
  check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  check_out_time TIMESTAMP,
  vehicle_number VARCHAR(50),
  guard_on_duty BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  audit_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  user_id BIGINT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_notifications (
  notification_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  user_id BIGINT,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  reference_type VARCHAR(50),
  reference_id BIGINT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cssd_instrument_sets (
  set_id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  set_code VARCHAR(50) NOT NULL UNIQUE,
  set_name VARCHAR(255) NOT NULL,
  set_type VARCHAR(100),
  item_count INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cssd_requests (
  request_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  request_number VARCHAR(50) NOT NULL UNIQUE,
  requesting_department_id INT NOT NULL,
  set_id INT NOT NULL,
  quantity INT DEFAULT 1,
  urgency priority_level DEFAULT 'normal',
  requested_by BIGINT,
  request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status request_status DEFAULT 'pending',
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cssd_sterilization_cycles (
  cycle_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  batch_number VARCHAR(50) NOT NULL UNIQUE,
  autoclave_machine_id VARCHAR(50),
  load_type VARCHAR(50),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  temperature_log JSONB,
  pressure_log JSONB,
  cycle_result VARCHAR(50),
  technician_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE linen_types (
  linen_type_id SERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  linen_name VARCHAR(100) NOT NULL,
  linen_code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE linen_requests (
  request_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  request_number VARCHAR(50) NOT NULL UNIQUE,
  ward_id INT,
  department_id INT,
  linen_type_id INT NOT NULL,
  quantity INT NOT NULL,
  urgency priority_level DEFAULT 'normal',
  requested_by BIGINT,
  request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status request_status DEFAULT 'pending',
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE linen_inventory (
  inventory_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  linen_type_id INT NOT NULL,
  location VARCHAR(100),
  clean_stock INT DEFAULT 0,
  soiled_stock INT DEFAULT 0,
  damaged_stock INT DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE washing_batches (
  batch_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  batch_number VARCHAR(50) NOT NULL UNIQUE,
  linen_type_id INT,
  weight_kg DECIMAL(8,2),
  washing_machine_id VARCHAR(50),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status request_status DEFAULT 'pending',
  operator_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE backup_policies (
  policy_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  policy_name VARCHAR(100) NOT NULL,
  schedule_cron VARCHAR(100) NOT NULL,
  retention_days INT NOT NULL,
  storage_location VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE backup_runs (
  run_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  policy_id BIGINT NOT NULL,
  run_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  run_completed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending',
  backup_size_mb INT,
  checksum VARCHAR(128),
  storage_uri VARCHAR(500)
);

CREATE TABLE data_retention_policies (
  retention_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  data_domain VARCHAR(100) NOT NULL,
  retention_years INT NOT NULL,
  archive_after_months INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE connection_pool_settings (
  setting_id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL,
  pool_mode VARCHAR(50),
  max_client_conn INT,
  default_pool_size INT,
  reserve_pool_size INT,
  idle_timeout_seconds INT,
  statement_timeout_ms INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. INDEXES
-- ==========================================

-- Tenants
CREATE UNIQUE INDEX idx_tenants_code ON tenants(tenant_code);
CREATE INDEX idx_tenants_status ON tenants(status);

-- Facilities
CREATE UNIQUE INDEX idx_facilities_code ON facilities(tenant_id, facility_code);
CREATE INDEX idx_facilities_active ON facilities(tenant_id, is_active);

-- Tenant Settings
CREATE UNIQUE INDEX idx_tenant_settings_key ON tenant_settings(tenant_id, setting_key);

-- Users
CREATE INDEX idx_users_username_active ON users(tenant_id, username, is_active);
CREATE INDEX idx_users_email ON users(tenant_id, email);
CREATE INDEX idx_users_employee ON users(tenant_id, employee_id);

-- Roles
CREATE UNIQUE INDEX idx_roles_code ON roles(tenant_id, role_code);
CREATE INDEX idx_roles_active ON roles(tenant_id, is_active);

-- Permissions
CREATE UNIQUE INDEX idx_permissions_code ON permissions(tenant_id, permission_code);
CREATE INDEX idx_permissions_module ON permissions(tenant_id, module);

-- User Roles
CREATE UNIQUE INDEX idx_user_roles_unique ON user_roles(tenant_id, user_id, role_id);
CREATE INDEX idx_user_roles_role ON user_roles(tenant_id, role_id);

-- Role Permissions
CREATE UNIQUE INDEX idx_role_permissions_unique ON role_permissions(tenant_id, role_id, permission_id);

-- Patients
CREATE UNIQUE INDEX idx_patients_upid ON patients(tenant_id, upid);
CREATE INDEX idx_patients_mobile ON patients(tenant_id, mobile_primary);
CREATE INDEX idx_patients_aadhaar ON patients(tenant_id, aadhaar_number);
CREATE INDEX idx_patients_name ON patients(tenant_id, first_name, last_name);
CREATE INDEX idx_patients_divyangjan ON patients(tenant_id, is_divyangjan);
CREATE INDEX idx_patients_created ON patients(tenant_id, created_at);

-- Patient Disabilities
CREATE INDEX idx_disabilities_patient ON patient_disabilities(tenant_id, patient_id, is_active);
CREATE INDEX idx_disabilities_type ON patient_disabilities(tenant_id, disability_type);

-- Patient Allergies
CREATE INDEX idx_allergies_patient ON patient_allergies(tenant_id, patient_id, is_active);

-- Departments
CREATE UNIQUE INDEX idx_departments_code ON departments(tenant_id, department_code);
CREATE INDEX idx_departments_active ON departments(tenant_id, is_active);

-- Staff Profiles
CREATE UNIQUE INDEX idx_staff_user ON staff_profiles(tenant_id, user_id);
CREATE INDEX idx_staff_employee_code ON staff_profiles(tenant_id, employee_code);
CREATE INDEX idx_staff_department ON staff_profiles(tenant_id, department_id);

-- Duty Roster
CREATE INDEX idx_duty_roster ON duty_roster(tenant_id, staff_id, duty_date);
CREATE INDEX idx_duty_date_dept ON duty_roster(tenant_id, duty_date, department_id);

-- Leave Applications
CREATE INDEX idx_leave_staff ON leave_applications(tenant_id, staff_id, start_date);
CREATE INDEX idx_leave_status ON leave_applications(tenant_id, status);

-- OPD Visits
CREATE UNIQUE INDEX idx_opd_visit_number ON opd_visits(tenant_id, visit_number);
CREATE INDEX idx_opd_patient_date ON opd_visits(tenant_id, patient_id, visit_date);
CREATE INDEX idx_opd_doctor_queue ON opd_visits(tenant_id, doctor_id, visit_date, status);
CREATE INDEX idx_opd_dept_date ON opd_visits(tenant_id, department_id, visit_date);
CREATE INDEX idx_opd_date_status ON opd_visits(tenant_id, visit_date, status);
CREATE INDEX idx_opd_created ON opd_visits(tenant_id, created_at);

-- OPD Consultations
CREATE UNIQUE INDEX idx_consultations_visit ON opd_consultations(tenant_id, visit_id);
CREATE INDEX idx_consultations_doctor ON opd_consultations(tenant_id, doctor_id, created_at);

-- Prescriptions
CREATE INDEX idx_prescriptions_patient ON prescriptions(tenant_id, patient_id, prescription_date);
CREATE INDEX idx_prescriptions_visit ON prescriptions(tenant_id, visit_id);

-- Prescription Items
CREATE INDEX idx_prescription_items ON prescription_items(tenant_id, prescription_id);
CREATE INDEX idx_prescription_drug ON prescription_items(tenant_id, drug_id);

-- Wards
CREATE UNIQUE INDEX idx_wards_code ON wards(tenant_id, ward_code);

-- Beds
CREATE UNIQUE INDEX idx_beds_ward_number ON beds(tenant_id, ward_id, bed_number);
CREATE INDEX idx_beds_availability ON beds(tenant_id, is_occupied, is_active);

-- IPD Admissions
CREATE UNIQUE INDEX idx_ipd_admission_number ON ipd_admissions(tenant_id, admission_number);
CREATE INDEX idx_ipd_patient_status ON ipd_admissions(tenant_id, patient_id, status);
CREATE INDEX idx_ipd_ward_status ON ipd_admissions(tenant_id, ward_id, status);
CREATE INDEX idx_ipd_bed_status ON ipd_admissions(tenant_id, bed_id, status);
CREATE INDEX idx_ipd_admission_date ON ipd_admissions(tenant_id, admission_date);

-- IPD Progress Notes
CREATE INDEX idx_ipd_notes_admission ON ipd_progress_notes(tenant_id, admission_id, note_date);

-- Discharge Summaries
CREATE UNIQUE INDEX idx_discharge_admission ON discharge_summaries(tenant_id, admission_id);
CREATE INDEX idx_discharge_patient ON discharge_summaries(tenant_id, patient_id);

-- Lab Tests
CREATE UNIQUE INDEX idx_lab_tests_code ON lab_tests(tenant_id, test_code);
CREATE INDEX idx_lab_tests_category ON lab_tests(tenant_id, test_category);

-- Lab Test Orders
CREATE UNIQUE INDEX idx_lab_order_number ON lab_test_orders(tenant_id, order_number);
CREATE INDEX idx_lab_patient_date ON lab_test_orders(tenant_id, patient_id, order_date);
CREATE INDEX idx_lab_status_date ON lab_test_orders(tenant_id, status, order_date);
CREATE INDEX idx_lab_visit ON lab_test_orders(tenant_id, visit_id);
CREATE INDEX idx_lab_admission ON lab_test_orders(tenant_id, admission_id);

-- Lab Test Items
CREATE INDEX idx_lab_test_items_order ON lab_test_items(tenant_id, order_id);
CREATE INDEX idx_lab_test_items_test ON lab_test_items(tenant_id, test_id, status);

-- Radiology Studies
CREATE UNIQUE INDEX idx_radio_studies_code ON radiology_studies(tenant_id, study_code);
CREATE INDEX idx_radio_studies_modality ON radiology_studies(tenant_id, modality);

-- Radiology Orders
CREATE UNIQUE INDEX idx_radio_order_number ON radiology_orders(tenant_id, order_number);
CREATE INDEX idx_radio_patient_date ON radiology_orders(tenant_id, patient_id, order_date);
CREATE INDEX idx_radio_status_date ON radiology_orders(tenant_id, status, order_date);

-- Radiology Order Items
CREATE INDEX idx_radio_items_order ON radiology_order_items(tenant_id, order_id);
CREATE INDEX idx_radio_items_study ON radiology_order_items(tenant_id, study_id, status);

-- Therapy Orders
CREATE UNIQUE INDEX idx_therapy_order_number ON therapy_orders(tenant_id, order_number);
CREATE INDEX idx_therapy_patient ON therapy_orders(tenant_id, patient_id, status);
CREATE INDEX idx_therapy_status_date ON therapy_orders(tenant_id, status, order_date);

-- Therapy Sessions
CREATE INDEX idx_therapy_sessions_order ON therapy_sessions(tenant_id, order_id, session_number);
CREATE INDEX idx_therapy_sessions_patient ON therapy_sessions(tenant_id, patient_id, session_date);
CREATE INDEX idx_therapy_sessions_therapist ON therapy_sessions(tenant_id, therapist_id, scheduled_date);

-- Appointments
CREATE UNIQUE INDEX idx_appointments_number ON appointments(tenant_id, appointment_number);
CREATE INDEX idx_appointments_patient ON appointments(tenant_id, patient_id, appointment_date);
CREATE INDEX idx_appointments_doctor ON appointments(tenant_id, doctor_id, appointment_date, status);
CREATE INDEX idx_appointments_date_status ON appointments(tenant_id, appointment_date, status);
CREATE INDEX idx_appointments_status ON appointments(tenant_id, status);

-- Bills
CREATE UNIQUE INDEX idx_bills_number ON bills(tenant_id, bill_number);
CREATE INDEX idx_bills_patient ON bills(tenant_id, patient_id, bill_date);
CREATE INDEX idx_bills_status ON bills(tenant_id, payment_status, bill_date);
CREATE INDEX idx_bills_date ON bills(tenant_id, bill_date);

-- Bill Items
CREATE INDEX idx_bill_items ON bill_items(tenant_id, bill_id);

-- Payments
CREATE UNIQUE INDEX idx_payments_number ON payments(tenant_id, payment_number);
CREATE INDEX idx_payments_bill ON payments(tenant_id, bill_id);
CREATE INDEX idx_payments_patient ON payments(tenant_id, patient_id, payment_date);
CREATE INDEX idx_payments_date ON payments(tenant_id, payment_date);

-- Drugs
CREATE UNIQUE INDEX idx_drugs_code ON drugs(tenant_id, drug_code);
CREATE INDEX idx_drugs_name ON drugs(tenant_id, drug_name);

-- Pharmacy Stock
CREATE INDEX idx_pharmacy_stock ON pharmacy_stock(tenant_id, drug_id, batch_number);
CREATE INDEX idx_pharmacy_expiry ON pharmacy_stock(tenant_id, expiry_date);

-- Pharmacy Sales
CREATE UNIQUE INDEX idx_pharmacy_sales_number ON pharmacy_sales(tenant_id, sale_number);
CREATE INDEX idx_pharmacy_sales_patient ON pharmacy_sales(tenant_id, patient_id, sale_date);
CREATE INDEX idx_pharmacy_sales_date ON pharmacy_sales(tenant_id, sale_date);

-- Pharmacy Sale Items
CREATE INDEX idx_pharmacy_sale_items ON pharmacy_sale_items(tenant_id, sale_id);

-- Inventory Categories
CREATE UNIQUE INDEX idx_inventory_category_code ON inventory_categories(tenant_id, category_code);

-- Inventory Items
CREATE UNIQUE INDEX idx_inventory_code ON inventory_items(tenant_id, item_code);
CREATE INDEX idx_inventory_category ON inventory_items(tenant_id, category_id);
CREATE INDEX idx_inventory_stock ON inventory_items(tenant_id, current_stock);

-- Inventory Transactions
CREATE INDEX idx_inventory_trans ON inventory_transactions(tenant_id, item_id, transaction_date);
CREATE INDEX idx_inventory_type ON inventory_transactions(tenant_id, transaction_type, transaction_date);

-- Security Incidents
CREATE UNIQUE INDEX idx_security_incident_number ON security_incidents(tenant_id, incident_number);
CREATE INDEX idx_security_status ON security_incidents(tenant_id, status, incident_date);

-- Visitor Logs
CREATE INDEX idx_visitor_checkin ON visitor_logs(tenant_id, check_in_time);
CREATE INDEX idx_visitor_contact ON visitor_logs(tenant_id, contact_number);

-- Audit Logs
CREATE INDEX idx_audit_table_record ON audit_logs(tenant_id, table_name, record_id);
CREATE INDEX idx_audit_user ON audit_logs(tenant_id, user_id, created_at);
CREATE INDEX idx_audit_created ON audit_logs(tenant_id, created_at);

-- System Notifications
CREATE INDEX idx_notifications_user ON system_notifications(tenant_id, user_id, is_read, created_at);

-- CSSD Instrument Sets
CREATE UNIQUE INDEX idx_cssd_set_code ON cssd_instrument_sets(tenant_id, set_code);

-- CSSD Requests
CREATE UNIQUE INDEX idx_cssd_request_number ON cssd_requests(tenant_id, request_number);
CREATE INDEX idx_cssd_status ON cssd_requests(tenant_id, status, request_time);

-- CSSD Sterilization Cycles
CREATE UNIQUE INDEX idx_cssd_batch ON cssd_sterilization_cycles(tenant_id, batch_number);
CREATE INDEX idx_cssd_start_time ON cssd_sterilization_cycles(tenant_id, start_time);

-- Linen Types
CREATE UNIQUE INDEX idx_linen_code ON linen_types(tenant_id, linen_code);

-- Linen Requests
CREATE UNIQUE INDEX idx_linen_request_number ON linen_requests(tenant_id, request_number);
CREATE INDEX idx_linen_status ON linen_requests(tenant_id, status, request_time);

-- Linen Inventory
CREATE INDEX idx_linen_inventory ON linen_inventory(tenant_id, linen_type_id, location);

-- Washing Batches
CREATE UNIQUE INDEX idx_washing_batch ON washing_batches(tenant_id, batch_number);
CREATE INDEX idx_washing_status ON washing_batches(tenant_id, status, start_time);

-- Backup Policies
CREATE UNIQUE INDEX idx_backup_policy_name ON backup_policies(tenant_id, policy_name);

-- Backup Runs
CREATE INDEX idx_backup_runs ON backup_runs(tenant_id, policy_id, run_started_at);

-- Data Retention Policies
CREATE UNIQUE INDEX idx_retention_domain ON data_retention_policies(tenant_id, data_domain);

-- Connection Pool Settings
CREATE INDEX idx_pool_tenant ON connection_pool_settings(tenant_id);

-- ==========================================
-- 4. FOREIGN KEYS
-- ==========================================

ALTER TABLE facilities ADD CONSTRAINT fk_facilities_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

ALTER TABLE tenant_settings ADD CONSTRAINT fk_tenant_settings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

ALTER TABLE users ADD CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE users ADD CONSTRAINT fk_users_facility FOREIGN KEY (facility_id) REFERENCES facilities(facility_id);

ALTER TABLE roles ADD CONSTRAINT fk_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

ALTER TABLE permissions ADD CONSTRAINT fk_permissions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(user_id);
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(role_id);
ALTER TABLE user_roles ADD CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(user_id);

ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(role_id);
ALTER TABLE role_permissions ADD CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(permission_id);

ALTER TABLE patients ADD CONSTRAINT fk_patients_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE patients ADD CONSTRAINT fk_patients_facility FOREIGN KEY (facility_id) REFERENCES facilities(facility_id);

ALTER TABLE patient_disabilities ADD CONSTRAINT fk_disabilities_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE patient_disabilities ADD CONSTRAINT fk_disabilities_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);

ALTER TABLE patient_allergies ADD CONSTRAINT fk_allergies_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE patient_allergies ADD CONSTRAINT fk_allergies_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);

ALTER TABLE departments ADD CONSTRAINT fk_departments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE departments ADD CONSTRAINT fk_departments_facility FOREIGN KEY (facility_id) REFERENCES facilities(facility_id);
ALTER TABLE departments ADD CONSTRAINT fk_departments_head FOREIGN KEY (head_of_department) REFERENCES users(user_id);

ALTER TABLE staff_profiles ADD CONSTRAINT fk_staff_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE staff_profiles ADD CONSTRAINT fk_staff_user FOREIGN KEY (user_id) REFERENCES users(user_id);
ALTER TABLE staff_profiles ADD CONSTRAINT fk_staff_department FOREIGN KEY (department_id) REFERENCES departments(department_id);

ALTER TABLE duty_roster ADD CONSTRAINT fk_roster_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE duty_roster ADD CONSTRAINT fk_roster_staff FOREIGN KEY (staff_id) REFERENCES staff_profiles(profile_id);
ALTER TABLE duty_roster ADD CONSTRAINT fk_roster_department FOREIGN KEY (department_id) REFERENCES departments(department_id);

ALTER TABLE leave_applications ADD CONSTRAINT fk_leave_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE leave_applications ADD CONSTRAINT fk_leave_staff FOREIGN KEY (staff_id) REFERENCES staff_profiles(profile_id);
ALTER TABLE leave_applications ADD CONSTRAINT fk_leave_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id);

ALTER TABLE opd_visits ADD CONSTRAINT fk_visits_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE opd_visits ADD CONSTRAINT fk_visits_facility FOREIGN KEY (facility_id) REFERENCES facilities(facility_id);
ALTER TABLE opd_visits ADD CONSTRAINT fk_visits_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);
ALTER TABLE opd_visits ADD CONSTRAINT fk_visits_department FOREIGN KEY (department_id) REFERENCES departments(department_id);
ALTER TABLE opd_visits ADD CONSTRAINT fk_visits_doctor FOREIGN KEY (doctor_id) REFERENCES users(user_id);
ALTER TABLE opd_visits ADD CONSTRAINT fk_visits_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id);

ALTER TABLE opd_consultations ADD CONSTRAINT fk_consultations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE opd_consultations ADD CONSTRAINT fk_consultations_visit FOREIGN KEY (visit_id) REFERENCES opd_visits(visit_id);
ALTER TABLE opd_consultations ADD CONSTRAINT fk_consultations_doctor FOREIGN KEY (doctor_id) REFERENCES users(user_id);

ALTER TABLE prescriptions ADD CONSTRAINT fk_prescriptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE prescriptions ADD CONSTRAINT fk_prescriptions_visit FOREIGN KEY (visit_id) REFERENCES opd_visits(visit_id);
ALTER TABLE prescriptions ADD CONSTRAINT fk_prescriptions_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);
ALTER TABLE prescriptions ADD CONSTRAINT fk_prescriptions_doctor FOREIGN KEY (doctor_id) REFERENCES users(user_id);

ALTER TABLE prescription_items ADD CONSTRAINT fk_prescription_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE prescription_items ADD CONSTRAINT fk_prescription_items_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id);
ALTER TABLE prescription_items ADD CONSTRAINT fk_prescription_items_drug FOREIGN KEY (drug_id) REFERENCES drugs(drug_id);

ALTER TABLE wards ADD CONSTRAINT fk_wards_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE wards ADD CONSTRAINT fk_wards_facility FOREIGN KEY (facility_id) REFERENCES facilities(facility_id);

ALTER TABLE beds ADD CONSTRAINT fk_beds_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE beds ADD CONSTRAINT fk_beds_ward FOREIGN KEY (ward_id) REFERENCES wards(ward_id);

ALTER TABLE ipd_admissions ADD CONSTRAINT fk_admissions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE ipd_admissions ADD CONSTRAINT fk_admissions_facility FOREIGN KEY (facility_id) REFERENCES facilities(facility_id);
ALTER TABLE ipd_admissions ADD CONSTRAINT fk_admissions_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);
ALTER TABLE ipd_admissions ADD CONSTRAINT fk_admissions_ward FOREIGN KEY (ward_id) REFERENCES wards(ward_id);
ALTER TABLE ipd_admissions ADD CONSTRAINT fk_admissions_bed FOREIGN KEY (bed_id) REFERENCES beds(bed_id);
ALTER TABLE ipd_admissions ADD CONSTRAINT fk_admissions_doctor FOREIGN KEY (admitting_doctor_id) REFERENCES users(user_id);
ALTER TABLE ipd_admissions ADD CONSTRAINT fk_admissions_discharge_summary FOREIGN KEY (discharge_summary_id) REFERENCES discharge_summaries(summary_id);

ALTER TABLE ipd_progress_notes ADD CONSTRAINT fk_notes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE ipd_progress_notes ADD CONSTRAINT fk_notes_admission FOREIGN KEY (admission_id) REFERENCES ipd_admissions(admission_id);
ALTER TABLE ipd_progress_notes ADD CONSTRAINT fk_notes_doctor FOREIGN KEY (doctor_id) REFERENCES users(user_id);
ALTER TABLE ipd_progress_notes ADD CONSTRAINT fk_notes_nurse FOREIGN KEY (nurse_id) REFERENCES users(user_id);

ALTER TABLE discharge_summaries ADD CONSTRAINT fk_summaries_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE discharge_summaries ADD CONSTRAINT fk_summaries_admission FOREIGN KEY (admission_id) REFERENCES ipd_admissions(admission_id);
ALTER TABLE discharge_summaries ADD CONSTRAINT fk_summaries_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);
ALTER TABLE discharge_summaries ADD CONSTRAINT fk_summaries_doctor FOREIGN KEY (doctor_id) REFERENCES users(user_id);

ALTER TABLE lab_tests ADD CONSTRAINT fk_tests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

ALTER TABLE lab_test_orders ADD CONSTRAINT fk_lab_orders_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE lab_test_orders ADD CONSTRAINT fk_lab_orders_facility FOREIGN KEY (facility_id) REFERENCES facilities(facility_id);
ALTER TABLE lab_test_orders ADD CONSTRAINT fk_lab_orders_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);
ALTER TABLE lab_test_orders ADD CONSTRAINT fk_lab_orders_visit FOREIGN KEY (visit_id) REFERENCES opd_visits(visit_id);
ALTER TABLE lab_test_orders ADD CONSTRAINT fk_lab_orders_admission FOREIGN KEY (admission_id) REFERENCES ipd_admissions(admission_id);
ALTER TABLE lab_test_orders ADD CONSTRAINT fk_lab_orders_doctor FOREIGN KEY (ordering_doctor_id) REFERENCES users(user_id);
ALTER TABLE lab_test_orders ADD CONSTRAINT fk_lab_orders_collector FOREIGN KEY (sample_collected_by) REFERENCES users(user_id);

ALTER TABLE lab_test_items ADD CONSTRAINT fk_lab_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE lab_test_items ADD CONSTRAINT fk_lab_items_order FOREIGN KEY (order_id) REFERENCES lab_test_orders(order_id);
ALTER TABLE lab_test_items ADD CONSTRAINT fk_lab_items_test FOREIGN KEY (test_id) REFERENCES lab_tests(test_id);
ALTER TABLE lab_test_items ADD CONSTRAINT fk_lab_items_verifier FOREIGN KEY (verified_by) REFERENCES users(user_id);

ALTER TABLE radiology_studies ADD CONSTRAINT fk_radio_studies_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

ALTER TABLE radiology_orders ADD CONSTRAINT fk_radio_orders_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE radiology_orders ADD CONSTRAINT fk_radio_orders_facility FOREIGN KEY (facility_id) REFERENCES facilities(facility_id);
ALTER TABLE radiology_orders ADD CONSTRAINT fk_radio_orders_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);
ALTER TABLE radiology_orders ADD CONSTRAINT fk_radio_orders_visit FOREIGN KEY (visit_id) REFERENCES opd_visits(visit_id);
ALTER TABLE radiology_orders ADD CONSTRAINT fk_radio_orders_admission FOREIGN KEY (admission_id) REFERENCES ipd_admissions(admission_id);
ALTER TABLE radiology_orders ADD CONSTRAINT fk_radio_orders_doctor FOREIGN KEY (ordering_doctor_id) REFERENCES users(user_id);

ALTER TABLE radiology_order_items ADD CONSTRAINT fk_radio_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE radiology_order_items ADD CONSTRAINT fk_radio_items_order FOREIGN KEY (order_id) REFERENCES radiology_orders(order_id);
ALTER TABLE radiology_order_items ADD CONSTRAINT fk_radio_items_study FOREIGN KEY (study_id) REFERENCES radiology_studies(study_id);
ALTER TABLE radiology_order_items ADD CONSTRAINT fk_radio_items_performer FOREIGN KEY (performed_by) REFERENCES users(user_id);
ALTER TABLE radiology_order_items ADD CONSTRAINT fk_radio_items_radiologist FOREIGN KEY (radiologist_id) REFERENCES users(user_id);

ALTER TABLE therapy_orders ADD CONSTRAINT fk_therapy_orders_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE therapy_orders ADD CONSTRAINT fk_therapy_orders_facility FOREIGN KEY (facility_id) REFERENCES facilities(facility_id);
ALTER TABLE therapy_orders ADD CONSTRAINT fk_therapy_orders_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);
ALTER TABLE therapy_orders ADD CONSTRAINT fk_therapy_orders_visit FOREIGN KEY (visit_id) REFERENCES opd_visits(visit_id);
ALTER TABLE therapy_orders ADD CONSTRAINT fk_therapy_orders_admission FOREIGN KEY (admission_id) REFERENCES ipd_admissions(admission_id);
ALTER TABLE therapy_orders ADD CONSTRAINT fk_therapy_orders_doctor FOREIGN KEY (ordering_doctor_id) REFERENCES users(user_id);

ALTER TABLE therapy_sessions ADD CONSTRAINT fk_therapy_sessions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE therapy_sessions ADD CONSTRAINT fk_therapy_sessions_order FOREIGN KEY (order_id) REFERENCES therapy_orders(order_id);
ALTER TABLE therapy_sessions ADD CONSTRAINT fk_therapy_sessions_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);
ALTER TABLE therapy_sessions ADD CONSTRAINT fk_therapy_sessions_therapist FOREIGN KEY (therapist_id) REFERENCES users(user_id);

ALTER TABLE appointments ADD CONSTRAINT fk_appointments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_facility FOREIGN KEY (facility_id) REFERENCES facilities(facility_id);
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_department FOREIGN KEY (department_id) REFERENCES departments(department_id);
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES users(user_id);
ALTER TABLE appointments ADD CONSTRAINT fk_appointments_therapist FOREIGN KEY (therapist_id) REFERENCES users(user_id);

ALTER TABLE bills ADD CONSTRAINT fk_bills_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE bills ADD CONSTRAINT fk_bills_facility FOREIGN KEY (facility_id) REFERENCES facilities(facility_id);
ALTER TABLE bills ADD CONSTRAINT fk_bills_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);
ALTER TABLE bills ADD CONSTRAINT fk_bills_visit FOREIGN KEY (visit_id) REFERENCES opd_visits(visit_id);
ALTER TABLE bills ADD CONSTRAINT fk_bills_admission FOREIGN KEY (admission_id) REFERENCES ipd_admissions(admission_id);
ALTER TABLE bills ADD CONSTRAINT fk_bills_generator FOREIGN KEY (generated_by) REFERENCES users(user_id);

ALTER TABLE bill_items ADD CONSTRAINT fk_bill_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE bill_items ADD CONSTRAINT fk_bill_items_bill FOREIGN KEY (bill_id) REFERENCES bills(bill_id);

ALTER TABLE payments ADD CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE payments ADD CONSTRAINT fk_payments_facility FOREIGN KEY (facility_id) REFERENCES facilities(facility_id);
ALTER TABLE payments ADD CONSTRAINT fk_payments_bill FOREIGN KEY (bill_id) REFERENCES bills(bill_id);
ALTER TABLE payments ADD CONSTRAINT fk_payments_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);
ALTER TABLE payments ADD CONSTRAINT fk_payments_receiver FOREIGN KEY (received_by) REFERENCES users(user_id);

ALTER TABLE drugs ADD CONSTRAINT fk_drugs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

ALTER TABLE pharmacy_stock ADD CONSTRAINT fk_stock_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE pharmacy_stock ADD CONSTRAINT fk_stock_facility FOREIGN KEY (facility_id) REFERENCES facilities(facility_id);
ALTER TABLE pharmacy_stock ADD CONSTRAINT fk_stock_drug FOREIGN KEY (drug_id) REFERENCES drugs(drug_id);

ALTER TABLE pharmacy_sales ADD CONSTRAINT fk_sales_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE pharmacy_sales ADD CONSTRAINT fk_sales_facility FOREIGN KEY (facility_id) REFERENCES facilities(facility_id);
ALTER TABLE pharmacy_sales ADD CONSTRAINT fk_sales_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id);
ALTER TABLE pharmacy_sales ADD CONSTRAINT fk_sales_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id);
ALTER TABLE pharmacy_sales ADD CONSTRAINT fk_sales_seller FOREIGN KEY (sold_by) REFERENCES users(user_id);

ALTER TABLE pharmacy_sale_items ADD CONSTRAINT fk_sale_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE pharmacy_sale_items ADD CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES pharmacy_sales(sale_id);
ALTER TABLE pharmacy_sale_items ADD CONSTRAINT fk_sale_items_stock FOREIGN KEY (stock_id) REFERENCES pharmacy_stock(stock_id);
ALTER TABLE pharmacy_sale_items ADD CONSTRAINT fk_sale_items_drug FOREIGN KEY (drug_id) REFERENCES drugs(drug_id);

ALTER TABLE inventory_categories ADD CONSTRAINT fk_inv_categories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE inventory_categories ADD CONSTRAINT fk_inv_categories_parent FOREIGN KEY (parent_category_id) REFERENCES inventory_categories(category_id);

ALTER TABLE inventory_items ADD CONSTRAINT fk_inv_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE inventory_items ADD CONSTRAINT fk_inv_items_category FOREIGN KEY (category_id) REFERENCES inventory_categories(category_id);

ALTER TABLE inventory_transactions ADD CONSTRAINT fk_inv_trans_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE inventory_transactions ADD CONSTRAINT fk_inv_trans_item FOREIGN KEY (item_id) REFERENCES inventory_items(item_id);
ALTER TABLE inventory_transactions ADD CONSTRAINT fk_inv_trans_department FOREIGN KEY (department_id) REFERENCES departments(department_id);
ALTER TABLE inventory_transactions ADD CONSTRAINT fk_inv_trans_issued_to FOREIGN KEY (issued_to) REFERENCES users(user_id);
ALTER TABLE inventory_transactions ADD CONSTRAINT fk_inv_trans_performer FOREIGN KEY (performed_by) REFERENCES users(user_id);

ALTER TABLE security_incidents ADD CONSTRAINT fk_incidents_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE security_incidents ADD CONSTRAINT fk_incidents_reporter FOREIGN KEY (reported_by) REFERENCES users(user_id);
ALTER TABLE security_incidents ADD CONSTRAINT fk_incidents_assignee FOREIGN KEY (assigned_to) REFERENCES users(user_id);

ALTER TABLE visitor_logs ADD CONSTRAINT fk_visitor_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE visitor_logs ADD CONSTRAINT fk_visitor_department FOREIGN KEY (department_id) REFERENCES departments(department_id);
ALTER TABLE visitor_logs ADD CONSTRAINT fk_visitor_guard FOREIGN KEY (guard_on_duty) REFERENCES users(user_id);

ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(user_id);

ALTER TABLE system_notifications ADD CONSTRAINT fk_notifications_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE system_notifications ADD CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(user_id);

ALTER TABLE cssd_instrument_sets ADD CONSTRAINT fk_cssd_sets_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

ALTER TABLE cssd_requests ADD CONSTRAINT fk_cssd_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE cssd_requests ADD CONSTRAINT fk_cssd_requests_dept FOREIGN KEY (requesting_department_id) REFERENCES departments(department_id);
ALTER TABLE cssd_requests ADD CONSTRAINT fk_cssd_requests_set FOREIGN KEY (set_id) REFERENCES cssd_instrument_sets(set_id);
ALTER TABLE cssd_requests ADD CONSTRAINT fk_cssd_requests_requester FOREIGN KEY (requested_by) REFERENCES users(user_id);

ALTER TABLE cssd_sterilization_cycles ADD CONSTRAINT fk_cssd_cycles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE cssd_sterilization_cycles ADD CONSTRAINT fk_cssd_cycles_tech FOREIGN KEY (technician_id) REFERENCES users(user_id);

ALTER TABLE linen_types ADD CONSTRAINT fk_linen_types_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

ALTER TABLE linen_requests ADD CONSTRAINT fk_linen_requests_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE linen_requests ADD CONSTRAINT fk_linen_requests_ward FOREIGN KEY (ward_id) REFERENCES wards(ward_id);
ALTER TABLE linen_requests ADD CONSTRAINT fk_linen_requests_dept FOREIGN KEY (department_id) REFERENCES departments(department_id);
ALTER TABLE linen_requests ADD CONSTRAINT fk_linen_requests_type FOREIGN KEY (linen_type_id) REFERENCES linen_types(linen_type_id);
ALTER TABLE linen_requests ADD CONSTRAINT fk_linen_requests_requester FOREIGN KEY (requested_by) REFERENCES users(user_id);

ALTER TABLE linen_inventory ADD CONSTRAINT fk_linen_inventory_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE linen_inventory ADD CONSTRAINT fk_linen_inventory_type FOREIGN KEY (linen_type_id) REFERENCES linen_types(linen_type_id);

ALTER TABLE washing_batches ADD CONSTRAINT fk_washing_batches_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE washing_batches ADD CONSTRAINT fk_washing_batches_type FOREIGN KEY (linen_type_id) REFERENCES linen_types(linen_type_id);
ALTER TABLE washing_batches ADD CONSTRAINT fk_washing_batches_operator FOREIGN KEY (operator_id) REFERENCES users(user_id);

ALTER TABLE backup_policies ADD CONSTRAINT fk_backup_policies_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

ALTER TABLE backup_runs ADD CONSTRAINT fk_backup_runs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);
ALTER TABLE backup_runs ADD CONSTRAINT fk_backup_runs_policy FOREIGN KEY (policy_id) REFERENCES backup_policies(policy_id);

ALTER TABLE data_retention_policies ADD CONSTRAINT fk_retention_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

ALTER TABLE connection_pool_settings ADD CONSTRAINT fk_pool_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id);

COMMIT;