const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error('Error opening database:', err.message);
    else console.log('Connected to SQLite database.');
});

// Create Users table
db.run(`
    CREATE TABLE IF NOT EXISTS Users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT
    )
`);

// Create Availability table
db.run(`
    CREATE TABLE IF NOT EXISTS Availability (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        startTime TEXT,
        endTime TEXT,
        FOREIGN KEY(userId) REFERENCES Users(id)
    )
`);

// Create Appointments table
db.run(`
    CREATE TABLE IF NOT EXISTS Appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        clientName TEXT,
        startTime TEXT,
        endTime TEXT,
        FOREIGN KEY(userId) REFERENCES Users(id)
    )
`);

module.exports = db;