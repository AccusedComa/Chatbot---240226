import express from 'express';
import { chatEngine } from '../services/ChatEngine';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

const router = express.Router();

// Create session
router.post('/session', (req, res) => {
  const sessionId = uuidv4();
  try {
    db.prepare("INSERT INTO sessions (session_id, platform) VALUES (?, 'web')").run(sessionId);
    res.json({ session_id: sessionId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send message
router.post('/message', async (req, res) => {
  const { session_id, message } = req.body;

  if (!session_id || !message) {
    return res.status(400).json({ error: 'Missing session_id or message' });
  }

  try {
    const result = await chatEngine.processMessage(session_id, message, 'web');
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Get history
router.get('/history', (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

  try {
    const messages = db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC').all(session_id);
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
