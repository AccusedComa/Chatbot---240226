import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import path from 'path';
import fs from 'fs';

const logger = pino({ level: 'info' });

export class WhatsappService {
    private sock: any = null;
    private qr: string | null = null;
    private status: 'connecting' | 'open' | 'close' | 'qr' = 'close';
    private authPath = path.resolve('auth_info_baileys');

    constructor() {
        // Ensure auth directory exists
        if (!fs.existsSync(this.authPath)) {
            fs.mkdirSync(this.authPath, { recursive: true });
        }
    }

    async connect() {
        const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
        const { version, isLatest } = await fetchLatestBaileysVersion();

        console.log(`Using WhatsApp v${version.join('.')}, isLatest: ${isLatest}`);

        this.sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: false, // We will handle QR via web
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
        });

        this.sock.ev.on('connection.update', (update: any) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                this.qr = qr;
                this.status = 'qr';
            }

            if (connection === 'close') {
                this.qr = null;
                const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
                this.status = 'close';
                if (shouldReconnect) {
                    this.connect();
                }
            } else if (connection === 'open') {
                console.log('opened connection');
                this.qr = null;
                this.status = 'open';
            }
        });

        this.sock.ev.on('creds.update', saveCreds);
    }

    getStatus() {
        return {
            status: this.status,
            qr: this.qr,
            phone: this.sock?.user?.id?.split(':')[0]
        };
    }

    async logout() {
        if (this.sock) {
            await this.sock.logout();
            this.sock = null;
        }
        this.status = 'close';
        this.qr = null;
        if (fs.existsSync(this.authPath)) {
            fs.rmSync(this.authPath, { recursive: true, force: true });
        }
    }
}

export const whatsappService = new WhatsappService();
