import express from 'express';
import db from '../db.ts';
import multer from 'multer';
import { createRequire } from 'module';
import { ragService } from '../services/rag.ts';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/departments', (req, res) => {
  const depts = db.prepare('SELECT * FROM departments ORDER BY display_order ASC').all();
  res.json(depts);
});

router.post('/departments', (req, res) => {
  const { name, icon, type, phone } = req.body;
  db.prepare('INSERT INTO departments (name, icon, type, phone) VALUES (?, ?, ?, ?)').run(name, icon, type, phone);
  res.json({ success: true });
});

router.put('/departments/:id', (req, res) => {
  const { id } = req.params;
  const { name, icon, type, phone } = req.body;
  db.prepare('UPDATE departments SET name = ?, icon = ?, type = ?, phone = ? WHERE id = ?').run(name, icon, type, phone, id);
  res.json({ success: true });
});

router.delete('/departments/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM departments WHERE id = ?').run(id);
  res.json({ success: true });
});

router.get('/stats', (req, res) => {
  const sessionCount = db.prepare('SELECT COUNT(*) as count FROM sessions').get() as any;
  const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get() as any;
  const docCount = db.prepare('SELECT COUNT(*) as count FROM documents').get() as any;
  res.json({
    sessions: sessionCount.count,
    messages: messageCount.count,
    documents: docCount.count
  });
});

router.get('/sessions', (req, res) => {
  const sessions = db.prepare('SELECT * FROM sessions ORDER BY last_message_at DESC').all();
  res.json(sessions);
});

<<<<<<< HEAD
router.post('/sessions/:sessionId/read', (req, res) => {
  const { sessionId } = req.params;
  db.prepare('UPDATE sessions SET is_read = 1 WHERE session_id = ?').run(sessionId);
  res.json({ success: true });
});

// ─── Settings ───────────────────────────────────────────────────────────────
=======
>>>>>>> 253d226ac800177e6aced0dbf34ab37d53336894
router.get('/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM app_settings').all();
  const settingsMap: any = {};
  settings.forEach((s: any) => settingsMap[s.key] = s.value);
  
  // Mask API Key for security
  if (settingsMap.gemini_api_key) {
    settingsMap.gemini_api_key = '********' + settingsMap.gemini_api_key.slice(-4);
  }
  
  res.json(settingsMap);
});

router.post('/settings', (req, res) => {
  const { key, value } = req.body;
  if (!key || !value) return res.status(400).json({ error: 'Key and value required' });
  
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
  res.json({ success: true });
});

// RAG Upload Endpoint
router.post('/rag/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    let content = '';
    
    if (req.file.mimetype === 'application/pdf') {
      const data = await pdfParse(req.file.buffer);
      content = data.text;
    } else if (req.file.mimetype === 'text/plain') {
      content = req.file.buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Unsupported file type. Use PDF or TXT.' });
    }

    if (!content.trim()) {
      return res.status(400).json({ error: 'File is empty or could not be parsed.' });
    }

    await ragService.ingestDocument(req.file.originalname, content);
    
    res.json({ success: true, message: `File ${req.file.originalname} processed successfully.` });
  } catch (err: any) {
    console.error('Upload error:', err);
    if (err.message.includes('GEMINI_API_KEY is missing')) {
        return res.status(503).json({ error: 'Sistema de IA não configurado (API Key missing).' });
    }
    res.status(500).json({ error: err.message });
  }
});

<<<<<<< HEAD
// ─── RAG Documents List & Delete ────────────────────────────────────────────
router.get('/rag/documents', (req, res) => {
  const docs = db.prepare('SELECT id, filename, created_at FROM documents ORDER BY created_at DESC').all();
  res.json(docs);
});

// ─── Live Chat Control ─────────────────────────────────────────────────────
router.post('/sessions/:sessionId/message', async (req, res) => {
  const { sessionId } = req.params;
  const { content } = req.body;

  if (!content) return res.status(400).json({ error: 'Content is required' });

  try {
    console.log(`[ADMIN] Sending message to session ${sessionId}: ${content.slice(0, 20)}...`);

    // 1. Get session info to check platform
    const session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) as any;
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // 2. Save message as 'bot' (sent by admin)
    db.prepare('INSERT INTO messages (session_id, sender, content) VALUES (?, ?, ?)').run(
      sessionId, 'bot', content
    );

    // 3. Automatically put session in 'admin' control mode
    db.prepare("UPDATE sessions SET controlled_by = 'admin' WHERE session_id = ?").run(sessionId);

    // 4. If platform is WhatsApp, send real message
    if (session.platform === 'whatsapp') {
      const { whatsappService } = await import('../services/whatsapp');
      await whatsappService.sendMessage(sessionId, content);
      console.log(`[ADMIN] WhatsApp message delivered to ${sessionId}`);
    }

    // 5. Update last_message_at and mark as read (admin just responded)
    db.prepare("UPDATE sessions SET last_message_at = CURRENT_TIMESTAMP, is_read = 1 WHERE session_id = ?").run(sessionId);

    res.json({ success: true });
  } catch (err: any) {
    console.error('[ADMIN] Message Error:', err);
    res.status(500).json({ error: 'Failed to send message', details: err.message });
  }
});

router.post('/sessions/:sessionId/takeover', (req, res) => {
  const { sessionId } = req.params;
  const { action } = req.body; // 'assume' or 'release'

  if (!action) return res.status(400).json({ error: 'Action is required' });

  try {
    console.log(`[ADMIN] Takeover request for session ${sessionId}, action: ${action}`);
    const controlledBy = action === 'assume' ? 'admin' : null;
    const result = db.prepare('UPDATE sessions SET controlled_by = ? WHERE session_id = ?').run(
      controlledBy, sessionId
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true, controlled_by: controlledBy });
  } catch (err: any) {
    console.error('[ADMIN] Takeover Error:', err);
    res.status(500).json({ error: 'Failed to update control status', details: err.message });
  }
});

router.delete('/rag/documents/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  res.json({ success: true });
});

=======
>>>>>>> 253d226ac800177e6aced0dbf34ab37d53336894
export default router;
