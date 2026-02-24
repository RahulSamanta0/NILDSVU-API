/**
 * Load Exception Reports Test Data
 * Usage: node scripts/load-exception-test-data.js
 */

import pg from 'pg';

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nild_db';

async function main() {
    console.log('🔄 Loading Exception Reports Test Data...\n');

    const client = new pg.Client({ connectionString });

    try {
        await client.connect();
        console.log('✓ Connected to database');

        const tenantId = 1; // Change if your tenant_id is different
        const today = new Date();

        // CREATE TEST PATIENTS
        console.log('\nCreating test patients...');
        
        const patients = [
            ['P12345', 'John', 'Doe', '1985-06-15', 'male', '9876543210', 'john.doe@test.com', '123 Main St', 'Mumbai', 'Maharashtra', '400001'],
            ['P12346', 'Sarah', 'Johnson', '1990-03-22', 'female', '9876543211', 'sarah.j@test.com', '456 Oak Ave', 'Mumbai', 'Maharashtra', '400002'],
            ['P12347', 'Michael', 'Brown', '1978-11-08', 'male', '9876543212', 'michael.b@test.com', '789 Pine Rd', 'Mumbai', 'Maharashtra', '400003'],
            ['P12348', 'Emily', 'Davis', '1995-07-30', 'female', '9876543213', 'emily.d@test.com', '321 Elm St', 'Mumbai', 'Maharashtra', '400004'],
            ['P12349', 'Robert', 'Wilson', '1982-12-05', 'male', '9876543214', 'robert.w@test.com', '654 Maple Dr', 'Mumbai', 'Maharashtra', '400005']
        ];

        for (const p of patients) {
            await client.query(`
                INSERT INTO patients (tenant_id, upid, first_name, last_name, date_of_birth, gender, phone_number, email, address_line1, city, state, pincode)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (upid) DO NOTHING
            `, [tenantId, ...p]);
        }
        console.log(`✓ Created ${patients.length} patients`);

        // CREATE TEST THERAPISTS
        console.log('Creating test therapists...');

        const therapists = [
            ['dr.smith@nild.com', 'Dr. John Smith', 'T001', 'John', 'Smith', 'Senior Therapist', 'Physiotherapy', '9998887770'],
            ['dr.jones@nild.com', 'Dr. Sarah Jones', 'T002', 'Sarah', 'Jones', 'Therapist', 'Occupational Therapy', '9998887771'],
            ['dr.taylor@nild.com', 'Dr. Michael Taylor', 'T003', 'Michael', 'Taylor', 'Therapist', 'Speech Therapy', '9998887772']
        ];

        for (const t of therapists) {
            await client.query(`
                INSERT INTO users (tenant_id, email, password_hash, full_name, role, is_active)
                VALUES ($1, $2, '$2b$10$abcdefghijklmnopqrstuvwxyz', $3, 'therapist', true)
                ON CONFLICT (email) DO NOTHING
            `, [tenantId, t[0], t[1]]);

            const userResult = await client.query('SELECT user_id FROM users WHERE email = $1 AND tenant_id = $2', [t[0], tenantId]);
            if (userResult.rows.length > 0) {
                const userId = userResult.rows[0].user_id;
                await client.query(`
                    INSERT INTO staff_profiles (tenant_id, user_id, employee_code, first_name, last_name, designation, specialization, phone_number, is_active)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
                    ON CONFLICT (employee_code) DO NOTHING
                `, [tenantId, userId, t[2], t[3], t[4], t[5], t[6], t[7]]);
            }
        }
        console.log(`✓ Created ${therapists.length} therapists`);

        // Get IDs
        const patientsResult = await client.query('SELECT patient_id, upid FROM patients WHERE tenant_id = $1 AND upid IN ($2, $3, $4, $5, $6)', [tenantId, 'P12345', 'P12346', 'P12347', 'P12348', 'P12349']);
        const therapistsResult = await client.query('SELECT user_id, email FROM users WHERE tenant_id = $1 AND email IN ($2, $3, $4)', [tenantId, 'dr.smith@nild.com', 'dr.jones@nild.com', 'dr.taylor@nild.com']);

        const patientMap = {};
        patientsResult.rows.forEach(p => { patientMap[p.upid] = p.patient_id; });

        const therapistMap = {};
        therapistsResult.rows.forEach(t => { therapistMap[t.email] = t.user_id; });

        // CREATE MISSED APPOINTMENTS
        console.log('Creating missed appointments...');

        let aptCount = 0;

        // Patient 1 - 5 missed
        const statuses1 = ['no_show', 'cancelled', 'no_show', 'cancelled', 'no_show'];
        const daysAgo1 = [5, 8, 12, 15, 20];
        for (let i = 0; i < 5; i++) {
            const appointmentDate = new Date(today);
            appointmentDate.setDate(today.getDate() - daysAgo1[i]);
            await client.query(`
                INSERT INTO appointments (tenant_id, appointment_number, patient_id, appointment_date, appointment_time, appointment_type, therapist_id, status)
                VALUES ($1, $2, $3, $4, '09:00', 'Physiotherapy', $5, $6::appointment_status)
                ON CONFLICT (appointment_number) DO NOTHING
            `, [tenantId, `APT-MS-00${i+1}`, patientMap['P12345'], appointmentDate, therapistMap['dr.smith@nild.com'], statuses1[i]]);
            aptCount++;
        }

        // Patient 2 - 3 missed
        const statuses2 = ['no_show', 'cancelled', 'no_show'];
        const daysAgo2 = [3, 7, 14];
        for (let i = 0; i < 3; i++) {
            const appointmentDate = new Date(today);
            appointmentDate.setDate(today.getDate() - daysAgo2[i]);
            await client.query(`
                INSERT INTO appointments (tenant_id, appointment_number, patient_id, appointment_date, appointment_time, appointment_type, therapist_id, status)
                VALUES ($1, $2, $3, $4, '10:00', 'Occupational Therapy', $5, $6::appointment_status)
                ON CONFLICT (appointment_number) DO NOTHING
            `, [tenantId, `APT-MS-00${i+6}`, patientMap['P12346'], appointmentDate, therapistMap['dr.jones@nild.com'], statuses2[i]]);
            aptCount++;
        }

        console.log(`✓ Created ${aptCount} missed appointments`);

        // CREATE REHABILITATION ENTRIES
        console.log('Creating rehabilitation entries...');

        let entryCount = 0;

        // Patient 3 - Minimal progress (5 entries)
        for (let i = 0; i < 5; i++) {
            const assessmentDate = new Date(today);
            assessmentDate.setDate(today.getDate() - ((4-i) * 7));
            await client.query(`
                INSERT INTO rehabilitation_entries (tenant_id, patient_id, therapist_id, assessment_date, overall_score, mobility_score, communication_score, cognitive_score, therapy_notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [tenantId, patientMap['P12347'], therapistMap['dr.taylor@nild.com'], assessmentDate, 45 + (i%2), 40 + (i%2), 50 + (i%2), 45 - (i%2), `Week ${i+1} - minimal progress`]);
            entryCount++;
        }

        // Patient 4 - Declining scores (4 entries)
        const scores = [60, 58, 55, 53];
        for (let i = 0; i < 4; i++) {
            const assessmentDate = new Date(today);
            assessmentDate.setDate(today.getDate() - ((3-i) * 7));
            await client.query(`
                INSERT INTO rehabilitation_entries (tenant_id, patient_id, therapist_id, assessment_date, overall_score, mobility_score, communication_score, cognitive_score, therapy_notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [tenantId, patientMap['P12348'], therapistMap['dr.smith@nild.com'], assessmentDate, scores[i], scores[i]+5, scores[i], scores[i]-5, `Week ${i+1} - declining`]);
            entryCount++;
        }

        // Patient 5 - Goals overdue (4 entries)
        const goalDate = new Date(today);
        goalDate.setDate(today.getDate() - 30);

        const daysAgo5 = [60, 45, 30, 15];
        for (let i = 0; i < 4; i++) {
            const assessmentDate = new Date(today);
            assessmentDate.setDate(today.getDate() - daysAgo5[i]);

            if (i === 0) {
                await client.query(`
                    INSERT INTO rehabilitation_entries (tenant_id, patient_id, therapist_id, assessment_date, overall_score, mobility_score, communication_score, cognitive_score, short_term_goals, long_term_goals, goal_target_date, therapy_notes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [tenantId, patientMap['P12349'], therapistMap['dr.jones@nild.com'], assessmentDate, 40+i, 35+i, 45, 40, 'Improve mobility by 20 points', 'Achieve independent walking', goalDate, 'Goals set with 30-day target']);
            } else {
                await client.query(`
                    INSERT INTO rehabilitation_entries (tenant_id, patient_id, therapist_id, assessment_date, overall_score, mobility_score, communication_score, cognitive_score, therapy_notes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [tenantId, patientMap['P12349'], therapistMap['dr.jones@nild.com'], assessmentDate, 40+i, 35+i, 45+(i%2), 40+(i%2), `Week ${i+1}`]);
            }
            entryCount++;
        }

        console.log(`✓ Created ${entryCount} rehabilitation entries`);

        console.log('\n✅ Test Data Loaded Successfully!\n');
        console.log('Test Data Summary:');
        console.log('- 5 test patients (P12345 to P12349)');
        console.log('- 3 test therapists (Dr. Smith, Dr. Jones, Dr. Taylor)');
        console.log('- 8 missed appointments');
        console.log('- 13 rehabilitation entries');
        console.log('\nTest the API at:');
        console.log('GET http://localhost:5000/rehabilitation/exceptions\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        throw error;
    } finally {
        await client.end();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
