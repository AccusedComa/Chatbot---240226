import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import db from '../db';
import { ragService } from './rag';
import { getApiKey, getGroqApiKey } from '../config';

export interface ChatResponse {
    response: string;
    options?: { label: string, value: string }[];
    controlledBy?: string | null;
    redirectUrl?: string;
}

class ChatEngine {
    async generateAIResponse(prompt: string): Promise<string> {
        const currentKey = getApiKey();
        const ai = currentKey ? new GoogleGenAI({ apiKey: currentKey }) : null;

        try {
            if (!ai) throw new Error("Gemini API Key não configurada");

            const result = await (ai.models as any).generateContent({
                model: "gemini-1.5-flash",
                contents: [{
                    role: 'user',
                    parts: [{ text: prompt }]
                }]
            });
            return result.response.text();
        } catch (error: any) {
            console.error("Gemini Error, attempting Groq fallback:", error.message);

            const groqKey = getGroqApiKey();
            if (groqKey) {
                try {
                    const groq = new Groq({ apiKey: groqKey });
                    const completion = await groq.chat.completions.create({
                        messages: [{ role: "user", content: prompt }],
                        model: "llama-3.3-70b-versatile",
                    });
                    console.log("Response delivered via Groq fallback");
                    return completion.choices[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";
                } catch (groqError: any) {
                    console.error("Groq Fallback Error:", groqError.message);
                }
            }
            return "Desculpe, estou com dificuldades para processar sua pergunta agora. Pode tentar novamente?";
        }
    }

    async processMessage(sessionId: string, message: string, platform: 'web' | 'whatsapp' = 'web', metadata?: { pushName?: string }): Promise<ChatResponse> {
        console.log(`[ENGINE] Processing message for session: ${sessionId}, platform: ${platform}`);
        let session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) as any;

        if (!session) {
            console.log(`[ENGINE] Session not found, creating: ${sessionId}`);
            db.prepare("INSERT INTO sessions (session_id, platform, last_message_at, is_read) VALUES (?, ?, CURRENT_TIMESTAMP, 0)").run(sessionId, platform);
            session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) as any;
        } else {
            console.log(`[ENGINE] Session found, updating activity: ${sessionId}`);
            db.prepare("UPDATE sessions SET last_message_at = CURRENT_TIMESTAMP, is_read = 0 WHERE session_id = ?").run(sessionId);
        }

        // 2. Pre-fill metadata for WhatsApp to skip onboarding
        if (platform === 'whatsapp' && !session.whatsapp) {
            const phone = sessionId.split('@')[0];
            const name = metadata?.pushName || phone;
            db.prepare('UPDATE sessions SET whatsapp = ?, full_name = ?, first_name = ? WHERE session_id = ?')
                .run(phone, name, name.split(' ')[0], sessionId);
            // Refresh session context
            session = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(sessionId) as any;
        }

        // 3. Save user message
        db.prepare('INSERT INTO messages (session_id, sender, content) VALUES (?, ?, ?)').run(sessionId, 'user', message);

        // Hybrid Control Check
        if (session.controlled_by === 'admin') {
            console.log(`Session ${sessionId} is under Admin control. Skipping AI response.`);
            return { response: '', controlledBy: 'admin' };
        }

        let botResponse = "Olá! Como posso ajudar?";
        let options: { label: string, value: string }[] | undefined;

        // SMART INTENT DETECTION (Fast-path for exact menu selections)
        const isMenuSelection = message === 'IA' || !!db.prepare('SELECT 1 FROM departments WHERE name = ?').get(message);
        let intent = "QUESTION";

        if (isMenuSelection) {
            console.log(`[ENGINE] Fast-path: Recognized as direct menu selection: ${message}`);
            intent = "SELECTION";
        } else {
            const systemPromptIntent = `Classifique a intenção desta mensagem para um chatbot de suporte:
- "MENU": Se o usuário quer ver opções, listar departamentos, ou cancelar a ação atual. NÃO CLASSIFIQUE NOME DE DEPARTAMENTO COMO MENU.
- "QUESTION": Se o usuário tem uma dúvida ou pede informação.
- "ONBOARDING": Se a mensagem parece ser a resposta a uma pergunta de Nome ou número de celular.

Mensagem: "${message}"
RETORNE APENAS UMA PALAVRA: MENU, QUESTION ou ONBOARDING.`;

            try {
                const aiIntent = (await this.generateAIResponse(systemPromptIntent)).toUpperCase().trim();
                if (aiIntent.includes("MENU")) intent = "MENU";
                else if (aiIntent.includes("ONBOARDING")) intent = "ONBOARDING";
                console.log(`[ENGINE] AI Detected Intent: ${intent}`);
            } catch (e) {
                console.error("[ENGINE] Intent detection failed, defaulting to QUESTION");
            }
        }

        if (intent === "MENU") {
            db.prepare("UPDATE sessions SET current_mode = NULL, current_dept = NULL WHERE session_id = ?").run(sessionId);
            const depts = db.prepare('SELECT name, icon FROM departments ORDER BY display_order ASC').all() as any[];
            options = [
                { label: "🤖 Tirar dúvidas com IA", value: "IA" },
                ...depts.map(d => ({ label: `${d.icon || ''} ${d.name}`, value: d.name }))
            ];
            botResponse = "Menu Principal:";
            return this.finalizeResponse(sessionId, botResponse, options, platform);
        }

