import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Client } = pg;

async function checkSchema() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check columns
    const columnsResult = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        column_default,
        is_nullable,
        character_maximum_length,
        udt_name
      FROM information_schema.columns 
      WHERE table_name = 'visitor_entries' 
      ORDER BY ordinal_position;
    `);

    console.log('📋 Current visitor_entries columns:');
    console.table(columnsResult.rows);

    // Check enum type
    const enumResult = await client.query(`
      SELECT 
        t.typname as enum_name,
        e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'visitor_entry_status'
      ORDER BY e.enumsortorder;
    `);

    if (enumResult.rows.length > 0) {
      console.log('\n📋 Enum type visitor_entry_status values:');
      console.table(enumResult.rows);
    } else {
      console.log('\n⚠️  Enum type visitor_entry_status does not exist');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSchema();
