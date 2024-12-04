import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { expect } from 'chai';
import fs from 'fs';
import ini from 'ini';
import Database from 'better-sqlite3';

// Use these to get the __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the path module
import path from 'path'; // Add this line to import the path module

describe('Table Creation', function() {
  let config;
  let db;

  before(function() {
    // Load the configuration from the test config.ini file
    const configPath = path.join(__dirname, '../config.test.ini'); // Use path here
    
    if (!fs.existsSync(configPath)) {
      throw new Error('Test config.ini file not found.');
    }
    
    config = ini.parse(fs.readFileSync(configPath, 'utf-8'));

    // Connect to the database
    const dbPath = config.database.db_path;
    db = new Database(dbPath);

    // Run the table creation script
    db.exec(`
      CREATE TABLE IF NOT EXISTS all_data (
        id TEXT PRIMARY KEY,
        date TEXT,
        file TEXT,
        joules TEXT
      )
    `);
  });

  after(function() {
    // Close the database connection
    if (db) {
      db.close();
    }
  });

  it('should ensure the all_data table is created', function() {
    // Check if the table exists in the database
    const result = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='all_data';
    `).get();

    expect(result).to.not.be.undefined; // Check if the result is not undefined, meaning the table exists
    expect(result.name).to.equal('all_data'); // Check that the table name is correct
  });
});
