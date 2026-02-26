import db from '../db';
import { chatEngine } from '../services/ChatEngine';

async function testChatLogic() {
    console.log("--- Starting Chat Logic Simulation ---");

    const sessionId = "test-session-" + Date.now();

    // 1. First message (Onboarding: Name)
    console.log("\nStep 1: User sends name");
    let res = await chatEngine.processMessage(sessionId, "João Silva", "web");
    console.log("Bot:", res.response);

    // 2. Second message (Onboarding: WhatsApp)
    console.log("\nStep 2: User sends phone");
    res = await chatEngine.processMessage(sessionId, "11999999999", "web");
    console.log("Bot:", res.response);
    console.log("Options:", res.options?.length, "departments available");

    // 3. Third message (Selection: IA)
    console.log("\nStep 3: User selects IA");
    res = await chatEngine.processMessage(sessionId, "IA", "web");
    console.log("Bot:", res.response);

    // 4. Test Mode Persistence (IA)
    console.log("\nStep 4: User asks a question in IA mode");
    res = await chatEngine.processMessage(sessionId, "Quais são os horários de funcionamento?", "web");
    console.log("Bot:", res.response);

    // 5. Test Takeover (Simulate Admin assume)
    console.log("\nStep 5: Admin takes over");
    db.prepare("UPDATE sessions SET controlled_by = 'admin' WHERE session_id = ?").run(sessionId);
    res = await chatEngine.processMessage(sessionId, "Oi, tem alguém aí?", "web");
    console.log("Bot response (should be empty):", res.response);
    console.log("Controlled by:", res.controlledBy);

    // 7. Test Manual Message Entry (Simulate admin sending message)
    console.log("\nStep 7: Admin sends manual message");
    // This part involves whatsappService.sendMessage if platform is whatsapp.
    // For now we just verify it saves to DB correctly.
    db.prepare("UPDATE sessions SET controlled_by = 'admin', platform = 'whatsapp' WHERE session_id = ?").run(sessionId);

    // Simulate what admin.ts does
    db.prepare('INSERT INTO messages (session_id, sender, content) VALUES (?, ?, ?)').run(sessionId, 'bot', "Olá, sou o gerente. Como posso ajudar?");

    // 8. Test WhatsApp Onboarding Bypass
    console.log("\nStep 8: WhatsApp user sends message");
    const waSessionId = "5511988887777@s.whatsapp.net";
    res = await chatEngine.processMessage(waSessionId, "Olá, tenho uma dúvida", "whatsapp", { pushName: "Carlos Silva" });
    console.log("Bot:", res.response);

    const waSession = db.prepare('SELECT * FROM sessions WHERE session_id = ?').get(waSessionId) as any;
    console.log("WA Session - Name:", waSession.full_name, "Phone:", waSession.whatsapp);

    console.log("\n--- Simulation Finished ---");
}

testChatLogic().catch(console.error);