        // 5. Onboarding Logic (Enforce Onboarding before anything else)
        if (!session.full_name && intent !== "SELECTION") {
            const firstName = message.split(' ')[0];
            db.prepare('UPDATE sessions SET full_name = ?, first_name = ? WHERE session_id = ?').run(message, firstName, sessionId);
            botResponse = `Prazer ${firstName}, agora digite seu Whatsapp com DDD (ex 11977777777):`;
            return this.finalizeResponse(sessionId, botResponse, undefined, platform);
        } else if (!session.whatsapp && intent !== "SELECTION") {
            const cleanPhone = message.replace(/\D/g, '');
            if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
                db.prepare('UPDATE sessions SET whatsapp = ? WHERE session_id = ?').run(cleanPhone, sessionId);
                botResponse = "Perfeito! 📱\n🎯 Como posso ajudar você hoje?";
                const depts = db.prepare('SELECT name, icon FROM departments ORDER BY display_order ASC').all() as any[];
                options = [
                    { label: "🤖 Tirar dúvidas com IA", value: "IA" },
                    ...depts.map(d => ({ label: `${d.icon || ''} ${d.name}`, value: d.name }))
                ];
            } else {
                botResponse = "Número inválido. Digite apenas números com DDD (ex: 11977777777).";
            }
            return this.finalizeResponse(sessionId, botResponse, options, platform);
        }

        // 6. Execution Logic
        if (isMenuSelection) {
            if (message === 'IA') {
                db.prepare("UPDATE sessions SET current_mode = 'IA', current_dept = NULL WHERE session_id = ?").run(sessionId);
                botResponse = "Você agora está falando com a IA. Como posso ajudar?";
            } else {
                const activeDept = db.prepare('SELECT * FROM departments WHERE name = ?').get(message) as any;
                if (activeDept.type === 'human') {
                    const redirectUrl = `https://wa.me/${activeDept.phone}?text=Olá,%20vim%20do%20site%20e%20gostaria%20de%20falar%20com%20${activeDept.name}.`;
                    botResponse = `Entendido! Estou te redirecionando para um atendente de ${activeDept.name} no WhatsApp...`;
                    db.prepare("UPDATE sessions SET current_dept = NULL, current_mode = NULL WHERE session_id = ?").run(sessionId);

                    if (botResponse) {
                        db.prepare('INSERT INTO messages (session_id, sender, content) VALUES (?, ?, ?)').run(sessionId, 'bot', botResponse);
                        db.prepare("UPDATE sessions SET last_message_at = CURRENT_TIMESTAMP WHERE session_id = ?").run(sessionId);
                    }
                    return { response: botResponse, redirectUrl };
                } else {
                    db.prepare("UPDATE sessions SET current_dept = ?, current_mode = NULL WHERE session_id = ?").run(activeDept.name, sessionId);
                    botResponse = `Você está no departamento ${activeDept.name}. Qual a sua dúvida?`;
                }
            }
        } else if (session.current_mode === 'IA' || (!session.current_dept && intent === 'QUESTION')) {
            if (session.current_mode !== 'IA') {
                db.prepare("UPDATE sessions SET current_mode = 'IA' WHERE session_id = ?").run(sessionId);
            }
            const relevantDocs = await ragService.search(message);
            const context = relevantDocs.map(d => d.content).join('\n\n');
            const settings = db.prepare("SELECT value FROM app_settings WHERE key = 'system_prompt'").get() as { value: string };
            const systemPrompt = settings?.value || `Você é um assistente virtual da BHS Eletrônica. 
    Use o contexto abaixo para responder à pergunta do usuário. 
    Se a resposta não estiver no contexto, diga que não encontrou a informação específica, mas tente ajudar com conhecimentos gerais de eletrônica se possível.`;

            const prompt = `${systemPrompt}\n\nContexto:\n${context}\n\nPergunta: ${message}`;
            botResponse = await this.generateAIResponse(prompt);
        } else if (session.current_dept) {
            const activeDept = db.prepare('SELECT * FROM departments WHERE name = ?').get(session.current_dept) as any;
            const relevantDocs = await ragService.search(message);
            const context = relevantDocs.map(d => d.content).join('\n\n');
            const deptPrompt = activeDept.prompt || `Você é um especialista do departamento ${activeDept.name} da BHS.`;
            const prompt = `${deptPrompt}\n\nContexto:\n${context}\n\nPergunta: ${message}`;
            botResponse = await this.generateAIResponse(prompt);
        } else {
            botResponse = "Não entendi sua escolha. Por favor, selecione uma opção do menu ou digite 'menu'.";
            const depts = db.prepare('SELECT name, icon FROM departments ORDER BY display_order ASC').all() as any[];
            options = [
                { label: "🤖 Tirar dúvidas com IA", value: "IA" },
                ...depts.map(d => ({ label: `${d.icon || ''} ${d.name}`, value: d.name }))
            ];
        }

        return this.finalizeResponse(sessionId, botResponse, options, platform);
    }

    private finalizeResponse(sessionId: string, botResponse: string, options: any[] | undefined, platform: string): ChatResponse {
        if (botResponse && platform === 'whatsapp' && options && options.length > 0) {
            console.log(`[ENGINE] Appending menu to response for WhatsApp. Options count: ${options.length}`);
            botResponse += "\n\n" + options.map((opt, i) => `${i + 1}️⃣ ${opt.label}`).join('\n');
            botResponse += "\n\n(Responda com o número ou clique na opção)";
        } else if (platform === 'whatsapp') {
            console.log(`[ENGINE] SKIP Appending menu. botResponse: ${!!botResponse}, options: ${options?.length || 'null'}`);
        }

        // Save bot message 
        if (botResponse) {
            db.prepare('INSERT INTO messages (session_id, sender, content) VALUES (?, ?, ?)').run(sessionId, 'bot', botResponse);
            db.prepare("UPDATE sessions SET last_message_at = CURRENT_TIMESTAMP WHERE session_id = ?").run(sessionId);
        }

        return { response: botResponse, options };
    }
}

export const chatEngine = new ChatEngine();
