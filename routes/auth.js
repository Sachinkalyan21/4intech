const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../models/db');

const router = express.Router();
const SECRET_KEY = 'your_secret_key';

// Registration endpoint
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hashSync(password, 10);

    const query = `INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`;
    await db.run(query, [name, email, hashedPassword], function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'User registered successfully', userId: this.lastID });
    });
});

// Login endpoint
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const query = `SELECT * FROM Users WHERE email = ?`;
    await db.get(query, [email], (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'Invalid credentials' });

        const isPasswordValid = bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ token });
    });
});

module.exports = router;