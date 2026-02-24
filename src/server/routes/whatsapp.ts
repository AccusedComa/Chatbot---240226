import express from 'express';
import { whatsappService } from '../services/whatsapp';
import QRCode from 'qrcode';

const router = express.Router();

router.get('/status', async (req, res) => {
    const status = whatsappService.getStatus();

    if (status.qr) {
        try {
            const qrDataUrl = await QRCode.toDataURL(status.qr);
            return res.json({ ...status, qrDataUrl });
        } catch (err) {
            return res.json({ ...status, error: 'Failed to generate QR Data URL' });
        }
    }

    res.json(status);
});

router.post('/connect', async (req, res) => {
    try {
        await whatsappService.connect();
        res.json({ message: 'Conectando...' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/logout', async (req, res) => {
    try {
        await whatsappService.logout();
        res.json({ message: 'Desconectado com sucesso.' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
