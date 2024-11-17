const Database = require('better-sqlite3');
const path = require('path');

// Create or open a database file
const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

// Example of creating a table
db.prepare(`
    CREATE TABLE IF NOT EXISTS db (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        joules INTEGER NOT NULL
    )
`).run();

const insertValues = (joules) => {
    const stmt = db.prepare('INSERT INTO db (joules) VALUES (?)');
    stmt.run(joules);
};

// Example of fetching data
const getValues = () => {
    return db.prepare('SELECT * FROM db').all();
};

module.exports = { insertValues, getValues};