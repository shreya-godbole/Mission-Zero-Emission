// Import necessary modules
import { expect } from 'chai';
import Database from 'better-sqlite3';
import path from 'path';

// Describe the test suite
describe('Database Insertion', function() {
    let db;
    const testID = `test-id-${Date.now()}`; // Generate a unique ID
    const testDate = '2024-11-18';
    const testFilePath = 'C:\\joular-demo\\Demo-project\\src\\No_input.java'; // Fix the escape characters
    const testJoules = '123.45';

    // Setup: Initialize the database connection before tests
    before(function() {
        // Use a temporary or test database path for safety
        const dbPath = path.join(process.cwd(), 'energy_measurement_test.db');
        db = new Database(dbPath);

        // Create the table if it doesn't exist
        db.exec(`
            CREATE TABLE IF NOT EXISTS measurements_data (
                id TEXT PRIMARY KEY,
                date TEXT,
                file TEXT,
                joules TEXT
            )
        `);
    });

    // Clear the database table before each test
    beforeEach(function() {
        db.exec('DELETE FROM measurements_data');
    });

    // Cleanup: Close the database connection after all tests
    after(function() {
        db.close();
    });

    // Test case for database insertion
    it('should insert data correctly into the measurements_data table', function() {
        // Prepare the SQL statement and insert the test data
        const insertStmt = db.prepare('INSERT INTO measurements_data (id, date, file, joules) VALUES (?, ?, ?, ?)');
        insertStmt.run(testID, testDate, testFilePath, testJoules);

        // Query the data to verify the insertion
        const selectStmt = db.prepare('SELECT * FROM measurements_data WHERE id = ?');
        const row = selectStmt.get(testID);

        // Assertions to verify that the data is correctly inserted
        expect(row).to.be.an('object');
        expect(row.id).to.equal(testID);
        expect(row.date).to.equal(testDate);
        expect(row.file).to.equal(testFilePath);
        expect(row.joules).to.equal(testJoules);
    });
});
