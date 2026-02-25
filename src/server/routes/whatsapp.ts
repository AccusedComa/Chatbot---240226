import express from 'express';
import { whatsappService } from '../services/whatsapp';

const router = express.Router();

router.get('/status', (req, res) => {
    res.json(whatsappService.getStatus());
});

router.post('/connect', async (req, res) => {
    try {
        await whatsappService.connect();
        res.json({ message: 'Connecting...' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/logout', async (req, res) => {
    try {
        await whatsappService.logout();
        res.json({ message: 'Logged out' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
