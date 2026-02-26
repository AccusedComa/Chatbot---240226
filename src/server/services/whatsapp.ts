import { makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import pino from 'pino';
import { chatEngine } from './ChatEngine';
import db from '../db';

class WhatsAppService {
    public sock: any = null;
    private qr: string | null = null;
    private connected: boolean = false;
    private me: any = null;
    private authDir = path.resolve(process.cwd(), 'whatsapp_auth');
    private logger = pino({ level: 'silent' });

    constructor() {
        // Auto-connect if session exists
        if (fs.existsSync(this.authDir)) {
            this.connect();
        }
    }

    async connect() {
        if (this.sock) return;

        const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
        const { version } = await fetchLatestBaileysVersion();

        this.sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger: this.logger,
        });

        this.sock.ev.on('connection.update', async (update: any) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                this.qr = await QRCode.toDataURL(qr);
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                this.connected = false;
                this.me = null;
                this.sock = null;
                if (shouldReconnect) this.connect();
            } else if (connection === 'open') {
                this.connected = true;
                this.qr = null;
                this.me = this.sock.user;
                console.log('WhatsApp connected');
            }
        });

        this.sock.ev.on('creds.update', saveCreds);

        // Handle incoming messages
        this.sock.ev.on('messages.upsert', async (m: any) => {
            if (m.type !== 'notify') return;

            for (const msg of m.messages) {
                if (!msg.message || msg.key.fromMe) continue;

                const senderJid = msg.key.remoteJid;
                const messageText = msg.message.conversation ||
                    msg.message.extendedTextMessage?.text ||
                    msg.message.buttonsResponseMessage?.selectedButtonId ||
                    msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
                    '';

                if (!messageText) continue;

                const pushName = msg.pushName || '';

                // SMART FALLBACK: If user typed a number, check if it maps to a menu option
                let finalMessage = messageText;
                const sessionsMessages = db.prepare('SELECT content FROM messages WHERE session_id = ? AND sender = "bot" ORDER BY timestamp DESC LIMIT 1').get(senderJid) as any;

                if (sessionsMessages?.content && /^\d+$/.test(messageText.trim())) {
                    console.log(`[WHATSAPP] Detected numeric reply: ${messageText}`);
                    const lastBotMsg = sessionsMessages.content;
                    const choice = parseInt(messageText.trim());
                    // Find lines that look like "N. Label"
                    const lines = lastBotMsg.split('\n').filter((l: string) => /^\d+/.test(l));
                    if (choice > 0 && choice <= lines.length) {
                        const targetLine = lines[choice - 1];
                        // Extract label (remove the number and emojis)
                        const label = targetLine.replace(/^\d+[^ ]* /, '').trim();
                        finalMessage = label;
                        console.log(`[WHATSAPP] Mapped number ${choice} to choice: ${finalMessage}`);
                    }
                }

                // Process via ChatEngine (with localized error handling)
                console.log(`[WHATSAPP] Processing message for ${senderJid}: "${finalMessage}"`);
                try {
                    const result = await chatEngine.processMessage(senderJid, finalMessage, 'whatsapp', { pushName });

                    if (result.response) {
                        console.log(`[WHATSAPP] Sending response to ${senderJid}. Options: ${result.options?.length || 0}`);
                        await this.sendMessage(senderJid, result.response, result.options);
                    }
                } catch (err: any) {
                    console.error(`[WHATSAPP] Error in ChatEngine for ${senderJid}: ${err.message}`, err);
                }
            }
        });
    }

    async sendMessage(to: string, content: string, options?: { label: string, value: string }[]) {
        if (!this.sock || !this.connected) {
            console.error('Cannot send message: WhatsApp not connected');
            return;
        }

        if (options && options.length > 0) {
            if (options.length <= 3) {
                // Send as Buttons
                const buttons = options.map(opt => ({
                    buttonId: opt.value,
                    buttonText: { displayText: opt.label },
                    type: 1
                }));

                await this.sock.sendMessage(to, {
                    text: content,
                    buttons: buttons,
                    headerType: 1
                });
            } else {
                // Send as List
                const sections = [
                    {
                        title: "Opções disponível",
                        rows: options.map(opt => ({
                            title: opt.label,
                            rowId: opt.value
                        }))
                    }
                ];

                await this.sock.sendMessage(to, {
                    text: content,
                    buttonText: "Ver Opções",
                    sections
                });
            }
        } else {
            await this.sock.sendMessage(to, { text: content });
        }
    }

    async logout() {
        if (this.sock) {
            try {
                await this.sock.logout();
            } catch (err) {
                console.error('Error during logout:', err);
            }
            this.sock = null;
        }
        this.connected = false;
        this.qr = null;
        this.me = null;
        if (fs.existsSync(this.authDir)) {
            fs.rmSync(this.authDir, { recursive: true, force: true });
        }
    }

    getStatus() {
        return {
            connected: this.connected,
            qr: this.qr,
            me: this.me
        };
    }
}

export const whatsappService = new WhatsAppService();
