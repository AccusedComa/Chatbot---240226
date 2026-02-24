import express from 'express';
import db from '../db';
import { v4 as uuidv4 } from 'uuid';
import { ragService } from '../services/rag';
import { GoogleGenAI } from "@google/genai";
import { getApiKey } from '../config';

const router = express.Router();

// Create session
router.post('/session', (req, res) => {
  const sessionId = uuidv4();
  try {
    db.prepare('INSERT INTO sessions (session_id) VALUES (?)').run(sessionId);
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
    // 1. Save user message
    db.prepare('INSERT INTO messages (session_id, sender, content) VALUES (?, ?, ?)').run(session_id, 'user', message);

    // 2. Get session context
    const session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(session_id) as any;

    // 3. Logic
    let botResponse = "Olá! Como posso ajudar?";
    let options: { label: string, value: string }[] | undefined;

    // Check onboarding status
    if (!session.full_name) {
      // Expecting name
      const firstName = message.split(' ')[0];
      db.prepare('UPDATE sessions SET full_name = ?, first_name = ? WHERE session_id = ?').run(message, firstName, session_id);
      botResponse = `Prazer ${firstName}, agora digite seu Whatsapp com DDD (ex 11977777777):`;
    } else if (!session.whatsapp) {
      // Expecting whatsapp
      const cleanPhone = message.replace(/\D/g, '');
      if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
        db.prepare('UPDATE sessions SET whatsapp = ? WHERE session_id = ?').run(cleanPhone, session_id);
        botResponse = "Perfeito! 📱\n🎯 Como posso ajudar você hoje?";

        // Get departments
        const depts = db.prepare('SELECT name, icon FROM departments ORDER BY display_order ASC').all() as any[];
        options = [
          { label: "🤖 Tirar dúvidas com IA", value: "IA" },
          ...depts.map(d => ({ label: `${d.icon || ''} ${d.name}`, value: d.name }))
        ];
      } else {
        botResponse = "Número inválido. Digite apenas números com DDD (ex: 11977777777).";
      }
    } else {
      // Main flow
      if (message === "IA" || session.current_mode === 'IA') { // Assuming we add current_mode to session later, for now just simple toggle

        // RAG Search
        const relevantDocs = await ragService.search(message);
        const context = relevantDocs.map(d => d.content).join('\n\n');

        const currentKey = getApiKey();
        const ai = currentKey ? new GoogleGenAI({ apiKey: currentKey }) : null;

        if (!ai) {
          botResponse = "Desculpe, o sistema de IA não está configurado no momento. (API Key missing)";
        } else {
          // Generate Answer with Gemini
          const prompt = `Você é um assistente virtual da BHS Eletrônica.
             Use o contexto abaixo para responder à pergunta do usuário.
             Se a resposta não estiver no contexto, diga que não encontrou a informação específica, mas tente ajudar com conhecimentos gerais de eletrônica se possível, deixando claro que é uma sugestão geral.
             Seja cordial e breve.
             
             Contexto:
             ${context}
             
             Pergunta: ${message}`;

          try {
            const result = await (ai.models as any).generateContent({
              model: "gemini-1.5-flash",
              contents: [{
                role: 'user',
                parts: [{ text: prompt }]
              }]
            });
            botResponse = result.text || "Desculpe, não consegui gerar uma resposta.";
          } catch (aiError) {
            console.error("Gemini Error:", aiError);
            botResponse = "Desculpe, estou com dificuldades para processar sua pergunta agora. Pode tentar novamente?";
          }
        }

      } else {
        // Check if it matches a department
        const dept = db.prepare('SELECT * FROM departments WHERE name = ?').get(message) as any;
        if (dept) {
          botResponse = `Beleza! Me diga em poucas palavras o que você precisa para o departamento de ${dept.name} para eu direcionar melhor.`;
        } else {
          // Default fallback -> Treat as AI query for now to be helpful
          const relevantDocs = await ragService.search(message);
          const context = relevantDocs.map(d => d.content).join('\n\n');

          const currentKey = getApiKey();
          const ai = currentKey ? new GoogleGenAI({ apiKey: currentKey }) : null;

          if (!ai) {
            botResponse = `Entendi: "${message}". (IA indisponível no momento)`;
          } else {
            const prompt = `Você é um assistente virtual da BHS Eletrônica.
               Use o contexto abaixo para responder à pergunta do usuário.
               Contexto: ${context}
               Pergunta: ${message}`;

            try {
              const result = await (ai.models as any).generateContent({
                model: "gemini-1.5-flash",
                contents: [{
                  role: 'user',
                  parts: [{ text: prompt }]
                }]
              });
              botResponse = result.text || `Entendi: "${message}". (IA indisponível no momento)`;
            } catch (aiError) {
              console.error("Gemini Error (Fallback):", aiError);
              botResponse = `Entendi: "${message}". (IA indisponível no momento)`;
            }
          }
        }
      }
    }

    // 4. Save bot message
    db.prepare('INSERT INTO messages (session_id, sender, content) VALUES (?, ?, ?)').run(session_id, 'bot', botResponse);

    res.json({ response: botResponse, options });

  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', details: err.message, stack: err.stack });
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
