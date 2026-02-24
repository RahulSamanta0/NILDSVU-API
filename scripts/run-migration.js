import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

async function runMigration() {
  // Get migration file path from command line argument or use default
  const migrationFile = process.argv[2] || 'database/migration-pharmacy-prescription-fields.sql';
  const migrationPath = path.join(path.dirname(__dirname), migrationFile);

  console.log(`\n📁 Reading migration file: ${migrationFile}`);

  // Check if file exists
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
  }

  // Read SQL file
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log(`\n🔌 Connecting to database...`);
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  console.log(`   User: ${process.env.DB_USER}`);

  // Create database client
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Connect to database
    await client.connect();
    console.log(`✅ Connected to database successfully\n`);

    // Execute migration
    console.log(`🚀 Running migration...\n`);
    await client.query(sql);

    console.log(`✅ Migration completed successfully!\n`);
    console.log(`📋 Applied changes:`);
    console.log(`   - Added reason_for_adjustment, requested_by, approved_by to pharmacy_stock`);
    console.log(`   - Added rejected_by, rejected_at to prescriptions`);
    console.log(`   - Created foreign key constraints`);
    console.log(`   - Created indexes for better performance\n`);

  } catch (error) {
    console.error(`\n❌ Migration failed:`, error.message);
    
    // Show more details for specific errors
    if (error.code === 'ENOTFOUND') {
      console.error(`   Cannot connect to database host: ${process.env.DB_HOST}`);
    } else if (error.code === '28P01') {
      console.error(`   Authentication failed. Check DB_USER and DB_PASSWORD`);
    } else if (error.code === '3D000') {
      console.error(`   Database does not exist: ${process.env.DB_NAME}`);
    } else if (error.code === '42701') {
      console.error(`   Column already exists. Migration may have been run previously.`);
    } else if (error.code === '42P07') {
      console.error(`   Constraint or index already exists.`);
    }
    
    console.error(`\n   Error code: ${error.code}`);
    console.error(`   Error details: ${error.detail || 'N/A'}\n`);
    
    process.exit(1);
  } finally {
    // Close connection
    await client.end();
    console.log(`🔌 Database connection closed\n`);
  }
}

// Run migration
runMigration().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
