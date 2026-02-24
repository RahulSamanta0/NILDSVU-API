import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const createTableQuery = `
CREATE TABLE IF NOT EXISTS "rehabilitation_entries" (
    "entry_id" BIGSERIAL PRIMARY KEY,
    "tenant_id" BIGINT NOT NULL,
    "patient_id" BIGINT NOT NULL,
    "visit_id" BIGINT,
    "therapist_id" BIGINT,
    "assessment_date" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referring_doctor" VARCHAR(100),
    "diagnosis" VARCHAR(255),
    "baseline_status" TEXT,
    "impairments" TEXT,
    "goal_description" TEXT,
    "goal_type" VARCHAR(50),
    "target_date" DATE,
    "review_date" DATE,
    "review_outcome" VARCHAR(50),
    "device_type" VARCHAR(100),
    "side_region" VARCHAR(50),
    "fitting_details" TEXT,
    "hep_date_given" DATE,
    "hep_frequency" VARCHAR(100),
    "hep_exercise_list" TEXT,
    "session_type" VARCHAR(50),
    "duration_minutes" INTEGER,
    "intensity" VARCHAR(50),
    "interventions" TEXT,
    "patient_response" TEXT,
    "therapist_signature" VARCHAR(100),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_rehab_patient" ON "rehabilitation_entries"("tenant_id", "patient_id");
CREATE INDEX IF NOT EXISTS "idx_rehab_date" ON "rehabilitation_entries"("tenant_id", "assessment_date");
`;

async function run() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Creating table rehabilitation_entries...');
    await client.query(createTableQuery);
    console.log('Table created successfully.');
    client.release();
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    await pool.end();
  }
}

run();
