import { makeWASocket, DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

class WhatsAppService {
    private sock: any = null;
    private qr: string | null = null;
    private connected: boolean = false;
    private me: any = null;
    private authDir = path.resolve(process.cwd(), 'whatsapp_auth');

    constructor() {
        // Auto-connect if session exists
        if (fs.existsSync(this.authDir)) {
            this.connect();
        }
    }

    async connect() {
        if (this.sock) return;

        const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

        this.sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
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
    }

    async logout() {
        if (this.sock) {
            await this.sock.logout();
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
