// PATCH: update username support on PUT /users/:id

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();

const SECRET = process.env.JWT_SECRET || "ngelive_super_secret";

// --- Require MariaDB pool from main app
const { dbPool } = require('./index');

// --- Middleware: auth (JWT)
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    const user = jwt.verify(token, SECRET);
    req.user = user;
    next();
  } catch (e) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}

// --- Middleware: admin-only
function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// --- DB init
async function initUsersTable() {
  const conn = await dbPool.getConnection();
  await conn.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(32) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(16) NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  // --- Ensure at least one admin exists (username: admin, password: admin123)
  const rows = await conn.query('SELECT * FROM users WHERE role="admin"');
  if (rows.length === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    await conn.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ["admin", hash, "admin"]);
  }
  conn.release();
}
initUsersTable();

// --- Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const conn = await dbPool.getConnection();
  const users = await conn.query('SELECT * FROM users WHERE username=?', [username]);
  conn.release();
  if (!users[0]) return res.status(401).json({ error: 'User not found' });
  if (!bcrypt.compareSync(password, users[0].password_hash))
    return res.status(401).json({ error: 'Wrong password' });
  const user = { id: users[0].id, username: users[0].username, role: users[0].role };
  const token = jwt.sign(user, SECRET, { expiresIn: '1d' });
  // --- Cookie: (optional, for httpOnly, else return token in body)
  res.cookie?.('token', token, { httpOnly: true, maxAge: 86400000, sameSite: 'strict', secure: false });
  res.json({ token, user });
});

// --- Get current user info
router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

// --- List users (admin only)
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  const conn = await dbPool.getConnection();
  const rows = await conn.query('SELECT id, username, role, created_at FROM users');
  conn.release();
  res.json(rows);
});

// --- Create new user (admin only)
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing field' });
  const hash = bcrypt.hashSync(password, 10);
  const conn = await dbPool.getConnection();
  try {
    await conn.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hash, role || 'user']);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Username already exists' });
  }
  conn.release();
});

// --- Update user (admin only) -- PATCH: support username change
router.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  const conn = await dbPool.getConnection();
  let q = 'UPDATE users SET ';
  const vals = [];
  if (username) {
    q += 'username=?, ';
    vals.push(username);
  }
  if (password) {
    q += 'password_hash=?, ';
    vals.push(bcrypt.hashSync(password, 10));
  }
  if (role) {
    q += 'role=?, ';
    vals.push(role);
  }
  q = q.replace(/, $/, '') + ' WHERE id=?';
  vals.push(req.params.id);
  try {
    await conn.query(q, vals);
    res.json({ success: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'DB error' });
    }
  }
  conn.release();
});

// --- Delete user (admin only)
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const conn = await dbPool.getConnection();
  await conn.query('DELETE FROM users WHERE id=?', [req.params.id]);
  conn.release();
  res.json({ success: true });
});

module.exports = router;
