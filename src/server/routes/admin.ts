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
  const sessions = db.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all();
  res.json(sessions);
});

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

export default router;
