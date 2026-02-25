import express from 'express';
import db from '../db';

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  try {
    // Simple check (in production use bcrypt)
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

    if (user && user.password_hash === password) {
      // Return a simple token (in production use JWT)
      res.json({ token: 'mock-token-123', user: { username: user.username, role: user.role } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
