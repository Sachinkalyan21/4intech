const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

// Initialize express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// SQLite Database
const db = new sqlite3.Database('./database.db');

// Create tables if they don't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS Appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES Users(id)
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS Availability (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES Users(id)
        )
    `);
});


const authenticateToken = (request, response, next) => {
    let jwtToken
    const authHeader = request.headers['authorization']
  
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(' ')[1]
    }
    if (jwtToken === undefined) {
      response.status(401)
      response.send('Invalid JWT Token')
    } else {
      jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async (error, payload) => {
        if (error) {
          response.status(401)
          response.send('Invalid JWT Token')
        } else {
          request.username = payload.username
          next()
        }
      })
    }
  }
  
  app.post('/register', async (request, response) => {
    try {
      const {name, email, password} = request.body
      const hashedPassword = await bcrypt.hash(request.body.password, 10)
      const selectUserQuery = `SELECT * FROM user WHERE email = '${email}'`
      const dbUser = await db.get(selectUserQuery)
      if (dbUser === undefined) {
        const createUserQuery = `
        INSERT INTO 
          user (name, email, password) 
        VALUES 
          (
            '${name}', 
            '${email}', 
            '${password}',
            
            
          );`
        if (password.length < 6) {
          response.status(400)
          response.send('Password is too short')
        } else {
          await db.run(createUserQuery)
          response.send('User created successfully')
        }
      } else {
        response.status(400)
        response.send('User already exists')
      }
    } catch (e) {
      console.log(`DB Error: ${e.message}`)
    }
  })

  app.post('/login', async (request, response) => {
    const{email, password} = request.body
    const selectUserQuery = `SELECT * FROM user WHERE username = '${email}'`
    const dbUser = await db.get(selectUserQuery)
    if (dbUser === undefined) {
      response.status(400)
      response.send('Invalid user')
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
      if (isPasswordMatched === true) {
        const payload = {
          username: username,
        }
        const jwtToken = jwt.sign(payload, 'MY_SECRET_TOKEN')
        response.send({jwtToken})
      } else {
        response.status(400)
        response.send('Invalid password')
      }
    }
  })

// Set User Availability
app.post('/set-availability', authenticateToken, async (req, res) => {
    const { startTime, endTime } = req.body;

    const stmt = db.prepare("INSERT INTO Availability (user_id, start_time, end_time) VALUES (?, ?, ?)");
    stmt.run(req.user.userId, startTime, endTime, function (err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to set availability' });
        }
        res.status(201).json({ message: 'Availability set successfully' });
    });
});

// Schedule Appointment
app.post('/schedule', authenticateToken, async (req, res) => {
    const { userId, startTime, endTime } = req.body;

    db.get("SELECT * FROM Availability WHERE user_id = ? AND start_time <= ? AND end_time >= ?", [userId, startTime, endTime], (err, availability) => {
        if (err || !availability) {
            return res.status(400).json({ error: 'No available slot for the selected time' });
        }

        const stmt = db.prepare("INSERT INTO Appointments (user_id, start_time, end_time) VALUES (?, ?, ?)");
        stmt.run(req.user.userId, startTime, endTime, function (err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to schedule appointment' });
            }
            res.status(201).json({ message: 'Appointment scheduled successfully' });
        });
    });
});

// Choose a port dynamically (if 5000 is occupied)
const PORT = process.env.PORT || 5001; // Change port to 5001 or any other unused port

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} `);
});