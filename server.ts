import 'dotenv/config';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import authRoutes from "./src/server/routes/auth";
import whatsappRoutes from "./src/server/routes/whatsapp";

console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Unset');

import chatRoutes from "./src/server/routes/chat";
import adminRoutes from "./src/server/routes/admin";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Request Logging Middleware
  app.use((req, res, next) => {
    console.log(`[SERVER] ${req.method} ${req.url}`);
    next();
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/whatsapp', whatsappRoutes);

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  });

  // Widget Script Endpoint (Dynamic generation or static serve)
  app.get('/widget.js', (req, res) => {
    // This would ideally serve the built widget bundle.
    // For now, we'll serve a placeholder or redirect to the dev server's asset if possible.
    // In production, this would serve the built JS from dist.
    res.type('application/javascript');
    res.send(`console.log("Widget loaded");`);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
